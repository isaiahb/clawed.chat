#!/bin/bash
set -euo pipefail

# ─── Full-Install Per-User Startup Script ─────────────────────────────────────
#
# This script is injected as GCP instance metadata by Pulumi when
# creating a per-user VM from a PLAIN Ubuntu 24.04 image.
#
# Unlike startup-script.sh (which assumes a pre-baked image), this script
# installs everything from scratch on first boot:
#   1. System prerequisites (unzip, curl, jq)
#   2. Node.js 22 (required for OpenClaw CLI shebang)
#   3. Bun 1.3.10+ (runtime for OpenClaw gateway)
#   4. OpenClaw (via bun i -g openclaw)
#   5. Channel plugin (clawed.chat)
#   6. Systemd service (system-level, NOT systemctl --user)
#   7. Per-user config from GCP instance metadata
#   8. Gateway start + health check
#
# On subsequent boots (stop/start cycles), it skips installation
# and only re-applies per-user config + restarts the gateway.
#
# Total first-boot time: ~6-10 minutes (depending on network)
# Subsequent boot time: ~10-15 seconds
#
# Learnings baked in (from manual setup on openclaw-agent):
#   - OpenClaw binary uses #!/usr/bin/env node — Node.js required even with Bun runtime
#   - Bun install requires `unzip` (not pre-installed on Ubuntu 24.04)
#   - chmod -R 755 on openclaw node_modules or systemd exits 203/EXEC
#   - systemctl --user doesn't work for root over SSH — use system service
#   - node is at /usr/bin/node (not /usr/local/bin/node)
#   - LAN bind requires gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback
#   - Do NOT set plugins.allow or plugins.entries — auto-discovery from ~/.openclaw/extensions/
#   - Plugin configSchema must NOT have required fields — use hardcoded defaults

METADATA_URL="http://metadata.google.internal/computeMetadata/v1/instance/attributes"
METADATA_HEADER="Metadata-Flavor: Google"
INSTALL_MARKER="/root/.openclaw/.install-complete"
OPENCLAW_HOME="/root/.openclaw"
SERVICE_NAME="openclaw-gateway"

log() {
  echo "[startup] $(date '+%Y-%m-%d %H:%M:%S') $*"
}

fetch_meta() {
  curl -sf "${METADATA_URL}/$1" -H "$METADATA_HEADER" 2>/dev/null || echo ""
}

# ─── Step 1: Read Instance Metadata ──────────────────────────────────────────

log "Reading instance metadata..."

LLM_PROVIDER=$(fetch_meta "llm-provider")
LLM_API_KEY=$(fetch_meta "llm-api-key")
MANAGED_MODE=$(fetch_meta "managed-mode")
BROWSER_USE_API_KEY=$(fetch_meta "browser-use-api-key")
CLAWED_BACKEND_URL=$(fetch_meta "clawed-backend-url")
CLAWED_INSTANCE_TOKEN=$(fetch_meta "clawed-instance-token")
GATEWAY_TOKEN=$(fetch_meta "gateway-token")
CHANNEL_PLUGIN_TAR=$(fetch_meta "channel-plugin-tar")

if [ -z "$GATEWAY_TOKEN" ]; then
  log "ERROR: Missing required metadata: gateway-token"
  exit 1
fi

log "  Gateway token: set"
log "  Backend URL:   ${CLAWED_BACKEND_URL:-(not set)}"
log "  Managed mode:  ${MANAGED_MODE:-false}"
log "  LLM provider:  ${LLM_PROVIDER:-(managed)}"

# ─── Step 2: Install Software (first boot only) ──────────────────────────────

if [ -f "$INSTALL_MARKER" ]; then
  log "Installation marker found — skipping software install (subsequent boot)"
