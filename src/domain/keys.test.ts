import { describe, it, expect } from 'vitest';
import { makeEntryId, parseEntryId } from './keys';

describe('keys', () => {
    it('should round-trip properly', () => {
        const entryId = makeEntryId('c1', 'r1', 'con1');
        expect(entryId).toBe('c1::r1::con1');

        const parsed = parseEntryId(entryId);
        expect(parsed).toEqual({
            competitionId: 'c1',
            roundId: 'r1',
            contestantId: 'con1',
        });
    });

    it('should reject invalid parts', () => {
        expect(() => makeEntryId('c1::x', 'r1', 'con1')).toThrow();
    });

    it('should reject invalid full IDs', () => {
        expect(() => parseEntryId('invalid format')).toThrow();
        expect(() => parseEntryId('a::b::c::d')).toThrow();
    });
});
