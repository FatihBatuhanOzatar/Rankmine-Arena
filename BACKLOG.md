# Backlog & Future Improvements

## M6 (Optional/Gated)
- [ ] Keyboard navigation (Arrow keys move focus, Enter edits, Esc cancels, Tab next)
- [ ] Entry Details modal
- [ ] Image evidence attachments (Blob size limits, IndexedDB `assets` store lifecycle)
  - Issue: missing orphan asset GC

## Phase 2
- [ ] ZIP Export: Pack JSON bundle alongside images in a single .zip
- [ ] Virtualized Score rendering: Implement `@tanstack/react-virtual` for row/col virtualization if the grid routinely exceeds 1500 cells and React.memo isn't enough.
- [ ] AI Jury System: Prompt automated proxy clients (OpenAI/Anthropic) to rate grid cells dynamically.

## Phase 5 — Public Arena Link (Deferred)
- [ ] Unpublish: Organizer can remove a published arena
- [ ] Re-publish / Update: Overwrite existing published snapshot with current state
- [ ] Auth & Ownership: Tie published arenas to authenticated organizer identity
- [ ] Rate Limiting: Prevent abuse of open insert policy
- [x] Jury Submissions: Public viewers can submit scores via jury mode ✅ Phase 7
- [ ] Blind Judging: Hide contestant names in public view until reveal

## Phase 6 — Public Arena Discovery (Deferred)
- [ ] Dedicated `/discover` page (move listing out of Landing)
- [ ] Pagination / Infinite scroll for the listing
- [ ] Search and Filter capabilities
- [ ] Categories / Tags schema extension

## Phase 7 — Jury Submission (Deferred)
- [ ] Submission editing / retraction after submit
- [ ] Auth-gated jury submissions (verified identity)
- [ ] Advanced anti-abuse (rate limiting, fingerprinting)
- [ ] Blind judging mode integration
- [ ] Jury moderation (organizer can reject submissions)
- [ ] Real-time aggregate updates (WebSocket / polling)
