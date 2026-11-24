# FRONTIER Task 7 Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox syntax for tracking.

**Goal:** Restore the original FRONTIER left-edge Android overlay, remove the freeze contributor, implement real game detection/native capability status and complete English/Russian localization.

**Architecture:** Reuse the current `Frontier` composition in an Android-only presentation while leaving browser twin-core unchanged. Keep one WebView alive and push cached, versioned native events from background Kotlin workers. Store Auto-detect/game selection natively and add a typed, exhaustive locale layer.

**Tech Stack:** React 19, TypeScript, Framer Motion, existing audio engine, Vite/Bun, Kotlin, Android API 26–36, Gradle, Vitest, JUnit, GitHub Actions.

## Global constraints
- Left-side-only touch-bounded Android overlay; never obscure or capture the rest of the game display.
- Preserve original CORE design, page components, animations, SFX/haptics and browser experience.
- No heavy synchronous JS bridge reads; no UsageStats/package scan from UI polling.
- One WebView/React tree during overlay service lifetime.
- Auto-detect requires explicit enable + Usage Access + recognized installed selected game; overlay requires overlay access.
- English/Russian must cover every visible UI/permission/error/accessibility/native string and persist.
- No fake RAM purge/touch boost/ping/game FPS/hardware thermal/game voice features.
- No AccessibilityService, hidden APIs, process injection or game memory access.
- PR merges only after fresh web/Android checks and Vercel are green; physical-device results must be reported separately.

---

### Task 1 — Original FRONTIER UI recovery
**Files:** `src/frontier/Frontier.tsx`, `src/android/overlay-main.tsx`, Android-only CSS; test `src/frontier/Frontier.presentation.test.tsx`.
- Add `presentation?: "browser" | "android-overlay"` to `Frontier`; browser is the unchanged default.
- Red tests: Android omits GameScene, right edge, NEXUS and wing switch; renders existing Home/Performance/Tools/Voice/Settings and original CORE classes.
- Implement Android CORE layout with original dock, motion, scan-line, page transition and existing `playSfx`/haptic calls.
- Verify focused Vitest red→green, full `bun run test`, `bun run lint`, `bun run build`, `bun run build:android`.
- Commit passing UI change.

### Task 2 — Stable WebView and async native detector
**Files:** `OverlayService.kt`, `OverlayWindowController.kt`, `ForegroundGameMonitor.kt`, `FrontierJavascriptBridge.kt`, `contracts.ts`, `native-adapter.ts`, `events.ts`.
- Kotlin reducer/controller tests: one WebView across repeated expand/minimize; idempotent stop; permission revoked; late event ignored.
- TS tests: version/sequence checks, malformed payload, duplicate event, subscribe/unsubscribe cleanup.
- Implement one WebView with `WindowManager.updateViewLayout`; destroy only at service stop.
- Native worker processes incremental UsageStats events. JS receives typed versioned events; no 2.2s synchronous game polling.
- Verify `gradle -p android :app:testDebugUnitTest` and `bun run test`; build debug APK.

### Task 3 — Real game selection and Auto-detect
**Files:** `NativeGameCatalog.kt`, `GameSelectionStore.kt`, `ForegroundGameMonitor.kt`, onboarding and settings pages.
- Tests: alias mapping, selected-only detection, missing launch intent, background/foreground transitions, debounce, manual dismiss, revocation.
- Save selected stable game IDs and Auto-detect preference in SharedPreferences.
- Add native package detection and Launch intent; use actual install state.
- Auto-open selected games only after explicit enable and required permissions; minimize after exit and suppress repeated reopening after manual dismissal.
- Verify tests and Android APK.

### Task 4 — Exhaustive English/Russian localization
**Files:** `src/frontier/i18n.ts`, its test, `store.ts`, `Frontier.tsx`, `pages.tsx`, `ui.tsx`, onboarding/entry and Android `values-ru` resources.
- Type `Language = "en" | "ru"`; add persisted language to existing settings.
- Red tests: missing key in either locale, interpolation, saved locale hydration, fallback invalid value.
- Translate navigation, onboarding, games, permissions, all pages, controls, capability states, errors, empty states, accessibility labels and native strings.
- Add immediate language selector in Settings. Assert every required key has both translations.
- Run locale tests, all web tests/lint and Android build.

### Task 5 — Truthful native diagnostics and notification controls
**Files:** `DeviceSnapshotProvider.kt`, `NotificationPolicyStore.kt`, `FrontierNotificationListenerService.kt`, `telemetry.ts`, `pages.tsx`.
- Tests prove no fake game FPS/GPU/CPU, exact thermal °C or network game ping is shown.
- Add actual battery/charging, supported thermal status, ActivityManager memory and ConnectivityManager network snapshot.
- Implement opt-in notification suppression only under a user-configured game policy; calls, alarms and exceptions remain exempt. Store no notification contents.
- Replace fake RAM Purge/Ping Stabilizer/Touch Boost with diagnostics or honest unavailable status.
- Verify Kotlin/TS tests and build.

### Task 6 — Native capture, lifecycle and visual/audio polish
**Files:** `MediaCaptureController.kt`, manifest, `OverlayService.kt`, `Frontier.tsx`, `pages.tsx`, minimal audio lifecycle integration.
- Test consent cancellation, stop callback, projection/resource cleanup and service shutdown.
- Implement MediaProjection screen recording only after explicit per-session consent and correct FGS type. Keep Instant Replay unavailable until separate rolling-buffer tests pass.
- Preserve all existing SFX IDs and synthesis definitions; audio volume/mute/haptics and reduced motion must work in WebView.
- Add landscape 320–480dp and portrait setup responsive rules; native touchable bounds match the visible panel.
- Verify automated layout and lifecycle tests. Physical-device touch/audio/game/30-minute stress is NOT RUN without attached phone.

### Task 7 — Release verification
**Files:** Android workflow, README/Android README.
- Run `bun run test`, `bun run lint`, `bun run check:assets`, `bun run build`, `bun run build:android`.
- Run `gradle -p android --no-daemon :app:testDebugUnitTest :app:assembleDebug`; inspect log.
- Upload and inspect APK artifact, package/version/hash.
- Open PR, check web + Android Actions and Vercel, fix and rerun failures, line-by-line acceptance review, merge only while green.

## External validation that must not be fabricated
A physical phone model/API/OEM is not provided and is not attached to this coding environment. Real game touch-through, OEM UsageStats timing, SFX in-game audibility and 30-minute stress remain NOT RUN until the APK is exercised on a physical phone.
