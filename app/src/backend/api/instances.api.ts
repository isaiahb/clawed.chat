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
  const {llm_provider, api_key} = await c.req.json()

  if (!llm_provider) return c.json({error: "llm_provider is required"}, 400)
  if (!api_key) return c.json({error: "api_key is required"}, 400)

  // TODO: get authenticated user from Clerk
  // TODO: call instance.service.ts → deploy() which:
  //   1. creates instance record in Convex (status: "provisioning")
  //   2. kicks off Pulumi Automation API async (fire-and-forget)
  //   3. Pulumi updates Convex at each milestone
  //   4. returns immediately with instance_id + status

  return c.json({
    instance_id: "TODO",
    subdomain: "TODO.clawed.chat",
    status: "provisioning",
  }, 201)
}

/** GET /:id — get instance details and current status */
async function getInstance(c: Context) {
  const id = c.req.param("id")

  // TODO: fetch instance from Convex by id
  // TODO: verify requesting user owns this instance
  // TODO: return full instance record including:
  //   id, status, subdomain, ip, browser_use_live_url, last_active_at, created_at

  return c.json({
    id,
    status: "TODO",
    subdomain: "TODO.clawed.chat",
    ip: null,
    browser_use_live_url: null,
    last_active_at: null,
    created_at: null,
  })
}

/** POST /:id/stop — sleep an instance (VM stops, $0 compute) */
async function stopInstance(c: Context) {
  const id = c.req.param("id")

  // TODO: verify user owns instance
  // TODO: call instance.service.ts → stop() which:
  //   1. calls GCP Compute Engine instances.stop()
  //   2. updates Convex status to "stopped"

  return c.json({id, status: "stopped"})
}

/** POST /:id/start — wake a sleeping instance (~30-45s resume) */
async function startInstance(c: Context) {
  const id = c.req.param("id")

  // TODO: verify user owns instance
  // TODO: call instance.service.ts → start() which:
  //   1. calls GCP Compute Engine instances.start()
  //   2. updates Convex status to "starting"
  //   3. polls until VM is running, then updates to "running"

  return c.json({id, status: "starting"})
}

/** DELETE /:id — permanently destroy an instance and all its resources */
async function destroyInstance(c: Context) {
  const id = c.req.param("id")

  // TODO: verify user owns instance
  // TODO: call instance.service.ts → destroy() which:
  //   1. calls Pulumi stack.destroy() (removes VM, DNS, firewall rules)
  //   2. updates Convex status to "destroyed"
  //   3. optionally cleans up Browser Use session

  return c.json({id, status: "destroyed"})
}

export default app
