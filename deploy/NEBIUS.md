# Nebius VM Runbook — replacing the GCP backend

> GCP billing took the backend down (June 2026). Buildership hands out Nebius
> credits — moving compute there fixes the outage AND completes the
> all-sponsor stack. This is the manual runbook; port `deploy/index.ts` to the
> Nebius Terraform provider later if per-user provisioning needs to scale.

## 1. Create the VM (Nebius console or CLI)

- Image: **Ubuntu 24.04 LTS**, smallest CPU preset is fine (2 vCPU / 8GB)
- Open inbound: **80/443** (app), **18789** (OpenClaw gateway — restrict to
  backend IP + your phone's network if possible)
- Add your SSH key

## 2. Provision (same recipe as the GCP startup script)

```bash
ssh ubuntu@<vm-ip>

# Bun
curl -fsSL https://bun.sh/install | bash && source ~/.bashrc

# App
sudo mkdir -p /opt/clawed-chat && sudo chown $USER /opt/clawed-chat
git clone https://github.com/isaiahb/clawed.chat.git /opt/clawed-chat/app
cd /opt/clawed-chat/app && bun install
cp .env.example app/.env   # fill in: Convex, Clerk, NEBIUS_API_KEY, TAVILY_API_KEY,
                           # VISION_API_TOKEN, OPENCLAW_GATEWAY_URL/TOKEN

# OpenClaw (native, Bun)
bun i -g openclaw
mkdir -p ~/.openclaw/extensions/clawed
cp -r openclaw-channel-clawed/* ~/.openclaw/extensions/clawed/
# point OpenClaw's model provider at the LLM proxy (Nebius-backed):
#   baseUrl: http://localhost:3000/api/llm-proxy/v1   apiKey: <instance token>

# systemd units (app on :80, openclaw gateway on :18789) — copy from
# deploy/index.ts startupScript section, drop the GCP metadata bits
```

## 3. Cut DNS over

In Cloudflare: point `clawed.chat` A record (and `*.clawed.chat`) at the
Nebius VM IP, proxied. The marketing site stays on Pages regardless — only
`/api/*` and the dashboard need the VM. **Also update `deploy/index.ts`** (or
disable the GitHub Action) so CI's `pulumi up` doesn't fight the new records.

## 4. Smoke test

```bash
curl https://clawed.chat/api/health                 # {"status":"ok"}
curl https://clawed.chat/api/llm-proxy/v1/models -H "Authorization: Bearer test"
curl -X POST https://clawed.chat/api/judge -d '{"message":"hello"}' -H "Content-Type: application/json"
# glasses miniapp settings → ws://<vm-ip>:18789 + gateway token → say "Hey Clawed"
```

## CI note

`.github/workflows/deploy.yml` SSHes into the VM by IP from Pulumi outputs.
Short-term: hardcode the Nebius IP as a repo secret (`DEPLOY_HOST`) and skip
the Pulumi infra phase. Long-term: Nebius Terraform provider.
