

/**
 * Displays a stacked preview of 0-4 images for an arena card.
 */
interface ArenaPreviewStackProps {
    urls: string[];
}

export function ArenaPreviewStack({ urls }: ArenaPreviewStackProps) {
    if (!urls || urls.length === 0) {
        return (
            <div className="arena-preview-stack empty">
                <div className="arena-preview-placeholder">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                </div>
            </div>
        );
    }

    if (urls.length === 1) {
        return (
            <div className="arena-preview-stack single">
                <img src={urls[0]} alt="Preview" loading="lazy" className="arena-preview-img center" />
            </div>
        );
    }

    const displayUrls = urls.slice(0, 3);
    const hasThree = displayUrls.length >= 3;

    return (
        <div className="arena-preview-stack multiple">
            {hasThree && (
                <img src={displayUrls[2]} alt="" loading="lazy" className="arena-preview-img right" />
            )}
            {displayUrls.length >= 2 && (
                <img src={displayUrls[1]} alt="" loading="lazy" className="arena-preview-img left" />
            )}
            <img src={displayUrls[0]} alt="Preview" loading="lazy" className="arena-preview-img center" />
        </div>
    );
}
