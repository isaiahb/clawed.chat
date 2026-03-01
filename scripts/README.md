# scripts/ — Build & Utility Scripts

> Helper scripts for image baking, deployment, and development utilities.

## What Lives Here

| Folder/File | Description |
|-------------|-------------|
| `bake-image/` | GCP VM image baking — creates the pre-installed OpenClaw image that user VMs boot from |

## bake-image/

The pre-baked GCP image is critical for fast deploys. Instead of installing Node.js + OpenClaw on every new VM (10+ minutes), we create a golden image once and boot from it (~60 seconds).

### What the baked image includes

- Ubuntu 22.04 LTS
- Node.js 22 (via nodesource)
- OpenClaw (latest, globally installed via npm)
- systemd unit file for `openclaw-gateway` service
- Basic security hardening (fail2ban, unattended-upgrades)
- Pre-pulled Browser Use CDP dependencies

### How to bake (when GCP is set up)

```bash
cd scripts/bake-image

# 1. Create a temporary VM
./bake.sh create

# 2. SSH in and install everything
./bake.sh provision

# 3. Create the image from the VM's disk
./bake.sh image

# 4. Clean up the temporary VM
./bake.sh cleanup
```

### When to re-bake

- OpenClaw releases a new version
- Node.js needs updating
- Security patches
- Config changes to the base image

## Adding New Scripts

- Keep scripts focused — one task per script
- Use bash for simple ops, TypeScript (via Bun) for complex logic
- Add a section to this README for each new script

## Style

- No semicolons, double quotes, trailing commas, `{thing}` not `{ thing }` (for TypeScript scripts)
- Bash scripts: `set -euo pipefail` at the top