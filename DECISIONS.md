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

## Published Arena — Snapshot Model
**Decision:** Publishing creates a point-in-time JSON snapshot of the competition. The snapshot is self-contained and stored in Supabase as JSONB. It is NOT a live mirror of the local workspace.
**Why:** Local-first editing must remain independent of remote state. A snapshot model avoids sync complexity and keeps the published view deterministic and immutable.

## Published Arena — No Auth for MVP
**Decision:** MVP publishing uses open INSERT (no authentication). There is no organizer ownership, no unpublish, and no delete policy. The Supabase `published_arenas` table has public SELECT and open INSERT RLS policies.
**Why:** Adding auth prematurely would increase scope and complexity beyond what's needed for the first iteration. This is a known abuse-risk tradeoff. Auth, ownership, unpublish, and rate limiting are deferred to the backlog.

## Published Arena — Remote Layer Separation
**Decision:** Supabase is used only for storing and retrieving published snapshots. The organizer workflow remains fully local (IndexedDB + Zustand). The public route (`/p/:slug`) fetches from Supabase directly — no store coupling.
**Why:** The remote layer is additive. It does not replace local persistence, does not introduce a sync engine, and does not modify the existing data flow.

## Public Discovery — Listing-Only MVP
**Decision:** We added scalar columns (`title`, `contestant_count`, `round_count`) to the Supabase schema rather than trying to parse the JSONB payload for the public listing.
**Why:** Fetching dozens of large JSON blobs just to display 3 simple counts on a card crushes performance and bandwidth. Flattening some metadata to the row level keeps the list query extremely fast and lightweight.

## Jury Submissions — Separate Data Layer
**Decision:** Jury submissions are stored in a dedicated `published_arena_submissions` table, completely separate from the organizer's published snapshot. The organizer's scores are not mixed into the jury aggregate.
**Why:** Clean separation between organizer-owned data and crowd-sourced jury data. The organizer's published snapshot remains immutable. Jury aggregate is computed client-side from all submissions. This is future-compatible with blind mode, moderation, and authentication without schema changes.

## Jury Submissions — JSONB Payload
**Decision:** Each jury submission stores a `payload` JSONB column containing the full scoring grid (`entries: [{roundId, contestantId, score}]`), not a normalized per-cell table.
**Why:** For MVP, a single JSONB payload per submission is simpler to insert, fetch, and process. Over-normalizing prematurely would slow delivery without providing proportional benefit at this stage. The payload format is structured enough for future migration if needed.

## Jury Aggregation — Cell-Level Average
**Decision:** Public jury results are computed as the arithmetic mean of all jury scores for each (roundId, contestantId) cell. The leaderboard and summary are then recomputed from these averaged entries using existing domain functions.
**Why:** Simple, deterministic, and easy to verify. All submissions are validated as complete (every cell scored), so every cell has exactly N scores from N submissions.

## Jury Validation — Strict Full Submission
**Decision:** Partial jury submissions are rejected. Every cell in the round × contestant grid must have a valid score within the arena's scoring range. The entry count must equal `rounds.length × contestants.length`.
**Why:** Simplifies aggregation (no need to handle missing cells), prevents low-effort submissions, and ensures every jury contribution is a complete evaluation.

## Jury Anti-Abuse — localStorage MVP
**Decision:** A `localStorage` flag (`jury_submitted_{slug}`) is set after each successful submission. This is checked on page load to show an "Already submitted" indicator and hide the jury CTA.
**Why:** This is NOT a security system. It is a UX convenience to prevent accidental re-submission. It can be bypassed trivially (incognito, different browser, clearing storage). Real anti-abuse requires authentication, rate limiting, and fingerprinting — all deferred to backlog.
