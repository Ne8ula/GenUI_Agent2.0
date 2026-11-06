# Historical documentation

For the owner and explicitly scoped historical lookup. **Nothing in this folder is an active agent instruction, workflow requirement or permission grant.** Do not read it to rediscover the current direction; use the root PLANNING.md instead.

## Preservation

`snapshot/` preserves all 160 tracked written-document files selected from the current `crimescene` checkout, plus the untracked 2026-10-29 text-to-world implementation plan: **161 files copied byte-for-byte**. [manifest.json](manifest.json) records original paths, archive paths, byte counts and SHA-256 hashes. This includes Markdown, text records/licenses and any selected document formats present; it is not a copy of every historical branch.

Original source revision: `334482aecfba8c23d9428dd59d61c6bfa60c203d`.

- [Previous root planning](snapshot/PLANNING.md)
- [Previous planning history](snapshot/PLANNING_HISTORY.md)
- [Previous project history](snapshot/docs/HISTORY.md)
- [Original text-to-world plan](snapshot/docs/superpowers/plans/2026-10-29-eva-text-to-world.md)

The original plan's Week 4 paths, preservation of old live routes, mandatory Weave packets and phase ceremony have been superseded for this workspace. Technical proposals can still be consulted individually. Do not execute its checklist wholesale.

## Media, source and recovery

Historical runtime code, photos, scans, videos, datasets, generated candidates and evidence media were not copied into this working tree. They were **not deleted from the original checkout**. Tracked versions remain in its Git history; untracked/ignored originals remain only wherever they were already stored. The untracked reference video and modified coordination database were left untouched in the original checkout.

Links inside historical documents are preserved as written. Links to omitted media/code may not resolve locally; look up the recorded original path at the source revision or in the preserved original checkout. Do not silently rewrite historical evidence or pretend absent media was inspected.

Example read-only lookup, while shared history is still available:

```sh
git show 334482aecfba8c23d9428dd59d61c6bfa60c203d:scripts/room_workflow/broker.mjs
```

Only recover the dependency needed for a current task. The old broker, validation schemas and Rust desktop effects are tightly coupled to previous demos and are not active future-demo modules. Their absence is not permission to replace relevant protections with permissive stubs.

The new clone shares the original Git object storage. Remote archival, independent recovery and old-worktree cleanup are pending. Keep the original checkout until those steps are explicitly completed.
