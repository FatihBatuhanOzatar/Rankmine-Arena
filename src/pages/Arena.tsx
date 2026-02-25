import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../state/store';
import { Leaderboard } from '../components/arena/Leaderboard';
import { ScoreTable } from '../components/arena/ScoreTable';
import { ManageContestants } from '../components/arena/ManageContestants';
import { ManageRounds } from '../components/arena/ManageRounds';
import { exportCompetition } from '../io';

export default function Arena() {
    const { id } = useParams();
    const { loadArena, unloadArena, activeCompetition } = useStore();
    const [showContestants, setShowContestants] = useState(false);
    const [showRounds, setShowRounds] = useState(false);

    useEffect(() => {
        if (id) {
            loadArena(id);
        }
        return () => unloadArena();
    }, [id, loadArena, unloadArena]);

    if (!id) return <div>No Arena ID</div>;
    if (!activeCompetition) return <div className="container">Loading...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {/* Top Bar */}
            <header style={{
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 24px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--panel)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link to="/" className="btn">← Back</Link>
                    <h1 style={{ margin: 0, fontSize: '1.2rem' }}>{activeCompetition.title}</h1>
                    <span className="chip" style={{
                        fontFamily: 'monospace',
                        border: '1px solid var(--border)',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px'
                    }}>
                        Score: {activeCompetition.scoring.min} - {activeCompetition.scoring.max}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn" onClick={() => setShowContestants(true)}>Manage Contestants</button>
                    <button className="btn" onClick={() => setShowRounds(true)}>Manage Rounds</button>
                    <button className="btn" onClick={async () => {
                        if (confirm("Images are not included in JSON export. They remain local-only. Continue?")) {
                            await exportCompetition(activeCompetition.id);
                        }
                    }}>Export JSON</button>
                </div>
            </header>

            {/* Modals */}
            {showContestants && <ManageContestants onClose={() => setShowContestants(false)} />}
            {showRounds && <ManageRounds onClose={() => setShowRounds(false)} />}

            {/* Main Layout */}
            <main style={{ flex: 1, display: 'flex', padding: '24px', overflow: 'hidden', gap: '24px' }}>
                <Leaderboard />
                <ScoreTable />
            </main>
        </div>
    );
}
