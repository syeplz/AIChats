#!/usr/bin/env bash
set -euo pipefail

# Build the Chrome Web Store upload package as aichats-store-v<version>.zip.
# Contents follow the v1.0.3 package layout (extension sources + store docs +
# assets), excluding local-only artifacts (.DS_Store, _metadata, .git, docs,
# .opencode, and previous zip files).

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

VERSION="$(grep -o '"version": *"[0-9.]*"' manifest.json | head -n1 | grep -o '[0-9.]*' || true)"
if [ -z "$VERSION" ]; then
  echo "error: could not read version from manifest.json" >&2
  exit 1
fi

OUT="aichats-store-v${VERSION}.zip"
rm -f "$OUT"

FILES=(
  manifest.json
  rules.json
  background.js
  chatList.js
  content.js
  favicon.js
  i18n.js
  options.js
  sidepanel.js
  standalone.js
  store.js
  theme.js
  options.css
  options.html
  sidepanel.css
  sidepanel.html
  standalone.css
  standalone.html
  theme.css
  README.md
  PRIVACY.md
  CHANGELOG.md
  LICENSE
  icons
  prompts
  _locales
  scripts
  assets
)

for f in "${FILES[@]}"; do
  if [ ! -e "$f" ]; then
    echo "error: missing file: $f" >&2
    exit 1
  fi
done

zip -r "$OUT" "${FILES[@]}" -x '*.DS_Store'

echo "created $OUT (manifest version $VERSION)"
