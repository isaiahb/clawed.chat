#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACTS_DIR="${ROOT_DIR}/artifacts"

required_vars=(
  CLOUDFLARE_ACCOUNT_ID
  CLOUDFLARE_R2_BUCKET
  CLOUDFLARE_R2_ACCESS_KEY_ID
  CLOUDFLARE_R2_SECRET_ACCESS_KEY
)

for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "Missing required env var: ${var_name}" >&2
    exit 1
  fi
done

if ! command -v aws >/dev/null 2>&1; then
  echo "aws CLI not found" >&2
  exit 1
fi

if [[ ! -d "${ARTIFACTS_DIR}" ]]; then
  echo "artifacts directory not found: ${ARTIFACTS_DIR}" >&2
  exit 1
fi

export AWS_ACCESS_KEY_ID="${CLOUDFLARE_R2_ACCESS_KEY_ID}"
export AWS_SECRET_ACCESS_KEY="${CLOUDFLARE_R2_SECRET_ACCESS_KEY}"
export AWS_DEFAULT_REGION="auto"

ENDPOINT="https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"
PREFIX="desktop/releases"

for path in "${ARTIFACTS_DIR}"/*; do
  file_name="$(basename "${path}")"
  aws s3 cp "${path}" "s3://${CLOUDFLARE_R2_BUCKET}/${PREFIX}/${file_name}" \
    --endpoint-url "${ENDPOINT}" \
    --no-progress
  echo "Uploaded: ${file_name}"
done

if [[ -n "${CLOUDFLARE_R2_PUBLIC_BASE_URL:-}" ]]; then
  echo "Public URLs:"
  for path in "${ARTIFACTS_DIR}"/*; do
    file_name="$(basename "${path}")"
    echo "${CLOUDFLARE_R2_PUBLIC_BASE_URL%/}/${PREFIX}/${file_name}"
  done
fi
