name: iOS Studio Extreme — Build Pipeline

# ============================================================================
# iOS Studio Extreme — Cloud Compilation Engine
# ----------------------------------------------------------------------------
# Triggers:
#   • push to main         (auto)
#   • workflow_dispatch    (manual "Run workflow" button in the Actions tab)
#
# Runner: GitHub-hosted macos-14 (Apple Silicon M1, Xcode 15.x).
# Output: UNSIGNED .ipa ready for ESign on-device signing.
# Artifact name: compiled-ios-app  (30-day retention)
# ============================================================================

on:
  push:
    branches:
      - main
      - master
  workflow_dispatch:
    inputs:
      app_name:
        description: "Override display name (defaults to iOS Studio Extreme)"
        required: false
        default: "iOS Studio Extreme"
      bundle_id:
        description: "Override bundle identifier (defaults to com.developer.iosstudioextreme)"
        required: false
        default: "com.developer.iosstudioextreme"
      app_version:
        description: "Override marketing version (defaults to 1.0.0)"
        required: false
        default: "1.0.0"
      app_build:
        description: "Override build number (defaults to 1)"
        required: false
        default: "1"

concurrency:
  group: ios-extreme-build-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

env:
  NODE_VERSION: "20"
  DEFAULT_APP_NAME: "iOS Studio Extreme"
  DEFAULT_BUNDLE_ID: "com.developer.iosstudioextreme"
  DEFAULT_VERSION: "1.0.0"
  DEFAULT_BUILD: "1"
  CAP_SCHEME: "App"
  ARCHIVE_PATH: "build/App.xcarchive"
  EXPORT_DIR: "export"
  IPA_NAME: "iOSStudioExtreme.ipa"

