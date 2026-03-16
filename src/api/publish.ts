import { getSupabase } from './supabase';
import type { PublishedArenaPayload } from '../domain/publishedArena';

// ── Publish ─────────────────────────────────────────────────────────

export async function publishArena(
    payload: PublishedArenaPayload,
    slug: string
): Promise<void> {
    const { error } = await getSupabase()
        .from('published_arenas')
        .insert({ slug, payload });

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

