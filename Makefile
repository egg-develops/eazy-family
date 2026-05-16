.PHONY: build ios run clean widget

# Build web app and copy to iOS
ios:
	npm run build && npx cap copy ios

# Build the Xcode project (App scheme, simulator)
build:
	xcodebuild -project ios/App/App.xcodeproj \
		-scheme App \
		-destination 'platform=iOS Simulator,name=iPhone 16' \
		-configuration Debug \
		build 2>&1 | xcpretty || xcodebuild -project ios/App/App.xcodeproj \
		-scheme App \
		-destination 'platform=iOS Simulator,name=iPhone 16' \
		-configuration Debug \
		build

# Build widget scheme only
widget:
	xcodebuild -project ios/App/App.xcodeproj \
		-scheme EazyFamilyWidget \
		-destination 'platform=iOS Simulator,name=iPhone 16' \
		-configuration Debug \
		build 2>&1 | xcpretty

# Full pipeline: web build → copy → xcode build
ship-sim: ios build

# Install xcpretty for readable build output (run once)
setup:
	gem install xcpretty
