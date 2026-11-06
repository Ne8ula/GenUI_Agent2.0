# Shado permission expiry while the page remains open

2026-10-20. Implemented and verified; owner acceptance pending. This extends [the first recovery pass](../room-recovery-v1/REVIEW.md) under the same owner UI waiver.

The ready-for-generation state now polls the existing job every two seconds. When the broker reports expired authority, the open page replaces generation with renewal for the same task. Polling issues only GET requests; it does not renew permission or submit generation automatically. The server remains responsible for rejecting expired authority between polls.

The actual browser regression keeps the page open while its synthetic service fixture changes from authorized-ready to expired-awaiting state. It verifies that the generation button disappears and the renewal button appears without reloading. Compare [before expiry](desktop-shado-before-expiry.png) with [expiry reflected on the open page](desktop-shado-expired-while-open.png). Both captures were visually inspected.

[checks.json](checks.json) records seven passed scenario groups, zero browser errors, and the full intercepted request history. The suite also reruns keyboard focus, cloud recovery/cancellation/reload, local validation cancellation, boundary editing and 390px touch/reduced-motion checks. This directory contains twelve screenshots and one checks log; the earlier public evidence and `.local` originals remain preserved.

Commands:

```powershell
node week4/app/scripts/verify-room-recovery.mjs .local/room-recovery-ui-expiry-v1 after
# From week4/app:
node ../node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
```

Both passed. This final pass changes only the upload polling state list and its browser regression. A new production build is left to the parent’s final combined verification.

These are headless Edge interactions with synthetic API responses, not live Shado/account or model execution. The service fixture simulates the expiry normalization separately covered by broker tests. No model, cloud or video generation calls were made.
