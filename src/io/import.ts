import * as repos from '../db/repos';
import { makeEntryId } from '../domain';
import type { CompetitionBundle } from './schema';

export async function importCompetition(file: File): Promise<string> {
    const text = await file.text();
    const bundle = JSON.parse(text) as CompetitionBundle;

    if (bundle.version !== 1) {
        throw new Error('Unsupported bundle version or invalid file format.');
    }

    // Generate new Competition ID for local db mapping
    const newCompId = crypto.randomUUID();
    const now = Date.now();

    const c = bundle.competition;
    c.id = newCompId;
    c.updatedAt = now;

    await repos.saveCompetition(c);

    for (const contestant of bundle.contestants) {
        contestant.competitionId = newCompId;
        await repos.saveContestant(contestant);
    }

    for (const round of bundle.rounds) {
        round.competitionId = newCompId;
        await repos.saveRound(round);
    }

    const newEntries = bundle.entries.map(e => ({
        ...e,
        id: makeEntryId(newCompId, e.roundId, e.contestantId),
        competitionId: newCompId
    }));

    await repos.saveEntries(newEntries);
    return newCompId;
}
