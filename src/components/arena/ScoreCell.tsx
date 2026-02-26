import { memo, useCallback, useState, useRef } from 'react';
import { useStore } from '../../state/store';
import { EntryModal } from './EntryModal';

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
    onNavigate
}: ScoreCellProps) {
    const entry = useStore(useCallback(s => s.entriesById[entryId], [entryId]));
    const upsertEntry = useStore(s => s.upsertEntry);
    const [modalOpen, setModalOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const val = entry?.score ?? '';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let parsed: number | undefined = undefined;
        if (e.target.value !== '') {
            parsed = parseInt(e.target.value, 10);
            if (isNaN(parsed)) return;
            if (parsed > max) parsed = max;
            if (parsed < min) parsed = min;
        }
        upsertEntry(roundId, contestantId, parsed);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Arrow Key Navigation
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            onNavigate(-1, 0);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            onNavigate(1, 0);
        } else if (e.key === 'ArrowLeft') {
            // Only navigate if at start of input
            if (inputRef.current && inputRef.current.selectionStart === 0) {
                e.preventDefault();
                onNavigate(0, -1);
            }
        } else if (e.key === 'ArrowRight') {
            // Only navigate if at end of input
            if (inputRef.current && inputRef.current.selectionStart === String(val).length) {
                e.preventDefault();
                onNavigate(0, 1);
            }
        } else if (e.key === 'Enter') {
            // Option 1: move down
            e.preventDefault();
            onNavigate(1, 0);
        } else if (e.key === 'Escape') {
            inputRef.current?.blur();
        }
    };

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let parsed = parseFloat(e.target.value);
        if (isNaN(parsed)) return;
        if (parsed > max) parsed = max;
        if (parsed < min) parsed = min;
        upsertEntry(roundId, contestantId, parsed);
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
                    type="number"
                    value={val}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    min={min}
                    max={max}
                    step={step}
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
                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{val === '' ? '-' : val}</span>
                    <input
                        ref={inputRef}
                        id={`cell-${rowIdx}-${colIdx}`}
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={val === '' ? min : val}
                        onChange={handleSliderChange}
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

            {/* Details Trigger */}
            <div
                onClick={() => setModalOpen(true)}
                style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    background: hasImage ? 'var(--cyan)' : (hasNotesOrLink ? 'var(--muted)' : 'transparent'),
                    border: hasImage || hasNotesOrLink ? 'none' : '1px solid var(--border)',
                    cursor: 'pointer',
                    opacity: 0.5,
                    transition: 'opacity 0.2s'
                }}
                title="Open Details/Image"
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
            />

            {modalOpen && (
                <EntryModal
                    onClose={() => setModalOpen(false)}
                    entry={entry}
                    roundId={roundId}
                    contestantId={contestantId}
                    min={min}
                    max={max}
                    step={step}
                />
            )}
        </td>
    );
});
