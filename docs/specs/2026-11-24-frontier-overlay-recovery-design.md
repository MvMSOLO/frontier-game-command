# FRONTIER — Task 7: Original Overlay Recovery, Native Game Detection & Runtime Stability

**Status:** Approved implementation specification
**Repository:** `MvMSOLO/frontier-game-command`
**Baseline `main`:** `4568b5903c96ed1444cd31ef3ff3b37549787c77`
**Decision:** Reuse the original FRONTIER React experience and keep the Android overlay on the left side only.

## Goal
Restore the original FRONTIER UI, motion, sound and interaction inside the native Android overlay; remove the separate simplified UI; eliminate synchronous/heavy UsageStats calls from the WebView thread; implement selected-game foreground detection and user-controlled auto-open; make settings, permissions and feature labels truthful; add English/Russian localization with complete UI coverage.

## Approved architecture
- Reuse `src/frontier/Frontier.tsx`, original pages, visual tokens, Framer Motion transitions and `src/frontier/audio.ts`.
- Add a platform presentation variant. Android renders the original CORE on the left only; browser preview, GameScene, NEXUS and right-edge controls remain browser-only.
- Keep one WebView/React tree alive for the full overlay-service lifetime. Collapse/expand by resizing the existing bounded native window; destroy only when service stops.
- Run UsageStats and package work on a native background executor. Use incremental event processing and push versioned events to WebView; no synchronous six-hour scan from JavaScript.
- Store selected game IDs and auto-detect preferences in native preferences and synchronize through a versioned bridge.
- Auto-open only when enabled and the user has not manually dismissed the overlay for the current game session. Minimize on game exit with debounce.
- Keep the window bounded to the visible left panel. Touches outside the panel must pass through; this must be validated on physical Android devices.
- Add complete English and Russian localization for every visible page, label, error, permission explanation, onboarding step, notification rule, status, tooltip and accessibility label. Persist language selection and apply immediately without restarting.
- Native capability labels must reflect actual support. Never present UI state as a successful system action.

## Feature truth and scope
- Implement real installed-game catalog, launch intents, foreground detection, overlay lifecycle, permission refresh, battery, Android thermal status, system memory snapshot and opt-in notification listener filtering.
- Replace random RAM purge with a read-only memory diagnostic. Replace fake Touch Boost/Ping Stabilizer with honest device/network diagnostics; do not claim game-level tuning or server ping.
- Game FPS/GPU/per-game CPU, global touch boost, global packet prioritization, RAM killing, in-game voice injection and full-screen crosshair remain unavailable unless an OEM/privileged API or safe validated implementation exists.
- Native screen recording requires MediaProjection consent per session and a correctly declared foreground service. Replay buffer is a separate follow-on only after recorder lifecycle is proven.
- Do not add boot-time auto-start. Detector is explicitly enabled by the user.

## Responsive/mobile UX
- Landscape gameplay is primary; portrait setup/settings remain fully usable.
- Use safe insets, density-aware dimensions, minimum tap targets, readable type, adaptive panel width, no clipping/overlap and reduced-motion support.
- Preserve original motion and SFX definitions; respect mute, volume, haptics and reduced-motion settings.
- Keep browser/Vercel UI behavior unchanged.

## Verification gates
- TypeScript tests: platform variant, bridge event schema, language persistence/coverage, selected-game sync, error handling and capability labels.
- Kotlin tests: package aliases, foreground/background event reducer, debounce, manual dismissal, permission revocation and service transitions.
- Android instrumentation: one WebView instance across collapse/expand, no duplicate windows, local-only navigation and safe callbacks after stop.
- Web CI and Android CI must pass; debug APK artifact must be produced.
- Physical-device QA is required for overlay touch pass-through, game auto-detection, sound, rotation, permissions and 30-minute freeze stress. If no physical device is available to the test operator, do not claim these checks passed or call the product fully ready.

## Implementation phases
1. Restore original Android UI composition and audio/motion.
2. Stabilize WebView lifecycle and non-blocking native event bridge.
3. Implement selected-game launch and auto-detect lifecycle.
4. Implement honest native diagnostics and notification control.
5. Implement MediaProjection recorder with per-session consent if API/foreground-service constraints are met.
6. Complete English/Russian localization and mobile accessibility/responsiveness.
7. Run web/native regression, generate APK, inspect CI and publish a truthful QA report.
