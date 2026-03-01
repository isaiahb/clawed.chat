#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACTS_DIR="${ROOT_DIR}/artifacts"
CHANNEL="${1:-stable}"

if [[ ! -d "${ARTIFACTS_DIR}" ]]; then
  echo "artifacts directory not found: ${ARTIFACTS_DIR}" >&2
  exit 1
fi

DMG_PATH="$(find "${ARTIFACTS_DIR}" -maxdepth 1 -type f -name "*-${CHANNEL}.dmg" | sort | tail -n 1 || true)"
if [[ -z "${DMG_PATH}" ]]; then
  DMG_PATH="$(find "${ARTIFACTS_DIR}" -maxdepth 1 -type f -name "*.dmg" | sort | tail -n 1 || true)"
fi

if [[ -z "${DMG_PATH}" ]]; then
  echo "No DMG found in ${ARTIFACTS_DIR}" >&2
  exit 1
fi

TAR_PATH="$(find "${ARTIFACTS_DIR}" -maxdepth 1 -type f -name "*.app.tar.zst" | sort | tail -n 1 || true)"
UPDATE_JSON_PATH="$(find "${ARTIFACTS_DIR}" -maxdepth 1 -type f -name "*-update.json" | sort | tail -n 1 || true)"

VERSION="$(cd "${ROOT_DIR}" && node -p "require('./package.json').version")"
GIT_SHA="$(git -C "${ROOT_DIR}/.." rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
BUILD_TIME_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

DMG_FILE="$(basename "${DMG_PATH}")"
DMG_SHA256="$(shasum -a 256 "${DMG_PATH}" | awk '{print $1}')"
DMG_SIZE="$(stat -f%z "${DMG_PATH}" 2>/dev/null || stat -c%s "${DMG_PATH}")"

cat > "${ARTIFACTS_DIR}/desktop-release-manifest.json" <<JSON
{
  "app": "clawed-chat-desktop",
  "version": "${VERSION}",
  "channel": "${CHANNEL}",
  "platform": "macos-arm64",
  "created_at": "${BUILD_TIME_UTC}",
  "git_sha": "${GIT_SHA}",
  "artifacts": {
    "dmg": {
      "file": "${DMG_FILE}",
      "sha256": "${DMG_SHA256}",
      "size_bytes": ${DMG_SIZE}
    },
    "tarball": "$(basename "${TAR_PATH:-}")",
    "update_json": "$(basename "${UPDATE_JSON_PATH:-}")"
  }
}
JSON

echo "Prepared release manifest: ${ARTIFACTS_DIR}/desktop-release-manifest.json"
echo "DMG: ${DMG_FILE}"
echo "SHA256: ${DMG_SHA256}"