else
  log "First boot — installing all software..."

  # 2a. System prerequisites
  log "  Installing system prerequisites..."
  apt-get update -qq
  apt-get install -y -qq unzip curl jq git

  # 2b. Node.js 22 (required: openclaw binary has #!/usr/bin/env node shebang)
  log "  Installing Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
  log "  Node.js $(node --version) installed at $(which node)"

  # 2c. Bun
  log "  Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="/root/.bun/bin:$PATH"
  ln -sf /root/.bun/bin/bun /usr/local/bin/bun
  ln -sf /root/.bun/bin/bunx /usr/local/bin/bunx
  log "  Bun $(bun --version) installed"

  # 2d. OpenClaw
  log "  Installing OpenClaw..."
  bun i -g openclaw
  log "  OpenClaw $(openclaw --version 2>/dev/null || echo 'version unknown') installed"

  # 2e. Fix permissions (without this, systemd exits 203/EXEC)
  log "  Fixing openclaw module permissions..."
  chmod -R 755 /root/.bun/install/global/node_modules/openclaw/

  # 2f. Run non-interactive onboard to create initial config structure
  log "  Running openclaw onboard..."
  openclaw onboard \
    --non-interactive \
    --accept-risk \
    --flow quickstart \
    --gateway-bind loopback \
    --gateway-auth token \
    --gateway-token "$GATEWAY_TOKEN" \
    --auth-choice anthropic-api-key \
    --anthropic-api-key "placeholder-will-be-overwritten" \
    --daemon-runtime bun \
    --skip-channels \
    --skip-skills \
    --skip-ui \
    2>&1 || log "  onboard exited non-zero (may be OK — config still written)"

  # 2g. Install channel plugin
  log "  Installing clawed.chat channel plugin..."
  mkdir -p "$OPENCLAW_HOME/extensions/clawed/src"

  # Write the plugin manifest
  cat > "$OPENCLAW_HOME/extensions/clawed/openclaw.plugin.json" << 'MANIFEST_EOF'
{
  "id": "clawed",
  "channels": ["clawed"],
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "backendUrl": {
        "type": "string",
        "description": "clawed.chat backend URL for outbound message callbacks",
        "default": "https://clawed.chat"
      },
      "authToken": {
        "type": "string",
        "description": "Per-instance auth token for verifying callbacks",
        "default": ""
      }
    }
  }
}
MANIFEST_EOF

  cat > "$OPENCLAW_HOME/extensions/clawed/package.json" << 'PKG_EOF'
{
  "name": "@clawed-chat/openclaw-channel",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "openclaw": {
    "extensions": ["./src/index.ts"]
  }
}
PKG_EOF

  # Write the channel plugin source
  cat > "$OPENCLAW_HOME/extensions/clawed/src/index.ts" << 'PLUGIN_EOF'
type OpenClawConfig = Record<string, any>;
type OpenClawPluginApi = {
  logger: { info: (msg: string) => void; error: (msg: string) => void };
  registerChannel: (reg: { plugin: any }) => void;
  registerGatewayMethod: (method: string, handler: (opts: any) => void | Promise<void>) => void;
  registerCommand: (cmd: { name: string; description: string; handler: (ctx: any) => any }) => void;
};

interface ClawedAccount { accountId: string; backendUrl: string; authToken: string; }

const clawedPlugin = {
  id: "clawed",
  meta: {
    id: "clawed",
    label: "clawed.chat",
    selectionLabel: "clawed.chat (Dashboard + Glasses)",
    docsPath: "/channels/clawed",
    blurb: "Chat from clawed.chat dashboard or Mentra smart glasses.",
    aliases: ["clawed-chat", "mentra"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (_cfg: OpenClawConfig) => ["default"],
    resolveAccount: (cfg: OpenClawConfig, accountId: string): ClawedAccount => ({
      accountId: accountId ?? "default",
      backendUrl: (cfg as any)?.backendUrl ?? "https://clawed.chat",
      authToken: (cfg as any)?.authToken ?? "",
    }),
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async ({ text, peerId, accountId, meta }: { text: string; peerId: string; accountId: string; meta?: any }) => {
      const account = meta?.resolvedAccount as ClawedAccount | undefined;
      const backendUrl = account?.backendUrl;
      const authToken = account?.authToken;
      if (!backendUrl) return { ok: false, error: "No backendUrl configured" };
      try {
        const res = await fetch(`${backendUrl}/api/openclaw/outbound`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ text, peerId, accountId: accountId ?? "default", timestamp: Date.now() }),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          return { ok: false, error: `Backend returned ${res.status}: ${body}` };
        }
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: `Failed to POST to backend: ${err.message}` };
      }
    },
  },
};

