#!/bin/bash
set -e

# Auto-bump versionCode in build.gradle
GRADLE_FILE="/Users/hq/eazy-family/android/app/build.gradle"
CURRENT=$(grep "versionCode" "$GRADLE_FILE" | grep -o '[0-9]*')
NEXT=$((CURRENT + 1))
sed -i '' "s/versionCode $CURRENT/versionCode $NEXT/" "$GRADLE_FILE"
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

echo ""
echo "✅ Done! AAB ready at:"
echo "   android/app/build/outputs/bundle/release/app-release.aab"
