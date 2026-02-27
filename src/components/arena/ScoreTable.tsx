import { memo, useCallback, useState } from 'react';
import { useStore } from '../../state/store';
import { ScoreCell } from './ScoreCell';
import { makeEntryId } from '../../domain';

export const ScoreTable = memo(function ScoreTable() {
    const activeCompetition = useStore(s => s.activeCompetition);
    const contestants = useStore(s => s.contestants);
    const rounds = useStore(s => s.rounds);
    const reorderRounds = useStore(s => s.reorderRounds);
    const reorderContestants = useStore(s => s.reorderContestants);

    const [dragTarget, setDragTarget] = useState<{ type: 'round' | 'contestant', index: number } | null>(null);

    const handleDragStart = (e: React.DragEvent, type: 'round' | 'contestant', index: number) => {
        e.dataTransfer.setData('type', type);
        e.dataTransfer.setData('index', String(index));
        // Needs a tiny timeout for drag image to render before applying styles
        setTimeout(() => {
            if (e.target instanceof HTMLElement) {
                e.target.style.opacity = '0.5';
            }
        }, 0);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        if (e.target instanceof HTMLElement) {
            e.target.style.opacity = '1';
        }
        setDragTarget(null);
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
        <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
                    <tr>
                        <th style={{ width: '250px', padding: '12px', textAlign: 'left', borderRight: '1px solid var(--border)' }}>
                            Round / Prompt
                        </th>
                        {contestants.map((c, idx) => (
                            <th
                                key={c.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, 'contestant', idx)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => handleDragOver(e, 'contestant', idx)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, 'contestant', idx)}
                                style={{
                                    padding: '12px',
                                    textAlign: 'center',
                                    minWidth: '100px',
                                    borderRight: '1px solid var(--border)',
                                    cursor: 'grab',
                                    backgroundColor: dragTarget?.type === 'contestant' && dragTarget.index === idx ? 'var(--line)' : 'transparent',
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
                                draggable
                                onDragStart={(e) => handleDragStart(e, 'round', rIdx)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => handleDragOver(e, 'round', rIdx)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, 'round', rIdx)}
                                style={{
                                    padding: '12px',
                                    borderRight: '1px solid var(--border)',
                                    borderBottom: '1px solid var(--border)',
                                    cursor: 'grab',
                                    backgroundColor: dragTarget?.type === 'round' && dragTarget.index === rIdx ? 'var(--line)' : 'transparent',
                                    transition: 'background-color 0.2s'
                                }}
                            >
                                {r.title}
                            </td>
                            {contestants.map((c, cIdx) => {
                                const entryId = makeEntryId(activeCompetition.id, r.id, c.id);
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
