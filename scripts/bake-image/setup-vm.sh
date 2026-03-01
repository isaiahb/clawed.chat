#!/bin/bash
set -euo pipefail

# ─── VM Setup Script for GCP Image Baking ────────────────────────────────────
#
# This script runs INSIDE the builder VM during image baking.
# It installs everything needed for OpenClaw to run natively:
#   - Bun (latest stable)
#   - OpenClaw (latest, globally installed via bun)
#   - Our clawed.chat channel plugin
#   - systemd service for OpenClaw gateway
#   - Security hardening (UFW, fail2ban, unattended-upgrades)
#
# After this script completes, the VM disk is snapshotted into a GCP image.
# Per-user config (API keys, tokens) is injected later via startup script.

echo "════════════════════════════════════════════════════════════"
echo "  clawed.chat — VM Image Setup"
echo "════════════════════════════════════════════════════════════"

# ─── System Update ────────────────────────────────────────────────────────────

echo ""
echo "==> [1/8] Updating system packages ..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq

# ─── Install System Utilities ─────────────────────────────────────────────────

echo ""
echo "==> [2/8] Installing utilities ..."
apt-get install -y -qq \
  curl \
  jq \
  git \
  htop \
  unzip \
  ufw \
  fail2ban \
  unattended-upgrades

# ─── Install Bun ──────────────────────────────────────────────────────────────

echo ""
echo "==> [3/8] Installing Bun ..."
curl -fsSL https://bun.sh/install | bash

# Make bun available system-wide (installer puts it in ~/.bun/bin)
ln -sf /root/.bun/bin/bun /usr/local/bin/bun
ln -sf /root/.bun/bin/bunx /usr/local/bin/bunx

echo "     Bun version: $(bun --version)"

# ─── Install OpenClaw ─────────────────────────────────────────────────────────

echo ""
echo "==> [4/8] Installing OpenClaw ..."
bun i -g openclaw@latest

# Link openclaw binary system-wide
OPENCLAW_BIN=$(find /root/.bun -name "openclaw" -type f -path "*/bin/*" 2>/dev/null | head -1)
if [ -n "$OPENCLAW_BIN" ]; then
  ln -sf "$OPENCLAW_BIN" /usr/local/bin/openclaw
fi

echo "     OpenClaw version: $(openclaw --version 2>/dev/null || echo 'installed')"

# ─── Create openclaw User ────────────────────────────────────────────────────

echo ""
echo "==> [5/8] Creating openclaw system user ..."
if ! id -u openclaw &>/dev/null; then
  useradd -m -s /bin/bash openclaw
fi

# Install bun for the openclaw user too
sudo -u openclaw bash -c 'curl -fsSL https://bun.sh/install | bash'

# Set up OpenClaw directory structure
sudo -u openclaw mkdir -p /home/openclaw/.openclaw/{workspace,extensions,credentials}
chmod 700 /home/openclaw/.openclaw/credentials

# ─── Install clawed.chat Channel Plugin ───────────────────────────────────────

echo ""
echo "==> [6/8] Installing clawed.chat channel plugin ..."
if [ -d /root/openclaw-channel-clawed ]; then
  cp -r /root/openclaw-channel-clawed/ /home/openclaw/.openclaw/extensions/clawed/
  cd /home/openclaw/.openclaw/extensions/clawed

  # Install plugin dependencies if any
  if [ -f package.json ]; then
    sudo -u openclaw /home/openclaw/.bun/bin/bun install --production 2>/dev/null || true
  fi

  chown -R openclaw:openclaw /home/openclaw/.openclaw/
  echo "     Plugin installed to ~/.openclaw/extensions/clawed/"
else
  echo "     WARNING: openclaw-channel-clawed/ not found, skipping plugin install"
fi

# ─── Create systemd Service ──────────────────────────────────────────────────

echo ""
echo "==> [7/8] Creating systemd service ..."
cat > /etc/systemd/system/openclaw.service << 'SYSTEMD_EOF'
[Unit]
Description=OpenClaw Gateway
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=openclaw
Group=openclaw
Environment=NODE_ENV=production
Environment=HOME=/home/openclaw
Environment=PATH=/home/openclaw/.bun/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/home/openclaw/.bun/bin/bun x openclaw gateway
Restart=always
RestartSec=5
WorkingDirectory=/home/openclaw

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/home/openclaw/.openclaw
PrivateTmp=true

[Install]
WantedBy=multi-user.target
SYSTEMD_EOF

systemctl daemon-reload
systemctl enable openclaw

# Don't start yet — config doesn't exist until the startup script runs
echo "     Service created and enabled (will start on first boot with config)"

# ─── Firewall & Security ─────────────────────────────────────────────────────

echo ""
echo "==> [8/8] Configuring firewall and security ..."

# UFW
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 18789/tcp  # OpenClaw gateway
ufw --force enable

# fail2ban — use defaults (protects SSH)
systemctl enable fail2ban
systemctl start fail2ban

# Enable unattended security upgrades
cat > /etc/apt/apt.conf.d/20auto-upgrades << 'APT_EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
APT_EOF

# ─── Cleanup ─────────────────────────────────────────────────────────────────

echo ""
echo "==> Cleaning up ..."
apt-get clean -qq
rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
rm -f /root/setup-vm.sh
rm -rf /root/openclaw-channel-clawed/

# Clear bash history so no secrets leak into the image
history -c
> /root/.bash_history
> /home/openclaw/.bash_history 2>/dev/null || true

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ VM image setup complete!"
echo ""
echo "  Installed:"
echo "    - Bun $(bun --version)"
echo "    - OpenClaw $(openclaw --version 2>/dev/null || echo 'latest')"
echo "    - clawed.chat channel plugin"
echo "    - systemd service (openclaw.service)"
echo "    - UFW firewall (22, 80, 443, 18789)"
echo "    - fail2ban + unattended-upgrades"
echo ""
echo "  Ready to snapshot into a GCP image."
echo "════════════════════════════════════════════════════════════"
