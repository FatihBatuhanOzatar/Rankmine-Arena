import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { Competition, Contestant, Round, Entry, Asset, AssetMeta } from '../domain';

export interface RankmineDB extends DBSchema {
    competitions: {
        key: string;
        value: Competition;
        indexes: { updatedAt: number };
    };
    contestants: {
        key: string;
        value: Contestant;
        indexes: { competitionId: string };
    };
    rounds: {
        key: string;
        value: Round;
        indexes: {
            competitionId: string;
            'competitionId, orderIndex': [string, number];
        };
    };
    entries: {
        key: string;
        value: Entry;
        indexes: {
            competitionId: string;
            roundId: string;
            contestantId: string;
            'competitionId, roundId, contestantId': [string, string, string];
        };
    };
    assets: {
        key: string;
        value: Asset;
    };
    assetMeta: {
        key: string;
        value: AssetMeta;
        indexes: { competitionId: string };
    };
}

let dbPromise: Promise<IDBPDatabase<RankmineDB>> | null = null;

export async function getDB(): Promise<IDBPDatabase<RankmineDB>> {
    if (!dbPromise) {
        dbPromise = openDB<RankmineDB>('rankmine-arena', 1, {
            upgrade(db) {
                // Competitions
                if (!db.objectStoreNames.contains('competitions')) {
                    const store = db.createObjectStore('competitions', { keyPath: 'id' });
                    store.createIndex('updatedAt', 'updatedAt');
                }

                // Contestants
                if (!db.objectStoreNames.contains('contestants')) {
                    const store = db.createObjectStore('contestants', { keyPath: 'id' });
                    store.createIndex('competitionId', 'competitionId');
                }

                // Rounds
                if (!db.objectStoreNames.contains('rounds')) {
                    const store = db.createObjectStore('rounds', { keyPath: 'id' });
                    store.createIndex('competitionId', 'competitionId');
                    store.createIndex('competitionId, orderIndex', ['competitionId', 'orderIndex']);
                }

                // Entries
                if (!db.objectStoreNames.contains('entries')) {
                    const store = db.createObjectStore('entries', { keyPath: 'id' });
                    store.createIndex('competitionId', 'competitionId');
                    store.createIndex('roundId', 'roundId');
                    store.createIndex('contestantId', 'contestantId');
                    store.createIndex('competitionId, roundId, contestantId', ['competitionId', 'roundId', 'contestantId']);
                }

                // Assets
                if (!db.objectStoreNames.contains('assets')) {
                    db.createObjectStore('assets', { keyPath: 'id' });
                }

                // AssetMeta
                if (!db.objectStoreNames.contains('assetMeta')) {
                    const store = db.createObjectStore('assetMeta', { keyPath: 'id' });
                    store.createIndex('competitionId', 'competitionId');
                }
            },
        });
    }
    return dbPromise;
}
