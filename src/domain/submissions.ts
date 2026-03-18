import type { PublishedArenaPayload } from './publishedArena';

// ── Jury Submission Types ───────────────────────────────────────────

export interface JurySubmissionEntry {
    roundId: string;
    contestantId: string;
    score: number;
}

export interface JurySubmissionPayload {
    entries: JurySubmissionEntry[];
}

export interface JurySubmissionRow {
    id: string;
    arena_slug: string;
    jury_name: string;
    submitted_at: string;
    payload: JurySubmissionPayload;
}

// ── Validation ──────────────────────────────────────────────────────

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Strict validation: every cell must have a score within range.
 * Partial submissions are rejected.
 */
export function validateSubmissionPayload(
    payload: JurySubmissionPayload,
    arena: PublishedArenaPayload
): ValidationResult {
    const { entries } = payload;
    const { rounds, contestants, competition } = arena;

    const expectedCount = rounds.length * contestants.length;

    if (!entries || entries.length === 0) {
        return { valid: false, error: 'No score entries provided.' };
    }

    if (entries.length !== expectedCount) {
        return {
            valid: false,
            error: `Expected ${expectedCount} entries (${rounds.length} rounds × ${contestants.length} contestants), got ${entries.length}.`,
        };
    }

    // Build lookup sets for valid IDs
    const validRoundIds = new Set(rounds.map(r => r.id));
    const validContestantIds = new Set(contestants.map(c => c.id));

    // Track seen cells to detect duplicates
    const seen = new Set<string>();

    for (const entry of entries) {
        if (!validRoundIds.has(entry.roundId)) {
            return { valid: false, error: `Invalid roundId: ${entry.roundId}` };
        }
        if (!validContestantIds.has(entry.contestantId)) {
            return { valid: false, error: `Invalid contestantId: ${entry.contestantId}` };
        }

        const cellKey = `${entry.roundId}::${entry.contestantId}`;
        if (seen.has(cellKey)) {
            return { valid: false, error: `Duplicate entry for cell: ${cellKey}` };
        }
        seen.add(cellKey);

        if (typeof entry.score !== 'number' || !isFinite(entry.score)) {
            return { valid: false, error: `Invalid score for cell ${cellKey}: ${entry.score}` };
        }

        if (entry.score < competition.scoreMin || entry.score > competition.scoreMax) {
            return {
                valid: false,
                error: `Score ${entry.score} out of range [${competition.scoreMin}, ${competition.scoreMax}] for cell ${cellKey}.`,
            };
        }
    }

    // Verify all cells are covered
    for (const round of rounds) {
        for (const contestant of contestants) {
            const cellKey = `${round.id}::${contestant.id}`;
            if (!seen.has(cellKey)) {
                return { valid: false, error: `Missing entry for cell: ${cellKey}` };
            }
        }
    }

    return { valid: true };
}
