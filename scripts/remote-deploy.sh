#!/bin/bash
set -euo pipefail

# ─── Remote Deploy Script ────────────────────────────────────────────────────
#
# This script runs ON the GCP VM (not locally).
# It's uploaded by CI/CD or the manual deploy script, then executed via SSH.
#
# What it does:
#   1. Installs Bun if not present
#   2. Installs dependencies
#   3. Swaps the old deploy with the new one (near-zero downtime)
#   4. Creates/updates the systemd service
#   5. Restarts the server
#   6. Runs a health check (rolls back on failure)
#
# Usage (called by CI or scripts/deploy.sh):
#   bash /opt/clawed-chat-new/scripts/remote-deploy.sh

APP_DIR="/opt/clawed-chat"
NEW_DIR="${APP_DIR}-new"
OLD_DIR="${APP_DIR}-old"

log() {
  echo "[deploy] $(date '+%H:%M:%S') $*"
}

# ─── Step 0: Ensure prerequisites ────────────────────────────────────────────

if ! command -v unzip &> /dev/null; then
  log "Installing prerequisites..."
  apt-get update -qq && apt-get install -y -qq unzip jq curl git 2>&1 | tail -1
else
  log "Prerequisites already installed, skipping"
fi

# ─── Step 1: Install Bun ─────────────────────────────────────────────────────

log "Checking Bun installation..."

export PATH="/root/.bun/bin:/root/.pulumi/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

if ! command -v bun &> /dev/null; then
  log "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  ln -sf /root/.bun/bin/bun /usr/local/bin/bun
  ln -sf /root/.bun/bin/bunx /usr/local/bin/bunx
fi

log "Bun $(bun --version)"

# ─── Step 2: Install Pulumi (for Automation API at runtime) ───────────────────

if ! command -v pulumi &> /dev/null; then
  log "Installing Pulumi..."
  curl -fsSL https://get.pulumi.com | bash
  ln -sf /root/.pulumi/bin/pulumi /usr/local/bin/pulumi
fi

# ─── Step 3: Install Dependencies ────────────────────────────────────────────

if [ ! -d "$NEW_DIR" ]; then
  log "ERROR: New deploy directory not found at $NEW_DIR"
  exit 1
fi

log "Installing dependencies..."
cd "$NEW_DIR"
# Note: We install ALL deps (not --production) because Bun's serve-time bundler
# needs devDependencies like tailwindcss and bun-plugin-tailwind to compile the frontend.
bun install 2>&1 | tail -3

# ─── Step 4: Fix GOOGLE_APPLICATION_CREDENTIALS path ─────────────────────────

if [ -f "$NEW_DIR/app/.env" ]; then
  if grep -q "GOOGLE_APPLICATION_CREDENTIALS" "$NEW_DIR/app/.env"; then
    sed -i 's|GOOGLE_APPLICATION_CREDENTIALS=.*|GOOGLE_APPLICATION_CREDENTIALS=/opt/gcp-sa-key.json|' "$NEW_DIR/app/.env"
  else
    echo "GOOGLE_APPLICATION_CREDENTIALS=/opt/gcp-sa-key.json" >> "$NEW_DIR/app/.env"
  fi
fi

# ─── Step 5: Swap Directories ────────────────────────────────────────────────

log "Swapping deploy directories..."

rm -rf "$OLD_DIR"

if [ -d "$APP_DIR" ]; then
  mv "$APP_DIR" "$OLD_DIR"
fi

mv "$NEW_DIR" "$APP_DIR"

# ─── Step 6: Create/Update systemd Service ───────────────────────────────────

log "Updating systemd service..."

cat > /etc/systemd/system/clawed-chat.service << 'SYSTEMD_EOF'
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
Environment=PATH=/root/.bun/bin:/root/.pulumi/bin:/usr/local/bin:/usr/bin:/bin
EnvironmentFile=/opt/clawed-chat/app/.env
Environment=PORT=80

# Security
NoNewPrivileges=false
AmbientCapabilities=CAP_NET_BIND_SERVICE
ProtectSystem=strict
ReadWritePaths=/opt/clawed-chat /tmp /root/.pulumi
PrivateTmp=true

[Install]
WantedBy=multi-user.target
SYSTEMD_EOF

systemctl daemon-reload
systemctl enable clawed-chat

# ─── Step 7: Restart ─────────────────────────────────────────────────────────

log "Restarting server..."
systemctl restart clawed-chat

# ─── Step 8: Health Check ────────────────────────────────────────────────────

log "Waiting for health check..."

MAX_ATTEMPTS=20
SLEEP_INTERVAL=3

for i in $(seq 1 $MAX_ATTEMPTS); do
  if curl -sf http://localhost:80/api/health > /dev/null 2>&1; then
    HEALTH=$(curl -sf http://localhost:80/api/health)
    log "Server is healthy! $HEALTH"
    rm -rf "$OLD_DIR"
    log "Deploy complete!"
    exit 0
  fi

  if [ "$((i % 5))" -eq 0 ]; then
    log "Still waiting... (attempt $i/$MAX_ATTEMPTS)"
  fi

  sleep $SLEEP_INTERVAL
done

# ─── Rollback on Failure ─────────────────────────────────────────────────────

log "ERROR: Health check failed after $((MAX_ATTEMPTS * SLEEP_INTERVAL))s"
log "Checking service status..."
systemctl status clawed-chat --no-pager || true
log "Recent logs:"
journalctl -u clawed-chat --no-pager -n 20 || true

if [ -d "$OLD_DIR" ]; then
  log "Rolling back to previous version..."
  rm -rf "$APP_DIR"
  mv "$OLD_DIR" "$APP_DIR"
  systemctl restart clawed-chat
  sleep 5

  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    log "Rollback successful — previous version is running"
  else
    log "WARNING: Rollback also failed — manual intervention needed"
  fi
fi

exit 1
