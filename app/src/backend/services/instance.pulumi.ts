/**
 * instance.pulumi.ts — inline Pulumi program for per-user infrastructure
 *
 * Defines the infrastructure each clawed.chat user gets:
 *   - GCP Compute Engine VM (from pre-baked image with OpenClaw installed)
 *   - Cloudflare DNS A record (<subdomain>.clawed.chat → VM IP)
 *
 * Used by instance.service.ts via Pulumi Automation API.
 * Each user gets their own isolated Pulumi stack.
 *
 * References:
 *   - Pulumi Automation API: https://www.pulumi.com/automation/
 *   - Pulumi GCP Provider: https://www.pulumi.com/registry/packages/gcp/
 *   - Pulumi Cloudflare Provider: https://www.pulumi.com/registry/packages/cloudflare/
 */

// @ts-ignore — Pulumi types resolve at runtime via Bun but TS can't find them in workspace
import * as automation from "@pulumi/pulumi/automation"
// @ts-ignore
import * as pulumi from "@pulumi/pulumi"
// @ts-ignore
import * as gcp from "@pulumi/gcp"
// @ts-ignore
import * as cloudflare from "@pulumi/cloudflare"
import * as crypto from "crypto"
import * as fs from "fs"

// ─── Config ──────────────────────────────────────────────────────────────────

const GCP_PROJECT = process.env.GCP_PROJECT || "clawed-chat"
const GCP_ZONE = process.env.GCP_ZONE || "us-west1-a"
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID || ""
const BROWSER_USE_API_KEY = process.env.BROWSER_USE_API_KEY || ""
const PUBLIC_URL = process.env.PUBLIC_URL || "https://clawed.chat"

/** Pre-baked GCP image family — always gets the latest image in the family */
const VM_IMAGE_FAMILY = "openclaw-base"

/** Machine type — e2-small is $15/mo always-on, ~$3-5/mo with sleep/wake */
const MACHINE_TYPE = "e2-small"

/** Boot disk size in GB */
const DISK_SIZE_GB = 20

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PulumiDeployConfig {
  /** LLM provider to configure in openclaw.json */
  llmProvider: string
  /** User's LLM API key (BYOK) — empty string for managed mode */
  apiKey: string
  /** Whether this is a managed instance (uses our LLM proxy) */
  managed: boolean
  /** The subdomain for this instance (e.g., "alice" for alice.clawed.chat) */
  subdomain: string
  /** Browser Use Cloud CDP WebSocket URL (optional — created separately) */
  cdpUrl?: string
}

export interface PulumiDeployResult {
  /** External IP address of the VM */
  ip: string
  /** GCP VM instance name */
  vmName: string
  /** Gateway auth token for this instance */
  gatewayToken: string
  /** Instance auth token (for channel plugin + LLM proxy auth) */
  instanceToken: string
}

// ─── Startup Script ──────────────────────────────────────────────────────────

/**
 * Reads the startup script template from scripts/bake-image/startup-script.sh.
 *
 * The template is injected as GCP instance metadata. It reads per-instance
 * config from GCP metadata attributes at boot time and writes openclaw.json.
 */
function loadStartupScript(): string {
  // Try to load from the repo — works in dev and when deployed alongside the repo
  const paths = [
    "scripts/bake-image/startup-script.sh",
    "../../../scripts/bake-image/startup-script.sh",
    `${process.cwd()}/scripts/bake-image/startup-script.sh`,
  ]

  for (const p of paths) {
    try {
      return fs.readFileSync(p, "utf-8")
    } catch {
      // Try next path
    }
  }

  // Fallback: minimal inline startup script
  console.warn("[pulumi] Could not find startup-script.sh, using minimal fallback")
  return `#!/bin/bash
set -euo pipefail
echo "[startup] WARNING: Using fallback startup script"
METADATA_URL="http://metadata.google.internal/computeMetadata/v1/instance/attributes"
METADATA_HEADER="Metadata-Flavor: Google"
fetch_meta() { curl -sf "\${METADATA_URL}/\$1" -H "\$METADATA_HEADER" 2>/dev/null || echo ""; }
GATEWAY_TOKEN=$(fetch_meta "gateway-token")
LLM_API_KEY=$(fetch_meta "llm-api-key")
LLM_PROVIDER=$(fetch_meta "llm-provider")
cat > /home/openclaw/.openclaw/openclaw.json << EOF
{
  "gateway": {"port": 18789, "mode": "local", "bind": "lan", "auth": {"mode": "token", "token": "\${GATEWAY_TOKEN}"}},
  "agents": {"defaults": {"model": {"primary": "\${LLM_PROVIDER}/claude-sonnet-4-5"}}},
  "models": {"providers": {"\${LLM_PROVIDER}": {"apiKey": "\${LLM_API_KEY}"}}},
  "plugins": {"enabled": true, "allow": ["clawed"]}
}
EOF
chown openclaw:openclaw /home/openclaw/.openclaw/openclaw.json
chmod 600 /home/openclaw/.openclaw/openclaw.json
systemctl restart openclaw
`
}

