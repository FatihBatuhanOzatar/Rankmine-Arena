import { create } from 'zustand';
import type { Competition, Contestant, Round, Entry } from '../domain';
import { makeEntryId } from '../domain';
import * as repos from '../db/repos';
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
    // TODO Add rounds/contestants mutating logic when we build it out M3/M4

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
        // Note: starts with no entries/scores
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
                return {}; // no active arena state change needed, just fetch competitions below
            });

            await get().loadCompetitions();
        }
    },

    // --- Arena Load/Unload
    loadArena: async (id: string) => {
        const active = await repos.getCompetition(id);
        if (!active) {
            set({ activeCompetition: null }); // Error state handling out of scope here
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
        // Force flush strictly if leaving
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
        const { activeCompetition, entriesById } = get();
        if (!activeCompetition) return;

        const compId = activeCompetition.id;
        const entryId = makeEntryId(compId, roundId, contestantId);

        const prev = entriesById[entryId];
        const next: Entry = prev ? {
            ...prev,
            score,
            updatedAt: Date.now()
        } : {
            id: entryId,
            competitionId: compId,
            roundId,
            contestantId,
            score,
            updatedAt: Date.now()
        };

        set(state => ({
            entriesById: { ...state.entriesById, [entryId]: next },
            pendingEntryWrites: { ...state.pendingEntryWrites, [entryId]: next }
        }));

        // Flush management Debounce 300ms
        if (flushTimeoutId) clearTimeout(flushTimeoutId);
        flushTimeoutId = setTimeout(() => {
            get().flushPending();
        }, 300);
    },

    // --- Sync Back ---
    flushPending: async () => {
        const { pendingEntryWrites } = get();
        const entriesToSave = Object.values(pendingEntryWrites);
        if (entriesToSave.length === 0) return;

        set({ pendingEntryWrites: {} }); // Clear immediately so new edits don't conflict
        await repos.saveEntries(entriesToSave);
    }

}));

// Window blur best-effort guarantee to save
if (typeof window !== 'undefined') {
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === 'hidden') {
            useStore.getState().flushPending();
        }
    });
}
