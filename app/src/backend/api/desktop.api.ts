/**
 * Desktop API — ElectroBun companion app communication
 *
 * POST /register    → register a locally running OpenClaw instance
 * POST /heartbeat   → keep a local instance marked as 'running'
 *
 * The desktop app runs OpenClaw locally on the user's Mac and tunnels
 * back to clawed.chat so the dashboard can interact with it.
 *
 * Reference: Design Doc 05
 */

import {Hono} from "hono"
import type {Context} from "hono"
import {getAuth} from "@hono/clerk-auth"

const app = new Hono()

// ─── Routes ──────────────────────────────────────────────────────────────────

app.post("/register", registerLocal)
app.post("/heartbeat", heartbeat)

// ─── Handlers ────────────────────────────────────────────────────────────────

/**
 * POST /register — register a local OpenClaw instance with the backend.
 *
 * Called by the ElectroBun desktop app after it starts OpenClaw locally.
 * Creates a "local" type instance in Convex so the dashboard can see it.
 *
 * Body: { tunnel_url: "https://...", gateway_port?: number }
 */
async function registerLocal(c: Context) {
  const auth = getAuth(c)
  if (!auth?.userId) {
    return c.json({error: "Unauthorized"}, 401)
  }

  const {tunnel_url, gateway_port = 18789} = await c.req.json()

  if (!tunnel_url) {
    return c.json({error: "tunnel_url is required"}, 400)
  }

  // TODO: Create or update a "local" instance record in Convex
  // const instanceId = await convex.mutation("instances:create", {
  //   user_id: auth.userId,
  //   type: "local",
  //   subdomain: `local-${auth.userId}`,
  //   llm_provider: "anthropic",
  //   status: "running",
  // })
  //
  // TODO: Store the tunnel URL so the dashboard can route to it
  // await convex.mutation("instances:updateDetails", {
  //   id: instanceId,
  //   ip: tunnel_url,
  // })

  return c.json({success: true})
}

/**
 * POST /heartbeat — keep a local instance marked as running.
 *
 * The desktop app calls this every ~30 seconds. If heartbeats stop,
 * the instance is considered offline (dashboard can show a warning).
 */
async function heartbeat(c: Context) {
  const auth = getAuth(c)
  if (!auth?.userId) {
    return c.json({error: "Unauthorized"}, 401)
  }

  // TODO: Find the user's local instance and touch last_active_at
  // const instances = await convex.query("instances:listByUser", {user_id: auth.userId})
  // const local = instances.find((i) => i.type === "local" && i.status === "running")
  //
  // if (local) {
  //   await convex.mutation("instances:touch", {id: local._id})
  // }

  return c.json({success: true})
}

export default app
