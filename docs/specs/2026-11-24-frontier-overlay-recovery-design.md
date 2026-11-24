# FRONTIER — Task 7: Original Overlay Recovery, Native Game Detection & Runtime Stability

**Status:** Approved by user for implementation  
**Repository:** MvMSOLO/frontier-game-command  
**Baseline:** 4568b5903c96ed1444cd31ef3ff3b37549787c77  
**Decision:** Reuse the original FRONTIER React experience and keep the Android overlay on the left only.

## Purpose
Task 7 repairs the mismatch introduced in Task 6. Android must render the original FRONTIER CORE experience, including existing pages, motion and Sonic Signature audio, while using real Android permission/game integration. This is a runtime recovery task, not a visual repaint.

## Audited defects
- Android currently mounts a separate, simplified `FrontierNativeOverlay`, not the original `Frontier` composition. Therefore the previous page design, original transitions, sound and interaction choreography are absent.
- `OverlayService` removes/destroys its WebView when collapsing and creates/loads another when expanding. Every reopen can remount React and discard in-memory state/audio resources.
- A JS adapter calls a synchronous JavaScript bridge method that queries up to six hours of UsageStats events. The overlay polls every 2.2 seconds. Declaring the adapter async does not make the synchronous native call non-blocking for JavaScript; it is a high-confidence freeze contributor that requires device stress confirmation.
- Foreground title reporting is not a full selection → launch → detect → auto-open → exit/minimize flow.
- Notification listener is an empty subclass; permission grant does not implement notification control.
- RAM Purge uses random fake reclaimed MB; Touch Boost and Ping Stabilizer change only local state; Zero-Distraction hides simulated UI notices.
- Telemetry labels WebView rendering, generated CPU/GPU/temperature and an app favicon request in ways that can be mistaken for game FPS, hardware telemetry and game ping.

## Approved UX
- Reuse original `Frontier.tsx`, `pages.tsx`, design tokens, iconography, Framer Motion spring/scan/page transitions and `audio.ts` with its original SFX events, volume and haptic behavior.
- Android renders original CORE on the left. No browser GameScene/fake HUD, right-edge launcher, NEXUS pane or CORE/NEXUS switch over a live game.
- Keep the original five destinations (Home, Performance, Tools, Voice and Settings), fitted to a bounded overlay window.
- Landscape is primary for gameplay. Portrait remains usable for onboarding/settings and responsive controls.
- The native touchable window must match the visible panel bounds; outside touches must reach the game. This must be confirmed on a physical device, not inferred from WebView or CI screenshots.
- Opening/collapsing retains the original transition and sound choreography; motion, volume, sound and haptics settings are honored.

## Runtime architecture
- One WebView/React tree exists for the lifetime of the user-started overlay service. Collapse/expand uses WindowManager layout updates, not destroy/recreate.
- Slow UsageStats/package work runs on a native background worker. JS bridge methods are limited to cached/fast commands.
- Kotlin pushes versioned, sequenced events (permission-state, game-state, detector-state, device-snapshot, overlay-state) onto the WebView's owning UI thread. JS does not poll synchronous heavy native methods.
- Reject malformed, stale and duplicate events. Ignore late callbacks after service/WebView shutdown.
- Preserve local-only bundled WebView origin, blocked network loads, disabled file/content access and no remote bridge exposure.
- Handle permission revocation, display configuration change, screen lock, service stop/restart and system window removal without duplicate windows or stale references.

## Selected games and Auto-detect
- Keep the existing 12 stable game IDs with explicit package aliases; support manual selection even when Usage Access is missing.
- Show Installed, Selected, Not installed, Package not recognized and Usage Access required states.
- Persist selected IDs and Auto-detect state in SharedPreferences. A game only triggers auto-open when installed, recognized, selected and auto-detect is enabled.
- Add Launch through Android package launch intent, including missing activity and uninstall states.
- Use incremental UsageStats event processing on a background worker. Android 10+ uses resumed/paused/stopped events; older supported versions use legacy foreground/background events.
- Debounce game activity transitions, minimize after the selected game exits, and respect manual dismissal for the current game session.
- No AccessibilityService, hidden API, injection, memory reads or anti-cheat circumvention.

## Capabilities and truthful boundaries
- Implement native battery percentage/charging; thermal status category (not invented chip °C); memory overview through ActivityManager (not “RAM purge”); network transport/validated connectivity (not game ping).
- Implement opt-in NotificationListenerService control only for user-selected policy while a selected game is active. Calls, alarms and user exceptions remain exempt by default. Do not store notification content.
- Performance profiles only tune FRONTIER overlay presentation. Do not claim that they boost another game's FPS.
- Game FPS/CPU/GPU remain unsupported/OEM-specific until an actual authorized source exists.
- Global touch boost, global packet priority, RAM killing and external-game voice routing are not exposed as working features.
- Center crosshair remains unavailable/experimental until Android touch pass-through is separately proven safe.
- Native Screen Recorder uses MediaProjection and fresh user consent per capture session. Instant Replay is unavailable until a separate rolling buffer is designed and tested.

## Localization
- Settings exposes English and Russian.
- Language selection applies immediately and persists across onboarding, navigation, page content, capability statuses, errors, permission guidance, dialogs, accessibility labels, loading, app settings and native notification strings.
- Translation coverage is exhaustive and tested; no missing-key fallback is allowed for normal UI copy.

## Lifecycle and performance
- Keep React component and tab/profile/settings state across collapse/reopen.
- Persist stable settings and selected games. Stop capture/microphone operations safely when their owning session ends; never restore an ephemeral capture as active after process death.
- Add diagnostic timing for native event delivery, WebView frame timing, JS long tasks and overlay transitions. Do not label WebView FPS as game FPS.
- Release must pass a repeated-open/close and long-run automated stress test; physical phone testing remains a separate gate.

## Implementation phases
1. Restore original React CORE UI in an Android-only left-side presentation and preserve browser twin-core unchanged.
2. Keep one WebView mounted; move heavy detector work to a background worker and push typed native events.
3. Add selected-game SharedPreferences, package aliases, Launch, Auto-detect, debounce and manual-dismiss behavior.
4. Add exhaustive English/Russian localization across app, onboarding, overlay and native resources.
5. Replace fake controls with truthful native battery/thermal/memory/network snapshots and opt-in notification policy.
6. Integrate capture only with explicit MediaProjection consent; finish motion/audio/lifecycle and responsive layout QA.
7. Run web/Android CI, create APK artifact, audit all requirements and merge only after checks pass.

## Test and release gates
- Vitest covers presentation split, event contract, localization completeness/persistence and capability rendering.
- JUnit covers package aliases, event reducer, selected-game filtering, debounce, manual dismiss, permissions and lifecycle.
- Android instrumentation/host checks cover one-WebView lifecycle, no duplicate windows, local-only navigation, notification opt-in and permission return.
- GitHub Actions builds the web target and Android debug APK from the same commit.
- Physical phone acceptance covers installation, permission grant/revoke, game launch/detection, touch pass-through, portrait/landscape, original SFX/motion, repeated control use and a 30-minute freeze stress run. If no physical device is available, mark these as NOT RUN and do not claim Task 7 is fully device-verified.

## Risks and boundaries
- OEM package names and UsageStats event timing vary; unknown variants remain unsupported rather than guessed.
- Android overlay touch security and foreground-service restrictions vary by OS/OEM; app-start remains user initiated and special-use service policy must be reviewed before public release.
- MediaProjection can be denied or block protected content; report the actual result and keep overlay usable.
