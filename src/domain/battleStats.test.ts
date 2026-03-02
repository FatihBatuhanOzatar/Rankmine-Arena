import { describe, it, expect } from 'vitest';
import { computeRoundWinners, computeArenaSummary } from './battleStats';
import type { Contestant, Entry, Round } from './models';

const makeId = (_c: string, r: string, ct: string) => `${_c}::${r}::${ct}`;

const c1: Contestant = { id: 'c1', competitionId: 'comp', name: 'Alpha', createdAt: 100 };
const c2: Contestant = { id: 'c2', competitionId: 'comp', name: 'Beta', createdAt: 200 };
const c3: Contestant = { id: 'c3', competitionId: 'comp', name: 'Gamma', createdAt: 300 };

const r1: Round = { id: 'r1', competitionId: 'comp', title: 'Round 1', orderIndex: 0, createdAt: 100 };
const r2: Round = { id: 'r2', competitionId: 'comp', title: 'Round 2', orderIndex: 1, createdAt: 200 };

const contestants = [c1, c2, c3];
const rounds = [r1, r2];

function mkEntry(roundId: string, contestantId: string, score?: number): Entry {
    return {
        id: `comp::${roundId}::${contestantId}`,
        competitionId: 'comp',
        roundId,
        contestantId,
        score,
        updatedAt: Date.now(),
    };
}

describe('computeRoundWinners', () => {
    it('returns empty arrays for rounds with no scored entries', () => {
        const byId: Record<string, Entry> = {};
        const result = computeRoundWinners(rounds, contestants, byId, makeId, 'comp');
        expect(result.get('r1')).toEqual([]);
        expect(result.get('r2')).toEqual([]);
    });

    it('identifies single round winners', () => {
        const e1 = mkEntry('r1', 'c1', 8);
        const e2 = mkEntry('r1', 'c2', 5);
        const e3 = mkEntry('r1', 'c3', 3);
        const byId: Record<string, Entry> = { [e1.id]: e1, [e2.id]: e2, [e3.id]: e3 };

        const result = computeRoundWinners(rounds, contestants, byId, makeId, 'comp');
        expect(result.get('r1')).toEqual(['c1']);
    });

    it('handles ties — multiple winners', () => {
        const e1 = mkEntry('r1', 'c1', 7);
        const e2 = mkEntry('r1', 'c2', 7);
        const e3 = mkEntry('r1', 'c3', 3);
        const byId: Record<string, Entry> = { [e1.id]: e1, [e2.id]: e2, [e3.id]: e3 };

        const result = computeRoundWinners(rounds, contestants, byId, makeId, 'comp');
        expect(result.get('r1')).toEqual(['c1', 'c2']);
    });

    it('ignores undefined scores', () => {
        const e1 = mkEntry('r1', 'c1', undefined);
        const e2 = mkEntry('r1', 'c2', 5);
        const byId: Record<string, Entry> = { [e1.id]: e1, [e2.id]: e2 };

        const result = computeRoundWinners(rounds, contestants, byId, makeId, 'comp');
        expect(result.get('r1')).toEqual(['c2']);
    });
});

describe('computeArenaSummary', () => {
    it('returns null winner for empty data', () => {
        const result = computeArenaSummary([], [], [], new Map());
        expect(result.overallWinner).toBeNull();
        expect(result.contestantStats).toEqual([]);
        expect(result.isTied).toBe(false);
    });

    it('computes overall winner correctly', () => {
        const entries = [
            mkEntry('r1', 'c1', 10),
            mkEntry('r2', 'c1', 8),
            mkEntry('r1', 'c2', 5),
            mkEntry('r2', 'c2', 4),
            mkEntry('r1', 'c3', 3),
            mkEntry('r2', 'c3', 2),
        ];

        const roundWinners = new Map([['r1', ['c1']], ['r2', ['c1']]]);

        const result = computeArenaSummary(contestants, entries, rounds, roundWinners);
        expect(result.overallWinner?.contestantId).toBe('c1');
        expect(result.overallWinner?.totalScore).toBe(18);
        expect(result.isTied).toBe(false);
    });

    it('detects ties', () => {
        const entries = [
            mkEntry('r1', 'c1', 10),
            mkEntry('r1', 'c2', 10),
        ];

        const roundWinners = new Map([['r1', ['c1', 'c2']]]);

        const result = computeArenaSummary(contestants, entries, rounds.slice(0, 1), roundWinners);
        expect(result.isTied).toBe(true);
    });

    it('computes rounds won and average correctly', () => {
        const entries = [
            mkEntry('r1', 'c1', 10),
            mkEntry('r2', 'c1', 6),
            mkEntry('r1', 'c2', 8),
            mkEntry('r2', 'c2', 9),
        ];

        const roundWinners = new Map([['r1', ['c1']], ['r2', ['c2']]]);

        const result = computeArenaSummary(contestants, entries, rounds, roundWinners);

        const c1Stats = result.contestantStats.find(s => s.contestantId === 'c1')!;
        const c2Stats = result.contestantStats.find(s => s.contestantId === 'c2')!;

        expect(c1Stats.roundsWon).toBe(1);
        expect(c2Stats.roundsWon).toBe(1);
        expect(c1Stats.averageScore).toBe(8); // (10+6)/2
        expect(c2Stats.averageScore).toBe(8.5); // (8+9)/2
    });
});
