import { memo, useCallback, useState, useRef } from 'react';
import { useStore } from '../../state/store';
import { EntryModal } from './EntryModal';

const DEBUG_RENDER = import.meta.env.DEV && false; // Toggle to true to debug renders

interface ScoreCellProps {
    roundId: string;
    contestantId: string;
    entryId: string;
    min: number;
    max: number;
    step: number;
    mode: 'numeric' | 'slider' | 'stars';
    rowIdx: number;
    colIdx: number;
    onNavigate: (rowDelta: number, colDelta: number) => void;
    contestantName?: string;
    roundTitle?: string;
}

export const ScoreCell = memo(function ScoreCell({
    roundId,
    contestantId,
    entryId,
    min,
    max,
    step,
    mode,
    rowIdx,
    colIdx,
    onNavigate,
    contestantName,
    roundTitle
}: ScoreCellProps) {
    const entry = useStore(useCallback(s => s.entriesById[entryId], [entryId]));
    const upsertEntry = useStore(s => s.upsertEntry);
    const [modalOpen, setModalOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [draftValue, setDraftValue] = useState('');

    const val = entry?.score ?? '';

    if (DEBUG_RENDER) {
        console.log(`Render cell [${rowIdx}, ${colIdx}] with val [${val}]`);
    }

    const commit = useCallback(() => {
        if (!isEditing) return;
        setIsEditing(false);

        const trimmed = draftValue.trim();
        if (trimmed === '') {
            if (val !== '') upsertEntry(roundId, contestantId, undefined);
            return;
        }

        let parsed = parseFloat(trimmed);
        if (isNaN(parsed)) return;

        if (parsed > max) parsed = max;
        if (parsed < min) parsed = min;

        parsed = Math.round(parsed / step) * step;
        parsed = parseFloat(parsed.toFixed(5));

        if (parsed !== val) {
            upsertEntry(roundId, contestantId, parsed);
        }
    }, [isEditing, draftValue, upsertEntry, roundId, contestantId, max, min, step, val]);

    const handleFocus = () => {
        setIsEditing(true);
        setDraftValue(val !== '' ? String(val) : '');
    };

    const handleBlur = () => {
        commit();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDraftValue(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setIsEditing(false);
            setDraftValue(val !== '' ? String(val) : ''); // Revert local state visually
            inputRef.current?.blur();
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            commit();
            inputRef.current?.blur();
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            commit();
            onNavigate(-1, 0);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            commit();
            onNavigate(1, 0);
        } else if (e.key === 'ArrowLeft') {
            if (inputRef.current && inputRef.current.selectionStart === 0) {
                e.preventDefault();
                commit();
                onNavigate(0, -1);
            }
        } else if (e.key === 'ArrowRight') {
            const len = (isEditing ? draftValue : String(val)).length;
            if (inputRef.current && inputRef.current.selectionStart === len) {
                e.preventDefault();
                commit();
                onNavigate(0, 1);
            }
        }
    };

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDraftValue(e.target.value);
    };

    const handleSliderPointerDown = () => {
        setIsEditing(true);
        setDraftValue(val !== '' ? String(val) : String(min));
    };

    const handleSliderPointerUp = () => {
        // We need to commit using the current draftValue, but pointerUp
        // might fire slightly before state updates sometimes depending on React?
        // Actually, commit uses isEditing and draftValue, it's safe to just commit.
        // But to be sure we commit the latest, we'll let commit close the edit loop.
        // Wait, commit() has draftValue in deps.
        commit();
    };

    const handleStarClick = (value: number) => {
        upsertEntry(roundId, contestantId, value);
    };

    const hasNotesOrLink = !!(entry?.note || entry?.link);
    const hasImage = !!entry?.assetId;

    return (
        <td style={{ border: '1px solid var(--border)', padding: '0', textAlign: 'center', position: 'relative' }}>
            {mode === 'numeric' && (
                <input
                    ref={inputRef}
                    id={`cell-${rowIdx}-${colIdx}`}
                    type="text"
                    inputMode="decimal"
                    value={isEditing ? draftValue : val}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    className="input cell-input"
                    style={{
                        width: '100%',
                        height: '100%',
                        boxSizing: 'border-box',
                        border: 'none',
                        borderRadius: 0,
                        textAlign: 'center',
                        background: 'transparent',
                        fontSize: '16px',
                    }}
                    placeholder="-"
                />
            )}

            {mode === 'slider' && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 8px', gap: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>
                        {isEditing ? draftValue : (val === '' ? '-' : val)}
                    </span>
                    <input
                        ref={inputRef}
                        id={`cell-${rowIdx}-${colIdx}`}
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={isEditing ? draftValue : (val === '' ? min : val)}
                        onChange={handleSliderChange}
                        onPointerDown={handleSliderPointerDown}
                        onPointerUp={handleSliderPointerUp}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        style={{ width: '100%', cursor: 'pointer' }}
                    />
                </div>
            )}

            {mode === 'stars' && (() => {
                const totalStars = Math.max(0, Math.ceil(max - min));
                const isActive = typeof val === 'number';
                return (
                    <div
                        style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        ref={inputRef as any}
                        id={`cell-${rowIdx}-${colIdx}`} // Let keyboard nav focus the wrapper if we gave it tabindex, but we'll stick to inputRef for numeric/slider. Stars are mouse-oriented mostly unless padded with tabindex.
                        tabIndex={0}
                        onKeyDown={handleKeyDown}
                    >
                        {step === 0.5 && (
                            <svg width="0" height="0" style={{ position: 'absolute' }}>
                                <defs>
                                    <linearGradient id={`half-${entryId}`} x1="0" x2="1" y1="0" y2="0">
                                        <stop offset="50%" stopColor="#FFC107" />
                                        <stop offset="50%" stopColor="transparent" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        )}
                        {Array.from({ length: totalStars }).map((_, i) => {
                            const starValRight = min + i + 1;
                            const starValLeft = min + i + 0.5;

                            let fill = 'transparent';
                            let stroke = 'var(--muted)';

                            if (isActive) {
                                if (val >= starValRight) {
                                    fill = '#FFC107';
                                    stroke = '#FFC107';
                                } else if (step === 0.5 && val >= starValLeft) {
                                    fill = `url(#half-${entryId})`;
                                    stroke = '#FFC107'; // outline glows
                                }
                            }

                            return (
                                <svg
                                    key={i}
                                    onClick={(e) => {
                                        if (step === 0.5) {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            if (e.clientX - rect.left < rect.width / 2) {
                                                handleStarClick(starValLeft);
                                                return;
                                            }
                                        }
                                        handleStarClick(starValRight);
                                    }}
                                    viewBox="0 0 24 24"
                                    width="18" height="18"
                                    style={{ cursor: 'pointer', fill, stroke, strokeWidth: '2px', transition: 'all 0.15s' }}
                                >
                                    <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
                                </svg>
                            );
                        })}
                    </div>
                );
            })()}

            {/* Attachment Chip — integrated top-right */}
            <div
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); setModalOpen(true); }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        setModalOpen(true);
                    }
                }}
                style={{
                    position: 'absolute',
                    top: 3,
                    right: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '18px',
                    height: '18px',
                    borderRadius: '5px',
                    background: hasImage
                        ? 'var(--accent-dim)'
                        : 'rgba(255,255,255,0.04)',
                    border: hasImage
                        ? '1px solid var(--accent)'
                        : '1px solid rgba(255,255,255,0.10)',
                    cursor: 'pointer',
                    opacity: hasImage ? 0.9 : (hasNotesOrLink ? 0.6 : 0.38),
                    transition: 'opacity 0.15s, background 0.15s, box-shadow 0.15s',
                }}
                title={hasImage ? 'View Image' : (hasNotesOrLink ? 'View Details' : 'Add Details')}
                onMouseEnter={e => {
                    e.currentTarget.style.opacity = '1';
                    if (hasImage) e.currentTarget.style.boxShadow = '0 0 6px var(--accent-glow)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.opacity = hasImage ? '0.9' : (hasNotesOrLink ? '0.6' : '0.38');
                    e.currentTarget.style.boxShadow = '';
                }}
                onFocus={e => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent)';
                }}
                onBlur={e => {
                    e.currentTarget.style.opacity = hasImage ? '0.9' : (hasNotesOrLink ? '0.6' : '0.38');
                    e.currentTarget.style.boxShadow = '';
                }}
            >
                {/* Tiny icon indicator */}
                <svg viewBox="0 0 16 16" width="10" height="10" style={{
                    fill: 'none',
                    stroke: hasImage ? 'var(--accent-text)' : (hasNotesOrLink ? 'var(--muted)' : 'rgba(255,255,255,0.30)'),
                    strokeWidth: 1.5,
                    strokeLinecap: 'round' as const,
                    strokeLinejoin: 'round' as const,
                }}>
                    {hasImage ? (
                        /* Camera icon for image */
                        <>
                            <rect x="1" y="4" width="14" height="10" rx="2" />
                            <circle cx="8" cy="9" r="2.5" />
                            <path d="M5 4L6 2h4l1 2" />
                        </>
                    ) : (
                        /* Dot grid for empty / notes-only */
                        <>
                            <circle cx="4" cy="5" r="1" fill="currentColor" stroke="none" />
                            <circle cx="8" cy="5" r="1" fill="currentColor" stroke="none" />
                            <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
                            <circle cx="4" cy="11" r="1" fill="currentColor" stroke="none" />
                            <circle cx="8" cy="11" r="1" fill="currentColor" stroke="none" />
                            <circle cx="12" cy="11" r="1" fill="currentColor" stroke="none" />
                        </>
                    )}
                </svg>
            </div>

            {modalOpen && (
                <EntryModal
                    onClose={() => setModalOpen(false)}
                    entry={entry}
                    roundId={roundId}
                    contestantId={contestantId}
                    min={min}
                    max={max}
                    step={step}
                    contestantName={contestantName}
                    roundTitle={roundTitle}
                />
            )}
        </td>
    );
});
