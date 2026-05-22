# Contributing

This is a fork of [LaVashikk/Lecoo-Control-Center](https://github.com/LaVashikk/Lecoo-Control-Center). Non-GUI improvements made here are sent back upstream when possible.

## Branches

- `main` — stable, follows upstream + our merged GUI work
- `gui-development` — active GUI work (current default for new features)
- `upstream-sync` — periodic merges from upstream

## Commit style

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation only
- `refactor:` — no behavior change
- `test:` — tests only
- `build:` — build system, Tauri config, dependencies
- `chore:` — housekeeping

Scope is optional (e.g., `feat(gui): ...`, `fix(daemon): ...`).

## Pull requests

1. Branch from `gui-development`
2. One concern per PR — don't bundle unrelated changes
3. Reference the spec in `docs/superpowers/specs/` if the change is architectural
4. Include test results or screenshots in the PR body when applicable

## Reporting issues

For bugs in the **daemon, CLI, or EC layer**, prefer filing upstream at https://github.com/LaVashikk/Lecoo-Control-Center/issues. For **GUI-only issues**, file here.

Whatever the layer, please attach a diagnostics bundle: open the GUI, go to **Settings → Diagnostics → Copy diagnostics**, and paste the result into the issue. If the bug needs more detail, enable **Verbose logging** first, reproduce it, then copy diagnostics again — the bundle then contains `debug`-level traces.
