#!/usr/bin/env bash
# platform-config-audit.sh — checks for common platform configuration mistakes
# Run before every release: bash scripts/platform-config-audit.sh

set -euo pipefail
PASS=0; FAIL=0; WARN=0
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
warn() { echo "  ⚠️  $1"; WARN=$((WARN+1)); }

# ── Helper ───────────────────────────────────────────────────────────────────
env_val() { grep -E "^$1=" "$ROOT/.env" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'"; }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Eazy.Family — Platform Config Audit"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Environment variables ──────────────────────────────────────────────────
echo ""
echo "▶ Environment variables (.env)"

IOS_KEY=$(env_val VITE_REVENUECAT_IOS_KEY)
ANDROID_KEY=$(env_val VITE_REVENUECAT_ANDROID_KEY)
SUPABASE_URL=$(env_val VITE_SUPABASE_URL)
SUPABASE_KEY=$(env_val VITE_SUPABASE_PUBLISHABLE_KEY)

[[ "$IOS_KEY" == appl_* ]]   && ok "VITE_REVENUECAT_IOS_KEY starts with appl_"     || fail "VITE_REVENUECAT_IOS_KEY missing or wrong prefix (expected appl_)"
[[ "$ANDROID_KEY" == goog_* ]] && ok "VITE_REVENUECAT_ANDROID_KEY starts with goog_" || fail "VITE_REVENUECAT_ANDROID_KEY missing or wrong prefix (expected goog_)"
[[ "$IOS_KEY" == "$ANDROID_KEY" ]] && fail "iOS and Android RC keys are identical — Android will use wrong key" || ok "iOS and Android RC keys are distinct"
[[ -n "$SUPABASE_URL" ]]      && ok "VITE_SUPABASE_URL set"                          || fail "VITE_SUPABASE_URL missing"
[[ -n "$SUPABASE_KEY" ]]      && ok "VITE_SUPABASE_PUBLISHABLE_KEY set"              || fail "VITE_SUPABASE_PUBLISHABLE_KEY missing"

# ── 2. RC key usage in source ─────────────────────────────────────────────────
echo ""
echo "▶ RevenueCat key wiring (src/lib/revenuecat.ts)"

RC_FILE="$ROOT/src/lib/revenuecat.ts"
grep -q "VITE_REVENUECAT_ANDROID_KEY" "$RC_FILE" && ok "Android key referenced in revenuecat.ts"  || fail "VITE_REVENUECAT_ANDROID_KEY not referenced in revenuecat.ts"
grep -q "getPlatform"                 "$RC_FILE" && ok "Platform detection present in revenuecat.ts" || fail "No platform detection in revenuecat.ts — same key used for both platforms"
grep -q "android.*RC_ANDROID_KEY\|RC_ANDROID_KEY.*android" "$RC_FILE" && ok "Android platform mapped to Android key" || warn "Could not confirm android→goog_ mapping — verify manually"

# ── 3. Android build config ───────────────────────────────────────────────────
echo ""
echo "▶ Android (android/app/build.gradle)"

GRADLE="$ROOT/android/app/build.gradle"
if [[ -f "$GRADLE" ]]; then
  APP_ID=$(grep -E "applicationId" "$GRADLE" | head -1 | grep -oE '"[^"]+"' | tr -d '"')
  VERSION_CODE=$(grep -E "^\s+versionCode " "$GRADLE" | head -1 | grep -oE '[0-9]+')
  [[ "$APP_ID" == "eazy.family.app" ]] && ok "applicationId = eazy.family.app" || fail "applicationId is '$APP_ID' — expected eazy.family.app"
  [[ -n "$VERSION_CODE" ]] && ok "versionCode = $VERSION_CODE" || warn "Could not read versionCode"
else
  warn "android/app/build.gradle not found — skipping Android checks"
fi

# ── 4. iOS Package.swift ──────────────────────────────────────────────────────
echo ""
echo "▶ iOS (ios/App/CapApp-SPM/Package.swift)"

PKG="$ROOT/ios/App/CapApp-SPM/Package.swift"
if [[ -f "$PKG" ]]; then
  SWIFT_VER=$(grep "swift-tools-version" "$PKG" | head -1 | grep -oE "[0-9]+\.[0-9]+")
  [[ "$SWIFT_VER" == "6.0" ]] && ok "swift-tools-version: 6.0 (required for .iOS(.v18))" || fail "swift-tools-version is $SWIFT_VER — must be 6.0 for Xcode 26 / .iOS(.v18)"
  grep -q '\.iOS(.v18)' "$PKG" && ok "Platform target: .iOS(.v18)" || fail "Platform target is not .iOS(.v18)"
else
  warn "Package.swift not found — skipping iOS SPM checks"
fi

# ── 5. Capacitor config ───────────────────────────────────────────────────────
echo ""
echo "▶ Capacitor (capacitor.config.ts)"

CAP="$ROOT/capacitor.config.ts"
if [[ -f "$CAP" ]]; then
  grep -q "eazy.family.app\|eazy\.family\.app" "$CAP" && ok "Capacitor appId = eazy.family.app" || warn "Could not confirm Capacitor appId — check capacitor.config.ts"
else
  warn "capacitor.config.ts not found"
fi

# ── 6. Hardcoded secrets check ────────────────────────────────────────────────
echo ""
echo "▶ Hardcoded secrets in source"

HARDCODED=$(grep -rn "appl_\|goog_\|eyJhbGci" "$ROOT/src" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "import.meta.env" | grep -v ".test." | grep -v "//" || true)
if [[ -z "$HARDCODED" ]]; then
  ok "No hardcoded API keys found in src/"
else
  fail "Hardcoded keys found in source:"
  echo "$HARDCODED" | sed 's/^/    /'
fi

# ── 7. .env in .gitignore ─────────────────────────────────────────────────────
echo ""
echo "▶ Secrets hygiene"

if grep -q "^\.env$" "$ROOT/.gitignore" 2>/dev/null; then
  ok ".env is in .gitignore"
else
  fail ".env is NOT in .gitignore — API keys may be committed to git"
  echo "    Fix: echo '.env' >> .gitignore"
fi

# Check if .env is already tracked by git
if git -C "$ROOT" ls-files --error-unmatch .env 2>/dev/null; then
  fail ".env is tracked by git — run: git rm --cached .env"
else
  ok ".env is not tracked by git"
fi

# ── 8. Build script ───────────────────────────────────────────────────────────
echo ""
echo "▶ Build script (build-android.sh)"

BUILD="$ROOT/build-android.sh"
if [[ -f "$BUILD" ]]; then
  grep -q "versionCode" "$BUILD" && ok "build-android.sh manages versionCode" || warn "build-android.sh found but versionCode auto-increment not detected"
else
  warn "build-android.sh not found"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Results: ✅ $PASS passed  ❌ $FAIL failed  ⚠️  $WARN warnings"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [[ $FAIL -gt 0 ]]; then
  echo "  ❌ Audit FAILED — fix the issues above before building."
  exit 1
else
  echo "  ✅ Audit passed."
  exit 0
fi
