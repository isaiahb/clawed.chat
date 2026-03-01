# bake-image/ — GCP VM Image Baking

> Creates the pre-installed OpenClaw golden image that every user VM boots from.

## Why Bake an Image

Without a pre-baked image, every new user VM would need to:

1. Install Node.js 22 (~30s)
2. Install OpenClaw globally (~60s)
3. Pull dependencies (~60s)
4. Configure systemd service (~10s)

That's 2-3 minutes on top of VM boot time. With a baked image, the VM boots in ~60 seconds and OpenClaw is already installed — the startup script only writes user-specific config and starts the service.

## What the Baked Image Includes

- **OS:** Ubuntu 22.04 LTS (GCP `ubuntu-2204-lts`)
- **Node.js 22** via nodesource apt repo
- **OpenClaw** (latest stable, globally installed via `npm install -g openclaw@latest`)
- **systemd unit file** at `/etc/systemd/system/openclaw-gateway.service`
- **Security:** fail2ban, unattended-upgrades, UFW rules for ports 80/443/18789
- **Utilities:** curl, jq, git, htop (for debugging)

## What the Baked Image Does NOT Include

- User-specific LLM API keys (written by VM startup script)
- Browser Use CDP URL (written by VM startup script)
- openclaw.json config (written by VM startup script)
- Any user data

## Prerequisites

- GCP project set up (see `isaiah.md` step 7)
- `gcloud` CLI installed and authenticated
- GCP project set as default: `gcloud config set project <PROJECT_ID>`

## Usage

```bash
# Full bake pipeline — creates VM, provisions, snapshots, cleans up
./bake.sh all

# Or step by step:
./bake.sh create      # 1. Create a temporary e2-small VM
./bake.sh provision    # 2. SSH in and install Node.js + OpenClaw + security
./bake.sh image        # 3. Stop VM, create image from disk
./bake.sh cleanup      # 4. Delete the temporary VM (keep the image)
```

## Image Naming

Images are created in a family called `clawed-chat`:

- `clawed-chat-openclaw-v1` — first bake
- `clawed-chat-openclaw-v2` — after OpenClaw update
- etc.

The Pulumi program in `app/src/backend/services/instance.pulumi.ts` references the family (`clawed-chat`), so new VMs always get the latest image in that family.

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
- Node.js major version update
- Security patches needed on the base image
- Changes to the systemd service configuration

## Files (planned)

| File | Description |
|------|-------------|
| `bake.sh` | Main bake script — create, provision, image, cleanup |
| `provision.sh` | Runs inside the VM via SSH — installs everything |
| `openclaw-gateway.service` | systemd unit file copied into the image |

## Hackathon Priority

**Do this first on hackathon day.** The baked image is a prerequisite for the one-click deploy flow. Everything else (dashboard, API, glasses) works against a pre-provisioned instance, but the deploy flow needs this image to exist.