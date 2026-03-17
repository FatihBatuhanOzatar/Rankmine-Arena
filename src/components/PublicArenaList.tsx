import { useEffect, useState } from 'react';
import { fetchRecentPublishedArenas, type PublishedArenaListItem } from '../api/publish';
import { PublicArenaCard } from './PublicArenaCard';

export function PublicArenaList() {
    const [arenas, setArenas] = useState<PublishedArenaListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        async function loadArenas() {
            try {
                setIsLoading(true);
                setError(null);
                const data = await fetchRecentPublishedArenas(12);
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
    }, []);

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
        <div className="public-listing-grid">
            {arenas.map((arena) => (
                <PublicArenaCard
                    key={arena.slug}
                    slug={arena.slug}
                    title={arena.title}
                    createdAt={arena.created_at}
                    contestantCount={arena.contestant_count ?? 0}
                    roundCount={arena.round_count ?? 0}
                />
            ))}
        </div>
    );
}
