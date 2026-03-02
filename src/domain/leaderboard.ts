import type { Contestant, Entry, Round } from './models';

export type RankingMode = 'total' | 'average' | 'weighted-total' | 'weighted-average';

export interface LeaderboardRow {
    contestant: Contestant;
    displayScore: number;
    scoredRoundsCount: number;
    progressText: string;
}

export function computeLeaderboard(
    contestants: Contestant[],
    entries: Entry[],
    rounds: Round[],
    rankingMode: RankingMode = 'total'
): LeaderboardRow[] {
    // 1. Group by contestantId
    const statsMap = new Map<string, { totalScore: number; weightedTotal: number; scoredRoundsCount: number; scoredWeightsSum: number }>();

    // Initialize
    for (const c of contestants) {
        statsMap.set(c.id, { totalScore: 0, weightedTotal: 0, scoredRoundsCount: 0, scoredWeightsSum: 0 });
    }

    const roundWeightMap = new Map<string, number>();
    for (const r of rounds) {
        roundWeightMap.set(r.id, r.weight ?? 1);
    }

    // Iterate entries
    for (const entry of entries) {
        const stats = statsMap.get(entry.contestantId);
        if (!stats) continue;

        if (entry.score !== undefined) {
            const w = roundWeightMap.get(entry.roundId) ?? 1;
            stats.totalScore += entry.score;
            stats.weightedTotal += entry.score * w;
            stats.scoredRoundsCount += 1;
            stats.scoredWeightsSum += w;
        }
    }

    // 2. Build rows
    const rows: LeaderboardRow[] = contestants.map((contestant) => {
        const stats = statsMap.get(contestant.id)!;
        let displayScore = 0;

        if (rankingMode === 'total') {
            displayScore = stats.totalScore;
        } else if (rankingMode === 'average') {
            displayScore = stats.scoredRoundsCount > 0 ? stats.totalScore / stats.scoredRoundsCount : 0;
        } else if (rankingMode === 'weighted-total') {
            displayScore = stats.weightedTotal;
        } else if (rankingMode === 'weighted-average') {
            displayScore = stats.scoredWeightsSum > 0 ? stats.weightedTotal / stats.scoredWeightsSum : 0;
        }

        // formatting (max 2 decimals)
        displayScore = Math.round(displayScore * 100) / 100;

        return {
            contestant,
            displayScore,
            scoredRoundsCount: stats.scoredRoundsCount,
            progressText: `${stats.scoredRoundsCount} / ${rounds.length}`,
        };
    });

    // 3. Sort
    // 1st: displayScore desc
    // 2nd: scoredRoundsCount desc
    // 3rd: createdAt asc
    rows.sort((a, b) => {
        if (b.displayScore !== a.displayScore) {
            return b.displayScore - a.displayScore;
        }
        if (b.scoredRoundsCount !== a.scoredRoundsCount) {
            return b.scoredRoundsCount - a.scoredRoundsCount;
        }
        return a.contestant.createdAt - b.contestant.createdAt;
    });

    return rows;
}
