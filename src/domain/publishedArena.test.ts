import { describe, it, expect } from 'vitest';
import { buildPublishedPayload } from './publishedArena';
import type { Competition, Contestant, Round, Entry } from './models';

describe('buildPublishedPayload', () => {
    const competition: Competition = {
        id: 'comp-1',
        title: 'Test Battle',
        scoreMin: 0,
        scoreMax: 10,
        scoreStep: 1,
        scoringMode: 'numeric',
        createdAt: 1000,
        updatedAt: 2000,
        ui: { theme: 'neoArcade', density: 'comfortable' },
        locked: true,
        isWeighted: false,
    };

    const contestants: Contestant[] = [
        { id: 'c-2', competitionId: 'comp-1', name: 'Beta', orderIndex: 1, createdAt: 1000 },
        { id: 'c-1', competitionId: 'comp-1', name: 'Alpha', orderIndex: 0, accentColor: '#ff0', createdAt: 1000 },
    ];

    const rounds: Round[] = [
        { id: 'r-2', competitionId: 'comp-1', title: 'Round B', orderIndex: 1, weight: 2, createdAt: 1000 },
        { id: 'r-1', competitionId: 'comp-1', title: 'Round A', orderIndex: 0, weight: 1, createdAt: 1000 },
    ];

    const entries: Entry[] = [
        { id: 'comp-1::r-1::c-1', competitionId: 'comp-1', roundId: 'r-1', contestantId: 'c-1', score: 8, updatedAt: 1000 },
        { id: 'comp-1::r-1::c-2', competitionId: 'comp-1', roundId: 'r-1', contestantId: 'c-2', score: undefined, updatedAt: 1000 },
        { id: 'comp-1::r-2::c-1', competitionId: 'comp-1', roundId: 'r-2', contestantId: 'c-1', score: 5, updatedAt: 1000 },
    ];

    it('produces correct version and sourceCompetitionId', () => {
        const p = buildPublishedPayload(competition, contestants, rounds, entries);
        expect(p.version).toBe(1);
        expect(p.sourceCompetitionId).toBe('comp-1');
        expect(p.publishedAt).toBeGreaterThan(0);
    });

    it('maps competition metadata correctly', () => {
        const p = buildPublishedPayload(competition, contestants, rounds, entries);
        expect(p.competition.title).toBe('Test Battle');
        expect(p.competition.scoreMin).toBe(0);
        expect(p.competition.scoreMax).toBe(10);
        expect(p.competition.locked).toBe(true);
        expect(p.competition.isWeighted).toBe(false);
        expect(p.competition.theme).toBe('neoArcade');
        expect(p.competition.density).toBe('comfortable');
    });

    it('sorts contestants by orderIndex', () => {
        const p = buildPublishedPayload(competition, contestants, rounds, entries);
        expect(p.contestants[0].name).toBe('Alpha');
        expect(p.contestants[1].name).toBe('Beta');
    });

    it('preserves accentColor when present', () => {
        const p = buildPublishedPayload(competition, contestants, rounds, entries);
        expect(p.contestants[0].accentColor).toBe('#ff0');
        expect(p.contestants[1].accentColor).toBeUndefined();
    });

    it('sorts rounds by orderIndex', () => {
        const p = buildPublishedPayload(competition, contestants, rounds, entries);
        expect(p.rounds[0].title).toBe('Round A');
        expect(p.rounds[1].title).toBe('Round B');
        expect(p.rounds[1].weight).toBe(2);
    });

    it('maps entries with correct fields', () => {
        const p = buildPublishedPayload(competition, contestants, rounds, entries);
        expect(p.entries).toHaveLength(3);
        const scored = p.entries.find(e => e.roundId === 'r-1' && e.contestantId === 'c-1');
        expect(scored?.score).toBe(8);
        const unscored = p.entries.find(e => e.roundId === 'r-1' && e.contestantId === 'c-2');
        expect(unscored?.score).toBeUndefined();
    });

    it('does not include internal fields like competitionId or updatedAt in entries', () => {
        const p = buildPublishedPayload(competition, contestants, rounds, entries);
        for (const e of p.entries) {
            expect(e).not.toHaveProperty('competitionId');
            expect(e).not.toHaveProperty('updatedAt');
            expect(e).not.toHaveProperty('id');
        }
    });

    it('defaults locked and isWeighted to false when undefined', () => {
        const minimal: Competition = {
            ...competition,
            locked: undefined,
            isWeighted: undefined,
        };
        const p = buildPublishedPayload(minimal, [], [], []);
        expect(p.competition.locked).toBe(false);
        expect(p.competition.isWeighted).toBe(false);
    });
});
