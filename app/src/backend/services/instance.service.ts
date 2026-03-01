/**
 * InstanceService — orchestrates the full OpenClaw instance lifecycle
 *
 * This is the main coordinator. API routes call these functions,
 * and they in turn call the other services (Pulumi, DNS, Browser Use, Convex).
 *
 * HACKATHON MODE:
 *   For the demo, deploy() assigns the pre-existing openclaw-agent VM
 *   to the user instead of spinning up new infrastructure via Pulumi.
 *   The VM is already running with the gateway + channel plugin + Anthropic key.
 *   This gives instant "deploy" (~0 seconds) instead of ~8-10 min first boot.
 *
 *   Set HACKATHON_MODE=true in .env to enable this behavior.
 *   When disabled, the normal Pulumi provisioning flow runs.
 *
 * Normal flow for deploy:
 *   1. Create instance record in Convex (status: "provisioning")
 *   2. Generate subdomain from user info
 *   3. Kick off Pulumi Automation API (VM + DNS) — async
 *   4. Pulumi creates VM + DNS, returns IP + tokens
 *   5. Update Convex with VM details (ip, vm_name, tokens, status: "running")
 *
 * Flow for stop (sleep):
 *   1. Update Convex status to "stopping"
 *   2. Call GCP Compute Engine instances.stop() via Pulumi helper
 *   3. Update Convex status to "stopped"
 *
 * Flow for start (wake):
 *   1. Update Convex status to "starting"
 *   2. Call GCP Compute Engine instances.start() via Pulumi helper
 *   3. Wait for gateway to become reachable
 *   4. Update Convex status to "running"
 *
 * Flow for destroy:
 *   1. Update Convex status to "destroying"
 *   2. Call Pulumi stack.destroy() (removes VM, DNS — everything)
 *   3. Update Convex status to "destroyed"
 */

import {ConvexHttpClient} from "convex/browser"
import {api} from "../../../../convex/_generated/api"
import * as openclaw from "./openclaw.service"
import * as browseruse from "./browseruse.service"

// Lazy-load Pulumi — uses node:v8 internally which Bun doesn't support at import time
const getPulumi = () => import("./instance.pulumi")

// ─── Hackathon Mode ──────────────────────────────────────────────────────────
//
// When HACKATHON_MODE=true, deploy() assigns the pre-existing openclaw-agent VM
// instead of spinning up new infrastructure. Instant deploy for the demo.

const HACKATHON_MODE = process.env.HACKATHON_MODE === "true"
const HACKATHON_VM_IP = process.env.OPENCLAW_GATEWAY_URL
  ? new URL(process.env.OPENCLAW_GATEWAY_URL).hostname
  : "10.138.0.3"
const HACKATHON_VM_NAME = "openclaw-agent"
const HACKATHON_VM_ZONE = "us-west1-a"

// ─── Convex Client ───────────────────────────────────────────────────────────

const CONVEX_URL = process.env.CONVEX_URL || ""
const convex = CONVEX_URL ? new ConvexHttpClient(CONVEX_URL) : null

