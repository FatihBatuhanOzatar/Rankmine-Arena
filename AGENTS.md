# Rankmine Arena — AGENTS.md  
Project Architecture, Contracts & Development Discipline

---

## 1. Product Identity

Rankmine Arena is a **local-first, single-user Battle Board** for structured comparisons.

Primary Use Case:
- User creates an Arena.
- Defines rounds (prompts or criteria).
- Adds contestants (models, entries, concepts).
- Uploads outputs (images or content).
- Scores manually.
- Sees instant ranking and battle outcome.

This is NOT:
- A benchmarking lab
- A multi-user judging system
- A cloud platform
- A backend-driven SaaS

System constraints:
- ❌ No backend
- ❌ No authentication
- ❌ No external UI libraries
- ❌ No hidden global state

The system is deterministic, performance-oriented, and strictly local-first.

---

## 2. Core Tech Stack

- Frontend: React (Vite) + TypeScript
- State Management: Zustand
- Persistence: IndexedDB via Repository Layer
- Styling: Custom CSS (Neo-Arcade / Amber-on-dark identity)
- Routing: React Router (AppShell architecture)

No new libraries without explicit approval.

---

## 3. Architectural Contracts

### 3.1 Single Source of Truth

All active domain data must live in:
`src/state/store.ts`

Data flow must always be:

UI → Store Action → Repository → IndexedDB

Never:
- Mutate state directly
- Write to IndexedDB from components
- Bypass the repository layer
- Perform DB writes during render

---

### 3.2 Repository Isolation

All IndexedDB access must be strictly confined to:
`src/db/repos.ts`

- UI layer must not import `idb`
- Domain layer must not import `idb`
- Only repository layer interacts with IndexedDB

---

### 3.3 Hydration & Silent Migration

When loading competitions:
- Hydrate store from IndexedDB
- If legacy data is missing fields (e.g., orderIndex, scoringConfig, lock state), apply silent migration
- Migrations must be deterministic and idempotent
- Never break previously saved data

Schema changes must be backward-safe.

---

## 4. Data Model Rules

### 4.1 Entry Identity

Entry IDs must always be generated using:
`makeEntryId(competitionId, roundId, contestantId)`

The composite key format must never change without schema version bump.

---

### 4.2 Order Persistence

Row/column reordering must persist via:
- `round.orderIndex`
- `contestant.orderIndex`

After reorder:
- Recompute sequential indices (0..n-1)
- Persist via repository in batch
- Use single Zustand `set()` call

UI array order alone is insufficient.

---

### 4.3 Template Contract

Templates are FORMAT ONLY.

Templates may include:
- contestant names
- round titles + orderIndex
- scoring config

Templates must NOT include:
- entry scores
- entry IDs
- asset IDs

Creating a competition from template must:
- Generate new competition ID
- Generate new contestant IDs
- Generate new round IDs
- Generate new entry IDs
- Initialize blank scores

No ID reuse across competitions.

---

## 5. Derived State & UI State Rules

### 5.1 Derived State Rule (Critical)

The following must ALWAYS be computed, never stored:

- Leaderboard sorting
- Round winners
- Arena summary statistics
- Aggregate counts (wins, averages, etc.)

Derived state:
- MUST be implemented via pure functions or memoized selectors
- MUST NOT be persisted in IndexedDB
- MUST NOT be stored redundantly in Zustand
- Database must contain only source-of-truth entities

---

### 5.2 UI-Only State Rule

UI interaction states must remain local and ephemeral:

Examples:
- Reveal Mode
- Modal open state
- Hover highlights
- Animation flags

These:
- Must NOT be persisted
- Must NOT modify entriesById
- Must NOT trigger grid-wide re-renders

---

### 5.3 Lock State Exception

Arena lock state (Battle Completed) IS domain state:
- Stored in Competition model
- Persisted in IndexedDB
- Backward-safe default: false

---

## 6. Performance Standards (Critical)

### 6.1 Selector Isolation

Each `ScoreCell` must subscribe only to:

`useArenaStore(s => s.entriesById[entryId])`

Never subscribe to:
- Entire entriesById object
- contestants array
- rounds array

Leaderboard may aggregate globally, but must memoize computations.

---

### 6.2 Batch Updates

Global updates (normalization, reorder, migration, mass score updates) must:

- Use a single Zustand `set()` call
- Avoid multiple `set()` calls in loops
- Persist repository writes in batch

---

### 6.3 Editing Discipline

While editing a cell:
- Draft value must remain local
- Commit only on:
  - blur
  - Enter
  - arrow navigation
- Esc must cancel and restore previous value
- Leaderboard must NOT update during typing
- Never write to DB on each keystroke
- Slider commits only on `onPointerUp`

---

### 6.4 Drag & Drop

- Use native HTML5 drag & drop only
- Highlight full row/column during drag
- Show insertion indicator
- Persist updated orderIndex
- No external DnD libraries

---

### 6.5 Animation Constraint

- Use CSS transitions only
- No heavy animation libraries
- No JS-driven layout thrashing
- Animations must not break selector isolation

---

## 7. Media Layer Contracts

- Assets stored as Blob in `assets` store
- Metadata stored in `assetMeta`
- Entry references asset via `assetId`
- ObjectURL must be revoked on unmount
- Deleting competition must cascade to assets + metadata
- JSON export excludes blobs
- Import must handle missing blobs gracefully

No image preloading for entire grid.
Lazy fetch only.

---

## 8. UI / UX Contracts

- All destructive actions must use ConfirmDialog
- Disabled actions must display reason (tooltip)
- All interactive elements must support keyboard
- Visible focus ring must remain
- Avoid excessive animation
- Maintain amber-on-dark identity
- Avoid turquoise / neon cyan accents

---

## 9. Folder Structure Contract

/src/domain       → Pure models & compute logic  
/src/db           → IndexedDB & repository layer  
/src/state        → Zustand store  
/src/components   → UI (layout / arena / ui)  
/src/pages        → Landing & Arena  
/src/assets       → Static assets  

Do not mix responsibilities.

---

## 10. Testing & Verification Protocol (Mandatory)

After completing any feature:

### 1. Run:
- npm run build
- npx tsc --noEmit
- npx eslint .
- npx vitest run

### 2. Manual Verification:
- Create competition
- Add/remove contestants & rounds
- Edit scores
- Switch scoring modes
- Reorder rows & columns
- Toggle reveal mode
- Lock/unlock arena
- Refresh page
- Verify persistence

### 3. Confirm:
- No console errors
- No infinite re-render loops
- No DB write-spam
- No performance degradation on 100x100 grid
- No selector isolation violation

Feature is not complete without verification.

---

## 11. Development Workflow (Chat-Based)

When starting new development cycle:

1. Read AGENTS.md
2. Read PROGRESS.md
3. Feature request defined directly in chat
4. Do not refactor unrelated systems
5. Do not introduce scope creep

After completion:
- Summarize modified files
- Explain architectural impact
- Update PROGRESS.md if milestone complete
- Update AGENTS.md only if architecture changed

No speculative architecture expansion.

---

## 12. Forbidden Patterns

- ❌ Direct state mutation
- ❌ Multiple Zustand `set()` inside loops
- ❌ DB writes during render
- ❌ ID reuse across competitions
- ❌ Breaking selector isolation
- ❌ Storing derived state
- ❌ External libraries without approval
- ❌ Silent breaking schema changes
- ❌ Converting product into benchmarking SaaS prematurely

---

Rankmine Arena is engineered for:

Determinism  
Performance  
Local Persistence  
Battle-Focused Interaction  
Controlled Feature Growth