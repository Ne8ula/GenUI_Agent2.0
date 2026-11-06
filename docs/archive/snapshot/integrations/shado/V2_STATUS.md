# Shado bridge v2: sealed-input quotation

2026-10-20. Server/client and popup repair candidate. No deployment, real account authorization, paid generation or complete automatic comparison has occurred.

The existing v1 popup tries to obtain a server quote before originals have been uploaded. Shado's real pricing path requires trusted metadata from sealed, owner-bound originals. Fresh room photos therefore cannot obtain that first quote. Browser-supplied dimensions must not be relabeled as trusted metadata to bypass this requirement.

## Preserved and changed files

- `client.mjs`, `client.test.mjs` and `eva-room-bridge.patch` preserve the prior v1 candidate. The current EVA broker uses v2.
- `client-v2.mjs` and `client-v2.test.mjs` implement separate upload, generation and existing-task recovery grants.
- `eva-room-bridge-v2.patch` is the complete alternative Shado patch against `e9dca6c0fe334162392d1a3c5681067846ab04d6`, including the earlier handoff files. Apply it instead of v1, not on top of v1.
- `shado-windows-build-compat.patch` separately normalizes CRLF in bundled skill source before validation/hashing. `build-compat.test.mjs` checks identical manifests and hashes for LF/CRLF input, including Unicode and literal escapes.
- The isolated `.local/worktrees/shado-bridge/` contains the v2 server and migrated authorization popup. The popup uses a tested ephemeral controller; actual Clerk/browser/deployment validation remains outstanding. EVA broker/UI integration is handled separately and must match the protocol below.

## Protocol

1. An authenticated, same-origin `proposal` request constructs the frozen project and recipe. It returns `next: "upload-authorization"` and no quote.
2. A same-origin authenticated `grant` request includes the existing task/project/node/assets/approval fields plus `phase: "upload"`, `quoteId: null`, `maximumMicros: 0`. Signed grants use `v: 2`, `aud: "shado-eva-room-v2"`. This grant can only call `media` and `quote`; it cannot submit, observe or cancel generation.
3. The server-side EVA v2 client uploads and seals the exact originals, then calls `quote()`. The quote uses Shado's existing owner-bound metadata and pricing implementation. Quote failure cannot authorize generation.
4. The same Shado user reviews the resulting quote. A new same-origin `grant` request preserves the exact project/task/node/assets, uses `phase: "generation"`, supplies that `quoteId` and sets `maximumMicros` to the exact quote amount. The server verifies sealed originals first, then obtains the current quote and requires matching ID and amount. Stale/repriced offers must be reviewed again.
5. Replace the private upload grant with the generation grant and retain the exact quote privately. Construct the v2 client and call `submit(savedQuote)`. Generation authority permits only `submit`, `status`, `stop`, `output`; it cannot upload or obtain replacement quotes. Submission must use the exact signed quote and amount. Existing durable task IDs, ownership/session revalidation, 15-minute expiry and recovery remain in force.

Both grant phases require a real Shado user session; neither grants the operator account authority. Upload authorization is not generation consent. Quotation and generation remain subject to existing server identity, terms, metadata, balance, task admission and resource checks.

An additional `recovery` phase uses `quoteId: null`, `maximumMicros: 0` and permits only `status`, `stop`, and receipt-bound `output`. Grant issuance requires the exact existing durable task, authenticated owner/scope, project, one-node count and recipe hash. A missing task is rejected; failed tasks may be observed without new generation. Recovery cannot upload, quote, create, resume or submit a task.

## Popup wire protocol

1. Popup sends `{type:"eva-room-ready"}` to the configured exact EVA origin. EVA keeps its Window reference and replies with `{type:"eva-room-request",nonce,jobId,taskId,assets}`. `assets` contains 5–7 `{id,sha256,size,mimeType}` records. Recovery uses `type:"eva-room-recovery-request"` with the same closed set of fields and same durable task.
2. Popup authenticates with Shado and fetches the data-only proposal. The serialized frozen project omits a save timestamp so reopening preserves exact bytes. Original IDs, versions, checksums and node/settings are checked before consent.
3. Following upload consent, popup returns `{type:"eva-room-grant",nonce,jobId,uploadNonce,grant}`. `uploadNonce` is a fresh 64-character lowercase hex value scoped to this popup/account/session. `grant` contains the existing private bundle fields plus `phase`, `quoteId`, and `maximumMicros`.
4. EVA stores the authority privately, uploads/seals originals and obtains the actual server quote. It then sends `{type:"eva-room-quote",nonce,jobId,taskId,recipeHash,uploadNonce,quote}` to the same popup and exact Shado origin.
5. Popup checks origin, source Window, both nonces, job/task/recipe, quote expiry/amount and SHA-256 of the canonical quote recipe. Separate generation consent requests the server grant bound to that exact offer. It returns the same `eva-room-grant` envelope with `grant.phase:"generation"`. It never submits a video.
6. Recovery mode shows a separate existing-task consent; it returns `phase:"recovery"` without upload or quote.
7. On account/session change, explicit decline or reconnect, popup sends `{type:"eva-room-invalidated",nonce,jobId,uploadNonce}` for its last delivered nonce, then clears ephemeral state. EVA must verify origin/source/current nonces before clearing future authority. This event is not server revocation and cannot undo an admitted task. Existing admitted work requires normal stop/status handling.

