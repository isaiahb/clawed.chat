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
import {ConvexHttpClient} from "convex/browser"
import {api} from "../../../../convex/_generated/api"

const app = new Hono()

// ─── Convex Client ───────────────────────────────────────────────────────────

const CONVEX_URL = process.env.CONVEX_URL || ""
const convex = CONVEX_URL ? new ConvexHttpClient(CONVEX_URL) : null

function getConvex(): ConvexHttpClient {
  if (!convex) {
    throw new Error("[desktop] CONVEX_URL not configured")
  }
  return convex
}

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
 * Body: { tunnel_url: "https://...", llm_provider?: string, gateway_port?: number }
 */
async function registerLocal(c: Context) {
  const auth = getAuth(c)
  if (!auth?.userId) {
    return c.json({error: "Unauthorized"}, 401)
  }

  let body: {tunnel_url?: string; llm_provider?: string; gateway_port?: number}
  try {
    body = await c.req.json()
  } catch {
    return c.json({error: "Invalid JSON body"}, 400)
  }

  const {tunnel_url, llm_provider = "anthropic", gateway_port = 18789} = body

  if (!tunnel_url) {
    return c.json({error: "tunnel_url is required"}, 400)
  }

  try {
    const db = getConvex()

    // Check if user already has a local instance that isn't destroyed
    const existing = await db.query(api.instances.listByUser, {user_id: auth.userId})
    const existingLocal = existing.find(
      (i) => i.type === "local" && i.status !== "destroyed",
    )

    if (existingLocal) {
      // Update the existing local instance — it may have restarted with a new tunnel
      await db.mutation(api.instances.updateDetails, {
        id: existingLocal._id,
        ip: tunnel_url,
        status: "running",
      })
      await db.mutation(api.instances.touch, {id: existingLocal._id})

      console.log(`[desktop] re-registered local instance for user=${auth.userId} tunnel=${tunnel_url}`)

      return c.json({
        success: true,
        instance_id: existingLocal._id,
        updated: true,
      })
    }

    // Create a new local instance record
    const validProviders = ["anthropic", "openai", "google", "minimax"] as const
    const provider = validProviders.includes(llm_provider as any)
      ? (llm_provider as (typeof validProviders)[number])
      : "anthropic"

    const instanceId = await db.mutation(api.instances.create, {
      user_id: auth.userId,
      type: "local",
      subdomain: `local-${auth.userId.slice(-8)}`,
      llm_provider: provider,
      status: "running",
    })

    // Store the tunnel URL as the IP so the dashboard can route to it
    await db.mutation(api.instances.updateDetails, {
      id: instanceId,
      ip: tunnel_url,
    })

    console.log(`[desktop] registered new local instance=${instanceId} for user=${auth.userId} tunnel=${tunnel_url} port=${gateway_port}`)

    return c.json({
      success: true,
      instance_id: instanceId,
      updated: false,
    })
  } catch (err: any) {
    console.error("[desktop] registerLocal error:", err.message)
    return c.json({error: "Failed to register local instance"}, 500)
  }
}

/**
 * POST /heartbeat — keep a local instance marked as running.
 *
 * The desktop app calls this every ~30 seconds. If heartbeats stop,
 * the instance is considered offline (dashboard can show a warning).
 *
 * Body: { instance_id?: string } — optional, otherwise we find the user's local instance
 */
async function heartbeat(c: Context) {
  const auth = getAuth(c)
  if (!auth?.userId) {
    return c.json({error: "Unauthorized"}, 401)
  }

  let body: {instance_id?: string} = {}
  try {
    body = await c.req.json()
  } catch {
    // body is optional for heartbeat
  }

  try {
    const db = getConvex()

    if (body.instance_id) {
      // Touch the specific instance (verify ownership)
      const instance = await db.query(api.instances.get, {id: body.instance_id as any})
      if (!instance) {
        return c.json({error: "Instance not found"}, 404)
      }
      if (instance.user_id !== auth.userId) {
        return c.json({error: "Not your instance"}, 403)
      }
      await db.mutation(api.instances.touch, {id: instance._id})
      return c.json({success: true, instance_id: instance._id})
    }

    // Find the user's local running instance and touch it
    const instances = await db.query(api.instances.listByUser, {user_id: auth.userId})
    const local = instances.find((i) => i.type === "local" && i.status === "running")

    if (!local) {
      return c.json({error: "No running local instance found"}, 404)
    }

    await db.mutation(api.instances.touch, {id: local._id})

    return c.json({success: true, instance_id: local._id})
  } catch (err: any) {
    console.error("[desktop] heartbeat error:", err.message)
    return c.json({error: "Heartbeat failed"}, 500)
  }
}

export default app
