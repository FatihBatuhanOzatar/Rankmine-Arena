import { useEffect, useState, useRef } from 'react';
import type { Entry } from '../../domain';
import { useStore } from '../../state/store';

interface EntryModalProps {
    onClose: () => void;
    entry: Entry | undefined;
    roundId: string;
    contestantId: string;
    min: number;
    max: number;
    step: number;
    /** Display labels for context */
    contestantName?: string;
    roundTitle?: string;
}

type ModalMode = 'preview' | 'edit';

export function EntryModal({ onClose, entry, roundId, contestantId, min, max, step, contestantName, roundTitle }: EntryModalProps) {
    const { upsertEntryField, saveAsset, getAssetBlob, deleteAsset } = useStore();

    const [mode, setMode] = useState<ModalMode>('preview');

    // Form State (used in edit mode)
    const [scoreStr, setScoreStr] = useState(entry?.score?.toString() || '');
    const [note, setNote] = useState(entry?.note || '');
    const [link, setLink] = useState(entry?.link || '');

    // Image Blob state
    const [imageObjUrl, setImageObjUrl] = useState<string | null>(null);
    const [isImageLoading, setIsImageLoading] = useState(false);

    // File upload ref
    const fileRef = useRef<HTMLInputElement>(null);

    // Initial load of blob if exists
    useEffect(() => {
        if (!entry?.assetId) return;

        let active = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsImageLoading(true);

        getAssetBlob(entry.assetId).then(blob => {
            if (!active) return;
            if (blob) {
                setImageObjUrl(URL.createObjectURL(blob));
            } else {
                console.warn('Image not found in local IDB.');
            }
            setIsImageLoading(false);
        });

        return () => {
            active = false;
        };
    }, [entry?.assetId, getAssetBlob]);

    // Cleanup generated ObjectUrls
    useEffect(() => {
        return () => {
            if (imageObjUrl) {
                URL.revokeObjectURL(imageObjUrl);
            }
        };
    }, [imageObjUrl]);

    // --- Edit Mode Handlers ---
    const handleSave = () => {
        let sc: number | undefined = undefined;
        if (scoreStr.trim() !== '') {
            sc = parseInt(scoreStr, 10);
            if (isNaN(sc)) sc = undefined;
            if (sc !== undefined) {
                if (sc > max) sc = max;
                if (sc < min) sc = min;
            }
        }

        upsertEntryField(roundId, contestantId, {
            score: sc,
            note: note.trim(),
            link: link.trim()
        });

        setMode('preview');
    };

    const handleCancelEdit = () => {
        // Revert draft state
        setScoreStr(entry?.score?.toString() || '');
        setNote(entry?.note || '');
        setLink(entry?.link || '');
        setMode('preview');
    };

    // --- Image Handlers (work from both modes) ---
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // GC old asset if substituting
        if (entry?.assetId) {
            await deleteAsset(entry.assetId);
        }

        const newAssetId = await saveAsset(file);
        upsertEntryField(roundId, contestantId, { assetId: newAssetId });

        if (imageObjUrl) URL.revokeObjectURL(imageObjUrl);
        setImageObjUrl(URL.createObjectURL(file));
    };

    const handleRemoveImage = async () => {
        if (!entry?.assetId) return;
        await deleteAsset(entry.assetId);
        upsertEntryField(roundId, contestantId, { assetId: undefined });
        if (imageObjUrl) {
            URL.revokeObjectURL(imageObjUrl);
            setImageObjUrl(null);
        }
    };

    // Hidden file input (shared)
    const fileInput = (
        <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }} onChange={handleFileChange} />
    );

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(6px)',
                display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}
        >
            <div
                className="card"
                onClick={e => e.stopPropagation()}
                style={{
                    width: mode === 'preview' ? '680px' : '800px',
                    maxWidth: '92vw',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    transition: 'width 0.2s ease',
                }}
            >
                {/* ========== PREVIEW MODE ========== */}
                {mode === 'preview' && (
                    <>
                        {/* Image Area */}
                        <div style={{
                            width: '100%',
                            minHeight: '300px',
                            maxHeight: '55vh',
                            background: 'var(--bg)',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            overflow: 'hidden',
                            position: 'relative',
                        }}>
                            {isImageLoading && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--muted)' }}>
                                    <div style={{ width: '24px', height: '24px', border: '2px solid var(--accent)', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                    <span style={{ fontSize: '13px' }}>Loading…</span>
                                </div>
                            )}

                            {!isImageLoading && imageObjUrl && (
                                <img src={imageObjUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Entry evidence" />
                            )}

                            {!isImageLoading && !imageObjUrl && entry?.assetId && (
                                <div style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                                    color: 'var(--bad)', padding: '24px', textAlign: 'center'
                                }}>
                                    <svg viewBox="0 0 24 24" width="32" height="32" style={{ fill: 'none', stroke: 'var(--bad)', strokeWidth: 1.5 }}>
                                        <rect x="2" y="4" width="20" height="16" rx="3" />
                                        <line x1="2" y1="4" x2="22" y2="20" />
                                    </svg>
                                    <span style={{ fontSize: '14px' }}>Image not available on this device</span>
                                </div>
                            )}

                            {!isImageLoading && !imageObjUrl && !entry?.assetId && (
                                <div style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                                    padding: '40px', textAlign: 'center'
                                }}>
                                    <svg viewBox="0 0 48 48" width="56" height="56" style={{
                                        fill: 'none', stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1.2
                                    }}>
                                        <rect x="4" y="10" width="40" height="30" rx="4" />
                                        <circle cx="24" cy="24" r="7" />
                                        <path d="M16 10L18 6h12l2 4" />
                                    </svg>
                                    <span style={{ color: 'var(--muted)', fontSize: '14px' }}>No image attached</span>
                                    <button
                                        className="btn"
                                        style={{ fontSize: '13px', padding: '6px 16px' }}
                                        onClick={() => fileRef.current?.click()}
                                    >
                                        Upload Image
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Metadata Row */}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '12px 0 8px 0', fontSize: '13px', color: 'var(--muted)'
                        }}>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                {contestantName && <span>👤 {contestantName}</span>}
                                {roundTitle && <span>📋 {roundTitle}</span>}
                                {entry?.score !== undefined && <span>Score: <strong style={{ color: 'var(--text)' }}>{entry.score}</strong></span>}
                            </div>
                            {(entry?.note || entry?.link) && (
                                <span style={{ opacity: 0.7 }}>
                                    {entry.note ? '📝 Note' : ''}{entry.note && entry.link ? ' · ' : ''}{entry.link ? '🔗 Link' : ''}
                                </span>
                            )}
                        </div>

                        <div className="divider" style={{ margin: '4px 0 12px 0' }} />

                        {/* Preview Actions */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn" style={{ fontSize: '13px' }} onClick={() => {
                                    setScoreStr(entry?.score?.toString() || '');
                                    setNote(entry?.note || '');
                                    setLink(entry?.link || '');
                                    setMode('edit');
                                }}>
                                    ✏️ Edit
                                </button>
                                <button className="btn" style={{ fontSize: '13px' }} onClick={() => fileRef.current?.click()}>
                                    {entry?.assetId ? '🔄 Replace Image' : '📷 Upload Image'}
                                </button>
                                {entry?.assetId && (
                                    <button
                                        className="btn"
                                        style={{ fontSize: '13px', borderColor: 'var(--bad)', color: 'var(--bad)' }}
                                        onClick={handleRemoveImage}
                                    >
                                        🗑 Remove Image
                                    </button>
                                )}
                            </div>
                            <button className="btn" onClick={onClose}>Close</button>
                        </div>
                    </>
                )}

                {/* ========== EDIT MODE ========== */}
                {mode === 'edit' && (
                    <>
                        <h2 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>Edit Entry</h2>
                        {(contestantName || roundTitle) && (
                            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
                                {contestantName}{contestantName && roundTitle ? ' — ' : ''}{roundTitle}
                            </div>
                        )}
                        <div className="divider" style={{ margin: '0 0 16px 0' }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--muted)' }}>Score ({min}–{max})</label>
                                <input
                                    className="input"
                                    type="number"
                                    step={step}
                                    value={scoreStr}
                                    onChange={e => setScoreStr(e.target.value)}
                                    min={min}
                                    max={max}
                                    style={{ width: '100%' }}
                                    autoFocus
                                />
                            </div>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--muted)' }}>Notes</label>
                                <textarea
                                    className="input"
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    style={{ width: '100%', flex: 1, resize: 'none', minHeight: '100px' }}
                                    placeholder="Type jury notes…"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--muted)' }}>Link</label>
                                <input
                                    className="input"
                                    type="url"
                                    value={link}
                                    onChange={e => setLink(e.target.value)}
                                    style={{ width: '100%' }}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        <div className="divider" style={{ margin: '16px 0 12px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button className="btn" onClick={handleCancelEdit}>Cancel</button>
                            <button className="btnPrimary" onClick={handleSave}>Save</button>
                        </div>
                    </>
                )}

                {fileInput}

                {/* Spinner keyframe (inline, no external CSS needed) */}
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );
}
