import { describe, it, expect } from 'vitest';
import { validateSubmissionPayload } from './submissions';
import type { PublishedArenaPayload } from './publishedArena';

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
    entries: [],
};

const FULL_ENTRIES = [
    { roundId: 'r-1', contestantId: 'c-1', score: 7 },
    { roundId: 'r-1', contestantId: 'c-2', score: 5 },
    { roundId: 'r-2', contestantId: 'c-1', score: 8 },
    { roundId: 'r-2', contestantId: 'c-2', score: 6 },
];

describe('validateSubmissionPayload', () => {
    it('accepts a valid full submission', () => {
        const result = validateSubmissionPayload({ entries: FULL_ENTRIES }, arena);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
    });

    it('rejects empty entries', () => {
        const result = validateSubmissionPayload({ entries: [] }, arena);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('No score entries');
    });

    it('rejects partial submissions (missing cells)', () => {
        const partial = FULL_ENTRIES.slice(0, 2); // only 2 of 4
        const result = validateSubmissionPayload({ entries: partial }, arena);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Expected 4');
    });

    it('rejects invalid roundId', () => {
        const bad = FULL_ENTRIES.map((e, i) =>
            i === 0 ? { ...e, roundId: 'r-999' } : e
        );
        const result = validateSubmissionPayload({ entries: bad }, arena);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid roundId');
    });

    it('rejects invalid contestantId', () => {
        const bad = FULL_ENTRIES.map((e, i) =>
            i === 1 ? { ...e, contestantId: 'c-999' } : e
        );
        const result = validateSubmissionPayload({ entries: bad }, arena);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid contestantId');
    });

    it('rejects score below range', () => {
        const bad = FULL_ENTRIES.map((e, i) =>
            i === 0 ? { ...e, score: -1 } : e
        );
        const result = validateSubmissionPayload({ entries: bad }, arena);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('out of range');
    });

    it('rejects score above range', () => {
        const bad = FULL_ENTRIES.map((e, i) =>
            i === 0 ? { ...e, score: 11 } : e
        );
        const result = validateSubmissionPayload({ entries: bad }, arena);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('out of range');
    });

    it('rejects duplicate cells', () => {
        const dup = [...FULL_ENTRIES, FULL_ENTRIES[0]]; // 5 entries, one duplicate
        const result = validateSubmissionPayload({ entries: dup }, arena);
        expect(result.valid).toBe(false);
        // Could fail on count mismatch or duplicate — both are correct
    });

    it('rejects NaN scores', () => {
        const bad = FULL_ENTRIES.map((e, i) =>
            i === 0 ? { ...e, score: NaN } : e
        );
        const result = validateSubmissionPayload({ entries: bad }, arena);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid score');
    });

    it('accepts boundary scores (min and max)', () => {
        const boundary = [
            { roundId: 'r-1', contestantId: 'c-1', score: 0 },   // scoreMin
            { roundId: 'r-1', contestantId: 'c-2', score: 10 },  // scoreMax
            { roundId: 'r-2', contestantId: 'c-1', score: 5 },
            { roundId: 'r-2', contestantId: 'c-2', score: 5 },
        ];
        const result = validateSubmissionPayload({ entries: boundary }, arena);
        expect(result.valid).toBe(true);
    });
});
