#!/usr/bin/env bash
#
# demo-local.sh — the $0 compute path for Buildership.
#
# Runs the clawed.chat backend on THIS machine and exposes it publicly
# through a Cloudflare quick tunnel (no account, no DNS, free). Use the
# printed https URL as the miniapp's vision endpoint and the judges' base
# URL while GCP is down and before/instead of a paid VM.
#
#   ./scripts/demo-local.sh
#
# Prereqs: bun, cloudflared (brew install cloudflared), app/.env filled in
# (NEBIUS_API_KEY + TAVILY_API_KEY for vision; OPENCLAW_GATEWAY_URL/TOKEN
# pointing at the OpenClaw on this machine or your LAN for /api/judge).

set -euo pipefail
cd "$(dirname "$0")/.."

command -v cloudflared >/dev/null || {
  echo "cloudflared not found — brew install cloudflared"; exit 1
}

echo "→ starting backend on :3000"
(cd app && bun src/index.ts) &
APP_PID=$!
trap 'kill $APP_PID 2>/dev/null' EXIT

for i in $(seq 1 20); do
  curl -sf localhost:3000/api/health >/dev/null && break
  sleep 0.5
done
curl -sf localhost:3000/api/health >/dev/null || { echo "backend failed to start"; exit 1; }
echo "→ backend healthy"

echo "→ opening Cloudflare quick tunnel (watch for the https://*.trycloudflare.com URL)"
echo "   miniapp vision endpoint:  <tunnel-url>/api/vision"
echo "   judge endpoint:           <tunnel-url>/api/judge"
cloudflared tunnel --url http://localhost:3000
