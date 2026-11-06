# eva-w4-stage-broker (mocked)

This is the platform-neutral policy and state layer for Week 4 desktop staging: consent receipts, window scope, a write-ahead journal, conditional restoration and crash recovery. It has **no native Windows adapter**. `FakeAdapter` simulates a desktop for tests, and `UnsupportedNativeAdapter` returns `Unsupported`/`NotConfigured` for every call. Nothing here moves a real window or changes a real wallpaper.

Run the checks:

```bash
cargo test --manifest-path week4/Cargo.toml
cargo clippy --manifest-path week4/Cargo.toml --all-targets -- -D warnings
```

## Contract summary

- **Renderer commands** (`renderer.rs`) mirror `../schemas/stage-request.schema.json` exactly. They take fixed enum values only. `../fixtures/ipc/stage-requests.json` is checked by both this crate and the TypeScript tests.
- **Sequencing.** The retained mock contract separates `enter` (window staging) from `set_far_field` (wallpaper). This belongs to the historical desktop experiment, not the current midterm scope.
- **Wallpaper.** A per-monitor image reference is kept alongside the **global** position mode, background colour and enabled state, following the Microsoft Learn findings in `../docs/research/SOURCE_CHECKS.md`. The broker writes only the per-monitor image and never changes the global values. Slideshow, Spotlight, policy-locked, span, disabled, empty or unknown configurations select degraded mode.
- **Window identity** is handle + PID + process start time (+ an optional class token). A recycled handle is reported gone and never acted on.
- **The journal is the single source of truth.** Every effect step is journaled before it is applied; an append failure means no effect. Live restore and crash recovery fold the same journal into a ledger and apply the same rules. Restoration happens only if the current state equals a broker-authored state, so later user changes are left alone. Every restore is read back. The journal is cleared only when every effect is settled.
- **Recovery** is serialized by a `RecoveryLock`. A competing recoverer gets `AlreadyInProgress`, and re-running after completion is a no-op. The provided lock is **in-process only**, and live staging is not yet lease-serialized against recovery.
- **Window slots** stay entirely inside the stage monitor's work area. Each applied step records the monitor and DPI it was read back with, so a monitor reassignment caused by EVA's own move is not mistaken for a user change.
- **Closing.** Once `restore` starts on a session, `enter` and `set_far_field` fail until the journal is cleared, even if that restore was incomplete. Completion consumes every receipt of the session. An emergency request turns the rest of a graceful return into one immediate step per window.
- **`FakeAdapter`** exists only for this crate's tests or with the non-default `fake` feature. The tests enable it through a self dev-dependency, so `cargo test` needs no extra flags.

## Not implemented

Not implemented: native Win32/COM adapter, durable file journal in private app data, cross-process lock, watchdog process, hotkey or tray, and Tauri IPC wiring.

Owner decisions of 2026-10-03:
- Keep the `enter` (phase B) / `set_far_field` (phase D, under the veil) split.
- Keep fail-closed handling of a torn final journal record for now. The requirement for crash-safe durable records is in [DURABLE_JOURNAL_REQUIREMENT.md](DURABLE_JOURNAL_REQUIREMENT.md), and real Windows staging stays disabled until it is met.
- The 240 px column is a mock fixture only.

## Parking policy

`BrokerConfig::parking` defaults to `ParkingPolicy::RejectIfResizeNeeded`. A window is parked only if an edge slot inside the stage monitor's work area keeps its exact size; otherwise it is excluded as `DoesNotFit` and left untouched, with nothing journaled. `ParkingPolicy::MockFitToStrip`, which shrinks windows into the 240 px column, exists only for the shared synthetic test fixture.

Neither option is the approved choreography: that is selected through the visual packet and verified on Windows. Windows that enforce a minimum size the slot cannot meet fail read-back verification and are undone (`MoveFailed`).