const plugin = {
  id: "clawed",
  name: "clawed.chat",
  description: "Connects OpenClaw to clawed.chat dashboard and Mentra smart glasses",
  configSchema: { type: "object" as const, additionalProperties: false, properties: {} },
  register(api: OpenClawPluginApi) {
    api.logger.info("clawed.chat channel plugin loading");
    api.registerChannel({ plugin: clawedPlugin });

    api.registerGatewayMethod("clawed.inbound", async ({ params, respond, context }: any) => {
      const text = (params as any)?.text as string | undefined;
      const peerId = (params as any)?.peerId as string | undefined;
      const accountId = ((params as any)?.accountId as string) ?? "default";
      if (!text || !peerId) {
        respond(false, undefined, { code: -32602, message: "Missing required params: text, peerId" });
        return;
      }
      try {
        const sessionKey = `clawed:${accountId}:${peerId}`;
        context.broadcast("chat:user-message", { sessionKey, channel: "clawed", peerId, text, timestamp: Date.now() });
        respond(true, { dispatched: true, sessionKey });
      } catch (err: any) {
        api.logger.error(`clawed.inbound dispatch failed: ${err.message}`);
        respond(false, undefined, { code: -32603, message: `Dispatch failed: ${err.message}` });
      }
    });

    api.registerGatewayMethod("clawed.status", ({ respond }: any) => {
      respond(true, { channel: "clawed", status: "ok" });
    });

    api.registerCommand({
      name: "clawed",
      description: "Show clawed.chat channel connection status",
      handler: () => ({ text: "clawed.chat channel is active." }),
    });

    api.logger.info("clawed.chat channel plugin loaded");
  },
};

export default plugin;
PLUGIN_EOF

  # 2h. Create system-level systemd service
  log "  Creating systemd service..."
  cat > "/etc/systemd/system/${SERVICE_NAME}.service" << 'SERVICE_EOF'
[Unit]
Description=OpenClaw Gateway
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
Environment=PATH=/root/.bun/bin:/usr/local/bin:/usr/bin:/bin
Environment=HOME=/root
WorkingDirectory=/root
ExecStart=/usr/bin/node /root/.bun/install/global/node_modules/openclaw/openclaw.mjs gateway run
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
SERVICE_EOF

  systemctl daemon-reload
  systemctl enable "$SERVICE_NAME"

  # Mark installation complete
  touch "$INSTALL_MARKER"
  log "  Software installation complete!"
fi

# ─── Step 3: Determine Model + Provider Config ───────────────────────────────

export PATH="/root/.bun/bin:/usr/local/bin:/usr/bin:/bin"

if [ "$MANAGED_MODE" = "true" ]; then
  MODEL="openai/claude-sonnet-4-5"
  LLM_PROVIDER="openai"
  LLM_API_KEY="$CLAWED_INSTANCE_TOKEN"
  LLM_BASE_URL="${CLAWED_BACKEND_URL}/api/llm-proxy/v1"
  log "  Model: $MODEL (via proxy at $LLM_BASE_URL)"
else
  LLM_BASE_URL=""
  case "${LLM_PROVIDER:-anthropic}" in
    anthropic) MODEL="anthropic/claude-sonnet-4-5" ;;
    openai)    MODEL="openai/gpt-5.2" ;;
    google)    MODEL="google/gemini-2.5-pro" ;;
    minimax)   MODEL="minimax/minimax-latest" ;;
    *)         MODEL="anthropic/claude-sonnet-4-5"
               log "  WARNING: Unknown provider '${LLM_PROVIDER}', defaulting to Anthropic" ;;
  esac
  log "  Model: $MODEL (direct BYOK)"
fi

# ─── Step 4: Write OpenClaw Config ───────────────────────────────────────────

log "Writing OpenClaw config..."

mkdir -p "$OPENCLAW_HOME"/{workspace,extensions,credentials}

