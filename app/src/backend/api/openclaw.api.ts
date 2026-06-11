/**
 * OpenClaw API — receives outbound messages from our channel plugin
 *
 * POST /outbound   → agent response callback from the clawed channel plugin
 *
 * When the OpenClaw agent generates a response, our channel plugin
 * HTTP POSTs it here. We then write it to Convex (chat_messages table)
 * so the frontend picks it up via real-time subscription, and optionally
 * speak it aloud if the source was glasses.
 *
 * Reference: Design Doc 10
 */

import {Hono} from "hono"
import type {Context} from "hono"
import {ConvexHttpClient} from "convex/browser"
import {api} from "../../../../convex/_generated/api"

const app = new Hono()

// ─── Convex Client ───────────────────────────────────────────────────────────

const CONVEX_URL = process.env.CONVEX_URL || ""
const convex = CONVEX_URL ? new ConvexHttpClient(CONVEX_URL) : null

function getConvex(): ConvexHttpClient {
  if (!convex) {
    throw new Error("[openclaw] CONVEX_URL not configured")
  }
  return convex
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.post("/outbound", handleOutbound)

// ─── Handlers ────────────────────────────────────────────────────────────────

/**
 * POST /outbound — receives agent responses from the OpenClaw channel plugin.
 *
 * The clawed channel plugin calls this whenever the agent sends a message.
 * Auth: Bearer token must match the per-instance token we generated during provisioning.
 *
 * Body: { text, peerId, accountId, timestamp }
 *
 * peerId format: "<source>:<userId>" e.g. "web:user_abc123" or "glasses:user_abc123"
 * For hackathon: peerId is just the userId (shared context across all clients).
 *
 * Flow:
 *   1. Verify the auth token matches a known instance token
 *   2. Parse peerId to determine source (web vs glasses vs desktop)
 *   3. Write the agent message to Convex `chat_messages` table
 *   4. If source is "glasses", trigger TTS via the user's MentraOS session
 */
async function handleOutbound(c: Context) {
  const authHeader = c.req.header("Authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({error: "Missing or invalid authorization"}, 401)
  }

  const token = authHeader.split(" ")[1] ?? ""

  // Verify the token matches our expected gateway token
  // In production this would be per-instance, but for hackathon we use a shared token.
  // No fallback default — if the env var isn't set, the endpoint is closed.
  const expectedToken = process.env.OPENCLAW_GATEWAY_TOKEN
  if (!expectedToken || !token || token !== expectedToken) {
    console.warn(`[openclaw] outbound: invalid token (got ${token.slice(0, 8)}...)`)
    return c.json({error: "Invalid instance token"}, 401)
  }

  try {
    const payload = await c.req.json()
    const {text, peerId, accountId, timestamp} = payload

    if (!text || !peerId) {
      return c.json({error: "text and peerId are required"}, 400)
    }

    // Parse source and userId from peerId
    // Convention: "web:<userId>" or "glasses:<userId>" or just "<userId>"
    let source: "web" | "glasses" | "desktop" = "web"
    let userId = peerId
    if (peerId.includes(":")) {
      const parts = peerId.split(":")
      const parsedSource = parts[0]
      userId = parts.slice(1).join(":") // handle colons in userId
      if (parsedSource === "glasses" || parsedSource === "desktop" || parsedSource === "web") {
        source = parsedSource
      }
    }

    const db = getConvex()

    // ─── Find the instance for this user ─────────────────────────────────
    // For hackathon, we look up the user's running instances and pick the first one.
    // In production, the token would map directly to an instance.
    let instanceId: string | null = null
    try {
      const instances = await db.query(api.instances.listByUser, {user_id: userId})
      const running = instances.find((i: any) =>
        i.status === "running" || i.status === "starting"
      )
      if (running) {
        instanceId = running._id
      }
    } catch (err) {
      console.warn("[openclaw] failed to look up instance for user:", err)
    }

    if (!instanceId) {
      // If we can't find an instance, we still log it but can't save to Convex
      console.warn(`[openclaw] outbound: no running instance found for user ${userId} — message not saved`)
      return c.json({ok: true, saved: false, reason: "no running instance"})
    }

    // ─── Write agent message to Convex ───────────────────────────────────
    // This triggers real-time update in the frontend chat panel
    try {
      await db.mutation(api.chatMessages.insert, {
        user_id: userId,
        instance_id: instanceId,
        role: "agent",
        source,
        content: text,
        timestamp: timestamp ?? Date.now(),
      })
    } catch (err) {
      console.error("[openclaw] failed to write agent message to Convex:", err)
      return c.json({error: "Failed to save agent message"}, 500)
    }

    // ─── Glasses TTS ─────────────────────────────────────────────────────
    // If the original message came from glasses, speak the response aloud
    if (source === "glasses") {
      try {
        // Dynamic import to avoid circular deps and keep this file clean
        // UserSession manages live MentraOS AppSession connections
        const {UserSession} = await import("../session/UserSession")
        const session = UserSession.get(userId)
        if (session?.appSession) {
          await session.appSession.audio.speak(text)
          console.log(`[openclaw] TTS: spoke ${text.length} chars to glasses for user ${userId}`)
        } else {
          console.warn(`[openclaw] TTS: no active glasses session for user ${userId}`)
        }
      } catch (err) {
        // TTS failure is non-critical — the message is already saved
        console.warn("[openclaw] TTS failed (non-critical):", err)
      }
    }

    console.log(`[openclaw] outbound: source=${source} user=${userId} instance=${instanceId} text="${text.slice(0, 80)}${text.length > 80 ? "..." : ""}"`)

    return c.json({ok: true, saved: true})
  } catch (error) {
    console.error("[openclaw] failed to process outbound message:", error)
    return c.json({error: "Internal server error"}, 500)
  }
}

export default app
