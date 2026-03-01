#!/bin/bash
set -euo pipefail

# ─── GCP VM Image Baking Script ──────────────────────────────────────────────
#
# Creates a pre-baked GCP image with Bun + OpenClaw + our channel plugin.
# Run from the repo root: ./scripts/bake-image/bake.sh
#
# The image is used by Pulumi when provisioning per-user VMs.
# With this image, a new VM boots and has OpenClaw ready in ~30s
# (vs 3+ minutes installing from scratch).
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - GCP_PROJECT env var set (or defaults to clawed-chat)
#   - openclaw-channel-clawed/ exists at repo root

PROJECT_ID="${GCP_PROJECT:-clawed-chat}"
ZONE="us-west1-a"
INSTANCE_NAME="openclaw-image-builder-$(date +%s)"
IMAGE_NAME="openclaw-base-$(date +%Y%m%d-%H%M)"
IMAGE_FAMILY="openclaw-base"
MACHINE_TYPE="e2-small"
DISK_SIZE="20GB"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  clawed.chat — GCP Image Baking                        ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Project:  $PROJECT_ID"
echo "║  Zone:     $ZONE"
echo "║  Image:    $IMAGE_NAME"
echo "║  Family:   $IMAGE_FAMILY"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ─── Step 1: Create Builder VM ────────────────────────────────────────────────

echo "==> [1/6] Creating builder VM: $INSTANCE_NAME ..."
gcloud compute instances create "$INSTANCE_NAME" \
  --project="$PROJECT_ID" \
  --zone="$ZONE" \
  --machine-type="$MACHINE_TYPE" \
  --image-family=ubuntu-2404-lts-amd64 \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size="$DISK_SIZE" \
  --quiet

# ─── Step 2: Wait for SSH ─────────────────────────────────────────────────────

echo "==> [2/6] Waiting for SSH to become available ..."
for i in $(seq 1 20); do
  if gcloud compute ssh "$INSTANCE_NAME" \
    --zone="$ZONE" \
    --project="$PROJECT_ID" \
    --command="echo ready" \
    --quiet 2>/dev/null; then
    echo "     SSH is ready."
    break
  fi
  if [ "$i" -eq 20 ]; then
    echo "ERROR: SSH not available after 60s. Aborting."
    exit 1
  fi
  sleep 3
done

# ─── Step 3: Upload Files ─────────────────────────────────────────────────────

echo "==> [3/6] Uploading setup script + channel plugin ..."
gcloud compute scp \
  "$SCRIPT_DIR/setup-vm.sh" \
  "$INSTANCE_NAME":~/setup-vm.sh \
  --zone="$ZONE" \
  --project="$PROJECT_ID" \
  --quiet

gcloud compute scp --recurse \
  "$REPO_ROOT/openclaw-channel-clawed/" \
  "$INSTANCE_NAME":~/openclaw-channel-clawed/ \
  --zone="$ZONE" \
  --project="$PROJECT_ID" \
  --quiet

# ─── Step 4: Run Setup Script ─────────────────────────────────────────────────

echo "==> [4/6] Running setup script inside VM (this takes 2-4 min) ..."
gcloud compute ssh "$INSTANCE_NAME" \
  --zone="$ZONE" \
  --project="$PROJECT_ID" \
  --command="sudo bash ~/setup-vm.sh" \
  --quiet

# ─── Step 5: Stop VM + Create Image ───────────────────────────────────────────

echo "==> [5/6] Stopping VM ..."
gcloud compute instances stop "$INSTANCE_NAME" \
  --zone="$ZONE" \
  --project="$PROJECT_ID" \
  --quiet

echo "     Creating image: $IMAGE_NAME (family: $IMAGE_FAMILY) ..."
gcloud compute images create "$IMAGE_NAME" \
  --project="$PROJECT_ID" \
  --source-disk="$INSTANCE_NAME" \
  --source-disk-zone="$ZONE" \
  --family="$IMAGE_FAMILY" \
  --description="OpenClaw base image with Bun + clawed.chat channel plugin" \
  --quiet

# ─── Step 6: Cleanup ──────────────────────────────────────────────────────────

echo "==> [6/6] Deleting builder VM ..."
gcloud compute instances delete "$INSTANCE_NAME" \
  --zone="$ZONE" \
  --project="$PROJECT_ID" \
  --quiet

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ Image baked successfully!                           ║"
echo "║                                                        ║"
echo "║  Image:  $IMAGE_NAME"
echo "║  Family: $IMAGE_FAMILY"
echo "║                                                        ║"
echo "║  Pulumi will auto-use the latest image in this family. ║"
echo "╚══════════════════════════════════════════════════════════╝"
