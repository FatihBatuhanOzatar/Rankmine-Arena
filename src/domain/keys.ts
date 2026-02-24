export function makeEntryId(competitionId: string, roundId: string, contestantId: string): string {
    if (competitionId.includes('::') || roundId.includes('::') || contestantId.includes('::')) {
        throw new Error('IDs cannot contain "::"');
    }
    return `${competitionId}::${roundId}::${contestantId}`;
}

export function parseEntryId(entryId: string): { competitionId: string; roundId: string; contestantId: string } {
    const parts = entryId.split('::');
    if (parts.length !== 3) {
        throw new Error('Invalid entryId format');
    }
    return {
        competitionId: parts[0],
        roundId: parts[1],
        contestantId: parts[2],
    };
}
