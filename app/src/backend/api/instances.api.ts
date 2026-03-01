/**
 * Instances API — deploy, get, stop, destroy OpenClaw instances
 *
 * POST /create         → provision a new cloud instance
 * GET  /:id            → get instance details
 * POST /:id/stop       → stop (sleep) an instance
 * POST /:id/start      → start (wake) a sleeping instance
 * DELETE /:id          → destroy an instance permanently
 */

import {Hono} from "hono"
import type {Context} from "hono"
import {getAuth} from "@hono/clerk-auth"
import {ConvexHttpClient} from "convex/browser"
import {api} from "../../../../convex/_generated/api"
import * as instanceService from "../services/instance.service"

// ─── Convex Client ───────────────────────────────────────────────────────────

const CONVEX_URL = process.env.CONVEX_URL || ""
const convex = CONVEX_URL ? new ConvexHttpClient(CONVEX_URL) : null

function getConvex(): ConvexHttpClient {
  if (!convex) {
    throw new Error("[instances] CONVEX_URL not configured")
  }
  return convex
}

const app = new Hono()

// ─── Routes ──────────────────────────────────────────────────────────────────

app.post("/create", createInstance)
app.get("/:id", getInstance)
app.post("/:id/stop", stopInstance)
app.post("/:id/start", startInstance)
app.delete("/:id", destroyInstance)

// ─── Handlers ────────────────────────────────────────────────────────────────

/** POST /create — provision a new OpenClaw cloud instance */
async function createInstance(c: Context) {
  const auth = getAuth(c)
  if (!auth?.userId) {
    return c.json({error: "Unauthorized"}, 401)
  }

  const body = await c.req.json()
  const {llm_provider, api_key, managed} = body

  // Managed mode doesn't need an API key
  const isManaged = managed === true

  if (!isManaged && !api_key) {
    return c.json({error: "api_key is required for BYOK mode"}, 400)
  }

  const validProviders = ["anthropic", "openai", "google", "minimax"]
  if (!isManaged && !validProviders.includes(llm_provider)) {
    return c.json({error: `llm_provider must be one of: ${validProviders.join(", ")}`}, 400)
  }

  try {
    const result = await instanceService.deploy({
      userId: auth.userId,
      llmProvider: isManaged ? "anthropic" : llm_provider,
      apiKey: isManaged ? "" : api_key,
      managed: isManaged,
    })

    return c.json({
      instance_id: result.instanceId,
      subdomain: result.subdomain,
      status: result.status,
    }, 201)
  } catch (err: any) {
    console.error("[instances] deploy failed:", err.message)
    return c.json({error: err.message || "Deploy failed"}, 500)
  }
}

/** GET /:id — get instance details and current status */
async function getInstance(c: Context) {
  const auth = getAuth(c)
  if (!auth?.userId) {
    return c.json({error: "Unauthorized"}, 401)
  }

  const id = c.req.param("id")
  const db = getConvex()

  try {
    const instance = await db.query(api.instances.get, {id: id as any})

    if (!instance) {
      return c.json({error: "Instance not found"}, 404)
    }

    if (instance.user_id !== auth.userId) {
      return c.json({error: "Instance not found"}, 404)
    }

    return c.json({
      id: instance._id,
      status: instance.status,
      type: instance.type,
      subdomain: instance.subdomain,
      ip: instance.ip ?? null,
      llm_provider: instance.llm_provider,
      gcp_vm_name: instance.gcp_vm_name ?? null,
      browser_use_live_url: instance.browser_use_live_url ?? null,
      last_active_at: instance.last_active_at ?? null,
    })
  } catch (err: any) {
    console.error("[instances] get failed:", err.message)
    return c.json({error: "Failed to fetch instance"}, 500)
  }
}

/** POST /:id/stop — sleep an instance (VM stops, $0 compute) */
async function stopInstance(c: Context) {
  const auth = getAuth(c)
  if (!auth?.userId) {
    return c.json({error: "Unauthorized"}, 401)
  }

  const id = c.req.param("id")

  try {
    await instanceService.stop(id)
    return c.json({id, status: "stopping"})
  } catch (err: any) {
    console.error("[instances] stop failed:", err.message)
    return c.json({error: err.message || "Stop failed"}, 500)
  }
}

/** POST /:id/start — wake a sleeping instance */
async function startInstance(c: Context) {
  const auth = getAuth(c)
  if (!auth?.userId) {
    return c.json({error: "Unauthorized"}, 401)
  }

  const id = c.req.param("id")

  try {
    await instanceService.start(id)
    return c.json({id, status: "starting"})
  } catch (err: any) {
    console.error("[instances] start failed:", err.message)
    return c.json({error: err.message || "Start failed"}, 500)
  }
}

/** DELETE /:id — permanently destroy an instance and all its resources */
async function destroyInstance(c: Context) {
  const auth = getAuth(c)
  if (!auth?.userId) {
    return c.json({error: "Unauthorized"}, 401)
  }

  const id = c.req.param("id")

  try {
    await instanceService.destroy(id)
    return c.json({id, status: "destroying"})
  } catch (err: any) {
    console.error("[instances] destroy failed:", err.message)
    return c.json({error: err.message || "Destroy failed"}, 500)
  }
}

export default app
