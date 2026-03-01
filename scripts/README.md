# scripts/ — Build & Utility Scripts

> Helper scripts for image baking, deployment, and development utilities.

## What Lives Here

| Folder/File | Description |
|-------------|-------------|
| `bake-image/` | GCP VM image baking — creates the pre-installed OpenClaw image that user VMs boot from |

## bake-image/

The pre-baked GCP image is critical for fast deploys. Instead of installing Bun + OpenClaw on every new VM (10+ minutes), we create a golden image once and boot from it (~60 seconds).

### What the baked image includes

- Ubuntu 24.04 LTS
- Bun (latest, via curl installer)
- OpenClaw (latest, globally installed via `bun i -g openclaw`)
- Our `clawed` channel plugin (pre-installed in `~/.openclaw/extensions/clawed/`)
- systemd unit file for `openclaw` service
- Basic security hardening (fail2ban, unattended-upgrades)
- UFW firewall rules (ports 80/443/18789)

### How to bake (when GCP is set up)

```bash
cd scripts/bake-image

# Full pipeline — creates VM, provisions, snapshots, cleans up
./bake.sh

# Or see bake-image/README.md for step-by-step
```

### When to re-bake

- OpenClaw releases a new version
- Bun needs updating
- Security patches
- Channel plugin changes
- Config changes to the base image

## Adding New Scripts

- Keep scripts focused — one task per script
- Use bash for simple ops, TypeScript (via Bun) for complex logic
- Add a section to this README for each new script

## Style

- No semicolons, double quotes, trailing commas, `{thing}` not `{ thing }` (for TypeScript scripts)
- Bash scripts: `set -euo pipefail` at the top