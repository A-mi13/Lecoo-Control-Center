# Changelog

All notable changes to this fork will be documented here.
This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

(nothing yet — the next entry will land here.)

## [0.1.4-beta] - 2026-05-23

Two small fixes from user feedback right after `0.1.3-beta`.

### Fixed
- **"Open release page" in Settings now actually opens GitHub.**
  `@tauri-apps/plugin-shell::open` was failing silently because the
  webview capability list didn't include `shell:allow-open`. Added it
  with a scope restricted to `github.com` and `*.github.com` so the
  permission can't be misused. Same fix unblocks the "View on GitHub"
  link in the About card.

### Changed
- **Fans page shows both fans side by side.** The CPU/GPU segment up
  top was hiding half the data — temp + rpm + mode for CPU and GPU
  now live in their own columns, and each fan has its own `Auto / Full`
  segment. Mode-per-fan was already supported on the daemon side; the
  UI just didn't surface it.

## [0.1.3-beta] - 2026-05-23

Polish + acceptance pass. No headline features, just smaller fixes that
follow from going through the whole UI screen by screen.

### Added
- **Telemetry poll interval is now actually wired.** The Settings
  segment used to be cosmetic; it now drives the Rust poller through a
  new `set_poll_interval` command. Choices are 3 s / 5 s / 10 s (1 s
  was removed — too aggressive on the EC, see `0.1.2-beta`). Choice is
  persisted and re-applied to the poller on every Settings mount.
- **Daemon version mismatch gets its own overlay.** When the IPC
  handshake rejects the GUI because of a protocol-major mismatch, the
  `DaemonOverlay` now reads `Daemon version mismatch` with an explicit
  "reinstall both from the same MSI" message instead of the generic
  `Daemon error` title.
- **`pnpm i18n:check` script** walks `en.json` / `ru.json` / `zh.json`,
  prints missing keys, extra keys, and untranslated leaves. Wired into
  the CI workflow so future translation drift fails the build instead
  of shipping silently.

### Fixed
- One Russian string (`Канал IPC`) that had been left in English.

### Build
- NSIS installer was on the table for this release. After looking at it
  we decided to stick with MSI only: Tauri's NSIS bundler doesn't know
  about Windows services natively, and bolting `sc create / sc start`
  through `NSIS_HOOK_POSTINSTALL` would introduce a second install path
  to test for no real user benefit (the wizard UI is roughly the same
  to a Windows user either way). Revisit if there is demand.

## [0.1.2-beta] - 2026-05-23

Acting on community feedback ([upstream maintainer's tech write-up on
SMI behaviour][smi-thread]): the GUI no longer evaluates fan curves
client-side, and it pesters the EC noticeably less often.

[smi-thread]: https://4pda.to/forum/index.php?showtopic=1115067 (Lenovo Lecoo Pro 14 thread on 4pda)

### Removed
- **Custom fan curves removed from the Fans page.** Evaluating a curve
  in the GUI meant polling the EC every 500 ms and writing back a PWM
  value, which on these boards triggers SMIs (System Management
  Interrupts) — those briefly pause the entire CPU and show up as DPC
  latency, audio glitches and FPS drops. A correct implementation has
  to live in the daemon (with hysteresis and a failsafe-on-crash), and
  that's upstream's call to make. Until then the Fan page exposes only
  the EC's two modes: **Auto** (the built-in thermal table, respects
  the active power profile) and **Full** (both fans at 100%).
- `gui/src/curve.rs`, `gui/src/curve_runner.rs`, the SVG fan-curve
  editor, the Silent/Balanced/Aggressive presets, and the
  `get_fan_curve` / `set_fan_curve` / `set_fan_curve_enabled` Tauri
  commands are all gone. The remaining `set_fan_mode` command stays
  the same.

### Changed
- **Telemetry poll rate lowered from 1 Hz to 0.33 Hz** (one sample
  every 3 s). That's still smooth enough for a chart someone is
  looking at, and it cuts our EC port-I/O traffic to a third.
- **The poller now parks while the window is hidden.** When the user
  closes the window to tray, `set_poll_paused(true)` stops further
  IPC round-trips entirely; the connection stays open so resumes are
  instant. Re-opening the window from the tray re-arms polling and
  pulls a fresh sample immediately.

