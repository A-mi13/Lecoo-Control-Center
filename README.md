<div align="center">
<img src="branding/logo-2.png" alt="Lecoo Control Center logo">

<h1>Lecoo Control Center</h1>

<p>
A desktop control center for Lecoo / Emdoor laptops — fan curves, power profiles, battery limits, keyboard backlight and rear LED ring control, built on top of LaVashikk's reverse-engineered Embedded Controller daemon.
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-0078D6.svg)]()
[![Built with Tauri 2](https://img.shields.io/badge/built%20with-Tauri%202-24C8DB.svg)](https://tauri.app/)
[![Language](https://img.shields.io/badge/language-Rust%20%2B%20React-orange.svg)]()

</div>

## About this fork

This repository is a fork of [**LaVashikk/Lecoo-Control-Center**](https://github.com/LaVashikk/Lecoo-Control-Center) — the original project that reverse-engineered the ITE IT5570 / IT8987 Embedded Controllers used in the Lecoo Pro 14 (N155) family of laptops and built a Rust daemon plus a `lecoo-ctrl` CLI on top of them. All credit for the underlying EC research, the IPC protocol, the daemon, and the CLI belongs to LaVashikk.

This fork focuses on building a polished desktop GUI and tightening up a few rough edges in the daemon:

- **Tauri 2 + React desktop GUI** — a Lenovo Vantage-style "center" surface for monitoring and configuration (the main reason this fork exists).
- **Server-side fan curve engine** — fan curves are evaluated by the daemon based on live temperature, not by the client polling and writing PWM values from user space.
- **Resume-from-sleep recovery** — after the system wakes from S3/S0ix, the daemon re-applies the last known profile, fan mode and battery limit instead of leaving the EC in whatever state Windows left it in.
- **Windows 11 25H2 auto-start fix** — the service now starts reliably on Windows 11 25H2, where the upstream daemon was failing to come up at boot.
- **Lock contention guard** — concurrent CLI / GUI / scheduled-task access to the EC no longer wedges the daemon under contention; the I/O lock has a fair wait and a watchdog.

Everything else — EC HRAM probing, PWM control, FlexiCharger thresholds, LED ring animations, telemetry plumbing — comes straight from upstream.

## Screenshots

> Screenshots will be added here once the GUI lands its first release. Until then, see the [upstream CLI screenshot](https://github.com/LaVashikk/Lecoo-Control-Center) for a feel of what the underlying daemon exposes.

## Features (GUI)

- ✨ **Live telemetry** — CPU and system temperatures, CPU and GPU fan RPM, current power profile, battery state, refreshed in real time over the daemon's IPC channel.
- 🌡️ **Fan curves** — interactive temperature → duty-cycle curve editor for the CPU and GPU fans, evaluated server-side by the daemon.
- ⚡ **Power profiles** — one-click Silent / Default / Performance switching, with the active profile reflected in the tray icon.
- 🔋 **Battery health (FlexiCharger)** — set charge thresholds (Full, High, Balanced, Lifespan, Desk) from a single screen.
- ⌨️ **Keyboard backlight** — adjust brightness levels (0–3).
- 💡 **Rear LED ring** — pick between automatic charge-indicator behavior and a custom static / breathing mode.
- 🎨 **Themes** — light, dark and system-follow themes.
- 🌍 **Internationalization** — English and Russian translations out of the box, with room for more.
- 📌 **System tray** — minimize-to-tray, quick profile switcher, live temperature/RPM readout in the tooltip.

For the lower-level CLI (`lecoo-ctrl ...`) commands — temperature reads, manual PWM, telemetry opt-out — see the [upstream README](https://github.com/LaVashikk/Lecoo-Control-Center/blob/main/README.md). The CLI is preserved unchanged in this fork.

## Installation

A signed installer will be published once the GUI hits a tagged release. Until then, build from source (next section).

If you only want the daemon and the CLI without the GUI, the upstream pre-built binaries from [LaVashikk/Lecoo-Control-Center/releases](https://github.com/LaVashikk/Lecoo-Control-Center/releases/latest) will work — the IPC protocol is compatible.

## Building from source

You will need:

- **Rust** stable toolchain (1.80+) — install via [rustup](https://rustup.rs/).
- **Node.js** 20+ and **pnpm** 9+ for the GUI front-end.
- **Tauri 2** prerequisites for your platform — see the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/). On Windows this is just the MSVC build tools and WebView2 (already bundled with Windows 11).

Clone and build:

```bash
git clone https://github.com/A-mi13/Lecoo-Control-Center.git
cd Lecoo-Control-Center

# Build the daemon and CLI
cargo build --release

# Build the GUI (Tauri front-end + back-end)
cd gui
pnpm install
pnpm tauri build
```

The daemon and CLI binaries land in `target/release/`. The packaged GUI installer (MSI / NSIS) lands in `gui/src-tauri/target/release/bundle/`.

For day-to-day development:

```bash
cd gui
pnpm tauri dev    # hot-reload GUI + auto-rebuild Rust back-end
```

## Architecture

This is a Cargo workspace with the following crates:

```
Lecoo-Control-Center/
├── ipc/               # Shared types and Unix-socket / named-pipe IPC protocol
├── daemon/            # Background service: EC driver, fan curve engine, IPC server
├── cli/               # `lecoo-ctrl` command-line client
├── gui/               # Tauri 2 desktop app (Rust back-end + React front-end)
├── libs/              # Internal helpers (EC HRAM probing, hardware quirks)
└── telemetry_server/  # Optional anonymous telemetry receiver (self-hostable)
```

The GUI talks to the daemon over the same IPC channel the CLI uses, so the two clients can run side by side without conflict.

## License

Released under the [MIT License](LICENSE), matching the upstream project.

## Credits

- **[LaVashikk](https://github.com/LaVashikk)** — original author of the Lecoo Control Center project. Reverse-engineered the ITE IT5570 / IT8987 Embedded Controller HRAM layout, designed the IPC protocol, wrote the Rust daemon and the `lecoo-ctrl` CLI, and built the telemetry pipeline. This fork would not exist without that work.
- **[A-mi13](https://github.com/A-mi13)** — maintainer of this fork; responsible for the Tauri 2 + React GUI and the daemon fixes listed in [About this fork](#about-this-fork).
- Thanks to the broader Lecoo / Emdoor laptop community that contributed motherboard revisions and EC offset reports to the upstream repository.

## Disclaimer

This software drives the laptop's Embedded Controller directly. Misconfiguration — for example, pinning a fan to 0 % duty cycle under sustained load — can cause overheating and permanent hardware damage. By using this software you accept that risk. The maintainers of this fork and the upstream author are not responsible for damage to your device.
