#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SRC="${ROOT_DIR}/desktop/ci/workflows/desktop-release.yml"
DST="${ROOT_DIR}/.github/workflows/desktop-release.yml"

if [[ ! -f "${SRC}" ]]; then
  echo "Missing source workflow template: ${SRC}" >&2
  exit 1
fi

mkdir -p "$(dirname "${DST}")"
cp "${SRC}" "${DST}"
echo "Installed workflow: ${DST}"
