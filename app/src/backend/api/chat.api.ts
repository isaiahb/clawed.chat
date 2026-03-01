/**
 * Chat API — proxy messages to OpenClaw instances
 *
 * POST /:instanceId    → send a message to an OpenClaw instance and get response
 */

import {Hono} from "hono"
import type {Context} from "hono"

const app = new Hono()

// ─── Routes ──────────────────────────────────────────────────────────────────

app.post("/:instanceId", sendMessage)

// ─── Handlers ────────────────────────────────────────────────────────────────

/** POST /:instanceId — send a message to the user's OpenClaw agent */
async function sendMessage(c: Context) {
  const instanceId = c.req.param("instanceId")
  const {message} = await c.req.json()

  if (!message) return c.json({error: "message is required"}, 400)

  // TODO: verify user owns this instance
  // TODO: fetch instance from Convex to get IP + status
  // TODO: if instance is sleeping, wake it first (call instance.service.ts → start())
  // TODO: call openclaw.service.ts → sendMessage() which:
  //   1. opens a short-lived WebSocket to ws://<vm_ip>:18789
  //   2. sends the message via OpenClaw's gateway protocol
  //   3. waits for the agent response
  //   4. closes the connection
  //   5. updates last_active_at in Convex
  // TODO: return the agent's response

  return c.json({
    instance_id: instanceId,
    message,
    response: "TODO — proxy to OpenClaw gateway",
  })
}

export default app
