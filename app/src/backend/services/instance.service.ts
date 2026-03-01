/**
 * InstanceService — orchestrates the full OpenClaw instance lifecycle
 *
 * This is the main coordinator. API routes call these functions,
 * and they in turn call the other services (Pulumi, DNS, Browser Use, Convex).
 *
 * Flow for deploy:
 *   1. Create instance record in Convex (status: "provisioning")
 *   2. Create Browser Use session (get cdpUrl + live_url)
 *   3. Kick off Pulumi Automation API (VM + DNS) — async, fire-and-forget
 *   4. Pulumi updates Convex at each milestone (vm_created, dns_set, running)
 *   5. Return immediately with instance_id + status
 *
 * Flow for stop (sleep):
 *   1. Update Convex status to "stopping"
 *   2. Call GCP Compute Engine instances.stop()
 *   3. Update Convex status to "stopped"
 *
 * Flow for start (wake):
 *   1. Update Convex status to "starting"
 *   2. Call GCP Compute Engine instances.start()
 *   3. Poll until VM is running
 *   4. Update Convex status to "running"
 *
 * Flow for destroy:
 *   1. Update Convex status to "destroying"
 *   2. Call Pulumi stack.destroy() (removes VM, DNS, firewall — everything)
 *   3. Tear down Browser Use session
 *   4. Update Convex status to "destroyed"
 */

// TODO: import {ConvexHttpClient} from "convex/browser"
// TODO: import * as pulumi from "./instance.pulumi"
// TODO: import * as browseruse from "./browseruse.service"
// TODO: import * as dns from "./dns.service"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DeployConfig {
  userId: string
  llmProvider: "anthropic" | "openai" | "google" | "minimax"
  apiKey: string
}

export interface DeployResult {
  instanceId: string
  subdomain: string
  status: "provisioning"
}

export interface InstanceStatus {
  id: string
  status: "provisioning" | "running" | "stopped" | "stopping" | "starting" | "destroying" | "destroyed" | "error"
  subdomain: string
  ip: string | null
  browserUseLiveUrl: string | null
  lastActiveAt: string | null
  createdAt: string
}

// ─── Deploy ──────────────────────────────────────────────────────────────────

/**
 * Deploy a new OpenClaw cloud instance for a user.
 *
 * Returns immediately with instance_id — provisioning happens async.
 * The dashboard subscribes to Convex real-time updates to show progress.
 */
export async function deploy(config: DeployConfig): Promise<DeployResult> {
  const {userId, llmProvider, apiKey} = config

  // TODO: Step 1 — create instance record in Convex
  //   const instanceId = await convex.mutation(api.instances.create, {
  //     userId,
  //     type: "cloud",
  //     llmProvider,
  //     status: "provisioning",
  //     subdomain: generateSubdomain(userId),
  //   })

  // TODO: Step 2 — create Browser Use session
  //   const browserSession = await browseruse.createSession()
  //   await convex.mutation(api.instances.update, {
  //     id: instanceId,
  //     browserUseSessionId: browserSession.browserId,
  //     browserUseLiveUrl: browserSession.liveUrl,
  //   })

  // TODO: Step 3 — kick off Pulumi async (fire-and-forget)
  //   provisionAsync(instanceId, userId, {
  //     llmProvider,
  //     apiKey,
  //     cdpUrl: browserSession.cdpUrl,
  //   }).catch((err) => {
  //     console.error(`[instance] provision failed: instance=${instanceId}`, err)
  //     convex.mutation(api.instances.updateStatus, {id: instanceId, status: "error"})
  //   })

  const subdomain = `${userId}.clawed.chat`

  console.log(`[instance] deploy started: user=${userId} subdomain=${subdomain}`)

  return {
    instanceId: "TODO",
    subdomain,
    status: "provisioning",
  }
}

// ─── Stop (Sleep) ────────────────────────────────────────────────────────────

/**
 * Stop (sleep) an instance — VM halts, $0 compute cost, disk preserved.
 * Resume with start(). Takes effect in ~10-15 seconds.
 */
export async function stop(instanceId: string): Promise<void> {
  // TODO: fetch instance from Convex to get gcp_vm_name + gcp_zone
  // TODO: update Convex status to "stopping"
  // TODO: call GCP Compute Engine:
  //   await compute.instances.stop({project: GCP_PROJECT, zone, instance: vmName})
  // TODO: update Convex status to "stopped"

  console.log(`[instance] stop: instance=${instanceId}`)
}

// ─── Start (Wake) ────────────────────────────────────────────────────────────

/**
 * Start (wake) a sleeping instance — VM resumes in ~30-45 seconds.
 * Called explicitly or auto-triggered when a chat message arrives for a sleeping instance.
 */
export async function start(instanceId: string): Promise<void> {
  // TODO: fetch instance from Convex to get gcp_vm_name + gcp_zone
  // TODO: update Convex status to "starting"
  // TODO: call GCP Compute Engine:
  //   await compute.instances.start({project: GCP_PROJECT, zone, instance: vmName})
  // TODO: poll until VM status is RUNNING (with timeout)
  // TODO: update Convex status to "running"

  console.log(`[instance] start: instance=${instanceId}`)
}

// ─── Destroy ─────────────────────────────────────────────────────────────────

/**
 * Permanently destroy an instance — removes VM, DNS record, firewall rules.
 * This is irreversible.
 */
export async function destroy(instanceId: string): Promise<void> {
  // TODO: fetch instance from Convex to get userId (for Pulumi stack name)
  // TODO: update Convex status to "destroying"
  // TODO: call Pulumi stack.destroy() via instance.pulumi.ts
  // TODO: tear down Browser Use session via browseruse.service.ts
  // TODO: update Convex status to "destroyed"

  console.log(`[instance] destroy: instance=${instanceId}`)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Async provisioning — runs Pulumi, updates Convex at each step.
 * Called by deploy() as fire-and-forget.
 */
async function provisionAsync(
  instanceId: string,
  userId: string,
  config: {llmProvider: string, apiKey: string, cdpUrl: string},
): Promise<void> {
  // TODO: Step 1 — run Pulumi Automation API (instance.pulumi.ts)
  //   const result = await pulumi.deployStack(userId, {
  //     cdpUrl: config.cdpUrl,
  //     llmProvider: config.llmProvider,
  //     apiKey: config.apiKey,
  //   })

  // TODO: Step 2 — update Convex with VM details
  //   await convex.mutation(api.instances.update, {
  //     id: instanceId,
  //     ip: result.ip,
  //     gcpVmName: result.vmName,
  //     gcpZone: GCP_ZONE,
  //     status: "running",
  //   })

  console.log(`[instance] provision complete: instance=${instanceId} user=${userId}`)
}

/**
 * Generate a subdomain from a userId. For hackathon, just use a slug.
 * Production would need collision detection + Convex uniqueness check.
 */
function generateSubdomain(userId: string): string {
  // TODO: generate a clean slug from Clerk user data (name, email, etc.)
  // For now, just sanitize the userId
  return userId.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 32)
}