# Build the LLM provider block
PROVIDER_BLOCK="\"${LLM_PROVIDER:-anthropic}\": { \"apiKey\": \"${LLM_API_KEY}\" }"
if [ -n "$LLM_BASE_URL" ]; then
  PROVIDER_BLOCK="\"${LLM_PROVIDER}\": { \"apiKey\": \"${LLM_API_KEY}\", \"baseUrl\": \"${LLM_BASE_URL}\" }"
fi

cat > "$OPENCLAW_HOME/openclaw.json" << CONFIG_EOF
{
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "lan",
    "controlUi": {
      "dangerouslyAllowHostHeaderOriginFallback": true
    },
    "auth": {
      "mode": "token",
      "token": "${GATEWAY_TOKEN}"
    },
    "tailscale": {
      "mode": "off",
      "resetOnExit": false
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "${MODEL}"
      },
      "workspace": "${OPENCLAW_HOME}/workspace"
    }
  },
  "models": {
    "providers": {
      ${PROVIDER_BLOCK}
    }
  },
  "commands": {
    "native": "auto",
    "nativeSkills": "auto",
    "restart": true,
    "ownerDisplay": "raw"
  },
  "session": {
    "dmScope": "per-channel-peer"
  }
}
CONFIG_EOF

chmod 600 "$OPENCLAW_HOME/openclaw.json"
log "Config written to $OPENCLAW_HOME/openclaw.json"

# ─── Step 5: Restart Gateway ─────────────────────────────────────────────────

log "Restarting OpenClaw gateway..."
systemctl restart "$SERVICE_NAME"

# ─── Step 6: Wait for Gateway Health ─────────────────────────────────────────

log "Waiting for gateway to become healthy..."

MAX_ATTEMPTS=60
SLEEP_INTERVAL=3

for i in $(seq 1 $MAX_ATTEMPTS); do
  # Check if the service is still running (hasn't crashed)
  if ! systemctl is-active --quiet "$SERVICE_NAME"; then
    if [ "$i" -le 5 ]; then
      # Give it a few seconds to start
      sleep "$SLEEP_INTERVAL"
      continue
    fi
    log "ERROR: Service $SERVICE_NAME is not running"
    journalctl -u "$SERVICE_NAME" --no-pager -n 30
    exit 1
  fi

  # Check HTTP health
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    "http://127.0.0.1:18789/" \
    -H "Authorization: Bearer ${GATEWAY_TOKEN}" \
    2>/dev/null || echo "000")

  # 404 is fine — means the gateway is responding (it returns 404 on bare /)
  # 200, 401, 429 also indicate the gateway is alive
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "429" ]; then
    log "OpenClaw gateway is ready! (HTTP $HTTP_CODE after ${i} attempts)"

    # Verify plugin loaded
    PLUGIN_STATUS=$(openclaw plugins list 2>&1 || true)
    if echo "$PLUGIN_STATUS" | grep -q "loaded"; then
      log "Channel plugin loaded successfully"
    else
      log "WARNING: Channel plugin may not be loaded — check 'openclaw plugins list'"
    fi

    log "=========================================="
    log "  OpenClaw startup complete!"
    log "  Gateway:  ws://0.0.0.0:18789"
    log "  Provider: ${LLM_PROVIDER:-anthropic}"
    log "  Model:    ${MODEL}"
    log "  Plugin:   clawed.chat channel"
    log "=========================================="
    exit 0
  fi

  if [ "$((i % 10))" -eq 0 ]; then
    log "  Still waiting... (attempt $i/$MAX_ATTEMPTS, last HTTP code: $HTTP_CODE)"
  fi

  sleep "$SLEEP_INTERVAL"
done

# If we get here, the gateway didn't start in time
TOTAL_SECONDS=$((MAX_ATTEMPTS * SLEEP_INTERVAL))
log "ERROR: OpenClaw gateway not ready after ${TOTAL_SECONDS}s"
log "  Service status:"
systemctl status "$SERVICE_NAME" --no-pager || true
log "  Recent logs:"
journalctl -u "$SERVICE_NAME" --no-pager -n 30 || true

exit 1
