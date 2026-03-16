import type { Competition, Contestant, Round, Entry } from './models';

// ── Published Arena Payload ─────────────────────────────────────────
// Point-in-time snapshot stored as JSONB in Supabase.
// Must be self-contained: no external references, no IndexedDB dependencies.

export interface PublishedArenaPayload {
    version: 1;
    publishedAt: number;
    sourceCompetitionId: string;
    competition: {
        title: string;
        scoreMin: number;
        scoreMax: number;
        scoreStep: number;
        scoreUnit?: string;
        scoringMode: string;
        isWeighted: boolean;
        locked: boolean;
        theme: string;
        density: string;
    };
    contestants: {
        id: string;
        name: string;
        orderIndex: number;
        accentColor?: string;
    }[];
    rounds: {
        id: string;
        title: string;
        orderIndex: number;
        weight: number;
    }[];
    entries: {
        roundId: string;
        contestantId: string;
        score?: number;
    }[];
}

/**
 * Pure function: builds a publishable snapshot from local domain data.
 * No side effects, no store/DB dependency.
 */
export function buildPublishedPayload(
    competition: Competition,
    contestants: Contestant[],
    rounds: Round[],
    entries: Entry[]
): PublishedArenaPayload {
    return {
        version: 1,
        publishedAt: Date.now(),
        sourceCompetitionId: competition.id,
        competition: {
            title: competition.title,
            scoreMin: competition.scoreMin,
            scoreMax: competition.scoreMax,
            scoreStep: competition.scoreStep,
            scoreUnit: competition.scoreUnit,
            scoringMode: competition.scoringMode,
            isWeighted: competition.isWeighted ?? false,
            locked: competition.locked ?? false,
            theme: competition.ui.theme,
            density: competition.ui.density,
        },
        contestants: contestants
            .slice()
            .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
            .map(c => ({
                id: c.id,
                name: c.name,
                orderIndex: c.orderIndex ?? 0,
                accentColor: c.accentColor,
            })),
        rounds: rounds
            .slice()
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map(r => ({
                id: r.id,
                title: r.title,
                orderIndex: r.orderIndex,
                weight: r.weight ?? 1,
            })),
        entries: entries.map(e => ({
            roundId: e.roundId,
            contestantId: e.contestantId,
            score: e.score,
        })),
    };
}
