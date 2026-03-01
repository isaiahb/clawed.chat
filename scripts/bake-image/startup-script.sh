#!/bin/bash
set -euo pipefail

# ─── Per-User Startup Script ─────────────────────────────────────────────────
#
# This script is injected as GCP instance metadata by Pulumi when
# creating a per-user VM from the pre-baked image.
#
# It runs on EVERY boot (including stop/start cycles) and is idempotent.
#
# What it does:
#   1. Reads per-user config from GCP instance metadata
#   2. Writes ~/.openclaw/openclaw.json with the user's API keys + settings
#   3. Restarts the OpenClaw systemd service
#   4. Waits for the gateway to become healthy
#
# The pre-baked image already has Bun, OpenClaw, and our channel plugin
# installed. This script only provides the per-user configuration.

METADATA_URL="http://metadata.google.internal/computeMetadata/v1/instance/attributes"
METADATA_HEADER="Metadata-Flavor: Google"

log() {
  echo "[startup] $(date '+%H:%M:%S') $*"
}

# ─── Step 1: Read Metadata ────────────────────────────────────────────────────

log "Reading instance metadata ..."

fetch_meta() {
  curl -sf "${METADATA_URL}/$1" -H "$METADATA_HEADER" 2>/dev/null || echo ""
}

LLM_PROVIDER=$(fetch_meta "llm-provider")
LLM_API_KEY=$(fetch_meta "llm-api-key")
MANAGED_MODE=$(fetch_meta "managed-mode")
BROWSER_USE_API_KEY=$(fetch_meta "browser-use-api-key")
CLAWED_BACKEND_URL=$(fetch_meta "clawed-backend-url")
CLAWED_INSTANCE_TOKEN=$(fetch_meta "clawed-instance-token")
GATEWAY_TOKEN=$(fetch_meta "gateway-token")

# Validate required metadata
if [ -z "$GATEWAY_TOKEN" ]; then
  log "ERROR: Missing required metadata (gateway-token)"
  exit 1
fi

# In managed mode, the VM uses our LLM proxy instead of a direct API key
if [ "$MANAGED_MODE" = "true" ]; then
  log "  Mode:        MANAGED (using clawed.chat LLM proxy)"
  if [ -z "$CLAWED_BACKEND_URL" ]; then
    log "ERROR: Managed mode requires clawed-backend-url"
    exit 1
  fi
else
  if [ -z "$LLM_PROVIDER" ] || [ -z "$LLM_API_KEY" ]; then
    log "ERROR: BYOK mode requires llm-provider and llm-api-key"
    exit 1
  fi
  log "  Mode:        BYOK"
fi

log "  Provider:    ${LLM_PROVIDER:-managed}"
log "  Backend URL: ${CLAWED_BACKEND_URL:-(not set)}"
log "  Gateway:     token is set"

# ─── Step 2: Determine Model + Provider Config ────────────────────────────────

if [ "$MANAGED_MODE" = "true" ]; then
  # Managed mode: use OpenAI-compatible format pointed at our proxy
  # The VM thinks it's talking to OpenAI, but it's actually hitting our backend
  # which forwards to Anthropic with our key. VM never sees real API key.
  MODEL="openai/claude-sonnet-4-5"
  LLM_PROVIDER="openai"
  LLM_API_KEY="$CLAWED_INSTANCE_TOKEN"
  LLM_BASE_URL="${CLAWED_BACKEND_URL}/api/llm-proxy/v1"
  log "  Model: $MODEL (via proxy at $LLM_BASE_URL)"
else
  # BYOK mode: direct connection to the provider
  LLM_BASE_URL=""
  case "$LLM_PROVIDER" in
    anthropic) MODEL="anthropic/claude-sonnet-4-5" ;;
    openai)    MODEL="openai/gpt-5.2" ;;
    google)    MODEL="google/gemini-2.5-pro" ;;
    minimax)   MODEL="minimax/minimax-latest" ;;
    *)         MODEL="anthropic/claude-sonnet-4-5"
               log "  WARNING: Unknown provider '$LLM_PROVIDER', defaulting to Anthropic" ;;
  esac
  log "  Model: $MODEL (direct)"