jobs:
  build-ios:
    name: Compile Unsigned iOS IPA
    runs-on: macos-14
    timeout-minutes: 45

    steps:
      - name: Resolve runtime variables
        id: vars
        run: |
          echo "Resolving build variables..."
          APP_NAME="${{ github.event.inputs.app_name || env.DEFAULT_APP_NAME }}"
          BUNDLE_ID="${{ github.event.inputs.bundle_id || env.DEFAULT_BUNDLE_ID }}"
          APP_VERSION="${{ github.event.inputs.app_version || env.DEFAULT_VERSION }}"
          APP_BUILD="${{ github.event.inputs.app_build || env.DEFAULT_BUILD }}"

          # Persist into job-wide env so subsequent steps can read them.
          echo "APP_NAME=$APP_NAME"        >> "$GITHUB_ENV"
          echo "APP_BUNDLE_ID=$BUNDLE_ID"  >> "$GITHUB_ENV"
          echo "APP_VERSION=$APP_VERSION"  >> "$GITHUB_ENV"
          echo "APP_BUILD=$APP_BUILD"      >> "$GITHUB_ENV"

          echo "=== Resolved ==="
          echo "  App Name  : $APP_NAME"
          echo "  Bundle ID : $BUNDLE_ID"
          echo "  Version   : $APP_VERSION"
          echo "  Build     : $APP_BUILD"

      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - name: Runner info
        run: |
          echo "=== OS ==="
          sw_vers
          echo "=== Xcode ==="
          xcodebuild -version
          xcode-select -p
          echo "=== Ruby (for cocoapods if needed) ==="
          ruby --version || true
          echo "=== Node ==="
          node --version

      - name: Setup Node.js ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
          cache-dependency-path: "**/package-lock.json"

      - name: Install npm dependencies
        run: |
          echo "Installing root dependencies..."
          npm install --no-audit --no-fund --loglevel=error
          echo "Installed."
          npx cap --version

      - name: Add iOS platform via Capacitor
        run: |
          if [ ! -d "ios" ]; then
            echo "Scaffolding native iOS project..."
            npx cap add ios
          else
            echo "iOS platform already exists — syncing only."
          fi

      - name: Sync web assets into native project
        run: |
          npx cap copy ios
          npx cap sync ios

      - name: Locate generated Xcode project
        id: xcode
        run: |
          set -euo pipefail
          PROJECT_DIR="ios/App"
          if [ ! -d "$PROJECT_DIR" ]; then
            echo "::error::Capacitor iOS project not found at $PROJECT_DIR"
            exit 1
          fi
          PROJECT_FILE=$(find "$PROJECT_DIR" -maxdepth 1 -name "*.xcodeproj" | head -n1)
          if [ -z "$PROJECT_FILE" ]; then
            echo "::error::No .xcodeproj under $PROJECT_DIR"
            exit 1
          fi
          echo "Found Xcode project: $PROJECT_FILE"
          echo "scheme=$CAP_SCHEME" >> "$GITHUB_OUTPUT"

      - name: Patch project.pbxproj (bundle ID, name, version)
        run: |
          set -euo pipefail
          PBXPROJ="ios/App/App.xcodeproj/project.pbxproj"
          if [ ! -f "$PBXPROJ" ]; then
            echo "::error::pbxproj not found at $PBXPROJ"
            exit 1
          fi

          echo "Injecting PRODUCT_BUNDLE_IDENTIFIER = $APP_BUNDLE_ID"
          sed -i '' -E "s|PRODUCT_BUNDLE_IDENTIFIER = [^;]*;|PRODUCT_BUNDLE_IDENTIFIER = $APP_BUNDLE_ID;|g" "$PBXPROJ"

          echo "Injecting PRODUCT_NAME = $CAP_SCHEME"
          sed -i '' -E "s|PRODUCT_NAME = [^;]*;|PRODUCT_NAME = $CAP_SCHEME;|g" "$PBXPROJ"

          echo "Injecting MARKETING_VERSION = $APP_VERSION"
          sed -i '' -E "s|MARKETING_VERSION = [^;]*;|MARKETING_VERSION = $APP_VERSION;|g" "$PBXPROJ"

          echo "Injecting CURRENT_PROJECT_VERSION = $APP_BUILD"
          sed -i '' -E "s|CURRENT_PROJECT_VERSION = [^;]*;|CURRENT_PROJECT_VERSION = $APP_BUILD;|g" "$PBXPROJ"

          echo "--- pbxproj bundle id occurrences ---"
          grep -n "PRODUCT_BUNDLE_IDENTIFIER" "$PBXPROJ" || true

      - name: Strip code-signing lines from pbxproj
        run: |
          set -euo pipefail
          PBXPROJ="ios/App/App.xcodeproj/project.pbxproj"
          sed -i '' -E '/CODE_SIGN_IDENTITY/d'        "$PBXPROJ" || true
          sed -i '' -E '/CODE_SIGN_STYLE/d'           "$PBXPROJ" || true
          sed -i '' -E '/DEVELOPMENT_TEAM/d'          "$PBXPROJ" || true
          sed -i '' -E '/PROVISIONING_PROFILE/d'      "$PBXPROJ" || true
          sed -i '' -E '/CODE_SIGN_ENTITLEMENTS/d'    "$PBXPROJ" || true
          echo "Stripped code-signing lines."

      - name: Patch Info.plist via PlistBuddy
        run: |
          set -euo pipefail
          INFO_PLIST="ios/App/App/Info.plist"
          if [ ! -f "$INFO_PLIST" ]; then
            echo "::error::Info.plist not found at $INFO_PLIST"
            exit 1
          fi

          PLB=/usr/libexec/PlistBuddy

          # CFBundleIdentifier
          $PLB -c "Set :CFBundleIdentifier $APP_BUNDLE_ID" "$INFO_PLIST" 2>/dev/null \
            || $PLB -c "Add :CFBundleIdentifier string $APP_BUNDLE_ID" "$INFO_PLIST"

          # CFBundleDisplayName
          $PLB -c "Set :CFBundleDisplayName $APP_NAME" "$INFO_PLIST" 2>/dev/null \
            || $PLB -c "Add :CFBundleDisplayName string $APP_NAME" "$INFO_PLIST"

          # CFBundleName (max 15 chars, no spaces)
          BUNDLE_NAME_SAFE=$(echo "$APP_NAME" | tr -d ' ' | cut -c1-15)
          $PLB -c "Set :CFBundleName $BUNDLE_NAME_SAFE" "$INFO_PLIST" 2>/dev/null \
            || $PLB -c "Add :CFBundleName string $BUNDLE_NAME_SAFE" "$INFO_PLIST"

          # CFBundleShortVersionString
          $PLB -c "Set :CFBundleShortVersionString $APP_VERSION" "$INFO_PLIST" 2>/dev/null \
            || $PLB -c "Add :CFBundleShortVersionString string $APP_VERSION" "$INFO_PLIST"

          # CFBundleVersion
          $PLB -c "Set :CFBundleVersion $APP_BUILD" "$INFO_PLIST" 2>/dev/null \
            || $PLB -c "Add :CFBundleVersion string $APP_BUILD" "$INFO_PLIST"

          echo "--- Info.plist after patch ---"
          plutil -p "$INFO_PLIST"

      - name: Print available schemes
        run: |
          xcodebuild -list -project "ios/App/App.xcodeproj" || true

      - name: Build & archive (unsigned)
        run: |
          set -euo pipefail
          mkdir -p build

          echo "=== xcodebuild archive ==="
          xcodebuild \
            -project "ios/App/App.xcodeproj" \
            -scheme "$CAP_SCHEME" \
            -configuration Release \
            -sdk iphoneos \
            -archivePath "$ARCHIVE_PATH" \
            -destination "generic/platform=iOS" \
            CODE_SIGNING_ALLOWED=NO \
            CODE_SIGNING_REQUIRED=NO \
            CODE_SIGN_IDENTITY="" \
            CODE_SIGN_ENTITLEMENTS="" \
            DEVELOPMENT_TEAM="" \
            PROVISIONING_PROFILE_SPECIFIER="" \
            PROVISIONING_PROFILE="" \
            IPHONEOS_DEPLOYMENT_TARGET=14.0 \
            TARGETED_DEVICE_FAMILY="1,2" \
            ENABLE_BITCODE=NO \
            SWIFT_TREAT_WARNINGS_AS_ERRORS=NO \
            GCC_TREAT_WARNINGS_AS_ERRORS=NO \
            clean \
            archive \
            | tee build/xcodebuild-archive.log

          echo "=== Archive produced ==="
          ls -la "$ARCHIVE_PATH/Products/Applications/"

      - name: Assemble unsigned .ipa
        run: |
          set -euo pipefail
          APP_BUNDLE_DIR=$(find "$ARCHIVE_PATH/Products/Applications" -maxdepth 1 -name "*.app" | head -n1)
          if [ -z "$APP_BUNDLE_DIR" ]; then
            echo "::error::No .app bundle found inside $ARCHIVE_PATH/Products/Applications"
            exit 1
          fi
          echo "Found .app bundle: $APP_BUNDLE_DIR"

          echo "Stripping _CodeSignature..."
          rm -rf "$APP_BUNDLE_DIR/_CodeSignature"
          rm -rf "$APP_BUNDLE_DIR/PlugIns" 2>/dev/null || true

          STAGING="build/ipa-staging"
          rm -rf "$STAGING"
          mkdir -p "$STAGING/Payload"
          cp -R "$APP_BUNDLE_DIR" "$STAGING/Payload/"

          cat > "$STAGING/build-info.txt" <<EOF
          app_name=$APP_NAME
          bundle_id=$APP_BUNDLE_ID
          version=$APP_VERSION
          build=$APP_BUILD
          source_ref=${{ github.sha }}
          source_branch=${{ github.ref_name }}
          built_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
          runner=macos-14
          EOF

          mkdir -p "$EXPORT_DIR"
          ( cd "$STAGING" && zip -qry "../$EXPORT_DIR/$IPA_NAME" . )
          echo "=== IPA produced ==="
          ls -la "$EXPORT_DIR/$IPA_NAME"
          unzip -l "$EXPORT_DIR/$IPA_NAME" | head -n 30

      - name: Emit SHA-256 checksum
        run: |
          cd "$EXPORT_DIR"
          shasum -a 256 "$IPA_NAME" > "$IPA_NAME.sha256"
          echo "--- checksum ---"
          cat "$IPA_NAME.sha256"

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: compiled-ios-app
          path: |
            ${{ env.EXPORT_DIR }}/${{ env.IPA_NAME }}
            ${{ env.EXPORT_DIR }}/${{ env.IPA_NAME }}.sha256
            build/xcodebuild-archive.log
          retention-days: 30
          if-no-files-found: error
          compression-level: 0

      - name: Workflow summary
        if: always()
        run: |
          {
            echo "### iOS Studio Extreme — Build Summary"
            echo ""
            echo "| Property | Value |"
            echo "|----------|-------|"
            echo "| App Name | ${{ env.APP_NAME }} |"
            echo "| Bundle ID | ${{ env.APP_BUNDLE_ID }} |"
            echo "| Version | ${{ env.APP_VERSION }} (${{ env.APP_BUILD }}) |"
            echo "| Runner | macos-14 (Apple Silicon M1) |"
            echo "| Artifact | \`compiled-ios-app\` |"
            echo "| IPA File | \`${{ env.IPA_NAME }}\` |"
            echo "| Commit | \`${{ github.sha }}\` |"
            echo "| Trigger | \`${{ github.event_name }}\` |"
          } >> "$GITHUB_STEP_SUMMARY"
