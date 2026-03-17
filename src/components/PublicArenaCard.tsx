import { Link } from 'react-router-dom';

/**
 * Reusable card for the public discovery listing.
 */
interface PublicArenaCardProps {
    slug: string;
    title: string;
    createdAt: string; // ISO date string from Supabase
    contestantCount: number;
    roundCount: number;
}

export function PublicArenaCard({
    slug,
    title,
    createdAt,
    contestantCount,
    roundCount
}: PublicArenaCardProps) {
    const dateStr = new Date(createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <Link to={`/p/${slug}`} className="card public-arena-card">
            <h3 className="public-arena-card-title">{title || 'Untitled Arena'}</h3>
            
            <div className="public-arena-card-meta">
                <span>Published {dateStr}</span>
                <span className="bullet">•</span>
                <span>{contestantCount} Contestants</span>
                <span className="bullet">•</span>
                <span>{roundCount} Rounds</span>
            </div>

            <div className="public-arena-card-footer">
                <span className="public-arena-card-cta">View Arena &rarr;</span>
            </div>
        </Link>
    );
}
