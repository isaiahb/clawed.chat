# Locked-down judge OpenClaw — public-facing demo agent, zero account access.
# Node (not Bun): OpenClaw's message-delivery layer requires node:sqlite,
# which Bun lacks. Node 24 ships node:sqlite as a stable built-in.
FROM node:24-slim

# socat: bridges the Fly private 6PN (IPv6) to the gateway's loopback listener,
# since OpenClaw's bind modes don't expose a non-loopback IPv6 bind.
RUN apt-get update && apt-get install -y --no-install-recommends socat && rm -rf /var/lib/apt/lists/*

# OpenClaw CLI
RUN npm install -g openclaw@2026.6.6

WORKDIR /agent
# Build context is the repo root (fly uses cwd); reference files under agent/
COPY agent/AGENTS.md /agent/AGENTS.md
COPY agent/entrypoint.sh /agent/entrypoint.sh
RUN chmod +x /agent/entrypoint.sh

ENV OPENCLAW_HEADLESS=true
# Gateway listens on Fly's private 6PN only (no public IP allocated for this app)
EXPOSE 18789

CMD ["/agent/entrypoint.sh"]
