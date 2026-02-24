import type { Contestant, Entry } from './models';

export interface LeaderboardRow {
    contestant: Contestant;
    totalScore: number;
    scoredRoundsCount: number;
    progressText: string;
}

export function computeLeaderboard(
    contestants: Contestant[],
    entries: Entry[],
    totalRounds: number
): LeaderboardRow[] {
    // 1. Group by contestantId
    const statsMap = new Map<string, { totalScore: number; scoredRoundsCount: number }>();

    // Initialize
    for (const c of contestants) {
        statsMap.set(c.id, { totalScore: 0, scoredRoundsCount: 0 });
    }

    // Iterate entries
    for (const entry of entries) {
        const stats = statsMap.get(entry.contestantId);
        if (!stats) continue;

        if (entry.score !== undefined) {
            stats.totalScore += entry.score;
            stats.scoredRoundsCount += 1;
        }
    }

    // 2. Build rows
    const rows: LeaderboardRow[] = contestants.map((contestant) => {
        const stats = statsMap.get(contestant.id)!;
        return {
            contestant,
            totalScore: stats.totalScore,
            scoredRoundsCount: stats.scoredRoundsCount,
            progressText: `${stats.scoredRoundsCount} / ${totalRounds}`,
        };
    });

    // 3. Sort
    // 1st: totalScore desc
    // 2nd: scoredRoundsCount desc
    // 3rd: createdAt asc
    rows.sort((a, b) => {
        if (b.totalScore !== a.totalScore) {
            return b.totalScore - a.totalScore;
        }
        if (b.scoredRoundsCount !== a.scoredRoundsCount) {
            return b.scoredRoundsCount - a.scoredRoundsCount;
        }
        return a.contestant.createdAt - b.contestant.createdAt;
    });

    return rows;
}
