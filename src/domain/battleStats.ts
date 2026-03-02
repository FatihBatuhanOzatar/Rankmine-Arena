import type { Contestant, Entry, Round } from './models';

// ---------- Round Winners ----------

/**
 * For each round, returns the IDs of the contestant(s) with the highest score.
 * Handles ties: multiple contestants can share a round win.
 * Rounds with no scored entries return an empty array.
 */
export function computeRoundWinners(
    rounds: Round[],
    contestants: Contestant[],
    entriesById: Record<string, Entry>,
    makeId: (compId: string, roundId: string, contestantId: string) => string,
    competitionId: string
): Map<string, string[]> {
    const result = new Map<string, string[]>();

    for (const round of rounds) {
        let maxScore = -Infinity;
        let winners: string[] = [];
        let hasAnyScore = false;

        for (const contestant of contestants) {
            const entryId = makeId(competitionId, round.id, contestant.id);
            const entry = entriesById[entryId];
            if (!entry || entry.score === undefined) continue;

            hasAnyScore = true;
            if (entry.score > maxScore) {
                maxScore = entry.score;
                winners = [contestant.id];
            } else if (entry.score === maxScore) {
                winners.push(contestant.id);
            }
        }

        result.set(round.id, hasAnyScore ? winners : []);
    }

    return result;
}

// ---------- Arena Summary ----------

export interface ContestantSummary {
    contestantId: string;
    contestantName: string;
    roundsWon: number;
    averageScore: number;
    totalScore: number;
}

export interface ArenaSummary {
    overallWinner: ContestantSummary | null;
    contestantStats: ContestantSummary[];
    isTied: boolean;
}

/**
 * Computes summary stats for the entire arena.
 * - Overall winner (highest total score)
 * - Rounds won per contestant
 * - Average score per contestant
 * - Tie indicator
 */
export function computeArenaSummary(
    contestants: Contestant[],
    entries: Entry[],
    totalRounds: number,
    roundWinners: Map<string, string[]>
): ArenaSummary {
    if (contestants.length === 0) {
        return { overallWinner: null, contestantStats: [], isTied: false };
    }

    // Build per-contestant aggregation
    const statsMap = new Map<string, { total: number; count: number; roundsWon: number }>();
    for (const c of contestants) {
        statsMap.set(c.id, { total: 0, count: 0, roundsWon: 0 });
    }

    // Accumulate scores
    for (const entry of entries) {
        const stats = statsMap.get(entry.contestantId);
        if (!stats) continue;
        if (entry.score !== undefined) {
            stats.total += entry.score;
            stats.count += 1;
        }
    }

    // Count round wins
    for (const winners of roundWinners.values()) {
        for (const wId of winners) {
            const stats = statsMap.get(wId);
            if (stats) stats.roundsWon += 1;
        }
    }

    // Build summary rows
    const contestantStats: ContestantSummary[] = contestants.map(c => {
        const s = statsMap.get(c.id)!;
        return {
            contestantId: c.id,
            contestantName: c.name,
            roundsWon: s.roundsWon,
            averageScore: s.count > 0 ? parseFloat((s.total / s.count).toFixed(2)) : 0,
            totalScore: s.total,
        };
    });

    // Sort by totalScore desc to find winner
    const sorted = [...contestantStats].sort((a, b) => b.totalScore - a.totalScore);

    const topScore = sorted[0]?.totalScore ?? 0;
    const hasAnyScores = sorted.some(s => s.totalScore > 0 || contestantStats.some(cs => {
        const m = statsMap.get(cs.contestantId);
        return m && m.count > 0;
    }));

    if (!hasAnyScores && totalRounds === 0) {
        return { overallWinner: null, contestantStats, isTied: false };
    }

    const tiedAtTop = sorted.filter(s => s.totalScore === topScore);
    const isTied = tiedAtTop.length > 1 && topScore >= 0 && sorted.some(s => statsMap.get(s.contestantId)!.count > 0);

    const overallWinner = sorted.length > 0 && statsMap.get(sorted[0].contestantId)!.count > 0
        ? sorted[0]
        : null;

    return { overallWinner, contestantStats, isTied };
}
