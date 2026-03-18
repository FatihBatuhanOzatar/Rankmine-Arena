-- ============================================================
-- Phase 7 — Jury Submission MVP
-- Migration: published_arena_submissions table
-- ============================================================

-- Ensure slug has a UNIQUE constraint (safe if already exists)
CREATE UNIQUE INDEX IF NOT EXISTS published_arenas_slug_unique
  ON published_arenas(slug);

-- Jury submissions table
CREATE TABLE published_arena_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_slug text NOT NULL REFERENCES published_arenas(slug),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  jury_name text NOT NULL DEFAULT 'Anonymous',
  contestant_count integer NOT NULL DEFAULT 0,
  round_count integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL
);

-- Index for fast lookup by arena slug
CREATE INDEX idx_submissions_arena_slug
  ON published_arena_submissions(arena_slug);

-- RLS policies
ALTER TABLE published_arena_submissions ENABLE ROW LEVEL SECURITY;

-- Public read (needed for client-side aggregation)
CREATE POLICY "public_read_submissions"
  ON published_arena_submissions FOR SELECT
  USING (true);

-- Public insert (no auth for MVP — documented tradeoff)
CREATE POLICY "public_insert_submissions"
  ON published_arena_submissions FOR INSERT
  WITH CHECK (true);
