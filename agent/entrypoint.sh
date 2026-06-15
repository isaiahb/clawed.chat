#!/usr/bin/env bash
# Render OpenClaw config from env (no secrets baked into the image) and start
# the gateway headless. This is the LOCKED-DOWN judge agent:
#   - inference only (Nebius), NO account credentials, NO Composio
#   - every dangerous tool denied (no shell/write/browser/web/cron)
#   - gateway reachable only on Fly's private network (clawed-agent.internal)
set -euo pipefail

: "${NEBIUS_API_KEY:?NEBIUS_API_KEY required}"
: "${OPENCLAW_GATEWAY_TOKEN:?OPENCLAW_GATEWAY_TOKEN required}"
NEBIUS_BASE="${NEBIUS_API_BASE:-https://api.studio.nebius.com/v1}"
NEBIUS_MODEL="${NEBIUS_TEXT_MODEL:-openai/gpt-oss-120b}"

CFG_DIR="$HOME/.openclaw"
WS_DIR="$CFG_DIR/workspace"
mkdir -p "$WS_DIR"

# Project knowledge for judge Q&A (read into the agent's workspace context).
cp /agent/AGENTS.md "$WS_DIR/AGENTS.md" 2>/dev/null || true

# Write config with secrets injected at runtime only.
cat > "$CFG_DIR/openclaw.json" <<JSON
{
  "gateway": {
    "auth": { "token": "${OPENCLAW_GATEWAY_TOKEN}" }
  },
  "models": {
    "mode": "merge",
    "providers": {
      "nebius": {
        "baseUrl": "${NEBIUS_BASE}",
        "apiKey": "${NEBIUS_API_KEY}",
        "api": "openai-completions",
        "models": [
          { "id": "${NEBIUS_MODEL}", "name": "judge-model", "contextWindow": 128000, "maxTokens": 8000, "input": ["text"] }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": { "primary": "nebius/${NEBIUS_MODEL}" },
      "sandbox": { "mode": "off" }
    }
  },
  "tools": {
    "deny": ["exec","process","write","edit","apply_patch","browser","web_search","web_fetch","cron","gateway","canvas","nodes","discord"]
  }
}
JSON

echo "[agent] config rendered; starting locked-down gateway (tools denied, inference-only)"

# Gateway listens on loopback only (private to this container).
openclaw gateway --port 18790 --bind loopback --auth token --allow-unconfigured --force &
GW=$!

# Wait for the gateway's loopback listener before bridging (bash /dev/tcp).
for i in $(seq 1 30); do
  if (exec 3<>/dev/tcp/127.0.0.1/18790) 2>/dev/null; then
    exec 3>&- 3<&-; echo "[agent] gateway loopback up"; break
  fi
  sleep 2
done

# Bridge Fly private 6PN (clawed-agent.internal:18789, IPv6) → gateway loopback.
# Direct 6PN avoids flycast's WebSocket proxy (which mangles upstream WS frames).
echo "[agent] starting IPv6→loopback relay on [::]:18789"
socat TCP6-LISTEN:18789,fork,reuseaddr TCP4:127.0.0.1:18790 &
SC=$!

# If either the gateway or the relay dies, exit so Fly restarts the machine.
wait -n "$GW" "$SC"
echo "[agent] a core process exited; restarting machine"
exit 1
