#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-isaiahb/clawed.chat}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
APP_ENV_PATH="${ROOT_DIR}/app/.env"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required" >&2
  exit 1
fi

if [[ ! -f "${APP_ENV_PATH}" ]]; then
  echo "Missing app/.env at ${APP_ENV_PATH}" >&2
  exit 1
fi

CF_TOKEN="$(awk -F= '/^CLOUDFLARE_API_TOKEN=/{print $2}' "${APP_ENV_PATH}" | tail -n 1 | tr -d '\"')"
ZONE_ID="$(awk -F= '/^CLOUDFLARE_ZONE_ID=/{print $2}' "${APP_ENV_PATH}" | tail -n 1 | tr -d '\"')"

if [[ -z "${CF_TOKEN}" || -z "${ZONE_ID}" ]]; then
  echo "CLOUDFLARE_API_TOKEN or CLOUDFLARE_ZONE_ID missing in app/.env" >&2
  exit 1
fi

ACCOUNT_ID="$(curl -fsSL -H "Authorization: Bearer ${CF_TOKEN}" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}" | jq -r '.result.account.id')"
if [[ -z "${ACCOUNT_ID}" || "${ACCOUNT_ID}" == "null" ]]; then
  echo "Unable to derive Cloudflare account id from zone" >&2
  exit 1
fi

echo "Setting repo variables for ${REPO}"
gh variable set DESKTOP_CLOUDFLARE_ACCOUNT_ID --repo "${REPO}" --body "${ACCOUNT_ID}"
gh variable set DESKTOP_CLOUDFLARE_R2_BUCKET --repo "${REPO}" --body "clawed-desktop-downloads"
gh variable set DESKTOP_CLOUDFLARE_R2_PUBLIC_BASE_URL --repo "${REPO}" --body "https://downloads.clawed.chat"

echo "Setting desktop release token secret (reuses existing Cloudflare API token)"
printf "%s" "${CF_TOKEN}" | gh secret set DESKTOP_CLOUDFLARE_API_TOKEN --repo "${REPO}"

echo "Done. Next: create R2 bucket/API keys and set DESKTOP_CLOUDFLARE_R2_ACCESS_KEY_ID + DESKTOP_CLOUDFLARE_R2_SECRET_ACCESS_KEY"
