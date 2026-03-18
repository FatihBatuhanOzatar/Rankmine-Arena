import type { Entry } from './models';
import type { PublishedArenaPayload } from './publishedArena';
import type { JurySubmissionRow } from './submissions';

// ── Jury Aggregation ────────────────────────────────────────────────

/**
 * Aggregates jury submissions into domain-compatible Entry[] using
 * cell-level averaging.
 *
 * Since all submissions are validated as complete (every cell scored),
 * every cell will have a score from every submission.
 *
 * When there are zero submissions, returns entries with score = undefined.
 */
export function aggregateJuryEntries(
    submissions: JurySubmissionRow[],
    arena: PublishedArenaPayload
): Entry[] {
    const { rounds, contestants, sourceCompetitionId } = arena;

    if (submissions.length === 0) {
        // Return empty-scored entries matching the arena structure
        return rounds.flatMap(r =>
            contestants.map(c => ({
                id: `${sourceCompetitionId}::${r.id}::${c.id}`,
                competitionId: sourceCompetitionId,
                roundId: r.id,
                contestantId: c.id,
                score: undefined,
                updatedAt: 0,
            }))
        );
    }

    // Accumulate scores per cell
    const sums = new Map<string, number>();
    const counts = new Map<string, number>();

    for (const sub of submissions) {
        for (const entry of sub.payload.entries) {
            const key = `${entry.roundId}::${entry.contestantId}`;
            sums.set(key, (sums.get(key) ?? 0) + entry.score);
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
    }

    // Build averaged Entry[] array
    return rounds.flatMap(r =>
        contestants.map(c => {
            const key = `${r.id}::${c.id}`;
            const sum = sums.get(key);
            const count = counts.get(key);
            const avgScore = sum !== undefined && count
                ? Math.round((sum / count) * 100) / 100
                : undefined;

            return {
                id: `${sourceCompetitionId}::${r.id}::${c.id}`,
                competitionId: sourceCompetitionId,
                roundId: r.id,
                contestantId: c.id,
                score: avgScore,
                updatedAt: 0,
            };
        })
    );
}
