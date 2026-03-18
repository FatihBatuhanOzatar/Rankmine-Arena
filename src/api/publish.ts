import { getSupabase } from './supabase';
import { useStore } from '../state/store';
import type { PublishedArenaPayload } from '../domain/publishedArena';

// ── Publish ─────────────────────────────────────────────────────────

export async function publishArena(
    payload: PublishedArenaPayload,
    slug: string
): Promise<void> {
    const store = useStore.getState();
    const finalPayload = { ...payload, entries: [...payload.entries] };

    // Upload local assets to Supabase storage
    for (let i = 0; i < finalPayload.entries.length; i++) {
        const entry = finalPayload.entries[i];
        if (entry.assetId) {
            const blob = await store.getAssetBlob(entry.assetId);
            if (blob) {
                const ext = blob.type.split('/')[1] || 'png';
                const fileName = `${slug}/${entry.assetId}.${ext}`;

                const { error: uploadError } = await getSupabase()
                    .storage
                    .from('arena-assets')
                    .upload(fileName, blob, { upsert: true });

                if (!uploadError) {
                    const { data } = getSupabase()
                        .storage
                        .from('arena-assets')
                        .getPublicUrl(fileName);

                    finalPayload.entries[i] = {
                        ...entry,
                        publicAssetUrl: data.publicUrl
                    };
                }
            }
            // Strip local DB reference from remote payload
            delete finalPayload.entries[i].assetId;
        }
    }

    const { error } = await getSupabase()
        .from('published_arenas')
        .insert({
            slug,
            payload: finalPayload,
            title: finalPayload.competition.title,
            contestant_count: finalPayload.contestants.length,
            round_count: finalPayload.rounds.length
        });

    if (error) {
        throw new Error(`Publish failed: ${error.message}`);
    }
}

// ── Fetch (public read) ─────────────────────────────────────────────

export interface PublishedArenaRow {
    id: string;
    slug: string;
    payload: PublishedArenaPayload;
    created_at: string;
}

export async function fetchPublishedArena(
    slug: string
): Promise<PublishedArenaRow | null> {
    const { data, error } = await getSupabase()
        .from('published_arenas')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

    if (error) {
        throw new Error(`Fetch failed: ${error.message}`);
    }

    return data as PublishedArenaRow | null;
}

// ── Fetch (public listing) ──────────────────────────────────────────

export interface PublishedArenaListItem {
    slug: string;
    title: string;
    created_at: string;
    contestant_count: number;
    round_count: number;
}

export async function fetchRecentPublishedArenas(
    limit: number = 12
): Promise<PublishedArenaListItem[]> {
    const { data, error } = await getSupabase()
        .from('published_arenas')
        // Select only the columns needed for listing (exclude payload)
        .select('slug, title, created_at, contestant_count, round_count')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        throw new Error(`Fetch listing failed: ${error.message}`);
    }

    return data as PublishedArenaListItem[];
}

