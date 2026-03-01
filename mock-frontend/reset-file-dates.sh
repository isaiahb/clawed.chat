#!/bin/bash
# =============================================================================
# reset-file-dates.sh
# Resets all file metadata (creation date, modification date, access date)
# to today's date for every file in the project.
#
# Works on macOS by recreating each file (copy → delete → copy back) which
# resets the birth time (creation date), then uses touch/SetFile to align
# all other timestamps.
#
# Usage:
#   chmod +x reset-file-dates.sh
#   ./reset-file-dates.sh [optional/path/to/project]
#
# If no path is given, defaults to the directory where this script lives.
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration – directories/files to skip
# ---------------------------------------------------------------------------
EXCLUDE_DIRS="node_modules dist .git .vite"
EXCLUDE_FILES="bun.lock .DS_Store"

# ---------------------------------------------------------------------------
# Resolve project root
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT_NAME="$(basename "$0")"
PROJECT_ROOT="${1:-$SCRIPT_DIR}"

if [ ! -d "$PROJECT_ROOT" ]; then
  echo "❌  Error: '$PROJECT_ROOT' is not a valid directory."
  exit 1
fi

echo "🗂  Project root: $PROJECT_ROOT"

# ---------------------------------------------------------------------------
# Build the find command exclusions
# ---------------------------------------------------------------------------
FIND_CMD="find \"$PROJECT_ROOT\" -type f"
for dir in $EXCLUDE_DIRS; do
  FIND_CMD="$FIND_CMD -not -path '*/$dir/*' -not -path '*/$dir'"
done
for fname in $EXCLUDE_FILES; do
  FIND_CMD="$FIND_CMD -not -name '$fname'"
done
FIND_CMD="$FIND_CMD -not -name '$SCRIPT_NAME'"

# ---------------------------------------------------------------------------
# Today's date in the formats various tools expect
# ---------------------------------------------------------------------------
TODAY_TOUCH=$(date +"%Y%m%d0000.00")          # touch  — YYYYMMDDhhmm.SS
TODAY_SETFILE=$(date +"%m/%d/%Y 00:00:00")    # SetFile — MM/DD/YYYY HH:MM:SS

HAS_SETFILE=false
if command -v SetFile >/dev/null 2>&1; then
  HAS_SETFILE=true
fi

# ---------------------------------------------------------------------------
# Count files
# ---------------------------------------------------------------------------
TOTAL=$(eval "$FIND_CMD" 2>/dev/null | wc -l | tr -d ' ')

if [ "$TOTAL" -eq 0 ]; then
  echo "⚠️  No files found to process."
  exit 0
fi

echo "📄  Found $TOTAL file(s) to reset."
echo ""

# ---------------------------------------------------------------------------
# Process each file
# ---------------------------------------------------------------------------
SUCCESS=0
FAIL=0

eval "$FIND_CMD" 2>/dev/null | while IFS= read -r filepath; do
  relpath="${filepath#"$PROJECT_ROOT"/}"

  # ---- Step 1: Recreate file to reset birth time (macOS creation date) ----
  tmpfile="$(mktemp)"
  if cp "$filepath" "$tmpfile" 2>/dev/null && \
     rm "$filepath" 2>/dev/null && \
     cp "$tmpfile" "$filepath" 2>/dev/null; then

    rm -f "$tmpfile"

    # ---- Step 2: Set modification & access time to today midnight ----
    touch -t "$TODAY_TOUCH" "$filepath" 2>/dev/null

    # ---- Step 3: Set creation date via SetFile if available ----
    if $HAS_SETFILE; then
      SetFile -d "$TODAY_SETFILE" "$filepath" 2>/dev/null || true
      SetFile -m "$TODAY_SETFILE" "$filepath" 2>/dev/null || true
    fi

    SUCCESS=$((SUCCESS + 1))
    printf "  ✅  %s\n" "$relpath"
  else
    # Restore from temp if something went wrong
    if [ -f "$tmpfile" ] && [ ! -f "$filepath" ]; then
      cp "$tmpfile" "$filepath" 2>/dev/null || true
    fi
    rm -f "$tmpfile"

    FAIL=$((FAIL + 1))
    printf "  ❌  %s (failed to recreate)\n" "$relpath"
  fi
done

# ---------------------------------------------------------------------------
# Also reset directory dates
# ---------------------------------------------------------------------------
echo ""
echo "📁  Resetting directory timestamps..."

DIR_CMD="find \"$PROJECT_ROOT\" -type d"
for dir in $EXCLUDE_DIRS; do
  DIR_CMD="$DIR_CMD -not -path '*/$dir/*' -not -path '*/$dir'"
done

DIR_COUNT=0
eval "$DIR_CMD" 2>/dev/null | while IFS= read -r dirpath; do
  touch -t "$TODAY_TOUCH" "$dirpath" 2>/dev/null || true
  if $HAS_SETFILE; then
    SetFile -d "$TODAY_SETFILE" "$dirpath" 2>/dev/null || true
    SetFile -m "$TODAY_SETFILE" "$dirpath" 2>/dev/null || true
  fi
  DIR_COUNT=$((DIR_COUNT + 1))
done
echo "  ✅  Directories updated."

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "============================================="
echo "  📊  Summary"
echo "============================================="
echo "  Total files:     $TOTAL"
echo "============================================="
echo ""

# ---------------------------------------------------------------------------
# Verify with a sample
# ---------------------------------------------------------------------------
SAMPLE=$(eval "$FIND_CMD" 2>/dev/null | head -1)
if [ -n "$SAMPLE" ] && [ -f "$SAMPLE" ]; then
  echo "🔍  Verification (sample: $(basename "$SAMPLE")):"
  stat -f "     Birth:    %SB" -t "%Y-%m-%d %H:%M:%S" "$SAMPLE" 2>/dev/null || true
  stat -f "     Modified: %Sm" -t "%Y-%m-%d %H:%M:%S" "$SAMPLE" 2>/dev/null || true
  stat -f "     Accessed: %Sa" -t "%Y-%m-%d %H:%M:%S" "$SAMPLE" 2>/dev/null || true
  echo ""
fi

echo "🎉  All files reset to today's date!"
