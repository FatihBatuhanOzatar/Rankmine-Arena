import { describe, it, expect } from 'vitest';
import { computeLeaderboard } from './leaderboard';
import type { Contestant, Entry } from './models';

describe('computeLeaderboard', () => {
    const c1: Contestant = { id: '1', competitionId: 'c1', name: 'A', createdAt: 100 };
    const c2: Contestant = { id: '2', competitionId: 'c1', name: 'B', createdAt: 200 };
    const c3: Contestant = { id: '3', competitionId: 'c1', name: 'C', createdAt: 300 };

    const contestants = [c3, c2, c1]; // Out of order on purpose

    it('handles empty entries gracefully', () => {
        const rows = computeLeaderboard(contestants, [], 5);
        expect(rows).toHaveLength(3);
        // Tie-breaker is createdAt ASC, so 100 -> 200 -> 300
        expect(rows[0].contestant.id).toBe('1');
        expect(rows[1].contestant.id).toBe('2');
        expect(rows[2].contestant.id).toBe('3');

        expect(rows[0].totalScore).toBe(0);
        expect(rows[0].scoredRoundsCount).toBe(0);
    });

    it('calculates totalScore correctly', () => {
        const entries: Entry[] = [
            { id: '1', competitionId: 'c1', roundId: 'r1', contestantId: '1', score: 10, updatedAt: 0 },
            { id: '2', competitionId: 'c1', roundId: 'r2', contestantId: '1', score: 5, updatedAt: 0 },
            { id: '3', competitionId: 'c1', roundId: 'r1', contestantId: '2', score: 20, updatedAt: 0 },
        ];

        const rows = computeLeaderboard(contestants, entries, 2);
        expect(rows[0].contestant.id).toBe('2'); // 20 points
        expect(rows[1].contestant.id).toBe('1'); // 15 points
        expect(rows[2].contestant.id).toBe('3'); // 0 points
    });

    it('handles undefined scores as 0 points, but does NOT increment count', () => {
        const entries: Entry[] = [
            { id: '1', competitionId: 'c1', roundId: 'r1', contestantId: '1', score: undefined, updatedAt: 0 },
            { id: '2', competitionId: 'c1', roundId: 'r1', contestantId: '2', score: 0, updatedAt: 0 },
        ];

        const rows = computeLeaderboard(contestants, entries, 1);

        // c2 has 0 score, 1 rounds count
        // c1 has 0 score, 0 rounds count
        // Count wins the tie-break
        expect(rows[0].contestant.id).toBe('2');
        expect(rows[1].contestant.id).toBe('1'); // Tie broken by createdAt
        expect(rows[2].contestant.id).toBe('3');
    });

    it('tiebreaks score with scoredRoundsCount', () => {
        const entries: Entry[] = [
            { id: '1', competitionId: 'c1', roundId: 'r1', contestantId: '3', score: 5, updatedAt: 0 },
            { id: '2', competitionId: 'c1', roundId: 'r2', contestantId: '3', score: 5, updatedAt: 0 }, // 10 total, 2 counts

            { id: '3', competitionId: 'c1', roundId: 'r1', contestantId: '1', score: 10, updatedAt: 0 }, // 10 total, 1 count
        ];

        const rows = computeLeaderboard(contestants, entries, 2);
        // 3 has 10 points over 2 rounds
        // 1 has 10 points over 1 round
        expect(rows[0].contestant.id).toBe('3');
        expect(rows[1].contestant.id).toBe('1');
        expect(rows[2].contestant.id).toBe('2');
    });

    it('final tiebreaker is stable via contestant.createdAt', () => {
        const entries: Entry[] = [
            { id: '1', competitionId: 'c1', roundId: 'r1', contestantId: '3', score: 10, updatedAt: 0 },
            { id: '2', competitionId: 'c1', roundId: 'r1', contestantId: '1', score: 10, updatedAt: 0 },
        ];

        const rows = computeLeaderboard(contestants, entries, 1);

        // same score (10), same count (1). createdAt ASC breaks tie
        // c1: 100, c3: 300
        expect(rows[0].contestant.id).toBe('1');
        expect(rows[1].contestant.id).toBe('3');
        expect(rows[2].contestant.id).toBe('2');
    });
});
