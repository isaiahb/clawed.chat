/**
 * deploy/index.ts — Pulumi program for clawed.chat's own infrastructure
 *
 * This creates the backend VM + networking + DNS.
 * Code deployment happens separately via CI/CD (SSH + rsync).
 *
 * What this creates:
 *   - GCP Compute Engine VM (blank Ubuntu 24.04 — code deployed via CI)
 *   - Static external IP (survives VM restarts)
 *   - Firewall rules for HTTP/HTTPS/WebSocket/dev traffic
 *   - Cloudflare DNS: clawed.chat + *.clawed.chat → server IP
 *
 * This is NOT the per-user provisioning — that lives in
 * app/src/backend/services/instance.pulumi.ts
 */

import * as pulumi from "@pulumi/pulumi"
import * as gcp from "@pulumi/gcp"
import * as cloudflare from "@pulumi/cloudflare"

// ─── Config ──────────────────────────────────────────────────────────────────

const config = new pulumi.Config()
const gcpProject = config.require("gcp-project")
const gcpZone = config.get("gcp-zone") || "us-west1-a"
const gcpRegion = config.get("gcp-region") || "us-west1"
const cloudflareZoneId = config.require("cloudflare-zone-id")
const domain = config.get("domain") || "clawed.chat"

// ─── Static IP ───────────────────────────────────────────────────────────────

const staticIp = new gcp.compute.Address("clawed-chat-ip", {
  name: "clawed-chat-ip",
  region: gcpRegion,
  project: gcpProject,
})

// ─── Firewall ────────────────────────────────────────────────────────────────

const firewall = new gcp.compute.Firewall("clawed-chat-firewall", {
  project: gcpProject,
  network: "default",
  allows: [
    {
      protocol: "tcp",
      ports: ["80", "443"],
    },
  ],
  sourceRanges: ["0.0.0.0/0"],
  targetTags: ["clawed-chat-server"],
  description: "Allow HTTP and HTTPS traffic to clawed.chat backend",
})

// ─── Backend VM ──────────────────────────────────────────────────────────────

// Minimal first-boot script — just installs Bun and creates the app directory.
// Actual code deployment happens via CI/CD (GitHub Actions → SSH → bun install → restart).
const startupScript = `#!/bin/bash
set -euo pipefail

# Only run on first boot (skip if Bun already installed)
if command -v bun &> /dev/null; then
  echo "[clawed.chat] Bun already installed, skipping first-boot setup"
  exit 0
fi

echo "[clawed.chat] First boot — installing Bun..."
curl -fsSL https://bun.sh/install | bash
ln -sf /root/.bun/bin/bun /usr/local/bin/bun
ln -sf /root/.bun/bin/bunx /usr/local/bin/bunx

# Install Pulumi CLI (needed for Automation API at runtime)
curl -fsSL https://get.pulumi.com | bash
ln -sf /root/.pulumi/bin/pulumi /usr/local/bin/pulumi

# Create app directory
mkdir -p /opt/clawed-chat/app

# Install basic tools
apt-get update -qq && apt-get install -y -qq jq git curl unzip

echo "[clawed.chat] First boot complete — waiting for CI/CD to deploy app code"
`

const server = new gcp.compute.Instance("clawed-chat-server", {
  name: "clawed-chat-server",
  machineType: "e2-small",
  zone: gcpZone,
  project: gcpProject,
  tags: ["clawed-chat-server"],
  bootDisk: {
    initializeParams: {
      image: "ubuntu-os-cloud/ubuntu-2404-lts-amd64",
      size: 30,
    },
  },
  networkInterfaces: [{
    network: "default",
    accessConfigs: [{
      natIp: staticIp.address,
    }],
  }],
  metadataStartupScript: startupScript,
  serviceAccount: {
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  },
  allowStoppingForUpdate: true,
})

// ─── DNS Records ─────────────────────────────────────────────────────────────

// Root domain — clawed.chat → server IP
const rootDns = new cloudflare.Record("clawed-chat-root-dns", {
  zoneId: cloudflareZoneId,
  name: "@",
  type: "A",
  content: staticIp.address,
  ttl: 1, // Auto — Cloudflare manages when proxied
  proxied: true, // Cloudflare terminates TLS, forwards HTTP to origin
})

// Wildcard — *.clawed.chat → server IP
// Per-user instances will override this with specific A records via the Automation API
const wildcardDns = new cloudflare.Record("clawed-chat-wildcard-dns", {
  zoneId: cloudflareZoneId,
  name: "*",
  type: "A",
  content: staticIp.address,
  ttl: 1,
  proxied: true,
})

// ─── Exports ─────────────────────────────────────────────────────────────────

export const serverIp = staticIp.address
export const serverName = server.name
export const serverZone = server.zone
export const rootDnsRecord = rootDns.name
export const wildcardDnsRecord = wildcardDns.name
