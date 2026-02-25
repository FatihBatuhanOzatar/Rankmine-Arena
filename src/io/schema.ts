import type { Competition, Contestant, Round, Entry } from '../domain';

export interface AssetManifest {
    assetId: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: number;
}

export interface CompetitionBundle {
    version: 1;
    exportedAt: number;
    competition: Competition;
    contestants: Contestant[];
    rounds: Round[];
    entries: Pick<Entry, 'roundId' | 'contestantId' | 'score' | 'note' | 'link' | 'assetId' | 'updatedAt'>[];
    assetManifest: AssetManifest[];
}
