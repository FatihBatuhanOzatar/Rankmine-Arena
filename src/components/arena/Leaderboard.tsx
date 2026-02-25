import { memo, useMemo } from 'react';
import { useStore } from '../../state/store';
import { computeLeaderboard } from '../../domain';

export const Leaderboard = memo(function Leaderboard() {
    const contestants = useStore(s => s.contestants);
    const entriesById = useStore(s => s.entriesById);
    const roundsLength = useStore(s => s.rounds.length);

    // Derive flat array of entries required by domain logic
    const derivedEntries = useMemo(() => Object.values(entriesById), [entriesById]);

    // Compute purely
    const rows = useMemo(() => {
        return computeLeaderboard(contestants, derivedEntries, roundsLength);
    }, [contestants, derivedEntries, roundsLength]);

    return (
        <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', paddingRight: '16px' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '1.2rem' }}>Leaderboard</h2>
            {rows.map((row, idx) => (
                <div key={row.contestant.id} className="card" style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', marginBottom: '8px' }}>
                    <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'var(--border)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: '12px',
                        fontWeight: 'bold'
                    }}>
                        {idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold' }}>{row.contestant.name}</div>
                        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{row.progressText}</div>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                        {row.totalScore}
                    </div>
                </div>
            ))}
        </div>
    );
});
