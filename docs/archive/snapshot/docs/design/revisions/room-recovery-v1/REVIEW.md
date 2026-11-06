# Room continuation and boundary reload

**2026-10-20 — implemented; owner acceptance pending.** The owner waived the Weave prerequisite for this overnight room-completion pass.

The upload workflow now offers an explicit check of an existing unresolved cloud call. Pending, unavailable and cancellation outcomes remain distinct; checking does not submit another model run. Shado permission expiry or restart exposes authorization renewal for the existing task. Local photo validation is labeled separately from model inference.

Reloading the estimated outline resets the selected corner, coordinate frame, opening edits and confirmation. The editor also clamps obsolete selection indices. This fixes a reproduced exception when a fifth corner was selected before reloading a four-corner outline. Photo guidance now asks for overlapping furniture/corners inside the same room rather than isolated detail shots.

## Evidence

These are actual headless Microsoft Edge screenshots and interaction logs **using synthetic API fixtures**. They are not room reconstruction results or proof of a live Shado account. No model or video generation ran for this UI verification.

| Artifact | Count | What it establishes |
|---|---:|---|
| [Before checks](before/checks.json) and `before/*.png` | 1 log, 5 screenshots | Missing recovery controls and the reproduced stale-corner browser exception |
| [After checks](after/checks.json) and `after/*.png` | 1 log, 10 screenshots | Six grouped regression scenarios, zero browser exceptions, and intercepted request history |

Matching before/after filenames compare the same fixture states: `desktop-cloud-unknown`, `desktop-intake`, `desktop-outline-selected-five`, `desktop-shado-expired`, and `phone-cancel-pending`. Additional after captures show keyboard focus, pending cancellation after reload, unavailable recovery, local photo checking, and the successfully reloaded outline.

- [Keyboard recovery focus](after/desktop-recovery-keyboard-focus.png): real Tab/Shift+Tab and Enter, with the visible focus outline checked.
- [Cancellation on a narrow screen](after/phone-cancel-pending.png): 390px emulated touch, reduced-motion preference, a 48px action target, and no horizontal overflow.
- [Reloaded outline](after/desktop-outline-reloaded.png): new coordinates remain in view, confirmation is reset, and add-corner plus arrow-key adjustment work.
- [Expired Shado permission](after/desktop-shado-expired.png): generation stays disabled and renewal remains available. The authorization fixture explicitly reports the absence of a live account.

Tests also exercised pending and unavailable recovery, cancellation across page reload, discarding a conclusive result after cancellation, successful uncancelled continuation to boundary review, and local preflight cancellation. The request log contains no analyze, compare or video-submit calls.

## Reproduction and limits

Run the current regression against the local development server:

```powershell
node week4/app/scripts/verify-room-recovery.mjs .local/room-recovery-ui-new-check after
```

The output directory must be new. The `before` mode recorded the pre-change implementation; it intentionally asserts the old failure and is not expected to pass against the fixed application.

Application TypeScript checking passed. `npm.cmd run build` from `week4/app` passed, including the Rust renderer wrapper. The initial sandbox build could not read esbuild's parent directory; the authorized run outside that filesystem restriction succeeded. Existing Rust unused-code warnings remain.

Screenshots were visually inspected. Touch is browser emulation, not a physical phone test. API routing deliberately isolates the UI from private photos, provider accounts and spending. The source `.local/room-recovery-ui-before-v1` and `.local/room-recovery-ui-after-v4` evidence directories are preserved. This public copy contains only synthetic job metadata, screenshots and request paths; no credentials or private room images.