Closing the popup does not create a task or authorize additional work. Reopen from the same EVA job to receive a new nonce with the same task/assets/project. Already sealed uploads resume; generation permission still requires a current quote. An admitted or uncertain task uses recovery mode, not another generation attempt. No token appears in a URL or browser persistence.

## Remaining integration and release checks

1. EVA broker grant storage, phase transitions, quote forwarding, matching invalidation and recovery are integrated and tested with mocked provider responses. Generation grants use the saved exact quote, never `quote()`. Real-provider verification remains pending.
2. Preserve task/project/assets/recipe through reopen and uncertain submissions. No replacement generation is permitted merely because an authorization window closed.
3. Test the actual popup with Clerk sign-in/account switching, keyboard/focus, expired grants, interrupted upload, blocked opener, cross-origin messages, stale quotes, denial and uncertain-submit recovery.
4. Review and commit source before deployment through Shado's normal repository workflow. The isolated full typecheck/build now pass; no deployment has occurred.

## Evidence

`node --test integrations/shado/*.test.mjs .local/worktrees/shado-bridge/src/server/eva-room-grant.test.mjs .local/worktrees/shado-bridge/src/server/eva-room-authority.test.mjs .local/worktrees/shado-bridge/src/lib/eva-room-handoff.test.mjs`

The portable route tests extract actual source from the standalone v2 patch and execute it with mocked infrastructure. The popup protocol tests likewise execute the real controller from that patch; TSX parsing is checked separately. These tests do not require the ignored worktree and do not establish live Clerk, storage or provider readiness. Native helper/client tests cover signed phase permissions, immutable assets, exact quote/price binding, uncertainty and no implicit retries. The v2 client accepts only the exact grant bundle fields: `token`, `taskId`, `nodeId`, `recipeHash`, `project`, `phase`, `quoteId`, `maximumMicros`, `expiresAt`, `assets`; unknown authority-bearing fields are rejected. The real Shado proposal constructor tests also passed using the installed `tsx --test`, including exact serialized-project equality on reopening.

### Isolated locked-install and build verification

Node `v24.14.0`, npm `11.9.0`; all work was confined to `.local/worktrees/shado-bridge`. Installed 589 packages with `npm.cmd ci --ignore-scripts --no-audit --no-fund --cache .npm-cache --fetch-retries=0`. The first sandbox attempt failed on network EACCES and was stopped; the authorized network-enabled install succeeded. Dependency lifecycle hooks stayed disabled. Lockfile SHA-256 remained `086B4C6B7306D1941193D691225773AB8B547955C22C05C264475CF1F628D3C2`.

The original prebuild/pretypecheck wrapper rejected Windows CRLF skill files before invoking TypeScript. The separate compatibility patch fixes that parsing failure. After the fix, actual `npm.cmd run typecheck` passed. The sandbox build then failed on ancestor-directory access, so it was rerun with approved local execution access and `NEXT_TELEMETRY_DISABLED=1`: actual `npm.cmd run build` passed. Next.js 16.3.8 compiled both bridge/popup routes, generated 57 static pages and passed the postbuild inspection of 54 client assets for private routing metadata/source maps. No account credentials were invented or configured.

The built production server was started temporarily on loopback port 3255. Actual HTTP checks returned bridge GET `200`, version `2`, `configured:false`; unauthenticated POST `403` with `eva_delegation_invalid`; and the popup route `200` with its explicit configuration-blocked message. The server was stopped after these checks. This verifies the unconfigured runtime fails closed, not authenticated browser interaction, paid generation, deployment or an end-to-end Shado comparison.
