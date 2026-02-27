import { create } from 'zustand';
import type { Competition, Contestant, Round, Entry, Template } from '../domain';
import { makeEntryId } from '../domain';
import * as repos from '../db/repos';
import { getDB } from '../db/idb';
import { createAITemplateCombo } from '../templates/ai-image-models-battle';

export interface ArenaState {
    // --- Landing State ---
    competitions: Competition[];
    templates: Template[];
    loadCompetitions: () => Promise<void>;
    loadTemplates: () => Promise<void>;
    createCompetition: (title: string) => Promise<string>;
    createFromTemplate: () => Promise<string>;
    createCompetitionFromTemplate: (templateId: string) => Promise<string>;
    deleteCompetition: (id: string) => Promise<void>;
    deleteTemplate: (id: string) => Promise<void>;
    updateCompetition: (id: string, partial: Partial<Competition>) => Promise<void>;
    updateScoringConfig: (id: string, config: Pick<Competition, 'scoreMin' | 'scoreMax' | 'scoreStep' | 'scoringMode' | 'scoreUnit'>) => Promise<void>;
    createGridCompetition: (size: number) => Promise<string>;

    // --- Arena State ---
    activeCompetition: Competition | null;
    contestants: Contestant[];
    rounds: Round[];
    entriesById: Record<string, Entry>; // O(1) indexed

    loadArena: (competitionId: string) => Promise<void>;
    unloadArena: () => void;
    addTemplateFromCompetition: (name: string) => Promise<void>;

    // --- Mutations ---
    upsertEntry: (roundId: string, contestantId: string, score: number | undefined) => void;
    upsertEntryField: (roundId: string, contestantId: string, partial: Partial<Entry>) => void;

    // --- Contestant Management ---
    addContestant: (name: string) => Promise<void>;
    renameContestant: (id: string, name: string) => Promise<void>;
    removeContestant: (id: string) => Promise<void>;
    reorderContestants: (fromIndex: number, toIndex: number) => Promise<void>;

    // --- Round Management ---
    addRound: (title: string) => Promise<void>;
    renameRound: (id: string, title: string) => Promise<void>;
    removeRound: (id: string) => Promise<void>;
    reorderRounds: (fromIndex: number, toIndex: number) => Promise<void>;

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
    templates: [],
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

    loadTemplates: async () => {
        const list = await repos.listTemplates();
        set({ templates: list.sort((a, b) => b.updatedAt - a.updatedAt) });
    },

    addTemplateFromCompetition: async (name: string) => {
        const { activeCompetition, contestants, rounds } = get();
        if (!activeCompetition) return;

        const now = Date.now();
        const newTemplate: Template = {
            id: crypto.randomUUID(),
            name,
            createdAt: now,
            updatedAt: now,
            scoring: {
                scoreMin: activeCompetition.scoreMin,
                scoreMax: activeCompetition.scoreMax,
                scoreStep: activeCompetition.scoreStep,
                scoreUnit: activeCompetition.scoreUnit,
                scoringMode: activeCompetition.scoringMode
            },
            contestants: contestants.map(c => ({ name: c.name })),
            rounds: rounds.slice().sort((a, b) => a.orderIndex - b.orderIndex).map(r => ({ title: r.title, orderIndex: r.orderIndex }))
        };

        await repos.saveTemplate(newTemplate);
        await get().loadTemplates();
    },

    deleteTemplate: async (id: string) => {
        await repos.deleteTemplate(id);
        await get().loadTemplates();
    },

    createCompetitionFromTemplate: async (templateId: string) => {
        const t = await repos.getTemplate(templateId);
        if (!t) throw new Error("Template not found");

        const compId = crypto.randomUUID();
        const now = Date.now();

        const newComp: Competition = {
            id: compId,
            title: t.name,
            scoreMin: t.scoring.scoreMin,
            scoreMax: t.scoring.scoreMax,
            scoreStep: t.scoring.scoreStep,
            scoreUnit: t.scoring.scoreUnit,
            scoringMode: t.scoring.scoringMode,
            createdAt: now,
            updatedAt: now,
            ui: { theme: 'neoArcade', density: 'comfortable' }
        };

        await repos.saveCompetition(newComp);

        const newContestants: Contestant[] = t.contestants.map(c => ({
            id: crypto.randomUUID(),
            competitionId: compId,
            name: c.name,
            createdAt: now
        }));

        for (const c of newContestants) {
            await repos.saveContestant(c);
        }

        const newRounds: Round[] = t.rounds.map(r => ({
            id: crypto.randomUUID(),
            competitionId: compId,
            title: r.title,
            orderIndex: r.orderIndex,
            createdAt: now
        }));

        for (const r of newRounds) {
            await repos.saveRound(r);
        }

        const newEntries: Entry[] = [];
        for (const r of newRounds) {
            for (const c of newContestants) {
                newEntries.push({
                    id: makeEntryId(compId, r.id, c.id),
                    competitionId: compId,
                    roundId: r.id,
                    contestantId: c.id,
                    score: undefined,
                    updatedAt: now
                });
            }
        }

        if (newEntries.length > 0) {
            await repos.saveEntries(newEntries);
        }

        await get().loadCompetitions();
        return compId;
    },

