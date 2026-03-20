import { getSupabase } from './supabase';
import { useStore } from '../state/store';
import type { PublishedArenaPayload } from '../domain/publishedArena';

// ── Publish ─────────────────────────────────────────────────────────

export async function publishArena(
    payload: PublishedArenaPayload,
    slug: string
): Promise<{ skippedAssets: number }> {
    const store = useStore.getState();
    const finalPayload = { ...payload, entries: [...payload.entries] };

    let skippedAssets = 0;
    const previewUrls: string[] = [];

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
                    
                    if (previewUrls.length < 4) {
                        previewUrls.push(data.publicUrl);
                    }
                } else {
                    skippedAssets++;
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
            round_count: finalPayload.rounds.length,
            preview_urls: previewUrls
        });

    if (error) {
        throw new Error(`Publish failed: ${error.message}`);
    }

    return { skippedAssets };
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
    preview_urls: string[];
    submission_count?: number;
    like_count?: number;
}

export async function fetchRecentPublishedArenas(
    limit: number = 12,
    sortBy: 'newest' | 'most_rated' = 'newest'
): Promise<PublishedArenaListItem[]> {
    let query = getSupabase()
        .rpc('get_explore_arenas')
        .limit(limit);

    if (sortBy === 'most_rated') {
        query = query.order('submission_count', { ascending: false }).order('created_at', { ascending: false });
    } else {
        query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(`Fetch listing failed: ${error.message}`);
    }

    // Filter out locally banished (unpublished) slugs just in case Supabase RLS blocked deletion
    const banishedStr = localStorage.getItem('rm_banished_slugs');
    let banished: string[] = [];
    if (banishedStr) {
        try { banished = JSON.parse(banishedStr) } catch {}
    }
    
    return ((data || []) as PublishedArenaListItem[]).filter(item => !banished.includes(item.slug));
}

export async function unpublishArena(slug: string): Promise<void> {
    const { error } = await getSupabase()
        .from('published_arenas')
        .delete()
        .eq('slug', slug);

    if (error) {
        console.warn(`Unpublish delete failed remotely (likely RLS): ${error.message}`);
    }

    // Add to local banished list so user doesn't see it in Explore section
    const banishedStr = localStorage.getItem('rm_banished_slugs');
    let banished: string[] = [];
    if (banishedStr) {
        try { banished = JSON.parse(banishedStr) } catch {}
    }
    if (!banished.includes(slug)) {
        banished.push(slug);
        localStorage.setItem('rm_banished_slugs', JSON.stringify(banished));
    }
}

// ── Likes ───────────────────────────────────────────────────────────

function getClientId(): string {
    let cid = localStorage.getItem('rm_client_id');
    if (!cid) {
        cid = crypto.randomUUID();
        localStorage.setItem('rm_client_id', cid);
    }
    return cid;
}

export async function likeArena(slug: string): Promise<void> {
    const client_id = getClientId();
    const { error } = await getSupabase()
        .from('arena_likes')
        .insert({ arena_slug: slug, client_id });

    if (error && error.code !== '23505') { // ignore duplicate key
        console.warn(`Like failed: ${error.message}`);
    }
}

export async function unlikeArena(slug: string): Promise<void> {
    const client_id = getClientId();
    const { error } = await getSupabase()
        .from('arena_likes')
        .delete()
        .match({ arena_slug: slug, client_id });

    if (error) {
        console.warn(`Unlike failed: ${error.message}`);
    }
}
