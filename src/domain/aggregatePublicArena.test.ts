import { describe, it, expect } from 'vitest';
import { aggregateJuryEntries } from './aggregatePublicArena';
import type { PublishedArenaPayload } from './publishedArena';
import type { JurySubmissionRow } from './submissions';

const arena: PublishedArenaPayload = {
    version: 1,
    publishedAt: 1000,
    sourceCompetitionId: 'comp-1',
    competition: {
        title: 'Test Battle',
        scoreMin: 0,
        scoreMax: 10,
        scoreStep: 1,
        scoringMode: 'numeric',
        isWeighted: false,
        locked: true,
        theme: 'neoArcade',
        density: 'comfortable',
    },
    contestants: [
        { id: 'c-1', name: 'Alpha', orderIndex: 0 },
        { id: 'c-2', name: 'Beta', orderIndex: 1 },
    ],
    rounds: [
        { id: 'r-1', title: 'Round A', orderIndex: 0, weight: 1 },
        { id: 'r-2', title: 'Round B', orderIndex: 1, weight: 2 },
    ],
    entries: [
        { roundId: 'r-1', contestantId: 'c-1', score: 7 },
        { roundId: 'r-1', contestantId: 'c-2', score: 5 },
        { roundId: 'r-2', contestantId: 'c-1', score: 8 },
        { roundId: 'r-2', contestantId: 'c-2', score: 6 },
    ],
};

function makeSub(
    id: string,
    entries: { roundId: string; contestantId: string; score: number }[]
): JurySubmissionRow {
    return {
        id,
        arena_slug: 'test-slug',
        jury_name: 'Juror',
        submitted_at: new Date().toISOString(),
        payload: { entries },
    };
}

describe('aggregateJuryEntries', () => {
    it('returns undefined scores when there are zero submissions', () => {
        const result = aggregateJuryEntries([], arena);
        expect(result).toHaveLength(4);
        for (const e of result) {
            expect(e.score).toBeUndefined();
        }
    });

    it('returns exact scores for a single submission', () => {
        const sub = makeSub('s1', [
            { roundId: 'r-1', contestantId: 'c-1', score: 9 },
            { roundId: 'r-1', contestantId: 'c-2', score: 3 },
            { roundId: 'r-2', contestantId: 'c-1', score: 7 },
            { roundId: 'r-2', contestantId: 'c-2', score: 5 },
        ]);
        const result = aggregateJuryEntries([sub], arena);

        const lookup = new Map(result.map(e => [`${e.roundId}::${e.contestantId}`, e.score]));
        expect(lookup.get('r-1::c-1')).toBe(9);
        expect(lookup.get('r-1::c-2')).toBe(3);
        expect(lookup.get('r-2::c-1')).toBe(7);
        expect(lookup.get('r-2::c-2')).toBe(5);
    });

    it('averages scores across multiple submissions', () => {
        const sub1 = makeSub('s1', [
            { roundId: 'r-1', contestantId: 'c-1', score: 10 },
            { roundId: 'r-1', contestantId: 'c-2', score: 4 },
            { roundId: 'r-2', contestantId: 'c-1', score: 8 },
            { roundId: 'r-2', contestantId: 'c-2', score: 6 },
        ]);
        const sub2 = makeSub('s2', [
            { roundId: 'r-1', contestantId: 'c-1', score: 6 },
            { roundId: 'r-1', contestantId: 'c-2', score: 8 },
            { roundId: 'r-2', contestantId: 'c-1', score: 4 },
            { roundId: 'r-2', contestantId: 'c-2', score: 10 },
        ]);

        const result = aggregateJuryEntries([sub1, sub2], arena);
        const lookup = new Map(result.map(e => [`${e.roundId}::${e.contestantId}`, e.score]));

        expect(lookup.get('r-1::c-1')).toBe(8);   // (10 + 6) / 2
        expect(lookup.get('r-1::c-2')).toBe(6);   // (4 + 8) / 2
        expect(lookup.get('r-2::c-1')).toBe(6);   // (8 + 4) / 2
        expect(lookup.get('r-2::c-2')).toBe(8);   // (6 + 10) / 2
    });

    it('produces domain-compatible entries with correct IDs', () => {
        const sub = makeSub('s1', [
            { roundId: 'r-1', contestantId: 'c-1', score: 5 },
            { roundId: 'r-1', contestantId: 'c-2', score: 5 },
            { roundId: 'r-2', contestantId: 'c-1', score: 5 },
            { roundId: 'r-2', contestantId: 'c-2', score: 5 },
        ]);
        const result = aggregateJuryEntries([sub], arena);

        for (const e of result) {
            expect(e.id).toBe(`comp-1::${e.roundId}::${e.contestantId}`);
            expect(e.competitionId).toBe('comp-1');
        }
    });

    it('rounds averaged scores to 2 decimal places', () => {
        const sub1 = makeSub('s1', [
            { roundId: 'r-1', contestantId: 'c-1', score: 7 },
            { roundId: 'r-1', contestantId: 'c-2', score: 3 },
            { roundId: 'r-2', contestantId: 'c-1', score: 5 },
            { roundId: 'r-2', contestantId: 'c-2', score: 1 },
        ]);
        const sub2 = makeSub('s2', [
            { roundId: 'r-1', contestantId: 'c-1', score: 8 },
            { roundId: 'r-1', contestantId: 'c-2', score: 4 },
            { roundId: 'r-2', contestantId: 'c-1', score: 6 },
            { roundId: 'r-2', contestantId: 'c-2', score: 2 },
        ]);
        const sub3 = makeSub('s3', [
            { roundId: 'r-1', contestantId: 'c-1', score: 9 },
            { roundId: 'r-1', contestantId: 'c-2', score: 5 },
            { roundId: 'r-2', contestantId: 'c-1', score: 7 },
            { roundId: 'r-2', contestantId: 'c-2', score: 3 },
        ]);

        const result = aggregateJuryEntries([sub1, sub2, sub3], arena);
        const lookup = new Map(result.map(e => [`${e.roundId}::${e.contestantId}`, e.score]));

        expect(lookup.get('r-1::c-1')).toBe(8);       // (7+8+9)/3 = 8
        expect(lookup.get('r-1::c-2')).toBe(4);       // (3+4+5)/3 = 4
        expect(lookup.get('r-2::c-1')).toBe(6);       // (5+6+7)/3 = 6
        expect(lookup.get('r-2::c-2')).toBe(2);       // (1+2+3)/3 = 2
    });
});
