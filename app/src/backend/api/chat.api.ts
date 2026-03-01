/**
 * Chat API — send messages to OpenClaw instances
 *
 * POST /:instanceId    → send an asynchronous message to an OpenClaw agent
 *
 * Messages are fire-and-forget from the client's perspective:
 *   1. User sends a message here
 *   2. We write it to Convex `chat_messages` immediately
 *   3. We dispatch it to OpenClaw via Gateway RPC (chat.send)
 *   4. The agent's response arrives later via the channel plugin
 *      → POST /api/openclaw/outbound → Convex → frontend subscription
 *
 * Reference: Design Doc 10
 */

import {Hono} from "hono"
import type {Context} from "hono"
import {getAuth} from "@hono/clerk-auth"
import {ConvexHttpClient} from "convex/browser"
import {api} from "../../../../convex/_generated/api"

const app = new Hono()

// ─── Convex Client ───────────────────────────────────────────────────────────

const CONVEX_URL = process.env.CONVEX_URL || ""
const convex = CONVEX_URL ? new ConvexHttpClient(CONVEX_URL) : null

function getConvex(): ConvexHttpClient {
  if (!convex) {
    throw new Error("[chat] CONVEX_URL not configured")
  }
  return convex
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.post("/:instanceId", sendMessage)

// ─── Handlers ────────────────────────────────────────────────────────────────

/** POST /:instanceId — send an asynchronous message to the user's OpenClaw agent */
async function sendMessage(c: Context) {
  const auth = getAuth(c)
  if (!auth?.userId) {
    return c.json({error: "Unauthorized"}, 401)
  }

  const instanceId = c.req.param("instanceId")
  const {message, source = "web"} = await c.req.json()

  if (!message) {
    return c.json({error: "message is required"}, 400)
  }

  const validSources = ["web", "glasses", "desktop"]
  if (!validSources.includes(source)) {
    return c.json({error: `source must be one of: ${validSources.join(", ")}`}, 400)
  }

  const db = getConvex()

  // ─── Verify user owns this instance ──────────────────────────────────
  let instance
  try {
    instance = await db.query(api.instances.get, {id: instanceId as any})
  } catch (err) {
    console.error("[chat] failed to fetch instance:", err)
    return c.json({error: "Instance not found"}, 404)
  }

  if (!instance) {
    return c.json({error: "Instance not found"}, 404)
  }

  if (instance.user_id !== auth.userId) {
    return c.json({error: "Instance not found"}, 404)
  }

  // ─── Write user's message to Convex immediately ──────────────────────
  // This shows up in the frontend chat panel in real-time via subscription
  try {
    await db.mutation(api.chatMessages.insert, {
      user_id: auth.userId,
      instance_id: instanceId,
      role: "user",
      source: source as "web" | "glasses" | "desktop",
      content: message,
      timestamp: Date.now(),
    })
  } catch (err) {
    console.error("[chat] failed to write message to Convex:", err)
    return c.json({error: "Failed to save message"}, 500)
  }

  // ─── Agent dispatch is handled by the WebSocket proxy ────────────────
  // The frontend sends messages to the agent via /api/openclaw-ws (useOpenClaw hook).
  // This endpoint ONLY writes the user message to Convex.
  // The WebSocket proxy handles: auth → chat.send → streaming response → persist.

  // ─── Touch last_active_at ────────────────────────────────────────────
  try {
    await db.mutation(api.instances.touch, {id: instanceId as any})
  } catch (err) {
    // Non-critical — just log it
    console.warn("[chat] failed to touch last_active_at:", err)
  }

  return c.json({
    success: true,
    message: "Message sent",
    dispatched: !!(instance.ip && instance.status === "running"),
  })
}

export default app
