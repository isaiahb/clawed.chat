# deploy/ — Our Own Infrastructure (CI/CD)

> Pulumi config that deploys the clawed.chat backend (Hono/Bun server) to GCP. This is NOT the per-user provisioning.

## Two Kinds of Pulumi in This Project

| | `deploy/` (this folder) | `app/src/backend/services/instance.pulumi.ts` |
|---|---|---|
| **Purpose** | Deploy OUR backend server | Deploy PER-USER OpenClaw VMs |
| **How it runs** | `pulumi up` via CLI or GitHub Actions | Pulumi Automation API called by Hono route handlers |
| **How many stacks** | 1 (or 2: dev + prod) | 1 per user (hundreds/thousands) |
| **When it runs** | On push to main | On user click "Deploy" in dashboard |
| **What it creates** | 1 GCP VM + firewall + DNS for clawed.chat itself | 1 GCP VM + DNS per user instance |

## What This Creates

- **GCP Compute Engine VM** — runs the Hono/Bun server (`app/`)
- **Static external IP** — so DNS doesn't change on reboot
- **Firewall rules** — allow HTTP (80), HTTPS (443), dev (3000)
- **Cloudflare DNS** — `clawed.chat` root + `*.clawed.chat` wildcard → server IP

## Setup

### Prerequisites

1. GCP project created and configured (see `.isaiah/isaiah.md` step 7)
2. Cloudflare zone for `clawed.chat` (see `.isaiah/isaiah.md` step 8)
3. Pulumi CLI installed and logged in (see `.isaiah/isaiah.md` step 9)

### First-Time Config

```bash
cd deploy
bun install

# Create a stack (dev or prod)
pulumi stack init dev

# Set required config
pulumi config set gcp-project <your-gcp-project-id>
pulumi config set cloudflare-zone-id <your-zone-id>

# Optional overrides (defaults shown)
pulumi config set gcp-zone us-west1-a
pulumi config set gcp-region us-west1
pulumi config set domain clawed.chat
```

### Deploy

```bash
# Preview changes
pulumi preview

# Apply changes
pulumi up

# Tear down (careful!)
pulumi destroy
```

## GitHub Actions (CI/CD)

On push to `main`, `.github/workflows/deploy.yml` runs `pulumi up` automatically.

Required GitHub secrets:
- `PULUMI_ACCESS_TOKEN`
- `GCP_CREDENTIALS` (service account JSON, base64-encoded)
- `CLOUDFLARE_API_TOKEN`

## Files

| File | Description |
|------|-------------|
| `index.ts` | Pulumi program — defines all infrastructure resources |
| `Pulumi.yaml` | Pulumi project metadata (name, runtime, description) |
| `Pulumi.dev.yaml` | Stack config for dev environment (created by `pulumi config set`) |
| `Pulumi.prod.yaml` | Stack config for production (created later) |
| `package.json` | Dependencies: `@pulumi/pulumi`, `@pulumi/gcp`, `@pulumi/cloudflare` |

## Hackathon Priority

**Medium.** For the hackathon, we can deploy manually:

```bash
# Quick manual deploy — just rsync to a GCP VM
gcloud compute scp --recurse . clawed-chat-server:/opt/clawed-chat --zone=us-west1-a
gcloud compute ssh clawed-chat-server --zone=us-west1-a -- 'cd /opt/clawed-chat && bun install && systemctl restart clawed-chat'
```

The full Pulumi CI/CD pipeline is for when we want push-to-deploy. Nice to have, not blocking.

## Style

- No semicolons, double quotes, trailing commas, `{thing}` not `{ thing }`
