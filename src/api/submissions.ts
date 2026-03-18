import { getSupabase } from './supabase';
import type { JurySubmissionPayload, JurySubmissionRow } from '../domain/submissions';

// ── Submit jury scores ──────────────────────────────────────────────

export async function submitJuryScores(
    slug: string,
    juryName: string,
    payload: JurySubmissionPayload,
    contestantCount: number,
    roundCount: number
): Promise<void> {
    const { error } = await getSupabase()
        .from('published_arena_submissions')
        .insert({
            arena_slug: slug,
            jury_name: juryName || 'Anonymous',
            contestant_count: contestantCount,
            round_count: roundCount,
            payload,
        });

    if (error) {
        throw new Error(`Jury submission failed: ${error.message}`);
    }
}

// ── Fetch submissions for a published arena ─────────────────────────

export async function fetchSubmissions(
    slug: string
): Promise<JurySubmissionRow[]> {
    const { data, error } = await getSupabase()
        .from('published_arena_submissions')
        .select('id, arena_slug, jury_name, submitted_at, payload')
        .eq('arena_slug', slug)
        .order('submitted_at', { ascending: true });

    if (error) {
        throw new Error(`Fetch submissions failed: ${error.message}`);
    }

    return (data ?? []) as JurySubmissionRow[];
}