// ─── Token Generation ────────────────────────────────────────────────────────

/** Generate a cryptographically secure random token */
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

// ─── Pulumi Inline Program ───────────────────────────────────────────────────

/**
 * Creates the Pulumi inline program for a single user's infrastructure.
 *
 * Resources created:
 *   - gcp.compute.Instance (VM from pre-baked image)
 *   - cloudflare.Record (A record: subdomain.clawed.chat → VM IP)
 */
function createProgram(
  userId: string,
  config: PulumiDeployConfig,
  gatewayToken: string,
  instanceToken: string,
) {
  return async () => {
    // ── GCP VM ──────────────────────────────────────────────────────────
    const startupScript = loadStartupScript()

    const instance = new gcp.compute.Instance(`openclaw-${userId}`, {
      machineType: MACHINE_TYPE,
      zone: GCP_ZONE,
      project: GCP_PROJECT,
      tags: {items: ["openclaw-instance"]},
      bootDisk: {
        initializeParams: {
          image: `projects/${GCP_PROJECT}/global/images/family/${VM_IMAGE_FAMILY}`,
          size: DISK_SIZE_GB,
        },
      },
      networkInterfaces: [{
        network: "default",
        accessConfigs: [{}], // Ephemeral external IP
      }],
      metadataStartupScript: startupScript,
      metadata: {
        // Per-instance config — read by the startup script at boot
        "llm-provider": config.managed ? "openai" : config.llmProvider,
        "llm-api-key": config.managed ? instanceToken : config.apiKey,
        "managed-mode": config.managed ? "true" : "false",
        "browser-use-api-key": config.cdpUrl ? BROWSER_USE_API_KEY : "",
        "clawed-backend-url": PUBLIC_URL,
        "clawed-instance-token": instanceToken,
        "gateway-token": gatewayToken,
      },
      // Allow the VM to be stopped and started (for sleep/wake)
      allowStoppingForUpdate: true,
    })

    // Extract the external IP
    const ip = instance.networkInterfaces.apply(
      (nics: any[]) => nics[0]?.accessConfigs?.[0]?.natIp || "",
    )

    // ── Cloudflare DNS ────────────────────────────────────────────────
    let dnsRecordId: pulumi.Output<string> = pulumi.output("")

    if (CLOUDFLARE_ZONE_ID) {
      const dnsRecord = new cloudflare.Record(`dns-${userId}`, {
        zoneId: CLOUDFLARE_ZONE_ID,
        name: config.subdomain,
        type: "A",
        content: ip,
        ttl: 60,
        proxied: false, // DNS only — OpenClaw uses WebSockets which need direct connection
      })
      dnsRecordId = dnsRecord.id
    } else {
      console.warn("[pulumi] CLOUDFLARE_ZONE_ID not set — skipping DNS record creation")
    }

    // ── Outputs ──────────────────────────────────────────────────────
    return {
      ip,
      vmName: instance.name,
      dnsRecordId,
    }
  }
}

// ─── Deploy ──────────────────────────────────────────────────────────────────

/**
 * Deploy a full per-user stack: GCP VM + Cloudflare DNS.
 *
 * Uses Pulumi Automation API to run an inline program.
 * Each user gets an isolated stack named "user-<userId>".
 */
export async function deployStack(
  userId: string,
  config: PulumiDeployConfig,
): Promise<PulumiDeployResult> {
  const gatewayToken = generateToken()
  const instanceToken = generateToken()

  const program = createProgram(userId, config, gatewayToken, instanceToken)

  // Each user = isolated stack
  const stack = await automation.LocalWorkspace.createOrSelectStack({
    stackName: `user-${sanitizeStackName(userId)}`,
    projectName: "clawed-chat-instances",
    program,
  })

  // Set provider config
  await stack.setConfig("gcp:project", {value: GCP_PROJECT})
  await stack.setConfig("gcp:zone", {value: GCP_ZONE})

  if (process.env.CLOUDFLARE_API_TOKEN) {
    await stack.setConfig("cloudflare:apiToken", {
      value: process.env.CLOUDFLARE_API_TOKEN,
      secret: true,
    })
  }

  console.log(`[pulumi] deploying stack for user=${userId} subdomain=${config.subdomain}...`)

  const result = await stack.up({
    onOutput: (msg: string) => {
      if (msg.trim()) console.log(`[pulumi:${userId}] ${msg.trim()}`)
    },
  })

  const ip = result.outputs.ip?.value as string
  const vmName = result.outputs.vmName?.value as string

  console.log(`[pulumi] deploy complete: user=${userId} ip=${ip} vm=${vmName}`)

  return {
    ip,
    vmName,
    gatewayToken,
    instanceToken,
  }
}

