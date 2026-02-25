import { memo } from 'react';
import { useStore } from '../../state/store';
import { ScoreCell } from './ScoreCell';
import { makeEntryId } from '../../domain';

export const ScoreTable = memo(function ScoreTable() {
    const activeCompetition = useStore(s => s.activeCompetition);
    const contestants = useStore(s => s.contestants);
    const rounds = useStore(s => s.rounds);

    if (!activeCompetition) return null;
    const { min, max } = activeCompetition.scoring;

    return (
        <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
                    <tr>
                        <th style={{ width: '250px', padding: '12px', textAlign: 'left', borderRight: '1px solid var(--border)' }}>
                            Round / Prompt
                        </th>
                        {contestants.map(c => (
                            <th key={c.id} style={{ padding: '12px', textAlign: 'center', minWidth: '100px', borderRight: '1px solid var(--border)' }}>
                                {c.name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rounds.map(r => (
                        <tr key={r.id}>
                            <td style={{ padding: '12px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                                {r.title}
                            </td>
                            {contestants.map(c => {
                                const entryId = makeEntryId(activeCompetition.id, r.id, c.id);
                                return (
                                    <ScoreCell
                                        key={entryId}
                                        roundId={r.id}
                                        contestantId={c.id}
                                        entryId={entryId}
                                        min={min}
                                        max={max}
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