### Daemon (fork-only changes)
- **EC port probing now retries up to 5 times with a 400 ms back-off.**
  On Windows 11 25H2 the Service Control Manager started releasing
  services slightly before the EC finishes its own power-on init, so
  the first probe could read `0xFF` on every port and the daemon would
  bail. Adding a short retry loop is enough to ride out that race
  without slowing the happy path (first probe almost always succeeds).
- **EC I/O lock has a watchdog.** A background thread polls
  `EcDevice::lock_age_ms` once a second and writes a `WARN`-level log
  line when a single batch holds the mutex past 2 s — usually a stuck
  SMI or a wedged super-I/O transaction. Each `with_batch` call also
  logs at WARN when its own elapsed time crosses 500 ms, so we get a
  trail in the diagnostics bundle even on milder slowdowns.

## [0.1.1-beta] - 2026-05-23

Patch release with the first batch of feedback fixes after `0.1.0-beta`.

### Added
- **Real battery info on the Overview dashboard.** `BatteryCard` was a
  placeholder; it now shows the live battery percentage, the configured
  FlexiCharger range, an AC-status line ("Charging" / "At charge limit"
  / "Plugged in" / "On battery"), and a tick mark on the progress bar
  at the upper charge limit.
- **Battery percent + AC status piped through the telemetry sample**, so
  the dashboard updates once a second alongside temperatures and RPMs.
  AC status is read from Windows' `GetSystemPowerStatus` directly in
  the GUI process — no daemon work needed.
- **Battery page now reflects the actual limit on disk.** If the daemon
  is configured for 70–80%, the page opens with "Balanced" already
  selected instead of always starting on Balanced regardless. The page
  also shows the live battery percentage in its header.

### Changed
- **Titlebar window controls follow Windows conventions** — three
  square buttons on the right (minimize, maximize/restore, close), with
  close lighting up `#e81123` on hover. The macOS-style traffic-light
  dots are gone.
- **App version is now read from `tauri.conf.json` at runtime** via
  `@tauri-apps/api/app::getVersion`. The hardcoded `0.1.0` strings in
  Titlebar and Settings are gone — one place to bump for every release.
  GUI Cargo crate has its own version (separate from the workspace one)
  to stay in sync with the Tauri config.

### Fixed
- **"Check for updates" returned HTTP 404** when every release was a
  prerelease, because GitHub's `/releases/latest` endpoint hides
  prereleases. Switched to listing `/releases` and taking the most
  recent entry regardless of the prerelease flag.

## [0.1.0-beta] - 2026-05-22

First public build of the A-mi13 fork. Ships the GUI, the MSI installer
that registers the daemon as a Windows service, and the diagnostics
plumbing needed for sensible bug reports.

### Added

#### GUI — overall shell
- Tauri 2 + React + TypeScript desktop app under `gui/`.
- Custom titlebar with macOS-style traffic-light buttons and a live
  connection-status pill driven by the Rust poller.
- Sidebar navigation with grouped sections (Hardware, Lighting, Settings)
  and active-route highlighting.
- Dark / Light / Auto theme, all colours driven from CSS variables so
  charts, sparklines and the LED preview ring follow the active theme.
- English, Русский and 中文 translations. Language is detected from the
  persisted store first, then `localStorage`, then the browser.

#### Overview dashboard
- Four stat tiles (CPU temp, system temp, CPU fan RPM, GPU fan RPM) with
  inline-SVG sparklines. The CPU tile turns warning-red at ≥ 85 °C.
- uPlot temperature chart with selectable time ranges (30 s / 60 s / 5 m /
  30 m), drawn from a bounded telemetry history (up to 30 min).
- Power-profile segmented control (Silent / Default / Performance) that
  round-trips through `set_power_profile`.
- Fans summary card with per-fan RPM bars and a Battery placeholder.

#### Fan curves
- Per-fan SVG editor for CPU and GPU. Drag points to move, double-click
  to add, right-click to remove (minimum two points enforced). A live
  cursor rides the curve at the current temperature; the > 80 °C area is
  shaded as a soft warning.
- Three starter presets (Silent / Balanced / Aggressive).
- Mode segment (Auto / Curve / Full). Auto and Full hand control back to
  the EC; Curve activates the client-side runner.
- Client-side runner: a 500 ms Tokio task evaluates the curve against the
  latest telemetry sample, maps percentages into the EC duty cycle range
  (0–220), and pushes `SetFanMode::Custom` over IPC. *(Server-side
  evaluation is the next milestone — see "Known limitations".)*

