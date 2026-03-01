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

const app = new Hono()

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
 *   1. Verify the auth token matches an active instance
 *   2. Parse peerId to determine source (web vs glasses vs desktop)
 *   3. Write the agent message to Convex `chat_messages` table
 *   4. If source is "glasses", trigger TTS via the user's MentraOS session
 */
async function handleOutbound(c: Context) {
  const authHeader = c.req.header("Authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({error: "Missing or invalid authorization"}, 401)
  }

  const token = authHeader.split(" ")[1]

  try {
    const payload = await c.req.json()
    const {text, peerId, accountId, timestamp} = payload

    if (!text || !peerId) {
      return c.json({error: "text and peerId are required"}, 400)
    }

    // TODO: Verify the token matches an active instance in Convex
    // const instance = await convex.query("instances:getByToken", {token})
    // if (!instance) {
    //   return c.json({error: "Unknown instance token"}, 401)
    // }

    // Parse source from peerId
    // Convention: "web:<userId>" or "glasses:<userId>" or just "<userId>"
    let source = "web"
    let userId = peerId
    if (peerId.includes(":")) {
      const parts = peerId.split(":")
      source = parts[0]
      userId = parts[1]
    }

    // TODO: Write the agent message to Convex `chat_messages`
    // await convex.mutation("chatMessages:insert", {
    //   user_id: userId,
    //   instance_id: instance._id,
    //   role: "agent",
    //   source,
    //   content: text,
    //   timestamp: timestamp ?? Date.now(),
    // })

    // TODO: If source is glasses, speak the response aloud via MentraOS
    // if (source === "glasses") {
    //   const session = UserSession.get(userId)
    //   if (session?.appSession) {
    //     await session.appSession.audio.speak(text)
    //   }
    // }

    console.log(`[openclaw] outbound: source=${source} user=${userId} text="${text.slice(0, 80)}..."`)

    return c.json({ok: true})
  } catch (error) {
    console.error("[openclaw] failed to process outbound message:", error)
    return c.json({error: "Internal server error"}, 500)
  }
}

export default app
