import { Link } from 'react-router-dom';
import { ArenaPreviewStack } from './ArenaPreviewStack';

/**
 * Reusable card for the public discovery listing.
 */
interface PublicArenaCardProps {
    slug: string;
    title: string;
    createdAt: string; // ISO date string from Supabase
    contestantCount: number;
    roundCount: number;
    previewUrls: string[];
    likeCount?: number;
    submissionCount?: number;
}

export function PublicArenaCard({
    slug,
    title,
    createdAt,
    contestantCount,
    roundCount,
    previewUrls,
    likeCount = 0,
    submissionCount = 0
}: PublicArenaCardProps) {
    const dateStr = new Date(createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <Link to={`/p/${slug}`} className="card public-arena-card">
            <ArenaPreviewStack urls={previewUrls} />
            <h3 className="public-arena-card-title">{title || 'Untitled Arena'}</h3>
            
            <div className="public-arena-card-meta">
                <span>Published {dateStr}</span>
                <span className="bullet">•</span>
                <span>{contestantCount} Contestants</span>
                <span className="bullet">•</span>
                <span>{roundCount} Rounds</span>
            </div>

            <div className="public-arena-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '12px', color: 'var(--muted)', fontSize: '13px' }}>
                     <span title="Likes">♥ {likeCount}</span>
                     <span title="Jury Submissions">💬 {submissionCount}</span>
                </div>
                <span className="public-arena-card-cta">View Arena &rarr;</span>
            </div>
        </Link>
    );
}