function getConvex(): ConvexHttpClient {
  if (!convex) {
    throw new Error("[instance] CONVEX_URL not configured")
  }
  return convex
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DeployConfig {
  /** Clerk user ID */
  userId: string
  /** LLM provider — "anthropic", "openai", "google", "minimax" */
  llmProvider: "anthropic" | "openai" | "google" | "minimax"
  /** User's LLM API key (BYOK) — empty for managed mode */
  apiKey: string
  /** Whether to use managed credits (our LLM proxy) instead of BYOK */
  managed: boolean
}

export interface DeployResult {
  instanceId: string
  subdomain: string
  status: "provisioning"
}

// ─── Deploy ──────────────────────────────────────────────────────────────────

/**
 * Deploy a new OpenClaw cloud instance for a user.
 *
 * Returns immediately with instance_id — provisioning happens async.
 * The dashboard subscribes to Convex real-time updates to show progress.
 */
export async function deploy(config: DeployConfig): Promise<DeployResult> {
  const {userId, llmProvider, apiKey, managed} = config
  const db = getConvex()

  // ── Hackathon Mode: assign existing VM instantly ─────────────────────
  if (HACKATHON_MODE) {
    return deployHackathon(config)
  }

  // ── Normal Mode: provision new VM via Pulumi ─────────────────────────

  // Generate a clean subdomain
  const subdomain = generateSubdomain(userId)
  const fullSubdomain = `${subdomain}.clawed.chat`

  // Step 1: Create instance record in Convex
  const instanceId = await db.mutation(api.instances.create, {
    user_id: userId,
    type: "cloud",
    subdomain: fullSubdomain,
    llm_provider: managed ? "anthropic" : llmProvider,
    status: "provisioning",
  })

  console.log(`[instance] deploy started: user=${userId} instance=${instanceId} subdomain=${fullSubdomain} managed=${managed}`)

  // Step 2: Kick off Pulumi async (fire-and-forget)
  // The dashboard sees real-time updates via Convex subscription
  provisionAsync(instanceId, userId, {
    llmProvider: managed ? "anthropic" : llmProvider,
    apiKey: managed ? "" : apiKey,
    managed,
    subdomain,
  }).catch(async (err) => {
    console.error(`[instance] provision failed: instance=${instanceId}`, err)
    try {
      await db.mutation(api.instances.updateStatus, {
        id: instanceId,
        status: "error",
      })
    } catch (convexErr) {
      console.error(`[instance] failed to update error status:`, convexErr)
    }
  })

  return {
    instanceId,
    subdomain: fullSubdomain,
    status: "provisioning",
  }
}

// ─── Hackathon Deploy ────────────────────────────────────────────────────────

/**
 * Hackathon mode deploy — assigns the existing openclaw-agent VM to the user.
 * No Pulumi, no new VM, no waiting. Instant "deploy".
 *
 * If the user already has an instance, returns it.
 * If not, creates a new record pointing at the shared VM.
 */
async function deployHackathon(config: DeployConfig): Promise<DeployResult> {
  const {userId, llmProvider, managed} = config
  const db = getConvex()

  // Check if user already has an instance
  const existing = await db.query(api.instances.listByUser, {user_id: userId})
  if (existing.length > 0) {
    const inst = existing[0]
    console.log(`[instance] hackathon: user already has instance ${inst._id}`)
    return {
      instanceId: inst._id,
      subdomain: inst.subdomain,
      status: "provisioning", // frontend expects this
    }
  }

  const subdomain = `demo-${generateSubdomain(userId)}`
  const fullSubdomain = `${subdomain}.clawed.chat`

  // Create instance record pointing at the shared hackathon VM
  const instanceId = await db.mutation(api.instances.create, {
    user_id: userId,
    type: "cloud",
    subdomain: fullSubdomain,
    llm_provider: managed ? "anthropic" : llmProvider,
    status: "provisioning",
  })

  // Immediately set it to running with the shared VM details
  await db.mutation(api.instances.updateDetails, {
    id: instanceId,
    ip: HACKATHON_VM_IP,
    gcp_vm_name: HACKATHON_VM_NAME,
    gcp_zone: HACKATHON_VM_ZONE,
    status: "running",
  })

  await db.mutation(api.instances.touch, {id: instanceId})

  console.log(`[instance] hackathon deploy: user=${userId} instance=${instanceId} → ${HACKATHON_VM_NAME} (${HACKATHON_VM_IP})`)

  return {
    instanceId,
    subdomain: fullSubdomain,
    status: "provisioning",
  }
}

// ─── Stop (Sleep) ────────────────────────────────────────────────────────────

/**
 * Stop (sleep) an instance — VM halts, $0 compute cost, disk preserved.
 * Resume with start(). Takes effect in ~10-15 seconds.
 */
export async function stop(instanceId: string): Promise<void> {
  const db = getConvex()

  // Fetch instance details
  const instance = await db.query(api.instances.get, {id: instanceId as any})
  if (!instance) throw new Error(`[instance] not found: ${instanceId}`)
  if (!instance.gcp_vm_name) throw new Error(`[instance] no VM name for: ${instanceId}`)

  console.log(`[instance] stopping: ${instanceId} vm=${instance.gcp_vm_name}`)

  // Update status
  await db.mutation(api.instances.updateStatus, {
    id: instanceId as any,
    status: "stopping",
  })

  try {
    // Call GCP to stop the VM
    const pulumi = await getPulumi()
    await pulumi.stopVM(instance.gcp_vm_name, instance.gcp_zone || undefined)

    // Wait a bit for the stop to take effect
    await sleep(5000)

    // Update status to stopped
    await db.mutation(api.instances.updateStatus, {
      id: instanceId as any,
      status: "stopped",
    })

    console.log(`[instance] stopped: ${instanceId}`)
  } catch (err) {
    console.error(`[instance] stop failed: ${instanceId}`, err)
    await db.mutation(api.instances.updateStatus, {
      id: instanceId as any,
      status: "error",
    })
    throw err
  }
}

// ─── Start (Wake) ────────────────────────────────────────────────────────────

/**
 * Start (wake) a sleeping instance — VM resumes in ~30-45 seconds.
 * Called explicitly or auto-triggered when a chat message arrives for a sleeping instance.
 */
export async function start(instanceId: string): Promise<void> {
  const db = getConvex()

  // Fetch instance details
  const instance = await db.query(api.instances.get, {id: instanceId as any})
  if (!instance) throw new Error(`[instance] not found: ${instanceId}`)
  if (!instance.gcp_vm_name) throw new Error(`[instance] no VM name for: ${instanceId}`)
  if (!instance.ip) throw new Error(`[instance] no IP for: ${instanceId}`)

  console.log(`[instance] starting: ${instanceId} vm=${instance.gcp_vm_name}`)

  // Update status
  await db.mutation(api.instances.updateStatus, {
    id: instanceId as any,
    status: "starting",
  })

  try {
    // Call GCP to start the VM
    const pulumi = await getPulumi()
    await pulumi.startVM(instance.gcp_vm_name, instance.gcp_zone || undefined)

    // Wait for the OpenClaw gateway to become reachable
    await openclaw.waitForGateway(instance.ip)

    // Re-create Browser Use session if needed (old one may have expired while stopped)
    try {
      const session = await browseruse.ensureSession(instance.browser_use_session_id)
      if (session.browserId !== instance.browser_use_session_id) {
        await db.mutation(api.instances.updateDetails, {
          id: instanceId as any,
          browser_use_session_id: session.browserId,
          browser_use_live_url: session.liveUrl,
        })
        console.log(`[instance] new Browser Use session on start: browserId=${session.browserId}`)
      }
    } catch (buErr: any) {
      console.warn(`[instance] Browser Use session refresh failed (non-fatal): ${buErr.message}`)
    }

    // Update status to running
    await db.mutation(api.instances.updateStatus, {
      id: instanceId as any,
      status: "running",
    })

    // Touch last_active_at
    await db.mutation(api.instances.touch, {id: instanceId as any})

    console.log(`[instance] started: ${instanceId}`)
  } catch (err) {
    console.error(`[instance] start failed: ${instanceId}`, err)
    await db.mutation(api.instances.updateStatus, {
      id: instanceId as any,
      status: "error",
    })
    throw err
  }
}

// ─── Destroy ─────────────────────────────────────────────────────────────────

/**
 * Permanently destroy an instance — removes VM, DNS record, all resources.
 * This is irreversible.
 */
export async function destroy(instanceId: string): Promise<void> {
  const db = getConvex()

  // Fetch instance details
  const instance = await db.query(api.instances.get, {id: instanceId as any})
  if (!instance) throw new Error(`[instance] not found: ${instanceId}`)

  console.log(`[instance] destroying: ${instanceId}`)

  // Update status
  await db.mutation(api.instances.updateStatus, {
    id: instanceId as any,
    status: "destroying",
  })

  try {
    // Destroy Browser Use session if one exists (best-effort)
    if (instance.browser_use_session_id) {
      try {
        await browseruse.destroySession(instance.browser_use_session_id)
      } catch (buErr: any) {
        console.warn(`[instance] Browser Use cleanup failed (non-fatal): ${buErr.message}`)
      }
    }

    // Destroy the Pulumi stack (VM + DNS)
    const pulumi = await getPulumi()
    await pulumi.destroyStack(instance.user_id)

    // Clear chat messages for this instance
    await db.mutation(api.chatMessages.clearByInstance, {
      instance_id: instanceId,
    })

    // Mark as destroyed in Convex
    await db.mutation(api.instances.markDestroyed, {
      id: instanceId as any,
    })

    console.log(`[instance] destroyed: ${instanceId}`)
  } catch (err) {
    console.error(`[instance] destroy failed: ${instanceId}`, err)
    await db.mutation(api.instances.updateStatus, {
      id: instanceId as any,
      status: "error",
    })
    throw err
  }
}

// ─── Async Provisioning ──────────────────────────────────────────────────────

/**
 * Async provisioning — runs Pulumi, updates Convex at each step.
 * Called by deploy() as fire-and-forget.
 */
async function provisionAsync(
  instanceId: string,
  userId: string,
  config: {
    llmProvider: string
    apiKey: string
    managed: boolean
    subdomain: string
  },
): Promise<void> {
  const db = getConvex()

  console.log(`[instance] provisioning: instance=${instanceId} user=${userId}`)

  // Run Pulumi Automation API
  const pulumi = await getPulumi()
  const result = await pulumi.deployStack(userId, {
    llmProvider: config.llmProvider,
    apiKey: config.apiKey,
    managed: config.managed,
    subdomain: config.subdomain,
  })

  console.log(`[instance] VM created: ip=${result.ip} vm=${result.vmName}`)

  // Update Convex with VM details
  await db.mutation(api.instances.updateDetails, {
    id: instanceId as any,
    ip: result.ip,
    gcp_vm_name: result.vmName,
    gcp_zone: process.env.GCP_ZONE || "us-west1-a",
    status: "running",
  })

  // Step 3: Create a Browser Use session (best-effort — don't fail deploy if this errors)
  try {
    const session = await browseruse.createSession("us")
    console.log(`[instance] Browser Use session created: browserId=${session.browserId} liveUrl=${session.liveUrl}`)

    await db.mutation(api.instances.updateDetails, {
      id: instanceId as any,
      browser_use_session_id: session.browserId,
      browser_use_live_url: session.liveUrl,
    })
  } catch (buErr: any) {
    // Browser Use is a nice-to-have — don't fail the entire deploy
    console.warn(`[instance] Browser Use session creation failed (non-fatal): ${buErr.message}`)
  }

  // Touch last_active_at
  await db.mutation(api.instances.touch, {id: instanceId as any})

  console.log(`[instance] provisioning complete: instance=${instanceId} ip=${result.ip}`)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generate a subdomain from a userId.
 * For hackathon, create a short clean slug.
 * Production would need collision detection + Convex uniqueness check.
 */
function generateSubdomain(userId: string): string {
  // Clerk user IDs look like "user_2abc123def"
  // Take the last 8 chars for a short unique slug
  const slug = userId
    .replace(/^user_/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(-8)

  return slug || `u${Date.now().toString(36)}`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
