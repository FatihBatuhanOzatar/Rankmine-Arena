import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Lazy Supabase client — created on first call, not at module load.
 * Throws a clear error if env vars are missing, but only when publish
 * is actually attempted (not on app boot).
 */
export function getSupabase(): SupabaseClient {
    if (_client) return _client;

    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

    if (!url || !key) {
        throw new Error(
            'Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to enable publishing.'
        );
    }

    _client = createClient(url, key);
    return _client;
}

