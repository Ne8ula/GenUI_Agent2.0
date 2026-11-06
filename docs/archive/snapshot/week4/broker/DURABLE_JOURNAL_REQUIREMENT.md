# Durable journal and verified recovery: native-readiness requirement

Status: **requirement, not implemented.** Recorded 2026-10-03 under the owner's consolidation decision. **Real Windows staging stays disabled until every item below is implemented and tested on the demo machine.** This does not block independent visual work against mocks.

## Current behaviour (retained for this checkpoint)

- The broker defines the write-ahead journal contract: an in-memory `MemoryJournal` plus a strict JSON-lines encoder and decoder (`journal.rs`).
- `from_json_lines` rejects the whole journal if any line is malformed. That includes a final record torn by a crash mid-write, an interior blank line, an unknown field or a wrong version. The error names the offending line (`tests/consolidation.rs::torn_final_journal_record_fails_closed`).
- Recovery therefore never starts from an ambiguous journal. Nothing is silently truncated, discarded, replayed or reported as recovered. The desktop stays in the state the crash left, and the condition must be surfaced to the user as unresolved.

## Required before native staging

1. **Durable append.** Each record is written to a per-user private app-data file outside the repository, then flushed and fsynced (`FlushFileBuffers`) before the corresponding effect is applied. A failed write or flush means no effect.
2. **Self-delimiting, checksummed records.** Each record carries a length or terminator plus a checksum (e.g. CRC32C) and a monotonic sequence number, so a torn tail is detectable rather than merely unparseable.
3. **Torn-tail rule.** A record that fails its checksum **only at the very end** may be classified as "intent possibly unapplied". Recovery may proceed only if the preceding intact record leaves that effect's state unambiguous: the ledger already treats both the pre-step and the intended placement as broker-owned. Any interior corruption, sequence gap or unknown version fails closed and is reported as unresolved. The torn bytes are retained for diagnosis and never rewritten in place.
4. **Atomic lifecycle.** Clear the journal only after verified restoration, with a `SessionClosed` marker followed by an atomic rename or delete. A crash during clearing must leave either the full journal or none.
5. **Cross-process exclusion.** The app and the watchdog take a named mutex or lock file before recovery and while live staging is active (review L2). A recoverer that cannot take it gets `AlreadyInProgress`.
6. **Privacy.** Only window identity numbers, placements, monitor IDs, DPI and opaque wallpaper references are stored: no titles, contents or process names. The file is deleted after verified restoration, and unresolved entries are disclosed to the user.
7. **Version.** Bump `JOURNAL_FORMAT_VERSION` on the first durable format. The record shape changed during W4-1 while staying at v1; nothing has been persisted yet.

## Acceptance tests to add with the native journal

- Fault injection at every byte offset of the final record: no effect is reported recovered unless rule 3 permits it, and none is ever applied twice.
- Interior corruption and sequence gaps fail closed.
- Power-loss style truncation after `append` but before the effect: the window is at the pre-step placement and is restored.
- App and watchdog race: exactly one restores.
- The historical Windows recovery scenarios (retrieve `week4/WINDOWS_SMOKE.md` section 7 through [Git recovery](../../docs/HISTORY.md)), run on the owner's Windows machine before any native staging claim.
