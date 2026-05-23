# RFC: Server-side fan curve evaluation in the daemon

> **Status:** draft for [upstream `LaVashikk/Lecoo-Control-Center` discussion](https://github.com/LaVashikk/Lecoo-Control-Center/discussions).
> **Author:** [@A-mi13](https://github.com/A-mi13) (maintainer of the
> [A-mi13/Lecoo-Control-Center](https://github.com/A-mi13/Lecoo-Control-Center) fork).
> **Last update:** 2026-05-23.

This is a proposal for adding **server-side fan curve evaluation** to the
daemon. Posting it before writing any code so we can agree on the shape of
the API and the safety guarantees up front. I'm happy to do the
implementation work and submit a PR — I just want to make sure the design
matches what you'd accept upstream.

## Why

I added a client-side curve runner to my fork's GUI in `v0.1.0-beta`:
the GUI polled `GetTemperatures` every 500 ms, evaluated a curve in JS,
and pushed `SetFanMode::Custom(pwm)` back to the daemon. After community
feedback (see [`procyonlotor`'s technical note on 4PDA][smi-thread]) I
removed that feature in `v0.1.2-beta`: each EC port-I/O round-trip can
trigger an SMI on these boards, and at 2 Hz that was visibly degrading
DPC latency, audio playback and game frame times.

[smi-thread]: https://4pda.to/forum/index.php?showtopic=1115067

The Fans page in my fork now exposes only `Auto` and `Full`. Users who
want a custom curve have no path at all. A server-side implementation in
the daemon would fix that without re-introducing the SMI storm: a single
process making the EC calls at a sensible rate, with hysteresis to keep
PWM writes infrequent, and with a failsafe that can't be left in a bad
state if the GUI dies.

You wrote in [Lenovo Lecoo Pro 14 (Пост Iavka #142761536)] that a safe
implementation needs data you already have, plus testing and stability
work. That's exactly what this RFC is asking about — I'd like to help.

## Proposed IPC additions

Non-breaking, both messages go at the end of their enums so old clients
keep decoding without issue.

```rust
// ipc/src/structs.rs
#[derive(Debug, Clone, Copy, PartialEq, Eq, Encode, Decode)]
pub struct FanCurvePoint {
    pub temp_c: u8, // 0..=100
    pub pwm:    u8, // 0..=100, percentage
}

#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
pub struct FanCurve {
    pub points: Vec<FanCurvePoint>,
}

// ipc/src/lib.rs — IpcRequest
SetFanCurve {
    fan: FanIndex,
    curve: Option<FanCurve>, // None disables the curve
},
GetFanCurve { fan: FanIndex },

// ipc/src/lib.rs — IpcResponse
FanCurveState {
    curve: Option<FanCurve>,
    enabled: bool,
},
```

PWM is sent as a percentage (0..=100) and the daemon maps to EC duty
internally — same boundary you already enforce in
`apply_fan_mode` (`d > 220 => bail`).

## Daemon-side engine

Single thread spawned at daemon start, owned by `EC` like other
sub-systems. Pseudocode:

```rust
fn run(ec: &EcDevice) {
    let mut last_pwm = HashMap::<FanIndex, u8>::new();
    let mut last_temp = HashMap::<FanIndex, f32>::new();
    loop {
        thread::sleep(Duration::from_millis(TICK_MS));   // 1500 ms by default

        // Snapshot per-fan state under one lock, then release.
        let state = state_snapshot();   // copies of FanCurve + enabled

        let (cpu_t, sys_t) = ec::read_temperatures(ec)?;
        for fan in [FanIndex::Cpu, FanIndex::Gpu] {
            let Some(curve) = state.curve_for(fan) else { continue; };
            if !state.enabled_for(fan) { continue; }

            let temp = if fan == FanIndex::Cpu { cpu_t } else { sys_t } as f32;
            let prev_temp = last_temp.get(&fan).copied().unwrap_or(temp);
            if (temp - prev_temp).abs() < HYSTERESIS_DEG_C { continue; }

            let pwm = curve.pwm_at(temp);
            let prev_pwm = last_pwm.get(&fan).copied();
            if prev_pwm == Some(pwm) { continue; }

            apply_fan_mode(ec, &fan, &FanMode::Custom(pct_to_duty(pwm)))?;
            last_pwm.insert(fan, pwm);
            last_temp.insert(fan, temp);
        }
    }
}
```

Three knobs:

- **Tick interval.** 1500 ms feels right on this hardware — well under the
  PWM step response, and only ~0.67 EC reads/s for both fans combined.
- **Temperature hysteresis.** 2–3 °C before the engine recomputes PWM.
  Combined with the `pwm_at(temp_prev) == pwm_at(temp)` check, idle
  laptops write the EC roughly never.
- **PWM-write deduplication.** If `pwm_at` returns the same value we
  computed last tick, no EC write happens at all.

Together these should keep custom curves well below the SMI threshold
that hurt client-side `0.1.0`.

## Safety properties

These are the bits I think are non-negotiable, in roughly the order I'd
implement them.

1. **Crash-safe fallback.** A `Drop` handler on the engine, plus an
   explicit `restore_state` step in `process_service`'s shutdown branch,
   resets both fans to `FanMode::Auto` on any exit path (clean, panic,
   service stop, suspend). Users can never end up with both fans pinned
   at 0% because the daemon died.
2. **Bounded duty.** The engine clamps to `[MIN_DUTY_PCT,
   100]` before writing, where `MIN_DUTY_PCT` is a small constant (10%?).
   Curves can request 0% in their config, but the engine refuses to
   write below the floor when temperature is above some safe threshold
   (say 60 °C system).
3. **Watchdog timeout.** If the engine loop has not run for >5 s (lock
   wedged, SMI stall, etc.), the EC lock watchdog you can see in my fork
   logs at WARN. A future iteration could escalate to "reset fans to
   Auto" if the timeout persists.
4. **Per-board off switch.** A daemon CLI flag `--no-fan-curve` (or a
   config key) so people running on unfamiliar boards can opt out
   without rebuilding.
5. **State persistence with sanity check.** Curves are saved alongside
   `CurrentSettings`. On load, any curve with <2 points or a final-PWM
   under the safety floor is discarded with a WARN.

## GUI side (what I'd ship in the fork once this lands)

The Fans page would re-introduce the SVG curve editor (drag points,
double-click add, right-click remove), three baseline presets (Silent /
Balanced / Aggressive), and a mode segment `Auto / Curve / Full`. The
heavy lifting moves to the daemon — the GUI just pushes the curve once
on edit, listens to telemetry like today, and doesn't touch the EC
between user actions.

## Open questions for you

1. Are you OK with the IPC shape above? Anything you'd add/remove?
2. Tick rate — do you have measurements that suggest a different value?
   I picked 1500 ms based on the SMI cost we observed; if the EC has a
   minimum settle time you'd want something different, I'm happy to use
   whatever you say.
3. Hysteresis location — engine-side as above, or push the dedup logic
   into a helper on `FanCurve` itself (so CLI users get the same
   behaviour for free)?
4. Where would you want the curve persisted? `CurrentSettings` so the
   existing save path picks it up, or a separate file?
5. Failure modes I'm missing? Anything about the IT5570 / IT8987 layout
   that would make the engine misbehave in a way I haven't anticipated?

## What I'm offering

I can do the implementation, the tests, and the testing on the boards I
have (N155A / N155D in my fork). PR would land against `main` upstream
with the GUI changes kept entirely in my fork until you're happy with
the daemon-side bits.

If you'd prefer to design and write it yourself I'll happily wait —
just let me know which way you're leaning so I can park the GUI side
or pick it back up.

Thanks for the upstream work; the daemon is already an impressive piece
of reverse engineering, and I'd like the GUI fork to keep being a
respectful contributor to it rather than diverge.
