# Decisions Log

Living document for ambiguity resolutions and architecture limitations.

## Persistence Guarantee
**Decision:** IndexedDB writes are "best effort", not synchronously guaranteed against abrupt exits like a process kill.
**Why:** True synchronous `beforeunload` IndexedDB flushing is unreliable in modern browsers due to restrictions. We will use a 300ms debounce on edits, flush manually on `visibilitychange` (when tab enters background) and on route change/unmount.

## ID Generation on Import
**Decision:** When importing a `CompetitionBundle`, only the `competition.id` is regenerated. All contestants, rounds, and entries retain their original IDs from the JSON file. The `competitionId` foreign key is remapped.
**Why:** Regenerating all IDs cascades into deep mapping complexity and breaks external reference stability. Regenerating just the topmost competition ID ensures we don't overwrite an existing competition locally while preserving the inner graph perfectly.

## Asset Orphan Cleanup
**Decision:** Phase-1 does not include Garbage Collection (GC) for orphaned image assets when rounds or contestants are deleted. Attempting GC synchronously delays the main UI thread during simple deletions.
**Why:** Keep it simple. When a `competition` is entirely deleted, all its associated assets are blitzed using a bulk index delete. For per-cell removal, we will eventually push GC to the backlog.