    createCompetition: async (title: string) => {
        const id = crypto.randomUUID();
        const now = Date.now();
        const c: Competition = {
            id,
            title,
            scoreMin: 0,
            scoreMax: 10,
            scoreStep: 1,
            scoringMode: 'numeric',
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

    createGridCompetition: async (size: number) => {
        const compId = crypto.randomUUID();
        const now = Date.now();
        const newComp: Competition = {
            id: compId,
            title: `Stress Test ${size}x${size}`,
            scoreMin: 0,
            scoreMax: 10,
            scoreStep: 1,
            scoringMode: 'slider',
            createdAt: now,
            updatedAt: now,
            ui: { theme: 'neoArcade', density: 'comfortable' }
        };

        await repos.saveCompetition(newComp);

        const newContestants: Contestant[] = Array.from({ length: size }).map((_, i) => ({
            id: crypto.randomUUID(),
            competitionId: compId,
            name: `Contestant ${i + 1}`,
            orderIndex: i,
            createdAt: now
        }));

        const newRounds: Round[] = Array.from({ length: size }).map((_, i) => ({
            id: crypto.randomUUID(),
            competitionId: compId,
            title: `Round ${i + 1}`,
            orderIndex: i,
            createdAt: now
        }));

        await repos.saveContestants(newContestants);
        await repos.saveRounds(newRounds);

        const newEntries: Entry[] = [];
        for (const r of newRounds) {
            for (const c of newContestants) {
                newEntries.push({
                    id: makeEntryId(compId, r.id, c.id),
                    competitionId: compId,
                    roundId: r.id,
                    contestantId: c.id,
                    score: undefined,
                    updatedAt: now
                });
            }
        }

        const batchSize = 1000;
        for (let i = 0; i < newEntries.length; i += batchSize) {
            await repos.saveEntries(newEntries.slice(i, i + batchSize));
        }

        await get().loadCompetitions();
        return compId;
    },

    deleteCompetition: async (id: string) => {
        await repos.deleteCompetition(id);
        await get().loadCompetitions();
    },

    updateCompetition: async (id: string, partial: Partial<Competition>) => {
        const c = await repos.getCompetition(id);
        if (c) {
            const updated = { ...c, ...partial, updatedAt: Date.now() };
            await repos.saveCompetition(updated);

            set(s => {
                if (s.activeCompetition?.id === id) {
                    // Update active arena if it's the one we just edited
                    return { activeCompetition: updated };
                }
                return {};
            });

            await get().loadCompetitions();
        }
    },

    updateScoringConfig: async (id: string, config: Pick<Competition, 'scoreMin' | 'scoreMax' | 'scoreStep' | 'scoringMode' | 'scoreUnit'>) => {
        const { activeCompetition, entriesById } = get();
        if (!activeCompetition || activeCompetition.id !== id) return;

        const oldMin = activeCompetition.scoreMin;
        const oldMax = activeCompetition.scoreMax;

        const newMin = config.scoreMin;
        const newMax = config.scoreMax;
        const newStep = config.scoreStep;

        const updatedComp = { ...activeCompetition, ...config, updatedAt: Date.now() };
        await repos.saveCompetition(updatedComp);

        const newEntriesById = { ...entriesById };
        const entriesToSave: Entry[] = [];

        for (const key of Object.keys(newEntriesById)) {
            const entry = newEntriesById[key];
            if (entry.score !== undefined) {
                // Normalize t [0, 1]
                const t = oldMax > oldMin ? (entry.score - oldMin) / (oldMax - oldMin) : 0;

                // Map to new bounds
                let newScore = newMin + t * (newMax - newMin);

                // Snap to step using round to nearest multiple
                newScore = Math.round(newScore / newStep) * newStep;

                // Precision fix for arbitrary decimals
                newScore = parseFloat(newScore.toFixed(5));

                // Clamp
                if (newScore < newMin) newScore = newMin;
                if (newScore > newMax) newScore = newMax;

                if (newScore !== entry.score) {
                    newEntriesById[key] = { ...entry, score: newScore, updatedAt: Date.now() };
                    entriesToSave.push(newEntriesById[key]);
                }
            }
        }

        if (entriesToSave.length > 0) {
            await repos.saveEntries(entriesToSave);
        }

        set({
            activeCompetition: updatedComp,
            entriesById: newEntriesById
        });

        await get().loadCompetitions();
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

        // Migration: Add orderIndex to contestants if missing
        let cModified = false;
        c.forEach((cont, idx) => {
            if (cont.orderIndex === undefined) {
                cont.orderIndex = idx;
                cModified = true;
            }
        });
        if (cModified) {
            await repos.saveContestants(c);
        }

        set({
            activeCompetition: active,
            contestants: c.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
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

    // --- Contestant Management ---
    addContestant: async (name: string) => {
        const { activeCompetition, rounds, contestants, entriesById } = get();
        if (!activeCompetition) return;

        const compId = activeCompetition.id;
        const orderIndex = contestants.length > 0 ? Math.max(...contestants.map(c => c.orderIndex ?? 0)) + 1 : 0;
        const newContestant: Contestant = {
            id: crypto.randomUUID(),
            competitionId: compId,
            name,
            orderIndex,
            createdAt: Date.now()
        };

        await repos.saveContestant(newContestant);

        // Generate empty entries for all existing rounds
        const newEntries = rounds.map(r => ({
            id: makeEntryId(compId, r.id, newContestant.id),
            competitionId: compId,
            roundId: r.id,
            contestantId: newContestant.id,
            score: undefined,
            updatedAt: Date.now()
        }));

        if (newEntries.length > 0) {
            await repos.saveEntries(newEntries);
        }

        const newEntriesById = { ...entriesById };
        for (const e of newEntries) {
            newEntriesById[e.id] = e;
        }

        set({
            contestants: [...contestants, newContestant],
            entriesById: newEntriesById
        });
    },

    renameContestant: async (id: string, name: string) => {
        const { contestants } = get();
        const existing = contestants.find(c => c.id === id);
        if (!existing) return;

        const updated = { ...existing, name };
        await repos.saveContestant(updated);

        set({
            contestants: contestants.map(c => c.id === id ? updated : c)
        });
    },

    removeContestant: async (id: string) => {
        const { contestants, entriesById, activeCompetition } = get();
        if (!activeCompetition) return;

        await repos.deleteContestant(id);

        const newEntriesById = { ...entriesById };
        // Delete all keys belonging to this contestant
        for (const key of Object.keys(newEntriesById)) {
            if (newEntriesById[key].contestantId === id) {
                delete newEntriesById[key];
            }
        }

        set({
            contestants: contestants.filter(c => c.id !== id),
            entriesById: newEntriesById
        });
    },

    reorderContestants: async (fromIndex: number, toIndex: number) => {
        const { contestants } = get();
        const clone = [...contestants];
        const [moved] = clone.splice(fromIndex, 1);
        clone.splice(toIndex, 0, moved);

        const updated = clone.map((c, i) => ({ ...c, orderIndex: i }));
        await repos.saveContestants(updated);
        set({ contestants: updated });
    },

    // --- Round Management ---
    addRound: async (title: string) => {
        const { activeCompetition, rounds, contestants, entriesById } = get();
        if (!activeCompetition) return;

        const compId = activeCompetition.id;
        const orderIndex = rounds.length > 0 ? Math.max(...rounds.map(r => r.orderIndex)) + 1 : 0;

        const newRound: Round = {
            id: crypto.randomUUID(),
            competitionId: compId,
            title,
            orderIndex,
            createdAt: Date.now()
        };

        await repos.saveRound(newRound);

        // Generate empty entries for all existing contestants
        const newEntries = contestants.map(c => ({
            id: makeEntryId(compId, newRound.id, c.id),
            competitionId: compId,
            roundId: newRound.id,
            contestantId: c.id,
            score: undefined,
            updatedAt: Date.now()
        }));

        if (newEntries.length > 0) {
            await repos.saveEntries(newEntries);
        }

        const newEntriesById = { ...entriesById };
        for (const e of newEntries) {
            newEntriesById[e.id] = e;
        }

        set({
            rounds: [...rounds, newRound],
            entriesById: newEntriesById
        });
    },

    renameRound: async (id: string, title: string) => {
        const { rounds } = get();
        const existing = rounds.find(r => r.id === id);
        if (!existing) return;

        const updated = { ...existing, title };
        await repos.saveRound(updated);

        set({
            rounds: rounds.map(r => r.id === id ? updated : r)
        });
    },

    removeRound: async (id: string) => {
        const { rounds, entriesById, activeCompetition } = get();
        if (!activeCompetition) return;

        await repos.deleteRound(id);

        const newEntriesById = { ...entriesById };
        // Delete all keys belonging to this round
        for (const key of Object.keys(newEntriesById)) {
            if (newEntriesById[key].roundId === id) {
                delete newEntriesById[key];
            }
        }

        set({
            rounds: rounds.filter(r => r.id !== id),
            entriesById: newEntriesById
        });
    },

    reorderRounds: async (fromIndex: number, toIndex: number) => {
        const { rounds } = get();
        const clone = [...rounds];
        const [moved] = clone.splice(fromIndex, 1);
        clone.splice(toIndex, 0, moved);

        const updated = clone.map((r, i) => ({ ...r, orderIndex: i }));
        await repos.saveRounds(updated);
        set({ rounds: updated });
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
