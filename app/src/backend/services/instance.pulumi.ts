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

// TODO: uncomment when dependencies are installed
// import * as automation from "@pulumi/pulumi/automation"
// import * as gcp from "@pulumi/gcp"
// import * as cloudflare from "@pulumi/cloudflare"

// ─── Config ──────────────────────────────────────────────────────────────────

const GCP_PROJECT = process.env.GCP_PROJECT || ""
const GCP_ZONE = process.env.GCP_ZONE || "us-west1-a"
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID || ""

/** Pre-baked GCP image with Node.js 22 + OpenClaw pre-installed */
const VM_IMAGE = "clawed-chat-openclaw-v1"

/** Machine type — e2-small is $15/mo always-on, ~$3-5/mo with sleep/wake */
const MACHINE_TYPE = "e2-small"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PulumiDeployConfig {
  /** Browser Use Cloud CDP WebSocket URL for this instance */
  cdpUrl: string
  /** LLM provider to configure in openclaw.json */
  llmProvider: string
  /** User's LLM API key (BYOK) */
  apiKey: string
}

export interface PulumiDeployResult {
  ip: string
  vmName: string
}

// ─── Startup Script ──────────────────────────────────────────────────────────

/**
 * Generates the VM startup script that configures OpenClaw on first boot.
 *
 * The pre-baked image already has Node.js and OpenClaw installed.
 * This script just writes the user-specific config (LLM key, Browser Use CDP URL)
 * and starts the OpenClaw gateway service.
 */
function generateStartupScript(config: PulumiDeployConfig): string {
  const openclawConfig = JSON.stringify({
    llm: {
      provider: config.llmProvider,
      apiKey: config.apiKey,
    },
    browser: {
      enabled: true,
      defaultProfile: "browseruse",
      profiles: {
        browseruse: {
          cdpUrl: config.cdpUrl,
        },
      },
    },
  }, null, 2)

  return `#!/bin/bash
set -euo pipefail

# Write user-specific OpenClaw config
mkdir -p /opt/openclaw
cat > /opt/openclaw/openclaw.json << 'OPENCLAW_CONFIG'
${openclawConfig}
OPENCLAW_CONFIG

# Start OpenClaw gateway as a systemd service
# (the pre-baked image has the systemd unit file already)
systemctl enable openclaw-gateway
systemctl start openclaw-gateway

echo "[clawed.chat] OpenClaw gateway started"
`
}

// ─── Pulumi Program ──────────────────────────────────────────────────────────

/**
 * Deploy a full per-user stack: GCP VM + Cloudflare DNS.
 *
 * Uses Pulumi Automation API to run an inline program.
 * Each user gets an isolated stack named "user-<userId>".
 */
export async function deployStack(
  userId: string,
  subdomain: string,
  config: PulumiDeployConfig,
): Promise<PulumiDeployResult> {
  // TODO: uncomment when @pulumi/* packages are installed
  //
  // const program = async () => {
  //   // ── GCP VM ────────────────────────────────────────────────────────────
  //   const instance = new gcp.compute.Instance(`openclaw-${userId}`, {
  //     machineType: MACHINE_TYPE,
  //     zone: GCP_ZONE,
  //     project: GCP_PROJECT,
  //     tags: ["openclaw-instance"],
  //     bootDisk: {
  //       initializeParams: {
  //         image: `projects/${GCP_PROJECT}/global/images/family/clawed-chat`,
  //       },
  //     },
  //     networkInterfaces: [{
  //       network: "default",
  //       accessConfigs: [{}], // ephemeral external IP
  //     }],
  //     metadata: {
  //       "startup-script": generateStartupScript(config),
  //     },
  //   })
  //
  //   const ip = instance.networkInterfaces.apply(
  //     (nics) => nics[0]?.accessConfigs?.[0]?.natIp || "",
  //   )
  //
  //   // ── Cloudflare DNS ──────────────────────────────────────────────────
  //   const dnsRecord = new cloudflare.Record(`dns-${userId}`, {
  //     zoneId: CLOUDFLARE_ZONE_ID,
  //     name: subdomain,
  //     type: "A",
  //     content: ip,
  //     ttl: 60,
  //     proxied: false, // DNS only — OpenClaw uses WebSockets
  //   })
  //
  //   return {
  //     ip: ip,
  //     vmName: instance.name,
  //     dnsRecordId: dnsRecord.id,
  //   }
  // }
  //
  // // Each user = isolated stack
  // const stack = await automation.LocalWorkspace.createOrSelectStack({
  //   stackName: `user-${userId}`,
  //   projectName: "clawed-chat",
  //   program,
  // })
  //
  // // Set provider config
  // await stack.setConfig("gcp:project", {value: GCP_PROJECT})
  // await stack.setConfig("gcp:zone", {value: GCP_ZONE})
  //
  // console.log(`[pulumi] deploying stack for user=${userId}...`)
  // const result = await stack.up({onOutput: console.log})
  //
  // return {
  //   ip: result.outputs.ip.value as string,
  //   vmName: result.outputs.vmName.value as string,
  // }

  console.log(`[pulumi] deployStack: user=${userId} subdomain=${subdomain} (stub)`)
  return {
    ip: "0.0.0.0",
    vmName: `openclaw-${userId}`,
  }
}

// ─── Destroy ─────────────────────────────────────────────────────────────────

/**
 * Destroy all infrastructure for a user.
 * Removes the VM, DNS record, and any other resources in the stack.
 */
export async function destroyStack(userId: string): Promise<void> {
  // TODO: uncomment when @pulumi/* packages are installed
  //
  // const stack = await automation.LocalWorkspace.selectStack({
  //   stackName: `user-${userId}`,
  //   projectName: "clawed-chat",
  //   program: async () => {},
  // })
  //
  // console.log(`[pulumi] destroying stack for user=${userId}...`)
  // await stack.destroy({onOutput: console.log})
  // await stack.workspace.removeStack(`user-${userId}`)

  console.log(`[pulumi] destroyStack: user=${userId} (stub)`)
}

// ─── Refresh ─────────────────────────────────────────────────────────────────

/**
 * Refresh the stack state — reconcile Pulumi state with actual cloud state.
 * Useful for recovering from manual changes or drift.
 */
export async function refreshStack(userId: string): Promise<void> {
  // TODO: uncomment when @pulumi/* packages are installed
  //
  // const stack = await automation.LocalWorkspace.selectStack({
  //   stackName: `user-${userId}`,
  //   projectName: "clawed-chat",
  //   program: async () => {},
  // })
  //
  // await stack.refresh({onOutput: console.log})

  console.log(`[pulumi] refreshStack: user=${userId} (stub)`)
}
