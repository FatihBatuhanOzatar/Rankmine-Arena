import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';

export default function Landing() {
    const navigate = useNavigate();
    const { competitions, loadCompetitions, createCompetition, createFromTemplate, deleteCompetition } = useStore();

    useEffect(() => {
        loadCompetitions();
    }, [loadCompetitions]);

    const handleCreateEmpty = async () => {
        const id = await createCompetition('New Competition');
        navigate(`/arena/${id}`);
    };

    const handleLoadTemplate = async () => {
        const id = await createFromTemplate();
        navigate(`/arena/${id}`);
    };

    const handleDelete = async (id: string, title: string) => {
        if (confirm(`Are you sure you want to delete "${title}"?`)) {
            await deleteCompetition(id);
        }
    };

    const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'neoArcade');

    const toggleTheme = () => {
        const next = theme === 'neoArcade' ? 'calm' : 'neoArcade';
        setTheme(next);
        document.documentElement.setAttribute('data-theme', next);
    };

    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <h1 style={{ margin: 0 }}>Rankmine Arena</h1>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <button className="btn" onClick={toggleTheme} title="Toggle Theme">
                        {theme === 'neoArcade' ? '🔮 Neo-Arcade' : '☁️ Calm'}
                    </button>
                    <button className="btnPrimary" onClick={handleCreateEmpty}>New Arena</button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
                <div className="card">
                    <h2>New Empty Arena</h2>
                    <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>Start from scratch with no contestants or prompts.</p>
                    <button className="btnPrimary" onClick={handleCreateEmpty}>Create New</button>
                </div>

                <div className="card">
                    <h2>AI Image Models Battle</h2>
                    <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>Load a pre-configured template with 5 models and 5 prompts.</p>
                    <button className="btn" onClick={handleLoadTemplate}>Load Template</button>
                </div>
            </div>

            <h2>Recent Battles</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {competitions.length === 0 ? (
                    <p style={{ color: 'var(--muted)' }}>No recent competitions.</p>
                ) : (
                    competitions.map(c => (
                        <div key={c.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px' }}>
                            <div>
                                <h3 style={{ margin: '0 0 4px 0' }}>{c.title}</h3>
                                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Updated: {new Date(c.updatedAt).toLocaleString()}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn" onClick={() => navigate(`/arena/${c.id}`)}>Open</button>
                                <button className="btn" style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }} onClick={() => handleDelete(c.id, c.title)}>Delete</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
