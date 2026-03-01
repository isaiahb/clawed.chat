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
import * as openclawService from "../services/openclaw.service"

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

  // ─── Dispatch to OpenClaw via Gateway RPC ────────────────────────────
  // The agent's response will arrive asynchronously via:
  //   channel plugin sendText → POST /api/openclaw/outbound → Convex → frontend
  // Fall back to OPENCLAW_GATEWAY_URL env var for demo/dev (when instance has no IP yet)
  const gatewayEnvUrl = process.env.OPENCLAW_GATEWAY_URL
  const gatewayIp = instance.ip || (gatewayEnvUrl ? new URL(gatewayEnvUrl).hostname : null)

  if (gatewayIp && (instance.status === "running" || instance.status === "starting" || gatewayEnvUrl)) {
    try {
      const result = await openclawService.sendMessage({
        ip: gatewayIp,
        token: process.env.OPENCLAW_GATEWAY_TOKEN || "clawed-default",
        text: message,
        userId: auth.userId,
        source: source as "web" | "glasses" | "desktop",
        instanceId,
      })
      console.log(`[chat] dispatched to OpenClaw: session=${result.sessionKey} dispatched=${result.dispatched}`)
    } catch (err: any) {
      // Don't fail the request — the message is already saved in Convex.
      // The user sees their message, and we log the dispatch failure.
      // They can retry or the agent may still respond if the gateway recovers.
      console.error(`[chat] failed to dispatch to OpenClaw (message saved, agent may not respond):`, err.message)
    }
  } else {
    console.warn(`[chat] instance ${instanceId} is not running (status=${instance.status}, ip=${instance.ip}) — message saved but not dispatched`)
  }

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