#### Power / Battery / Keyboard
- Power page with the profile segment, per-profile description, and an
  EC diagnostics card (EC value + applied-at timestamp).
- Battery page exposes all five FlexiCharger limits (Full / High /
  Balanced / Maximum Lifespan / Desk Mode) with real percentage ranges
  and a one-line rationale per option.
- Keyboard page offers Off / Low / Medium / High presets plus a 0–255
  custom slider. A three-row mini-keyboard preview lights up in real
  time so the brightness is honest before the daemon round-trips.

#### LED Ring
- Three modes: Auto (let the EC drive it), Static (slider 0–255 with a
  glowing preview ring), Animation (a full `BreathConfig` builder).
- 11 named animation presets mirroring the upstream `ipc::BreathConfig`
  constants (smooth, sleep, alert, zen, ping, energetic, warning,
  vacuum, panic, sonar, toxic). Each preset tile has its own breath-curve
  thumbnail so you can preview the shape without applying it.
- Live preview ring driven by `requestAnimationFrame`, sampling the
  same breath equation the EC will run.

#### System tray
- Tray icon shown with the real app icon (the previous placeholder
  1×1 PNGs are gone).
- Tooltip is live: CPU temp, system temp, CPU fan RPM and GPU fan RPM
  refresh on every poller tick.
- Menu offers Open window, Power-profile submenu, Fans submenu, and
  Quit. Left-clicking the icon brings the window to the front.
- Closing the window hides it instead of exiting; Quit in the tray menu
  is the real way out.

#### Settings
- Six grouped cards: Appearance, Behavior, Telemetry, Updates, Daemon,
  Diagnostics, plus an About card. Every change applies immediately.
- Autostart toggle uses `tauri-plugin-autostart` to register / remove the
  per-user `Run` key. Settings reads the OS state at mount so the toggle
  never lies about reality.
- Updates card has a "Check for updates" button that queries the GitHub
  Releases API, compares against the embedded version and shows a link
  to the release page when a newer tag exists.
- Diagnostics card opens the log folder, copies a diagnostics bundle to
  the clipboard (with a non-async `execCommand` fallback for webview
  environments that block `navigator.clipboard`), and toggles verbose
  logging at runtime through `set_log_level`.

#### Daemon connectivity
- 1 Hz Rust poller connects to the daemon over the named pipe, emits
  `telemetry` and `connection-status` events to the webview, and
  reconnects with a 2 s back-off (interruptible by a `Notify` signal so
  the "Retry now" button is instant).
- Modal `DaemonOverlay` when the connection is anything other than
  `connected`. Explains the situation, lists `sc query` / `sc start`
  commands, and offers a Retry button.

