export interface Competition {
    id: string;                          // uuid
    title: string;
    scoring: { min: number; max: number; integerOnly: boolean };
    createdAt: number;                   // Date.now()
    updatedAt: number;
    ui: { theme: 'neoArcade' | 'calm'; density: 'comfortable' | 'compact' };
}

export interface Contestant {
    id: string;
    competitionId: string;
    name: string;
    accentColor?: string;               // hex
    createdAt: number;
}

export interface Round {
    id: string;
    competitionId: string;
    title: string;
    orderIndex: number;
    createdAt: number;
}

export interface Entry {
    id: string;                          // `${competitionId}::${roundId}::${contestantId}`
    competitionId: string;
    roundId: string;
    contestantId: string;
    score?: number;                      // missing means "unscored", counts as 0, but not towards scoredRoundsCount
    note?: string;
    link?: string;
    assetId?: string;
    updatedAt: number;
}

export interface Asset {
    id: string;
    blob: Blob;
}

export interface AssetMeta {
    id: string;
    competitionId: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: number;
}