// ─── Stop (Sleep) ────────────────────────────────────────────────────────────

/**
 * Stop a VM — halts compute but preserves disk.
 * Uses the GCP Compute Engine REST API directly (faster than Pulumi for lifecycle ops).
 */
export async function stopVM(vmName: string, zone: string = GCP_ZONE): Promise<void> {
  const url = `https://compute.googleapis.com/compute/v1/projects/${GCP_PROJECT}/zones/${zone}/instances/${vmName}/stop`

  const token = await getGCPAccessToken()
  const res = await fetch(url, {
    method: "POST",
    headers: {Authorization: `Bearer ${token}`},
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`[pulumi] Failed to stop VM ${vmName}: ${res.status} ${body}`)
  }

  console.log(`[pulumi] VM stop initiated: ${vmName}`)
}

// ─── Start (Wake) ────────────────────────────────────────────────────────────

/**
 * Start a stopped VM — resumes from where it left off.
 * Uses the GCP Compute Engine REST API directly.
 */
export async function startVM(vmName: string, zone: string = GCP_ZONE): Promise<void> {
  const url = `https://compute.googleapis.com/compute/v1/projects/${GCP_PROJECT}/zones/${zone}/instances/${vmName}/start`

  const token = await getGCPAccessToken()
  const res = await fetch(url, {
    method: "POST",
    headers: {Authorization: `Bearer ${token}`},
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`[pulumi] Failed to start VM ${vmName}: ${res.status} ${body}`)
  }

  console.log(`[pulumi] VM start initiated: ${vmName}`)
}

// ─── Destroy ─────────────────────────────────────────────────────────────────

/**
 * Destroy all infrastructure for a user.
 * Removes the VM, DNS record, and any other resources in the stack.
 */
export async function destroyStack(userId: string): Promise<void> {
  try {
    const stack = await automation.LocalWorkspace.selectStack({
      stackName: `user-${sanitizeStackName(userId)}`,
      projectName: "clawed-chat-instances",
      program: async () => ({}),
    })

    console.log(`[pulumi] destroying stack for user=${userId}...`)

    await stack.destroy({
      onOutput: (msg: string) => {
        if (msg.trim()) console.log(`[pulumi:${userId}:destroy] ${msg.trim()}`)
      },
    })

    // Clean up the stack itself
    await stack.workspace.removeStack(`user-${sanitizeStackName(userId)}`)

    console.log(`[pulumi] stack destroyed: user=${userId}`)
  } catch (err: any) {
    // If the stack doesn't exist, that's fine — might have been cleaned up already
    if (err.message?.includes("no stack named")) {
      console.log(`[pulumi] stack already gone: user=${userId}`)
      return
    }
    throw err
  }
}

// ─── Refresh ─────────────────────────────────────────────────────────────────

/**
 * Refresh the stack state — reconcile Pulumi state with actual cloud state.
 * Useful for recovering from manual changes or drift.
 */
export async function refreshStack(userId: string): Promise<void> {
  const stack = await automation.LocalWorkspace.selectStack({
    stackName: `user-${sanitizeStackName(userId)}`,
    projectName: "clawed-chat-instances",
    program: async () => ({}),
  })

  await stack.refresh({
    onOutput: (msg: string) => {
      if (msg.trim()) console.log(`[pulumi:${userId}:refresh] ${msg.trim()}`)
    },
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Sanitize a userId for use as a Pulumi stack name.
 * Stack names must match [a-zA-Z0-9-_.]+
 */
function sanitizeStackName(userId: string): string {
  return userId
    .toLowerCase()
    .replace(/[^a-z0-9\-_.]/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
}

/**
 * Get a GCP access token for API calls.
 * Uses the service account key from GOOGLE_APPLICATION_CREDENTIALS.
 */
async function getGCPAccessToken(): Promise<string> {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!keyPath) {
    throw new Error("[pulumi] GOOGLE_APPLICATION_CREDENTIALS not set")
  }

  const keyFile = JSON.parse(fs.readFileSync(keyPath, "utf-8"))

  // Build JWT
  const now = Math.floor(Date.now() / 1000)
  const header = {alg: "RS256", typ: "JWT"}
  const payload = {
    iss: keyFile.client_email,
    scope: "https://www.googleapis.com/auth/compute",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }

  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url")

  const unsigned = `${encode(header)}.${encode(payload)}`
  const sign = crypto.createSign("RSA-SHA256")
  sign.update(unsigned)
  const signature = sign.sign(keyFile.private_key, "base64url")
  const jwt = `${unsigned}.${signature}`

  // Exchange JWT for access token
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`[pulumi] Failed to get GCP access token: ${res.status} ${body}`)
  }

  const data = await res.json() as {access_token: string}
  return data.access_token
}
