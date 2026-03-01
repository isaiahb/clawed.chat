# bake-image/ — GCP VM Image Baking

> Creates the pre-installed OpenClaw golden image that every user VM boots from.

## Why Bake an Image

Without a pre-baked image, every new user VM would need to:

1. Install Bun (~10s)
2. Install OpenClaw globally (~60s)
3. Install our channel plugin (~30s)
4. Configure systemd service (~10s)

That's 2-3 minutes on top of VM boot time. With a baked image, the VM boots in ~60 seconds and OpenClaw is already installed — the startup script only writes user-specific config and starts the service.

## What the Baked Image Includes

- **OS:** Ubuntu 24.04 LTS (GCP `ubuntu-2404-lts-amd64`)
- **Bun** (latest stable, via `curl -fsSL https://bun.sh/install | bash`)
- **OpenClaw** (latest stable, globally installed via `bun i -g openclaw`)
- **clawed.chat channel plugin** pre-installed in `/home/openclaw/.openclaw/extensions/clawed/`
- **systemd unit file** at `/etc/systemd/system/openclaw.service`
- **Security:** fail2ban, unattended-upgrades, UFW rules for ports 80/443/18789
- **Utilities:** curl, jq, git, htop (for debugging)

## What the Baked Image Does NOT Include

- User-specific LLM API keys (written by VM startup script)
- Browser Use CDP URL (written by VM startup script)
- openclaw.json config (written by VM startup script)
- Any user data

## Prerequisites

- GCP project set up (see `.isaiah/isaiah.md`)
- `gcloud` CLI installed and authenticated
- GCP project set as default: `gcloud config set project <PROJECT_ID>`

## Usage

```bash
# Full bake pipeline — creates VM, provisions, snapshots, cleans up
./bake.sh

# Uses GCP_PROJECT env var (or defaults to clawed-chat)
GCP_PROJECT=clawed-chat ./bake.sh
```

## Image Naming

Images are created in a family called `openclaw-base`:

- `openclaw-base-20260301` — named by date
- `openclaw-base-20260315` — after OpenClaw update
- etc.

The Pulumi program in `app/src/backend/services/instance.pulumi.ts` references the family (`openclaw-base`), so new VMs always get the latest image in that family.

## Estimated Time

| Step | Time |
|------|------|
| Create VM | ~30s |
| Provision (install everything) | ~3-5 min |
| Stop VM + create image | ~2-3 min |
| Cleanup | ~10s |
| **Total** | **~6-8 min** |

## When to Re-Bake

- OpenClaw releases a new version
- Bun major version update
- Channel plugin changes
- Security patches needed on the base image
- Changes to the systemd service configuration

## Files

| File | Description |
|------|-------------|
| `bake.sh` | Main script — runs from local machine, orchestrates the whole pipeline |
| `setup-vm.sh` | Runs inside the builder VM via SSH — installs Bun, OpenClaw, plugin, systemd |
| `startup-script.sh` | Template — injected per-user via GCP metadata, writes config + starts service |

## Hackathon Priority

**Do this first on hackathon day.** The baked image is a prerequisite for the one-click deploy flow. Everything else (dashboard, API, glasses) works against a pre-provisioned instance, but the deploy flow needs this image to exist.