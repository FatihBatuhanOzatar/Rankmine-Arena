import { getSupabase } from './supabase';
import type { PublishedArenaPayload } from '../domain/publishedArena';

// ── Publish ─────────────────────────────────────────────────────────

export async function publishArena(
    payload: PublishedArenaPayload,
    slug: string
): Promise<void> {
    const { error } = await getSupabase()
        .from('published_arenas')
        .insert({
            slug,
            payload,
            title: payload.competition.title,
            contestant_count: payload.contestants.length,
            round_count: payload.rounds.length
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

