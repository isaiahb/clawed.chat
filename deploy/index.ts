/**
 * deploy/index.ts — Pulumi program for clawed.chat's own infrastructure
 *
 * This deploys OUR backend (the Hono/Bun server) to GCP.
 * This is NOT the per-user provisioning — that lives in
 * app/src/backend/services/instance.pulumi.ts and uses the Automation API.
 *
 * What this creates:
 *   - GCP Compute Engine VM running the clawed.chat Hono/Bun server
 *   - Firewall rules for HTTP/HTTPS/WebSocket traffic
 *   - Cloudflare DNS records pointing clawed.chat to the server
 *   - Static external IP so DNS doesn't change on reboot
 *
 * Runs via GitHub Actions on push to main:
 *   .github/workflows/deploy.yml → pulumi up
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
      ports: ["80", "443", "3000"],
    },
  ],
  sourceRanges: ["0.0.0.0/0"],
  targetTags: ["clawed-chat-server"],
  description: "Allow HTTP, HTTPS, and dev server traffic to clawed.chat backend",
})

// ─── Backend VM ──────────────────────────────────────────────────────────────

const startupScript = `#!/bin/bash
set -euo pipefail

# Install Bun if not present
if ! command -v bun &> /dev/null; then
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
fi

# Clone or pull latest code
APP_DIR="/opt/clawed-chat"
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
  git pull origin main
else
  git clone https://github.com/BallahTech/clawed.chat.git "$APP_DIR"
  cd "$APP_DIR"
fi

# Install dependencies
bun install

# Start the app via systemd
cat > /etc/systemd/system/clawed-chat.service << 'EOF'
[Unit]
Description=clawed.chat Hono/Bun server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/clawed-chat/app
ExecStart=/root/.bun/bin/bun run start
Restart=always
RestartSec=5
EnvironmentFile=/opt/clawed-chat/.env

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable clawed-chat
systemctl restart clawed-chat

echo "[clawed.chat] backend server started"
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
      size: 20, // 20 GB
    },
  },
  networkInterfaces: [{
    network: "default",
    accessConfigs: [{
      natIp: staticIp.address,
    }],
  }],
  metadata: {
    "startup-script": startupScript,
  },
  serviceAccount: {
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  },
})

// ─── DNS Records ─────────────────────────────────────────────────────────────

// Root domain — clawed.chat → server IP
const rootDns = new cloudflare.Record("clawed-chat-root-dns", {
  zoneId: cloudflareZoneId,
  name: "@",
  type: "A",
  content: staticIp.address,
  ttl: 60,
  proxied: false, // DNS only — we handle TLS ourselves or use Cloudflare later
})

// Wildcard — *.clawed.chat → server IP
// Per-user instances will override this with specific A records via the Automation API
const wildcardDns = new cloudflare.Record("clawed-chat-wildcard-dns", {
  zoneId: cloudflareZoneId,
  name: "*",
  type: "A",
  content: staticIp.address,
  ttl: 60,
  proxied: false,
})

// ─── Exports ─────────────────────────────────────────────────────────────────

export const serverIp = staticIp.address
export const serverName = server.name
export const serverZone = server.zone
export const rootDnsRecord = rootDns.name
export const wildcardDnsRecord = wildcardDns.name
