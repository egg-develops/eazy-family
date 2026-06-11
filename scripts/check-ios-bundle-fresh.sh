#!/bin/bash
# Guard against archiving a STALE web bundle.
#
# Capacitor's Xcode project ships whatever is in ios/App/App/public — it does
# NOT rebuild the web app when you Archive. So a forgotten `npm run build` or
# `npx cap sync ios` silently ships old JS (this is how confirmed fixes
# "came back" in TestFlight on 2026-06-11).
#
# This fails fast — exit 1 — when either is true:
#   A) source under src/ is newer than the last web build (forgot to rebuild)
#   B) dist/ and the synced iOS bundle differ      (forgot to cap sync ios)
#
# Usage:
#   - Manually / via npm:  npm run ios:check
#   - As an Xcode "Run Script" build phase on the App target (runs on Archive):
#       "$SRCROOT/../scripts/check-ios-bundle-fresh.sh"
set -euo pipefail

# Project root: prefer Xcode's SRCROOT (= ios/App) when present, else infer.
if [ -n "${SRCROOT:-}" ]; then
  ROOT="$(cd "$SRCROOT/.." && pwd)"
else
  ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fi

DIST="$ROOT/dist"
IOS="$ROOT/ios/App/App/public"

fail() { echo "❌ STALE iOS BUNDLE — archive aborted"; echo "   $1"; echo "   Fix:  npm run ios:release   (build + cap sync ios), then re-archive"; exit 1; }

[ -d "$DIST/assets" ] || fail "no dist/ build found."
[ -d "$IOS/assets" ]  || fail "iOS web bundle missing (never synced)."

# A) source newer than the last build?
NEWER="$(find "$ROOT/src" "$ROOT/index.html" "$ROOT/capacitor.config.ts" -type f -newer "$DIST/index.html" 2>/dev/null | head -1 || true)"
[ -z "$NEWER" ] || fail "source changed since the last build (e.g. ${NEWER#$ROOT/})."

# B) does the synced iOS bundle match dist/ exactly?
DIST_SUM="$(cd "$DIST/assets" && ls -1 | sort | shasum | awk '{print $1}')"
IOS_SUM="$(cd "$IOS/assets"  && ls -1 | sort | shasum | awk '{print $1}')"
[ "$DIST_SUM" = "$IOS_SUM" ] || fail "ios/App/App/public is out of sync with dist/."

echo "✅ iOS web bundle is fresh (dist/ matches ios/App/App/public, no newer source)."