fi

# ─── Step 3: Write OpenClaw Config ────────────────────────────────────────────

log "Writing OpenClaw config ..."

CONFIG_DIR="/home/openclaw/.openclaw"
CONFIG_FILE="$CONFIG_DIR/openclaw.json"

# Ensure directory exists
sudo -u openclaw mkdir -p "$CONFIG_DIR"/{workspace,extensions,credentials}

# Build browser config section (only if Browser Use key is provided)
BROWSER_CONFIG=""
if [ -n "$BROWSER_USE_API_KEY" ]; then
  BROWSER_CONFIG=$(cat <<BROWSER_EOF
  "browser": {
    "enabled": true,
    "defaultProfile": "browseruse",
    "profiles": {
      "browseruse": {
        "cdpUrl": "wss://api.browser-use.com/browser?apiKey=${BROWSER_USE_API_KEY}"
      }
    }
  },
BROWSER_EOF
)
fi

# Build clawed channel config (only if backend URL is provided)
CHANNEL_CONFIG=""
if [ -n "$CLAWED_BACKEND_URL" ]; then
  CHANNEL_CONFIG=$(cat <<CHANNEL_EOF
  "channels": {
    "clawed": {
      "enabled": true,
      "backendUrl": "${CLAWED_BACKEND_URL}",
      "authToken": "${CLAWED_INSTANCE_TOKEN}",
      "dmPolicy": "open"
    }
  },
CHANNEL_EOF
)
fi

cat > "$CONFIG_FILE" <<CONFIG_EOF
{
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "lan",
    "auth": {
      "mode": "token",
      "token": "${GATEWAY_TOKEN}"
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "${MODEL}"
      },
      "workspace": "/home/openclaw/.openclaw/workspace"
    }
  },
  "models": {
    "providers": {
      "${LLM_PROVIDER}": {
        "apiKey": "${LLM_API_KEY}"${LLM_BASE_URL:+,
        "baseUrl": "${LLM_BASE_URL}"}
      }
    }
  },
  "plugins": {
    "enabled": true,
    "allow": ["clawed"]
  },
  ${CHANNEL_CONFIG}
  ${BROWSER_CONFIG}
  "session": {
    "dmScope": "per-channel-peer"
  }
}
CONFIG_EOF

# Fix ownership and permissions (config contains secrets)
chown openclaw:openclaw "$CONFIG_FILE"
chmod 600 "$CONFIG_FILE"

log "Config written to $CONFIG_FILE"

# ─── Step 4: Restart OpenClaw ─────────────────────────────────────────────────

log "Restarting OpenClaw service ..."
systemctl restart openclaw

# ─── Step 5: Wait for Gateway to be Ready ─────────────────────────────────────

log "Waiting for gateway to become healthy ..."

MAX_ATTEMPTS=40
SLEEP_INTERVAL=3

for i in $(seq 1 $MAX_ATTEMPTS); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    "http://127.0.0.1:18789/health" \
    -H "Authorization: Bearer ${GATEWAY_TOKEN}" \
    2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "429" ]; then
    log "OpenClaw is ready! (HTTP $HTTP_CODE after ${i} attempts)"
    exit 0
  fi

  if [ "$((i % 10))" -eq 0 ]; then
    log "  Still waiting ... (attempt $i/$MAX_ATTEMPTS, last HTTP code: $HTTP_CODE)"
  fi

  sleep $SLEEP_INTERVAL
done

# If we get here, the gateway didn't start in time
TOTAL_SECONDS=$((MAX_ATTEMPTS * SLEEP_INTERVAL))
log "ERROR: OpenClaw gateway not ready after ${TOTAL_SECONDS}s"
log "  Checking service status ..."
systemctl status openclaw --no-pager || true
log "  Checking recent logs ..."
journalctl -u openclaw --no-pager -n 30 || true

exit 1
