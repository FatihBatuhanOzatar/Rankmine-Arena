# Rankmine Arena — PROGRESS.md  
Product State, Battle Vision & Technical Milestones

---

## 🏟 Product Identity

Rankmine Arena is a **single-user AI Battle Board**.

Primary Use Case:
- User creates an Arena.
- Defines prompts (Rounds).
- Imports or uploads AI-generated outputs (images).
- Scores contestants manually.
- Sees instant ranking and battle outcome.

This is NOT a benchmarking lab.
This is an interactive comparison arena.

Multi-user judging and publishing are future considerations.

---

## ✅ Phase 1 — Core Engine & Identity
Status: COMPLETE  
Stability: VERIFIED

### Architecture
- React + TypeScript + Zustand
- IndexedDB with Repository isolation
- AppShell layout + persistent header
- AGENTS.md architectural contract

### Competition Engine
- Dynamic grid (add/remove contestants & rounds)
- Drag & Drop reordering (orderIndex persisted)
- Real-time leaderboard (pure compute function)
- Scoring modes:
  - Numeric
  - Slider
  - Star (full / half step)
- Score normalization on scoringConfig change
- Template system (format-only replication)

### Interaction Model
- Local draft editing (commit on Blur / Enter / Arrow)
- Esc cancels edit
- Arrow-key navigation
- Selector isolation preserved (no full-grid re-render)

---

## ✅ Phase 2 — Structural Hardening
Status: COMPLETE

- Slider commit optimization (pointerup)
- 50x50 and 100x100 stress tests
- Import validation hardened
- Cascade deletes verified (entries + assets)

---

## ✅ Phase 3 — Media Layer
Status: COMPLETE

- Per-entry image attachment (upload / replace / remove)
- Preview-first modal
- Integrated attachment chip (always visible)
- Grid / Gallery view toggle
- ObjectURL lifecycle management
- Asset cascade integrity
- `getEntryAssetBlob(entryId)` helper for future AI integration

Images remain local-only.

---

## ✅ Phase 4 — Battle Experience Layer
Status: COMPLETE

### Reveal Mode
- Toggle in Arena top bar: Live / Reveal
- In Reveal mode, leaderboard shows unsorted order with blurred scores
- "Results Hidden" overlay with "Reveal Results" button
- FLIP animation on reveal (CSS transitions, no animation libs)
- Winner highlighted with subtle glow

### Round Winner Highlight
- Pure `computeRoundWinners()` function in `domain/battleStats.ts`
- Per-round winner cells highlighted with amber inset glow
- Ties handled gracefully (multiple cells highlighted)

### Arena Summary Panel
- Collapsible panel above Leaderboard
- Overall winner, rounds won per contestant, avg score, tie indicator
- Pure `computeArenaSummary()` function, fully memoized

### Score Locking
- `locked?: boolean` on Competition model (backward-safe default: false)
- Lock/Unlock button in top bar
- "🏁 Battle Completed" banner when locked
- All editing, DnD, add/remove disabled when locked
- Persisted in IndexedDB via `toggleLock()` store action

---

## ✅ Phase 5 — Public Arena Link
Status: COMPLETE

### Publishing
- Organizer can publish any competition from the Arena toolbar
- Point-in-time snapshot stored in Supabase (`published_arenas` table)
- Generates unique 8-char slug for public URL
- Local metadata (`publishedSlug`, `publishedAt`) persisted on Competition model
- Publish orchestration at page level (not in global store)

### Public View (Read-Only)
- Route: `/p/:slug` — rendered outside AppShell
- Standalone page fetches snapshot from Supabase, no Zustand store dependency
- Displays: title, scoring config, contestants, rounds, scores, leaderboard, summary
- Round winner highlights and battle summary computed via pure domain functions
- No editing controls: no DnD, no score inputs, no modals, no add/remove
- Loading, not-found, and error states handled
- Theme applied from published payload

### Architecture
- Domain: `publishedArena.ts` — payload type + `buildPublishedPayload()` pure function
- API: `src/api/supabase.ts` (client) + `src/api/publish.ts` (publish/fetch)
- UI: `PublicArena.tsx` — fully self-contained read-only page
- Existing local-first flow untouched

### Not in Scope (Deferred)
- Unpublish / re-publish
- Authentication / ownership
- Jury submissions
- Blind judging mode

---

## ✅ Phase 6 — Public Arena Discovery
Status: COMPLETE

### Community Listing
- Added "Explore Community Arenas" section to Landing page.
- Lists recently published arenas fetched directly from Supabase.
- Lightweight card design showing title, publish date, contestant count, and round count.
- Clicking a card navigates to the existing `/p/:slug` public page.

### Architectural Extensions
- Added new columns to `published_arenas` (`title`, `contestant_count`, `round_count`) to avoid fetching large JSON payloads for listing purposes.
- Added `fetchRecentPublishedArenas()` API function to fetch metadata-only list.

---

## ✅ Phase 7 — Jury Submission MVP
Status: COMPLETE

### Jury Participation
- Visitors can contribute scores as jury members on any published arena
- Dedicated jury scoring form with support for all scoring modes (numeric, slider, stars)
- Strict validation: all cells must be scored, values within range
- Submissions stored in Supabase (`published_arena_submissions` table) with JSONB payload
- Jury name optional (default: "Anonymous")

### Public Results
- Public arena page shows tabbed results: "Jury Results" vs "Organizer Baseline"
- Jury aggregate computed via cell-level averaging across all submissions
- Leaderboard and summary recomputed from averaged entries using existing domain functions
- When no jury submissions exist, shows published snapshot baseline (unchanged from Phase 6)
- Submission count displayed in jury results tab

### Anti-Abuse (MVP)
- localStorage-based flag prevents repeat submissions from same browser
- Not secure — documented as temporary limitation

### Architecture
- Domain: `submissions.ts` (types + strict validation), `aggregatePublicArena.ts` (pure aggregation)
- API: `src/api/submissions.ts` (insert/fetch from Supabase)
- UI: `PublicJuryForm.tsx` (scoring form), `PublicArena.tsx` (observer/jury mode toggle)
- Organizer scores excluded from public aggregate (jury-only averaging)
- Existing local-first organizer workflow untouched

### Not in Scope (Deferred)
- Blind judging mode
- Authentication / verified identity
- Submission editing after submit
- Advanced anti-abuse / rate limiting
- Real-time collaboration

---

## ✅ Phase UI-1 — Visual design pass
Status: COMPLETE

---

## 🎯 Current Active Focus
Phase UI-2 — Terracotta redesign, collapsible panel, toolbar restructure

---

Last Updated: Phase UI-2