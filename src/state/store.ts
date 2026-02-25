import { create } from 'zustand';
import type { Competition, Contestant, Round, Entry } from '../domain';
import { makeEntryId } from '../domain';
import * as repos from '../db/repos';
import { getDB } from '../db/idb';
import { createAITemplateCombo } from '../templates/ai-image-models-battle';

export interface ArenaState {
    // --- Landing State ---
    competitions: Competition[];
    loadCompetitions: () => Promise<void>;
    createCompetition: (title: string) => Promise<string>;
    createFromTemplate: () => Promise<string>;
    deleteCompetition: (id: string) => Promise<void>;
    renameCompetition: (id: string, title: string) => Promise<void>;

    // --- Arena State ---
    activeCompetition: Competition | null;
    contestants: Contestant[];
    rounds: Round[];
    entriesById: Record<string, Entry>; // O(1) indexed

    loadArena: (competitionId: string) => Promise<void>;
    unloadArena: () => void;

    // --- Mutations ---
    upsertEntry: (roundId: string, contestantId: string, score: number | undefined) => void;
    upsertEntryField: (roundId: string, contestantId: string, partial: Partial<Entry>) => void;

    // --- Assets ---
    saveAsset: (blob: Blob) => Promise<string>;
    getAssetBlob: (assetId: string) => Promise<Blob | undefined>;
    deleteAsset: (assetId: string) => Promise<void>;

    // --- Pending DB Writes ---
    pendingEntryWrites: Record<string, Entry>;
    flushPending: () => Promise<void>;
}

// Timeout helper for db queueing
let flushTimeoutId: ReturnType<typeof setTimeout> | null = null;

export const useStore = create<ArenaState>((set, get) => ({
    competitions: [],
    activeCompetition: null,
    contestants: [],
    rounds: [],
    entriesById: {},
    pendingEntryWrites: {},

    // --- Landing
    loadCompetitions: async () => {
        const list = await repos.listCompetitions();
        set({ competitions: list.sort((a, b) => b.updatedAt - a.updatedAt) });
    },

    createCompetition: async (title: string) => {
        const id = crypto.randomUUID();
        const now = Date.now();
        const c: Competition = {
            id,
            title,
            scoring: { min: 0, max: 10, integerOnly: true },
            createdAt: now,
            updatedAt: now,
            ui: { theme: 'neoArcade', density: 'comfortable' },
        };
        await repos.saveCompetition(c);
        return id;
    },

    createFromTemplate: async () => {
        const { competition, contestants, rounds } = createAITemplateCombo();
        await repos.saveCompetition(competition);
        for (const c of contestants) await repos.saveContestant(c);
        for (const r of rounds) await repos.saveRound(r);
        return competition.id;
    },

    deleteCompetition: async (id: string) => {
        await repos.deleteCompetition(id);
        await get().loadCompetitions();
    },

    renameCompetition: async (id: string, newTitle: string) => {
        const c = await repos.getCompetition(id);
        if (c) {
            c.title = newTitle;
            c.updatedAt = Date.now();
            await repos.saveCompetition(c);

            set(s => {
                if (s.activeCompetition?.id === id) {
                    return { activeCompetition: { ...s.activeCompetition, title: newTitle } };
                }
                return {};
            });

            await get().loadCompetitions();
        }
    },

    // --- Arena Load/Unload
    loadArena: async (id: string) => {
        const active = await repos.getCompetition(id);
        if (!active) {
            set({ activeCompetition: null });
            return;
        }

        const [c, r, e] = await Promise.all([
            repos.listContestants(id),
            repos.listRounds(id),
            repos.listEntries(id),
        ]);

        const entriesById: Record<string, Entry> = {};
        for (const entry of e) {
            entriesById[entry.id] = entry;
        }

        set({
            activeCompetition: active,
            contestants: c,
            rounds: r.sort((a, b) => a.orderIndex - b.orderIndex),
            entriesById,
            pendingEntryWrites: {}
        });
    },

    unloadArena: () => {
        get().flushPending();
        set({
            activeCompetition: null,
            contestants: [],
            rounds: [],
            entriesById: {},
            pendingEntryWrites: {}
        });
    },

    // --- Mutation ---
    upsertEntry: (roundId: string, contestantId: string, score: number | undefined) => {
        get().upsertEntryField(roundId, contestantId, { score });
    },

    upsertEntryField: (roundId: string, contestantId: string, partial: Partial<Entry>) => {
        const { activeCompetition, entriesById } = get();
        if (!activeCompetition) return;

        const compId = activeCompetition.id;
        const entryId = makeEntryId(compId, roundId, contestantId);

        const prev = entriesById[entryId];
        const next: Entry = prev ? {
            ...prev,
            ...partial,
            updatedAt: Date.now()
        } : {
            id: entryId,
            competitionId: compId,
            roundId,
            contestantId,
            score: undefined,
            ...partial,
            updatedAt: Date.now()
        };

        set(state => ({
            entriesById: { ...state.entriesById, [entryId]: next },
            pendingEntryWrites: { ...state.pendingEntryWrites, [entryId]: next }
        }));

        if (flushTimeoutId) clearTimeout(flushTimeoutId);
        flushTimeoutId = setTimeout(() => {
            get().flushPending();
        }, 300);
    },

    // --- Assets ---
    saveAsset: async (blob: Blob) => {
        const db = await getDB();
        const assetId = crypto.randomUUID();
        await db.put('assets', { id: assetId, blob });

        const compId = get().activeCompetition?.id || 'unknown';
        await db.put('assetMeta', {
            id: assetId,
            competitionId: compId,
            mimeType: blob.type,
            sizeBytes: blob.size,
            createdAt: Date.now(),
        });
        return assetId;
    },

    getAssetBlob: async (assetId: string) => {
        const db = await getDB();
        const rec = await db.get('assets', assetId);
        return rec?.blob;
    },

    deleteAsset: async (assetId: string) => {
        const db = await getDB();
        const tx = db.transaction(['assets', 'assetMeta'], 'readwrite');
        await tx.objectStore('assets').delete(assetId);
        await tx.objectStore('assetMeta').delete(assetId);
        await tx.done;
    },

    // --- Sync Back ---
    flushPending: async () => {
        const { pendingEntryWrites } = get();
        const entriesToSave = Object.values(pendingEntryWrites);
        if (entriesToSave.length === 0) return;

        set({ pendingEntryWrites: {} });
        await repos.saveEntries(entriesToSave);
    }

}));

if (typeof window !== 'undefined') {
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === 'hidden') {
            useStore.getState().flushPending();
        }
    });
}
