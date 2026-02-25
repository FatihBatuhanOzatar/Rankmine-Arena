import { getDB } from './idb';
import type { Competition, Contestant, Round, Entry } from '../domain';

// --- Competitions ---
export async function listCompetitions(): Promise<Competition[]> {
    const db = await getDB();
    const list = await db.getAllFromIndex('competitions', 'updatedAt');
    return list.map(hydrateCompetition);
}

export async function getCompetition(id: string): Promise<Competition | undefined> {
    const db = await getDB();
    const c = await db.get('competitions', id);
    return c ? hydrateCompetition(c) : undefined;
}

export async function saveCompetition(comp: Competition): Promise<void> {
    const db = await getDB();
    await db.put('competitions', comp);
}

// Transactional Delete cascade logic (M3)
export async function deleteCompetition(id: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(
        ['competitions', 'contestants', 'rounds', 'entries', 'assets', 'assetMeta'],
        'readwrite'
    );

    // 1. Delete the competition itself
    await tx.objectStore('competitions').delete(id);

    // 2. Clear contestants for comp
    const contestantsIndex = tx.objectStore('contestants').index('competitionId');
    let cCursor = await contestantsIndex.openCursor(IDBKeyRange.only(id));
    while (cCursor) {
        await cCursor.delete();
        cCursor = await cCursor.continue();
    }

    // 3. Clear rounds
    const roundsIndex = tx.objectStore('rounds').index('competitionId');
    let rCursor = await roundsIndex.openCursor(IDBKeyRange.only(id));
    while (rCursor) {
        await rCursor.delete();
        rCursor = await rCursor.continue();
    }

    // 4. Clear entries
    const entriesIndex = tx.objectStore('entries').index('competitionId');
    let eCursor = await entriesIndex.openCursor(IDBKeyRange.only(id));
    while (eCursor) {
        await eCursor.delete();
        eCursor = await eCursor.continue();
    }

    // 5. Clear AssetMeta
    const metaIndex = tx.objectStore('assetMeta').index('competitionId');
    let mCursor = await metaIndex.openCursor(IDBKeyRange.only(id));
    while (mCursor) {
        // Also delete the blob in 'assets'
        const assetId = mCursor.value.id;
        await tx.objectStore('assets').delete(assetId);
        await mCursor.delete();
        mCursor = await mCursor.continue();
    }

    await tx.done;
}

// --- Contestants ---
export async function listContestants(competitionId: string): Promise<Contestant[]> {
    const db = await getDB();
    return db.getAllFromIndex('contestants', 'competitionId', competitionId);
}

export async function saveContestant(c: Contestant): Promise<void> {
    const db = await getDB();
    await db.put('contestants', c);
    // Touch competition
    await touchCompetition(c.competitionId);
}

export async function deleteContestant(id: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(['contestants', 'entries', 'competitions'], 'readwrite');

    const c = await tx.objectStore('contestants').get(id);
    if (!c) return;

    // 1. delete contestant
    await tx.objectStore('contestants').delete(id);

    // 2. delete related entries
    const entriesIndex = tx.objectStore('entries').index('contestantId');
    let cursor = await entriesIndex.openCursor(IDBKeyRange.only(id));
    while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
    }

    // Touch
    await touchCompetitionInTx(tx, c.competitionId);
    await tx.done;
}

// --- Rounds ---
export async function listRounds(competitionId: string): Promise<Round[]> {
    const db = await getDB();
    return db.getAllFromIndex('rounds', 'competitionId, orderIndex', IDBKeyRange.bound(
        [competitionId, 0],
        [competitionId, Number.MAX_SAFE_INTEGER]
    ));
}

export async function saveRound(r: Round): Promise<void> {
    const db = await getDB();
    await db.put('rounds', r);
    await touchCompetition(r.competitionId);
}

export async function deleteRound(id: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(['rounds', 'entries', 'competitions'], 'readwrite');

    const r = await tx.objectStore('rounds').get(id);
    if (!r) return;

    // 1. delete round
    await tx.objectStore('rounds').delete(id);

    // 2. delete related entries
    const entriesIndex = tx.objectStore('entries').index('roundId');
    let cursor = await entriesIndex.openCursor(IDBKeyRange.only(id));
    while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
    }

    await touchCompetitionInTx(tx, r.competitionId);
    await tx.done;
}

// --- Entries ---
export async function listEntries(competitionId: string): Promise<Entry[]> {
    const db = await getDB();
    return db.getAllFromIndex('entries', 'competitionId', competitionId);
}

// Only for granular cell saves in bulk without slowing UI thread
export async function saveEntries(entries: Entry[]): Promise<void> {
    if (entries.length === 0) return;
    const db = await getDB();
    const tx = db.transaction(['entries', 'competitions'], 'readwrite');

    for (const e of entries) {
        await tx.objectStore('entries').put(e);
    }
    await touchCompetitionInTx(tx, entries[entries.length - 1].competitionId);
    await tx.done;
}

// Helpers
async function touchCompetition(id: string) {
    const db = await getDB();
    const comp = await db.get('competitions', id);
    if (comp) {
        comp.updatedAt = Date.now();
        await db.put('competitions', comp);
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function touchCompetitionInTx(tx: any, id: string) {
    const store = tx.objectStore('competitions');
    const comp = await store.get(id);
    if (comp) {
        comp.updatedAt = Date.now();
        await store.put(comp);
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hydrateCompetition(c: any): Competition {
    if (c.scoring !== undefined) {
        c.scoreMin = c.scoring.min ?? 0;
        c.scoreMax = c.scoring.max ?? 10;
        c.scoreStep = 1;
        c.scoringMode = 'numeric';
        delete c.scoring;
    } else {
        // Just in case it's a completely empty object somehow
        c.scoreMin = c.scoreMin ?? 0;
        c.scoreMax = c.scoreMax ?? 10;
        c.scoreStep = c.scoreStep ?? 1;
        c.scoringMode = c.scoringMode ?? 'numeric';
    }
    return c as Competition;
}
