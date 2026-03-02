import { memo, useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import { computeRoundWinners, computeArenaSummary } from '../../domain';
import { makeEntryId } from '../../domain';

export const ArenaSummary = memo(function ArenaSummary() {
    const activeCompetition = useStore(s => s.activeCompetition);
    const contestants = useStore(s => s.contestants);
    const rounds = useStore(s => s.rounds);
    const entriesById = useStore(s => s.entriesById);

    const [collapsed, setCollapsed] = useState(false);

    const entries = useMemo(() => Object.values(entriesById), [entriesById]);

    const roundWinners = useMemo(
        () => activeCompetition
            ? computeRoundWinners(rounds, contestants, entriesById, makeEntryId, activeCompetition.id)
            : new Map<string, string[]>(),
        [rounds, contestants, entriesById, activeCompetition]
    );

    const summary = useMemo(
        () => computeArenaSummary(contestants, entries, rounds.length, roundWinners),
        [contestants, entries, rounds.length, roundWinners]
    );

    if (contestants.length === 0) return null;

    return (
        <div className="arena-summary card" style={{ width: '320px', flexShrink: 0 }}>
            <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setCollapsed(v => !v)}
            >
                <h3 style={{ margin: 0, fontSize: '0.9rem', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--muted)' }}>
                    ⚔ Battle Summary
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--muted)', transition: 'transform 0.2s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', display: 'inline-block' }}>
                    ▼
                </span>
            </div>

            {!collapsed && (
                <div style={{ marginTop: '12px' }}>
                    {/* Overall Winner */}
                    {summary.overallWinner ? (
                        <div className="winner-glow" style={{ padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {summary.isTied ? 'Tied at Top' : 'Overall Winner'}
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent-text)' }}>
                                🏆 {summary.overallWinner.contestantName}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                                {summary.overallWinner.totalScore} pts
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                            No scores yet
                        </div>
                    )}

                    {/* Stats Table */}
                    {summary.contestantStats.length > 0 && summary.overallWinner && (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                                    <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 500 }}>Name</th>
                                    <th style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 500 }}>Wins</th>
                                    <th style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 500 }}>Avg</th>
                                    <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 500 }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.contestantStats.map(cs => (
                                    <tr
                                        key={cs.contestantId}
                                        style={{
                                            borderBottom: '1px solid var(--border)',
                                            opacity: cs.totalScore > 0 || cs.averageScore > 0 ? 1 : 0.5
                                        }}
                                    >
                                        <td style={{
                                            padding: '5px 6px',
                                            maxWidth: '100px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {cs.contestantName}
                                        </td>
                                        <td style={{ padding: '5px 6px', textAlign: 'center' }}>
                                            {cs.roundsWon}
                                        </td>
                                        <td style={{ padding: '5px 6px', textAlign: 'center' }}>
                                            {cs.averageScore}
                                        </td>
                                        <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 600, color: 'var(--accent-text)' }}>
                                            {cs.totalScore}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
});
