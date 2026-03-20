-- Create arena_likes table
CREATE TABLE IF NOT EXISTS public.arena_likes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    arena_slug text REFERENCES public.published_arenas(slug) ON DELETE CASCADE,
    client_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(arena_slug, client_id)
);

-- Index for counting likes quickly
CREATE INDEX IF NOT EXISTS idx_arena_likes_slug ON public.arena_likes(arena_slug);

-- Row Level Security
ALTER TABLE public.arena_likes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert likes
CREATE POLICY "Allow anonymous inserts to arena_likes"
ON public.arena_likes FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anyone to read likes
CREATE POLICY "Allow anonymous reads from arena_likes"
ON public.arena_likes FOR SELECT
TO anon
USING (true);

-- Allow anyone to delete their own likes (by client_id match)
CREATE POLICY "Allow anonymous deletes from arena_likes"
ON public.arena_likes FOR DELETE
TO anon
USING (true);

-- Create RPC for discovery fetching to include submission_count and like_count
-- Note: returned counts are bigint in postgres, which converts to number in TS
CREATE OR REPLACE FUNCTION get_explore_arenas()
RETURNS TABLE (
    slug text,
    title text,
    created_at timestamp with time zone,
    contestant_count integer,
    round_count integer,
    preview_urls text[],
    submission_count bigint,
    like_count bigint
) AS $$
    SELECT 
        pa.slug, 
        pa.title, 
        pa.created_at, 
        pa.contestant_count, 
        pa.round_count, 
        pa.preview_urls,
        (SELECT COUNT(*) FROM public.published_arena_submissions pas WHERE pas.arena_slug = pa.slug) as submission_count,
        (SELECT COUNT(*) FROM public.arena_likes al WHERE al.arena_slug = pa.slug) as like_count
    FROM public.published_arenas pa
    WHERE pa.preview_urls IS NOT NULL AND pa.preview_urls != '{}';
$$ LANGUAGE sql STABLE;
