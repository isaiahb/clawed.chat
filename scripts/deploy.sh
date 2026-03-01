#!/bin/bash
set -euo pipefail

# ─── Manual Deploy Script ────────────────────────────────────────────────────
#
# Deploys the clawed.chat backend to the GCP VM manually.
# Use this when you don't want to wait for CI/CD, or for first-time setup.
#
# Usage:
#   ./scripts/deploy.sh              # deploy to default server
#   ./scripts/deploy.sh --setup      # first-time setup (installs Bun, Pulumi, systemd)
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - GCP_PROJECT env var set (or defaults to clawed-chat)
#   - app/.env file exists with all secrets

PROJECT="${GCP_PROJECT:-clawed-chat}"
ZONE="${GCP_ZONE:-us-west1-a}"
SERVER="clawed-chat-server"
APP_DIR="/opt/clawed-chat"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  clawed.chat — Manual Deploy                            ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Project:  $PROJECT"
echo "║  Zone:     $ZONE"
echo "║  Server:   $SERVER"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Check that app/.env exists
if [ ! -f "$REPO_ROOT/app/.env" ]; then
  echo "ERROR: app/.env not found. Copy .env.example and fill in your keys."
  exit 1
fi

# ─── First-Time Setup ─────────────────────────────────────────────────────────

if [ "${1:-}" = "--setup" ]; then
  echo "==> [Setup] Installing Bun + Pulumi on server..."

  gcloud compute ssh "$SERVER" --zone="$ZONE" --project="$PROJECT" --command="bash -s" << 'SETUP_EOF'
    set -euo pipefail

    echo "==> Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    ln -sf /root/.bun/bin/bun /usr/local/bin/bun
    ln -sf /root/.bun/bin/bunx /usr/local/bin/bunx
    echo "    Bun $(bun --version)"

    echo "==> Installing Pulumi..."
    curl -fsSL https://get.pulumi.com | bash
    ln -sf /root/.pulumi/bin/pulumi /usr/local/bin/pulumi
    echo "    Pulumi $(pulumi version)"

    echo "==> Installing utilities..."
    apt-get update -qq && apt-get install -y -qq jq git curl unzip

    echo "==> Creating app directory..."
    mkdir -p /opt/clawed-chat/app

    echo "==> Setup complete!"
SETUP_EOF

  echo ""
  echo "Setup done. Run again without --setup to deploy."
  exit 0
fi

# ─── Deploy ───────────────────────────────────────────────────────────────────

echo "==> [1/5] Uploading code to server..."

# Rsync the repo (excluding stuff we don't need on the server)
gcloud compute scp --recurse \
  --zone="$ZONE" \
  --project="$PROJECT" \
  --compress \
  "$REPO_ROOT" "${SERVER}:${APP_DIR}-new" \
  -- --exclude='.git' \
     --exclude='node_modules' \
     --exclude='.repos' \
     --exclude='.isaiah' \
     --exclude='desktop/build' \
     --exclude='.env' \
     --exclude='.env.*' \
     --exclude='!.env.example'

echo "==> [2/5] Uploading secrets..."

# Upload the .env file separately (not in git)
gcloud compute scp --zone="$ZONE" --project="$PROJECT" \
  "$REPO_ROOT/app/.env" \
  "${SERVER}:${APP_DIR}-new/app/.env"

# Upload GCP service account key if it exists
SA_KEY="${GOOGLE_APPLICATION_CREDENTIALS:-$HOME/.config/gcloud/clawed-chat-sa-key.json}"
if [ -f "$SA_KEY" ]; then
  gcloud compute scp --zone="$ZONE" --project="$PROJECT" \
    "$SA_KEY" \
    "${SERVER}:/opt/gcp-sa-key.json"

  # Make sure .env points to the right key path
  gcloud compute ssh "$SERVER" --zone="$ZONE" --project="$PROJECT" --command="
    if ! grep -q 'GOOGLE_APPLICATION_CREDENTIALS' ${APP_DIR}-new/app/.env 2>/dev/null; then
      echo 'GOOGLE_APPLICATION_CREDENTIALS=/opt/gcp-sa-key.json' >> ${APP_DIR}-new/app/.env
    else
      sed -i 's|GOOGLE_APPLICATION_CREDENTIALS=.*|GOOGLE_APPLICATION_CREDENTIALS=/opt/gcp-sa-key.json|' ${APP_DIR}-new/app/.env
    fi
  "
