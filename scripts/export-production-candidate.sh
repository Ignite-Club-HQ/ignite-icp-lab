#!/usr/bin/env bash
# Prepares a curated, production-ready export of this lab's frontend for
# handoff to a brand-new repository the repository owner creates and
# controls. See docs/PRODUCTION_HANDOFF_EXPORT_GUIDE.md for the full
# rationale behind each inclusion/exclusion decision below.
#
# This script never creates, contacts, or pushes to any existing
# repository (lab or production) — it only writes a local export
# directory. Creating the destination repository and pushing to it are
# left to the repository owner, on purpose.
#
# Usage:
#   bash scripts/export-production-candidate.sh [destination-dir]
set -euo pipefail

SRC_ROOT="$(git rev-parse --show-toplevel)"
EXPORT_DIR="${1:-$HOME/ignite-club-hq-production-export}"

if [ ! -d "$SRC_ROOT/frontend" ]; then
  echo "error: expected $SRC_ROOT/frontend to exist" >&2
  exit 1
fi

rm -rf "$EXPORT_DIR"
mkdir -p "$EXPORT_DIR"

rsync -a "$SRC_ROOT/frontend/" "$EXPORT_DIR/" \
  --exclude 'dist/' \
  --exclude 'dist-live/' \
  --exclude 'dist-product/' \
  --exclude 'node_modules/' \
  --exclude 'index.html' \
  --exclude 'src/main.tsx' \
  --exclude 'src/lab/LabApp.tsx' \
  --exclude 'product-index.html' \
  --exclude 'vite.product.config.ts' \
  --exclude 'lab-tests/' \
  --exclude 'lab-runtime-files.json' \
  --exclude 'lab-route-classification.json' \
  --exclude 'vitest.lab.config.mjs' \
  --exclude 'scripts/check-isolation.mjs' \
  --exclude 'scripts/check-production-secrets.mjs' \
  --exclude 'scripts/check-live-config.mjs' \
  --exclude 'duplication-baseline.json' \
  --exclude 'quality-baseline.json' \
  --exclude 'product-type-error-baseline.json' \
  --exclude 'exported-test-mapping.json'

# Rename live-index.html to index.html so it's the natural default entry
# in the new, production-only repository (no lab entry to disambiguate
# from anymore).
if [ -f "$EXPORT_DIR/live-index.html" ]; then
  mv "$EXPORT_DIR/live-index.html" "$EXPORT_DIR/index.html"
fi

echo "Export prepared at: $EXPORT_DIR"
echo
echo "Next steps (all performed by you, outside this lab):"
echo "  1. cd \"$EXPORT_DIR\""
echo "  2. Review the tree; optionally prune the 'ambiguous' items listed in"
echo "     section 3.4 of docs/PRODUCTION_HANDOFF_EXPORT_GUIDE.md."
echo "  3. git init && git add -A && git commit -m 'Import hybrid Supabase/ICP frontend from lab'"
echo "  4. Create a brand-new GitHub repository yourself (name/owner/visibility"
echo "     of your choosing), then:"
echo "       git remote add origin <your-new-repo-url>"
echo "       git branch -M main"
echo "       git push -u origin main"
