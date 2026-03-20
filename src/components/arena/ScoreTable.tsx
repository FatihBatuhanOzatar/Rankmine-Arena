import { memo, useCallback, useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import { ScoreCell } from './ScoreCell';
import { makeEntryId, computeRoundWinners } from '../../domain';

function WeightEditor({ roundId, weight, locked }: { roundId: string, weight: number, locked?: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const updateRound = useStore(s => s.updateRound);

    if (locked) return <span style={{ marginLeft: '8px', color: 'var(--muted)', fontSize: '11px' }}>×{weight.toFixed(1)}</span>;

    return (
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '8px' }}>
            <span
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                style={{ color: 'var(--muted)', fontSize: '11px', cursor: 'pointer' }}
            >
                ×{weight.toFixed(1)}
            </span>
            {isOpen && (
                <div
                    onClick={e => e.stopPropagation()}
                    style={{
                        position: 'absolute', top: '100%', left: 0, marginTop: '4px',
                        background: 'var(--panel-elevated)', border: '1px solid var(--border)',
                        padding: '4px', borderRadius: '4px', zIndex: 50,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                >
                    <input
                        type="number" step="0.1" min="0"
                        defaultValue={weight}
                        onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val >= 0) {
                                updateRound(roundId, { weight: val });
                            }
                            setIsOpen(false);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.currentTarget.blur();
                            } else if (e.key === 'Escape') {
                                setIsOpen(false);
                            }
                        }}
                        autoFocus
                        style={{ width: '60px', padding: '2px 4px', fontSize: '12px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    />
                </div>
            )}
        </span>
    );
}

interface ScoreTableProps {
    isCompact?: boolean;
    locked?: boolean;
    showImages?: boolean;
}

