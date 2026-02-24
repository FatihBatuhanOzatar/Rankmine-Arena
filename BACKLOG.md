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
