import * as repos from '../db/repos';
import type { CompetitionBundle } from './schema';

export async function exportCompetition(competitionId: string): Promise<void> {
    const [competition, contestants, rounds, entries] = await Promise.all([
        repos.getCompetition(competitionId),
        repos.listContestants(competitionId),
        repos.listRounds(competitionId),
        repos.listEntries(competitionId),
    ]);

    if (!competition) throw new Error('Competition not found');

    const bundle: CompetitionBundle = {
        version: 1,
        exportedAt: Date.now(),
        competition,
        contestants,
        rounds,
        entries: entries.map(e => ({
            roundId: e.roundId,
            contestantId: e.contestantId,
            score: e.score,
            note: e.note,
            link: e.link,
            assetId: e.assetId,
            updatedAt: e.updatedAt,
        })),
        assetManifest: [] // Phase-1 leaves this empty, no image support needed out the gate
    };

    const json = JSON.stringify(bundle, null, 2);
    const blob = new Blob([json], { type: 'application/json' });

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Rankmine_${competition.title.replace(/\s+/g, '_')}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
}
