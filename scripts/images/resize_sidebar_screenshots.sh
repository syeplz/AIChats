#!/usr/bin/env bash
set -euo pipefail

# Normalize the store screenshots to a 1280x800 canvas: scale each image to fit
# within 1280x800 using the Lanczos resampling filter (preserving aspect ratio),
# then pad the remaining area with a transparent background, centered.
#
# Output is written next to this script (never over the source files) under
# output/<lang>/sidebar.png, mirroring the assets layout so the en/zh shots do
# not collide. The output directory is created on demand.
#
# Usage: bash scripts/images/resize_sidebar_screenshots.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUT_DIR="$SCRIPT_DIR/output"
cd "$ROOT_DIR"

if command -v magick >/dev/null 2>&1; then
  MAGICK=magick
elif command -v convert >/dev/null 2>&1; then
  MAGICK=convert
else
  echo "error: ImageMagick not found (need 'magick' or 'convert')" >&2
  exit 1
fi

# Source paths relative to the repo root; outputs mirror this layout under OUT_DIR.
TARGETS=(
  assets/en/sidebar.png
  assets/zh/sidebar.png
)

for img in "${TARGETS[@]}"; do
  if [ ! -f "$img" ]; then
    echo "error: missing file: $img" >&2
    exit 1
  fi

  # Keep the en/zh segment (strip the leading assets/) so outputs never clash.
  out="$OUT_DIR/${img#assets/}"
  mkdir -p "$(dirname "$out")"
  "$MAGICK" "$img" -filter Lanczos -resize 1280x800 -background none \
    -gravity center -extent 1280x800 "$out"
  echo "resized $img -> $out"
done
