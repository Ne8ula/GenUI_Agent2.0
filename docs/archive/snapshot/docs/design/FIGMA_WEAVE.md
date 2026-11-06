# Figma Weave authoring workflow

Policy retained during the 2026-10-18 cleanup; this is not current account verification or a new spending allowance.

## Mandatory prerequisite for every UI change

Every frontend/UI edit, redesign, reimplementation or visual pass needs fresh change-specific Figma Weave references **before source edits**. Generate images; motion/temporal changes also require video. Every writer inspects actual outputs and implementation guidance.

Use a direct Weave model or reusable workflow; no manual graph-building is required per task. Old references, screenshots, text briefs and other providers are not substitutes. One packet covers one bounded pass. No small/mechanical exemption without explicit owner instruction.

Missing access, usable route, finite cost approval or inspectable outputs blocks UI work, not independent non-UI work. Cloud may receive a current packet from the connected main session without credentials or assumed connectivity.

## Connection and spending

Reuse the official Figma plugin/MCP connection. Verify authentication, linked Weave account/workspace and callable contracts; do not add a duplicate server or infer access from its name. Discover actual capabilities/model IDs.

Inspect inputs, outputs and costs; establish finite scope and explicit cost authorization before running. No prior allowance carries forward. After a timeout/failure, verify job/charge state before retrying. Cancellation does not prove a refund. No private uploads, credentials or expiring authenticated URLs in public evidence.

Do not claim graph editing, editable export or synchronization without demonstrated support. No sharing/publication changes are implied.

## Bounded pass

1. Read current scope, design guide, candidate and owner feedback; capture before-state.
2. Specify design question, fixture/identity constraints, deliverables, route and budget.
3. Generate; record real run/model/workflow IDs/version where exposed, inputs/settings and costs.
4. Retrieve/inspect images and video. Exclude generated mistakes; extract primitives, anchors, material/motion rules, controls and reduced-motion behavior.
5. Implement reviewed native components within authorized scope. Runtime models remain bounded-data producers.
6. Compare matching captures against references; check interaction, continuity, failure/cancellation and accessibility. Discard stale results.
7. Record actual checks, limits and pending owner decision. Generated references and tests do not accept a phase.

## Packet

New midterm revisions use `docs/design/revisions/<revision-id>/`:

- `REVIEW.md`: status, selected references, links, scope, guidance.
- `references/contact-sheet.png`, `references/images/`, `references/videos/`: actual outputs.
- `implementation/before/`, `implementation/after/`: matching captures.
- `provenance.json`: real route, IDs, settings, approval/cost, assets, inspection.

Use the [review template](templates/weave-review/REVIEW.md) and [provenance template](templates/weave-review/provenance.json). Unknown fields stay null/empty. Follow [the manifest requirements](../../DESIGN.md#evidence-and-acceptance) and link actual candidates in [the index](INDEX.md).

Preserve new reviewable renditions, including rejected ones. [Historical cleanup](../HISTORY.md) is not blanket future deletion permission.
