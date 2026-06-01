#!/bin/bash
set -e

GRADLE_FILE="/Users/hq/eazy-family/android/app/build.gradle"

# Extract versionCode — match only lines that END with a plain integer
# (avoids corrupting expressions like Integer.parseInt(...) on the same line)
CURRENT=$(grep -E 'versionCode [0-9]+$' "$GRADLE_FILE" | grep -oE '[0-9]+$')
NEXT=$((CURRENT + 10))

# Replace only "versionCode <digits>" at end of line — safe anchor
sed -i '' -E "s/(versionCode )[0-9]+$/\1$NEXT/" "$GRADLE_FILE"
echo "▶ versionCode bumped: $CURRENT → $NEXT"

# Build web and sync to Android
cd /Users/hq/eazy-family
echo "▶ Building web app..."
npm run build

echo "▶ Syncing to Android..."
npx cap sync android

# Build signed AAB
echo "▶ Building release AAB..."
cd /Users/hq/eazy-family/android/app
ANDROID_KEYSTORE_PATH=keystore.jks \
ANDROID_KEYSTORE_PASSWORD='EazyFamily2024!' \
ANDROID_KEY_ALIAS=eazyfamily \
ANDROID_KEY_PASSWORD='EazyFamily2024!' \
../gradlew bundleRelease 2>&1 | tail -5

# Commit the bumped versionCode
cd /Users/hq/eazy-family
git add android/app/build.gradle
git commit -m "chore: bump Android versionCode to $NEXT"
git push

echo ""
echo "✅ Done! AAB ready at:"
echo "   android/app/build/outputs/bundle/release/app-release.aab"
