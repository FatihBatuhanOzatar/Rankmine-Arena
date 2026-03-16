export interface Competition {
    id: string;                          // uuid
    title: string;

    scoreMin: number;
    scoreMax: number;
    scoreStep: number;
    scoreUnit?: string;
    scoringMode: 'numeric' | 'slider' | 'stars';

    createdAt: number;                   // Date.now()
    updatedAt: number;
    ui: { theme: 'neoArcade' | 'calm' | 'light'; density: 'comfortable' | 'compact' };
    locked?: boolean;                    // Phase 4: Score Locking (default false)
    isWeighted?: boolean;                // Phase 4 Extension: Optional weighted rounds (default false)
    publishedSlug?: string | null;       // Phase 5: Public arena slug (null = not published)
    publishedAt?: number | null;         // Phase 5: Timestamp of last publish
}

export interface Contestant {
    id: string;
    competitionId: string;
    name: string;
    orderIndex?: number;
    accentColor?: string;               // hex
    createdAt: number;
}

export interface Round {
    id: string;
    competitionId: string;
    title: string;
    orderIndex: number;
    weight?: number;                     // Phase 4 Extension: Round weight (default 1)
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

export interface ScoringConfig {
    scoreMin: number;
    scoreMax: number;
    scoreStep: number;
    scoreUnit?: string;
    scoringMode: 'numeric' | 'slider' | 'stars';
}

export interface Template {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    scoring: ScoringConfig;
    contestants: { name: string }[];
    rounds: { title: string; orderIndex: number }[];
}
