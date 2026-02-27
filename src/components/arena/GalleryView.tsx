import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../state/store';

interface GalleryTile {
    entryId: string;
    assetId: string;
    contestantName: string;
    roundTitle: string;
    rowIdx: number;
    colIdx: number;
}

interface GalleryViewProps {
    onNavigateToCell: (rowIdx: number, colIdx: number) => void;
}

export function GalleryView({ onNavigateToCell }: GalleryViewProps) {
    const contestants = useStore(s => s.contestants);
    const rounds = useStore(s => s.rounds);
    const entriesById = useStore(s => s.entriesById);
    const getAssetBlob = useStore(s => s.getAssetBlob);

    // Build tile list from entries that have an assetId
    const tiles = useMemo<GalleryTile[]>(() => {
        const result: GalleryTile[] = [];
        const contestantMap = new Map(contestants.map((c, i) => [c.id, { name: c.name, idx: i }]));
        const roundMap = new Map(rounds.map((r, i) => [r.id, { title: r.title, idx: i }]));

        for (const entry of Object.values(entriesById)) {
            if (!entry?.assetId) continue;
            const cInfo = contestantMap.get(entry.contestantId);
            const rInfo = roundMap.get(entry.roundId);
            if (!cInfo || !rInfo) continue;

            result.push({
                entryId: entry.id,
                assetId: entry.assetId,
                contestantName: cInfo.name,
                roundTitle: rInfo.title,
                rowIdx: rInfo.idx,
                colIdx: cInfo.idx,
            });
        }

        return result;
    }, [contestants, rounds, entriesById]);

    // Track objectURLs per assetId for lazy loading + cleanup
    const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
    const urlsRef = useRef<Record<string, string>>({});

    // Fetch blobs lazily and create objectURLs
    useEffect(() => {
        let cancelled = false;
        const newUrls: Record<string, string> = {};

        (async () => {
            for (const tile of tiles) {
                if (cancelled) break;
                // Don't re-fetch already-created URLs
                if (urlsRef.current[tile.assetId]) {
                    newUrls[tile.assetId] = urlsRef.current[tile.assetId];
                    continue;
                }
                const blob = await getAssetBlob(tile.assetId);
                if (cancelled) break;
                if (blob) {
                    newUrls[tile.assetId] = URL.createObjectURL(blob);
                }
            }
            if (!cancelled) {
                // Revoke URLs that are no longer needed
                for (const [id, url] of Object.entries(urlsRef.current)) {
                    if (!newUrls[id]) {
                        URL.revokeObjectURL(url);
                    }
                }
                urlsRef.current = newUrls;
                setThumbUrls({ ...newUrls });
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [tiles, getAssetBlob]);

    // Cleanup all objectURLs on unmount
    useEffect(() => {
        return () => {
            for (const url of Object.values(urlsRef.current)) {
                URL.revokeObjectURL(url);
            }
            urlsRef.current = {};
        };
    }, []);

    if (tiles.length === 0) {
        return (
            <div style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'var(--muted)',
                fontSize: '18px',
                flexDirection: 'column',
                gap: '12px'
            }}>
                <span style={{ fontSize: '48px', opacity: 0.3 }}>🖼️</span>
                <span>No images attached yet.</span>
                <span style={{ fontSize: '13px' }}>Upload images through cell details to see them here.</span>
            </div>
        );
    }

    return (
        <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '8px',
        }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '16px',
            }}>
                {tiles.map(tile => {
                    const url = thumbUrls[tile.assetId];
                    return (
                        <div
                            key={tile.entryId}
                            onClick={() => onNavigateToCell(tile.rowIdx, tile.colIdx)}
                            style={{
                                background: 'var(--panel)',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                transition: 'transform 0.15s, box-shadow 0.15s',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.35)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = '';
                                e.currentTarget.style.boxShadow = '';
                            }}
                        >
                            {/* Thumbnail */}
                            <div style={{
                                width: '100%',
                                aspectRatio: '4 / 3',
                                background: 'var(--bg)',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                overflow: 'hidden',
                            }}>
                                {url ? (
                                    <img
                                        src={url}
                                        alt={`${tile.contestantName} — ${tile.roundTitle}`}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Loading…</span>
                                )}
                            </div>

                            {/* Label */}
                            <div style={{ padding: '10px 12px' }}>
                                <div style={{
                                    fontWeight: 600,
                                    fontSize: '14px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    marginBottom: '2px',
                                }}>
                                    {tile.contestantName}
                                </div>
                                <div style={{
                                    fontSize: '12px',
                                    color: 'var(--muted)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}>
                                    {tile.roundTitle}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