else
  echo "    WARNING: Service account key not found at $SA_KEY"
  echo "    Pulumi Automation API won't work without it"
fi

echo "==> [3/5] Installing dependencies on server..."

gcloud compute ssh "$SERVER" --zone="$ZONE" --project="$PROJECT" --command="
  set -euo pipefail
  export PATH='/root/.bun/bin:/usr/local/bin:\$PATH'
  cd ${APP_DIR}-new
  bun install --production
"

echo "==> [4/5] Swapping and restarting..."

gcloud compute ssh "$SERVER" --zone="$ZONE" --project="$PROJECT" --command="bash -s" << 'DEPLOY_EOF'
  set -euo pipefail
  export PATH="/root/.bun/bin:/usr/local/bin:$PATH"

  APP_DIR="/opt/clawed-chat"

  # Swap directories (near-zero downtime)
  if [ -d "$APP_DIR" ] && [ ! -d "${APP_DIR}-new" ]; then
    echo "ERROR: New deploy directory not found"
    exit 1
  fi

  rm -rf "${APP_DIR}-old"
  if [ -d "$APP_DIR" ]; then
    mv "$APP_DIR" "${APP_DIR}-old"
  fi
  mv "${APP_DIR}-new" "$APP_DIR"

  # Create/update systemd service
  cat > /etc/systemd/system/clawed-chat.service << 'SYSTEMD'
[Unit]
Description=clawed.chat Hono/Bun Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/clawed-chat/app
ExecStart=/root/.bun/bin/bun run start
Restart=always
RestartSec=3
Environment=NODE_ENV=production
Environment=PATH=/root/.bun/bin:/root/.pulumi/bin:/usr/local/bin:/usr/bin:/bin
EnvironmentFile=/opt/clawed-chat/app/.env

NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/opt/clawed-chat /tmp /root/.pulumi
PrivateTmp=true

[Install]
WantedBy=multi-user.target
SYSTEMD

  systemctl daemon-reload
  systemctl enable clawed-chat
  systemctl restart clawed-chat

  # Wait for health check
  echo "Waiting for server to start..."
  for i in $(seq 1 20); do
    if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
      echo "Server is healthy!"
      rm -rf "${APP_DIR}-old"
      exit 0
    fi
    sleep 3
  done

  echo "WARNING: Health check failed — rolling back"
  if [ -d "${APP_DIR}-old" ]; then
    rm -rf "$APP_DIR"
    mv "${APP_DIR}-old" "$APP_DIR"
    systemctl restart clawed-chat
    echo "Rolled back to previous version"
  fi
  exit 1
DEPLOY_EOF

echo "==> [5/5] Verifying..."

# Get the server IP and test
SERVER_IP=$(gcloud compute instances describe "$SERVER" \
  --zone="$ZONE" \
  --project="$PROJECT" \
  --format="get(networkInterfaces[0].accessConfigs[0].natIp)" 2>/dev/null || echo "unknown")

HEALTH=$(curl -sf "http://${SERVER_IP}:3000/api/health" 2>/dev/null || echo '{"status":"unreachable"}')

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ Deploy complete!                                     ║"
echo "║                                                          ║"
echo "║  Server IP:  $SERVER_IP"
echo "║  Health:     $HEALTH"
echo "║  Dashboard:  http://${SERVER_IP}:3000"
echo "║  API:        http://${SERVER_IP}:3000/api/health"
echo "╚══════════════════════════════════════════════════════════╝"
