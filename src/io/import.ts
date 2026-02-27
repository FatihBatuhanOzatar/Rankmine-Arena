import * as repos from '../db/repos';
import { makeEntryId } from '../domain';
import type { CompetitionBundle } from './schema';

export async function importCompetition(file: File): Promise<string> {
    const text = await file.text();
    let bundle: Partial<CompetitionBundle>;
    try {
        bundle = JSON.parse(text);
    } catch {
        throw new Error('File is not valid JSON.');
    }

    if (!bundle || typeof bundle !== 'object') {
        throw new Error('Invalid file format: root must be an object.');
    }

    if (bundle.version !== 1) {
        throw new Error(`Unsupported bundle version: ${bundle.version}. Expected version 1.`);
    }

    if (!bundle.competition || typeof bundle.competition !== 'object' || !bundle.competition.id) {
        throw new Error('Invalid file format: missing or invalid competition object.');
    }

    if (!Array.isArray(bundle.contestants)) {
        throw new Error('Invalid file format: contestants must be an array.');
    }

    if (!Array.isArray(bundle.rounds)) {
        throw new Error('Invalid file format: rounds must be an array.');
    }

    if (!Array.isArray(bundle.entries)) {
        throw new Error('Invalid file format: entries must be an array.');
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