export const ScoreTable = memo(function ScoreTable({ isCompact, locked, showImages }: ScoreTableProps) {
    const activeCompetition = useStore(s => s.activeCompetition);
    const contestants = useStore(s => s.contestants);
    const rounds = useStore(s => s.rounds);
    const entriesById = useStore(s => s.entriesById);
    const reorderRounds = useStore(s => s.reorderRounds);
    const reorderContestants = useStore(s => s.reorderContestants);

    // Memoized round winners
    const roundWinners = useMemo(
        () => activeCompetition
            ? computeRoundWinners(rounds, contestants, entriesById, makeEntryId, activeCompetition.id)
            : new Map<string, string[]>(),
        [rounds, contestants, entriesById, activeCompetition]
    );

    const [dragTarget, setDragTarget] = useState<{ type: 'round' | 'contestant', index: number } | null>(null);
    const [draggedItem, setDraggedItem] = useState<{ type: 'round' | 'contestant', index: number } | null>(null);

    const handleDragStart = (e: React.DragEvent, type: 'round' | 'contestant', index: number) => {
        if (locked) { e.preventDefault(); return; }
        setDraggedItem({ type, index });
        e.dataTransfer.setData('type', type);
        e.dataTransfer.setData('index', String(index));
    };

    const handleDragEnd = () => {
        setDragTarget(null);
        setDraggedItem(null);
    };

    const handleDragOver = (e: React.DragEvent, type: 'round' | 'contestant', index: number) => {
        // We can't safely read e.dataTransfer.getData during dragover cross-browser
        e.preventDefault();
        setDragTarget({ type, index });
    };

    const handleDragLeave = () => {
        setDragTarget(null);
    };

    const handleDrop = async (e: React.DragEvent, targetType: 'round' | 'contestant', targetIndex: number) => {
        e.preventDefault();
        setDragTarget(null);
        setDraggedItem(null);

        const type = e.dataTransfer.getData('type');
        if (type !== targetType) return;

        const fromIndex = parseInt(e.dataTransfer.getData('index'), 10);
        if (isNaN(fromIndex) || fromIndex === targetIndex) return;

        if (type === 'round') {
            await reorderRounds(fromIndex, targetIndex);
        } else if (type === 'contestant') {
            await reorderContestants(fromIndex, targetIndex);
        }
    };

    const handleNavigate = useCallback((currentRow: number, currentCol: number, rowDelta: number, colDelta: number) => {
        const nextRow = currentRow + rowDelta;
        const nextCol = currentCol + colDelta;

        // Boundary checks
        if (nextRow < 0 || nextRow >= rounds.length) return;
        if (nextCol < 0 || nextCol >= contestants.length) return;

        const nextId = `cell-${nextRow}-${nextCol}`;
        const elem = document.getElementById(nextId) as HTMLInputElement | null;

        if (elem) {
            elem.focus();
            // Select all text for easy overwriting when navigating by keyboard
            setTimeout(() => elem.select(), 0);
        }
    }, [rounds.length, contestants.length]);

    if (!activeCompetition) return null;
    const { scoreMin: min, scoreMax: max, scoreStep: step, scoringMode: mode } = activeCompetition;

    return (
        <div className={`score-table-wrapper ${isCompact ? 'grid--compact' : ''}`} style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg)', ...{ '--drag-accent': 'rgba(193, 68, 14, 0.75)' } } as React.CSSProperties}>
            <style>
                {`
                .score-table {
                    min-width: 100%;
                    width: max-content;
                    border-collapse: collapse;
                    table-layout: fixed;
                }
                .score-table th.col-round {
                    width: 250px;
                    min-width: 250px;
                }
                .score-table th.col-contestant {
                    min-width: 120px;
                    width: 120px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .grid--compact .score-table th.col-contestant {
                    min-width: 80px;
                    width: 80px;
                    font-size: 13px;
                }
                ${draggedItem?.type === 'contestant' ? `
                    table.score-table th:nth-child(${draggedItem.index + 2}),
                    table.score-table td:nth-child(${draggedItem.index + 2}) {
                        background-color: var(--line) !important;
                        opacity: 0.5;
                    }
                ` : ''}
                ${(dragTarget?.type === 'contestant' && draggedItem?.type === 'contestant') ? `
                    table.score-table th:nth-child(${dragTarget.index + 2}),
                    table.score-table td:nth-child(${dragTarget.index + 2}) {
                        box-shadow: inset 4px 0 0 0 var(--drag-accent) !important;
                    }
                ` : ''}
                ${draggedItem?.type === 'round' ? `
                    table.score-table tbody tr:nth-child(${draggedItem.index + 1}) td {
                        background-color: var(--line) !important;
                        opacity: 0.5;
                    }
                ` : ''}
                ${(dragTarget?.type === 'round' && draggedItem?.type === 'round') ? `
                    table.score-table tbody tr:nth-child(${dragTarget.index + 1}) td {
                        box-shadow: inset 0 4px 0 0 var(--drag-accent) !important;
                    }
                ` : ''}
                `}
            </style>
            <table className="score-table">
                <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: '#181818', borderBottom: '2px solid rgba(193,68,14,0.4)' }}>
                    <tr>
                        <th className="col-round" style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid var(--border)' }}>
                            Round / Prompt
                        </th>
                        {contestants.map((c, idx) => (
                            <th
                                key={c.id}
                                className="col-contestant"
                                draggable={!locked}
                                onDragStart={(e) => handleDragStart(e, 'contestant', idx)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => handleDragOver(e, 'contestant', idx)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, 'contestant', idx)}
                                style={{
                                    padding: '12px',
                                    textAlign: 'center',
                                    borderRight: '1px solid var(--border)',
                                    cursor: locked ? 'default' : 'grab',
                                    transition: 'background-color 0.2s'
                                }}
                            >
                                {c.name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rounds.map((r, rIdx) => (
                        <tr key={r.id}>
                            <td
                                draggable={!locked}
                                onDragStart={(e) => handleDragStart(e, 'round', rIdx)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => handleDragOver(e, 'round', rIdx)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, 'round', rIdx)}
                                style={{
                                    padding: '12px',
                                    borderRight: '1px solid var(--border)',
                                    borderBottom: '1px solid var(--border)',
                                    cursor: locked ? 'default' : 'grab',
                                    transition: 'background-color 0.2s'
                                }}
                            >
                                {r.title}
                                {activeCompetition.isWeighted && <WeightEditor roundId={r.id} weight={r.weight ?? 1} locked={locked} />}
                            </td>
                            {contestants.map((c, cIdx) => {
                                const entryId = makeEntryId(activeCompetition.id, r.id, c.id);
                                const winners = roundWinners.get(r.id) ?? [];
                                const isWinner = winners.includes(c.id);
                                return (
                                    <ScoreCell
                                        key={entryId}
                                        roundId={r.id}
                                        contestantId={c.id}
                                        entryId={entryId}
                                        min={min}
                                        max={max}
                                        step={step}
                                        mode={mode}
                                        rowIdx={rIdx}
                                        colIdx={cIdx}
                                        onNavigate={(rowDelta, colDelta) => handleNavigate(rIdx, cIdx, rowDelta, colDelta)}
                                        contestantName={c.name}
                                        roundTitle={r.title}
                                        isWinner={isWinner}
                                        locked={locked}
                                        highlightMissingImage={!entriesById[entryId]?.assetId}
                                        showImage={showImages}
                                    />
                                )
                            })}
                        </tr>
                    ))}
                    {rounds.length === 0 && (
                        <tr>
                            <td colSpan={contestants.length + 1} style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>
                                No rounds yet.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
});
