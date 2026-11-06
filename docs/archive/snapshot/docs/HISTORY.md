# History and recovery

## Owner decision: 2026-10-18

The owner requested a major reduction of superseded material across all weeks, including unused Week 4 experiments, while retaining a condensed long-term Dreamatorium/Shado plan. The current focus is an artistic memory palace built from photographs, with EVA conversation and object-linked memories. A crime-scene journal remains a separate future concept.

This explicitly replaces prior instructions to keep every historical archive in the current checkout. It does not authorize ongoing evidence deletion, a new UI pass, paid generation, deployment or acceptance.

## Recovery source

Complete pre-cleanup tree: **`6f93daf0d531dac900256d64558cb7b35620b38b`** on the existing `midterm` branch. Every removed file was checked against its Git blob before deletion. History was not rewritten, and no commit/push was made by cleanup.

Inspect one historical text file without restoring it:

```powershell
git show 6f93daf0d531dac900256d64558cb7b35620b38b:week4/RUST_RECONSTRUCTION_PROMPT.md
```

Export a historical subtree into a ZIP for separate inspection:

```powershell
git archive --format=zip --output="$env:TEMP/eva-week3-history.zip" 6f93daf0d531dac900256d64558cb7b35620b38b week3
```

Choose a new output name if it already exists. Avoid restoring old task prompts into the active reading path. Original paths and blob IDs remain available through `git ls-tree -r` at the recovery commit.

## Retained meaning

- Week 1 was owner-reported successful; later phases did not inherit that acceptance.
- Week 2's weather work and Week 3's conversational-eye work are historical, not the current product assignment.
- Week 4 contributes the eye, artistic scene construction, source inspection, local controls and mock policy/contracts. Its authored geometry and source-derived 2.5D scenes do not establish photo reconstruction.
- R18's hover/right-side-overlay refinement was accepted on 2026-10-16. Its final review, source fingerprints, reference contact sheet, before-state, final captures and interaction recording remain. R17 and broader Week 4/research phase acceptance are not inferred.
- Track C remains primary; Shado owns Steps 1?5, EVA Steps 6?7. The source chart is unchanged.
- The old procedural Rust assignment and Weave `RECONSTRUCTION.md` were Paris-specific directions. Their useful structural/material principles are condensed in DESIGN.md; they are not ML specifications.

## Cleanup scope

Removed tracked Weeks 1?3, old Cloud setup/assignment packs, redundant research/planning copies, obsolete task reports/prompts, bulk revision media and scratch exports. Runtime assets, source credits/licenses, all reachable Week 4 app source, tests, Rust crates and six provenance-tested reference JPGs remain.

The Week 3 eye oracle was copied unchanged into Week 4 tests. The historical Weave checklist moved into test fixtures. Root commands now target Week 4. Agent reading order and the reminder hook now point to current scope rather than a retired Paris assignment; a stale hook-only route-waiver claim conflicted with the supplied current instructions and canonical Weave guide and was removed.

Ignored private settings, runtime data and local dependency/build caches were not deleted. Their remaining directories are not active application archives. Git's object database is untouched, so checkout reduction is not a claim that Git history or total disk usage shrank equally.

See [cleanup verification](maintenance/cleanup-2026-10-18.json) for counts and executed checks.
