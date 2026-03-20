import { useEffect, useState } from 'react';
import { fetchRecentPublishedArenas, type PublishedArenaListItem } from '../api/publish';
import { PublicArenaCard } from './PublicArenaCard';

export function PublicArenaList() {
    const [arenas, setArenas] = useState<PublishedArenaListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'newest'|'most_rated'>('newest');

    useEffect(() => {
        let mounted = true;

        async function loadArenas() {
            try {
                setIsLoading(true);
                setError(null);
                const data = await fetchRecentPublishedArenas(12, sortBy);
                if (mounted) {
                    setArenas(data);
                }
            } catch (err) {
                if (mounted) {
                    setError('Failed to load community arenas.');
                    console.error('Discover fetch error:', err);
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        }

        loadArenas();

        return () => {
            mounted = false;
        };
    }, [sortBy]);

    if (error) {
        return (
            <div className="public-listing-empty">
                <p style={{ color: 'var(--danger)' }}>{error}</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="public-listing-empty">
                <p>Loading recent arenas...</p>
            </div>
        );
    }

    if (arenas.length === 0) {
        return (
            <div className="public-listing-empty">
                <p>No published arenas yet.</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginTop: '8px' }}>
                    Publish an arena to see it here.
                </p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <button 
                    onClick={() => setSortBy('newest')}
                    style={{ 
                        background: sortBy === 'newest' ? 'var(--accent)' : 'transparent', 
                        color: sortBy === 'newest' ? '#fff' : 'var(--muted)',
                        border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s'
                    }}>
                    Newest
                </button>
                <button 
                    onClick={() => setSortBy('most_rated')}
                    style={{ 
                        background: sortBy === 'most_rated' ? 'var(--accent)' : 'transparent', 
                        color: sortBy === 'most_rated' ? '#fff' : 'var(--muted)',
                        border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s'
                    }}>
                    Most Rated
                </button>
            </div>
            
            <div className="public-listing-grid">
                {arenas.map((arena) => (
                    <PublicArenaCard
                        key={arena.slug}
                        slug={arena.slug}
                        title={arena.title}
                        createdAt={arena.created_at}
                        contestantCount={arena.contestant_count ?? 0}
                        roundCount={arena.round_count ?? 0}
                        previewUrls={arena.preview_urls ?? []}
                        likeCount={arena.like_count ?? 0}
                        submissionCount={arena.submission_count ?? 0}
                    />
                ))}
            </div>
        </div>
    );
}
