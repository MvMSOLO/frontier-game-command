# FRONTIER Android shell

The Android target is a native Kotlin host with a locally bundled React UI. It does not load the production website at runtime.

## Build

From the repository root run: bun install --frozen-lockfile, bun run build:android, then gradle -p android :app:testDebugUnitTest :app:assembleDebug.

Open the android/ folder in Android Studio 2026.1.4 or newer to build and run on a device. The project targets API 36 and supports Android 8.0 (API 26) and later.

The debug APK is written to android/app/build/outputs/apk/debug/app-debug.apk.

## Overlay behavior

- The app asks the user to grant Display over other apps before starting the overlay.
- The native service is started from the visible app after the user's explicit action.
- The collapsed handle and expanded control panel are anchored to the left edge.
- The expanded overlay is a bounded 340 dp window; the rest of the screen remains outside the overlay window and continues receiving game touch input.
- The overlay starts with no cross-screen capture, microphone routing, RAM manipulation, or system tuning.
- Usage access and notification-listener access are optional and are only read to report platform capability and game context.

## Local web asset security

The WebView loads only assets packaged inside the APK through the app-local https://appassets.frontier/ origin. External navigation and network requests are blocked, JavaScript is exposed only to the bundled local UI, and file/content URL access is disabled.
