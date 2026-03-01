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

const app = new Hono()

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

  // TODO: Verify user owns this instance
  // const instance = await convex.query("instances:get", {id: instanceId})
  // if (!instance || instance.user_id !== auth.userId) {
  //   return c.json({error: "Instance not found"}, 404)
  // }

  // TODO: If instance is sleeping, wake it first
  // if (instance.status === "stopped") {
  //   await instanceService.start(instanceId)
  //   await openclawService.waitForGateway(instance.ip)
  // }

  // TODO: Write user's message to Convex `chat_messages` immediately
  // await convex.mutation("chatMessages:insert", {
  //   user_id: auth.userId,
  //   instance_id: instanceId,
  //   role: "user",
  //   source,
  //   content: message,
  //   timestamp: Date.now(),
  // })

  // TODO: Dispatch to OpenClaw via Gateway RPC
  // The agent's response will arrive asynchronously via:
  //   channel plugin sendText → POST /api/openclaw/outbound → Convex → frontend
  //
  // import {sendMessage as openclawSend} from "../services/openclaw.service"
  //
  // try {
  //   const result = await openclawSend({
  //     ip: instance.ip,
  //     token: instance.gateway_token,
  //     text: message,
  //     userId: auth.userId,
  //     source,
  //   })
  //   console.log(`[chat] dispatched to OpenClaw: session=${result.sessionKey}`)
  // } catch (err) {
  //   console.error(`[chat] failed to dispatch to OpenClaw:`, err)
  //   return c.json({error: "Failed to send message to agent"}, 502)
  // }

  // TODO: Touch last_active_at
  // await convex.mutation("instances:touch", {id: instanceId})

  return c.json({
    success: true,
    message: "Message sent to agent",
  })
}

export default app
