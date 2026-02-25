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
}

export function EntryModal({ onClose, entry, roundId, contestantId, min, max }: EntryModalProps) {
    const { upsertEntryField, saveAsset, getAssetBlob, deleteAsset } = useStore();

    // Form State mapped to current Entry
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


    // Handlers
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

        onClose();
    };

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

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}
        >
            <div
                className="card"
                onClick={e => e.stopPropagation()}
                style={{ width: '800px', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
                <h2>Entry Details</h2>
                <div className="divider" />

                <div style={{ display: 'flex', gap: '24px', flex: 1, overflow: 'hidden' }}>

                    {/* Left: Image Preview */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{
                            flex: 1,
                            background: 'var(--bg)',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            overflow: 'hidden', position: 'relative'
                        }}>
                            {isImageLoading && <span style={{ color: 'var(--muted)' }}>Loading...</span>}

                            {!isImageLoading && imageObjUrl && (
                                <img src={imageObjUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Evidence" />
                            )}

                            {!isImageLoading && !imageObjUrl && entry?.assetId && (
                                <span style={{ color: 'var(--bad)', padding: '16px', textAlign: 'center' }}>
                                    Image lost. Not available on this device.
                                </span>
                            )}

                            {!isImageLoading && !imageObjUrl && !entry?.assetId && (
                                <span style={{ color: 'var(--muted)' }}>No Image Evidence</span>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }} onChange={handleFileChange} />
                            <button className="btn" onClick={() => fileRef.current?.click()}>
                                {entry?.assetId ? 'Replace Image' : 'Upload Image'}
                            </button>
                            {entry?.assetId && (
                                <button className="btn" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }} onClick={handleRemoveImage}>
                                    Remove
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right: Meta Forms */}
                    <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--muted)' }}>Score ({min}-{max})</label>
                            <input className="input" type="number" value={scoreStr} onChange={e => setScoreStr(e.target.value)} min={min} max={max} style={{ width: '100%' }} />
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--muted)' }}>Notes</label>
                            <textarea className="input" value={note} onChange={e => setNote(e.target.value)} style={{ width: '100%', flex: 1, resize: 'none' }} placeholder="Type jury notes..." />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--muted)' }}>Attachment Link</label>
                            <input className="input" type="url" value={link} onChange={e => setLink(e.target.value)} style={{ width: '100%' }} placeholder="https://..." />
                        </div>
                    </div>
                </div>

                <div className="divider" style={{ marginTop: '24px', marginBottom: '16px' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button className="btn" onClick={onClose}>Cancel</button>
                    <button className="btnPrimary" onClick={handleSave}>Save & Close</button>
                </div>
            </div>
        </div>
    );
}