#### Diagnostics & logging
- `tracing-subscriber` with both stdout and a daily-rotating file
  appender under `%LOCALAPPDATA%\Lecoo Control Center\logs\`.
- `EnvFilter` sits behind a `reload::Handle` so verbose logging can be
  flipped at runtime without restarting.
- `get_diagnostics_bundle` Tauri command produces a copy-paste-ready
  markdown block with the GUI version, OS info, daemon state, the last
  connection error and the tail of today's log.
- React `ErrorBoundary` wraps the whole app: on a render-time crash the
  user gets the stack trace and a retry button instead of a blank
  WebView2.

### Build & release

- WiX MSI installer (`gui/wix/daemon-service.wxs`) ships
  `lecoo-ec-daemon.exe`, `inpoutx64.dll` and the GUI, then registers
  `LecooControlDaemon` as a LocalSystem auto-start service. The service
  starts on install, and stops + unregisters on uninstall, so MSI repair
  and upgrade stay clean.
- `pnpm tauri build` produces a single `.msi` — the daemon is built in
  release as a `beforeBundleCommand` step.
- `.github/workflows/release.yml`: tag-triggered (`v*.*.*`) Windows build
  that runs the unit tests, produces the MSI, attaches a SHA-256, and
  publishes a GitHub Release with notes pulled from this file.
- `.github/workflows/rust.yml`: CI on every push and PR. Workspace tests
  run on Windows (full) and Linux (`--exclude gui`, because Tauri's
  webview stack is Windows-only here). UI job runs `tsc --noEmit` and
  `vitest`.
- `branding/screenshots/` slot for the four screenshots referenced from
  the README, with a small README in that folder describing what each
  filename should show.
- `scripts/make-icon.mjs`: turns the horizontal brand logo into a square
  PNG so `pnpm tauri icon` can regenerate the full icon set whenever the
  artwork changes.

### Tests
- Rust: the `gui` crate has 11 unit tests covering fan-curve
  interpolation, EC duty-cycle mapping, update-version comparison and
  the IPC handshake error path.
- TypeScript: 11 vitest cases over the fan-curve editor helpers (sort,
  clamp, coordinate mapping, interpolation mirroring the Rust side).

### Known limitations

- The MSI is not yet code-signed, so Windows SmartScreen will show a
  "Microsoft Defender SmartScreen prevented an unrecognized app from
  starting" prompt on first run. Click **More info → Run anyway**.
- The fan curve is evaluated client-side (in the GUI) at 500 ms
  intervals. If the GUI is closed the EC's auto profile takes over.
  Server-side evaluation is the headline item in the next release.
- Tauri's full updater (auto-download + replace) requires a signed
  build, so the in-app updater currently points the user at the release
  page rather than installing the new MSI directly.

## Upstream baseline

Based on `LaVashikk/Lecoo-Control-Center` at version 0.4.0. Upstream changelog preserved below.

---

## [0.4.0] - 2026-05-06

### Added
- Added insecure mode for daemon operation.
- Implemented flexible keyboard backlight control with custom brightness values.
- Added comprehensive i18n support for all CLI arguments (English and Russian).
- Added charge indicator status control logic.
- Added Simplified Chinese README documentation.

### Changed
- Improved help messages and output for the `charge` CLI command.
- Updated telemetry with additional system information.
- Updated README with installation instructions.

### Fixed
- Fixed EC state preservation during system Suspend/S4 (hibernation).
- Fixed PWM mux and bypass timer for custom keyboard backlight control.
- Fixed charge limit state being overridden on unknown values.

### Refactored
- Introduced atomic batching for EC I/O operations for better performance and safety.
- Centralized EC offsets into board-specific profiles.
- Simplified IPC protocol by removing `IpcResponse::Message`.

## [0.3.3] - 2026-03-23

### Added
- Added a new `monitoring` CLI command for real-time, continuous tracking of CPU/System temperatures and fan speeds.
- Added a `both` target option to the `fan` CLI command, allowing users to control CPU and GPU fans simultaneously (e.g., `fan both auto`).

### Changed
- Updated the Windows daemon initialization logic to explicitly require a `--service` flag and introduced a 3-second startup delay to improve service stability.

### Fixed
- Ensured that panic logs in the Windows service are explicitly flushed to disk before telemetry is sent, preventing log data loss during a crash.


## [0.3.2] - 2026-03-21

### Changed
- The daemon now completely restores all device settings (including battery charge limits) upon system wake-up, whereas previously only the LED mode was restored.
- The Linux installation script (`install.sh`) now features extensive pre-installation safety checks, including `/dev/port` accessibility validation and virtualization detection.
- The Linux uninstallation script (`uninstall.sh`) now interactively prompts the user before deleting saved daemon configuration data.

### Fixed
- Fixed an issue where battery charge limits were not being saved to the configuration state during system shutdown or hibernation.
- Fixed Linux daemon failing to properly detect and handle system hibernation (S4) by implementing `systemd` job monitoring alongside `logind`.
- Fixed Windows daemon power event handling to properly map Suspend events to the new hibernation logic, ensuring state is saved correctly on Windows platforms.


## [0.3.1] - 2026-03-20

### Added
- Battery charge limits are now actively applied when loading daemon settings.
- Added `RpcSs` as a dependency in the Windows installation script (`install.bat`) to ensure more reliable service startup.

### Changed
- CPU and OS information on Windows is now fetched directly from the Windows Registry instead of using `raw_cpuid`.
- Refactored the Windows daemon startup flow to explicitly wait for the OS service initialization to complete before binding the IPC server and initializing EC communication, preventing potential race conditions.

### Fixed
- Fixed a bug in EC HRAM window base address detection by correctly treating `0xFF` (instead of `0`) as the uninitialized offset.
- Prevented the daemon from crashing (panicking) during system shutdown if reading the keyboard backlight state fails.
- Ensure the active power profile is correctly read and saved alongside the keyboard backlight state during system shutdown.
- Fixed the Windows uninstaller script (`uninstall.bat`) attempting to remove the wrong service name (`LecooControlCenter` instead of `LecooControlDaemon`).
