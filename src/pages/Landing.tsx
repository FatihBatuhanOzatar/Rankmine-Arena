import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import { importCompetition } from '../io';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PublicArenaList } from '../components/PublicArenaList';
export default function Landing() {
    const navigate = useNavigate();
    const { competitions, templates, loadCompetitions, loadTemplates, createCompetition, createFromTemplate, createCompetitionFromTemplate, deleteCompetition, deleteTemplate, createGridCompetition } = useStore();

    useEffect(() => {
        loadCompetitions();
        loadTemplates();
    }, [loadCompetitions, loadTemplates]);

    const handleCreateEmpty = async () => {
        const id = await createCompetition('New Competition');
        navigate(`/arena/${id}`);
    };

    const handleLoadTemplate = async () => {
        const id = await createFromTemplate();
        navigate(`/arena/${id}`);
    };

    const handleDelete = (type: 'competition' | 'template', id: string, title: string) => {
        setConfirmDelete({ type, id, title });
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = e.target.files?.[0];
            if (!file) return;
            const newId = await importCompetition(file);
            navigate(`/arena/${newId}`);
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(`Failed to import: ${err.message}`);
            }
        }
    };

    const [confirmDelete, setConfirmDelete] = useState<{ type: 'competition' | 'template', id: string, title: string } | null>(null);

    const handleDeleteConfirm = async () => {
        if (confirmDelete) {
            if (confirmDelete.type === 'competition') {
                await deleteCompetition(confirmDelete.id);
            } else {
                await deleteTemplate(confirmDelete.id);
            }
            setConfirmDelete(null);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '800px', paddingTop: '40px', position: 'relative' }}>
            {/* Background Wordmark Removed */}

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px', marginBottom: '60px' }}>
                <div 
                    style={{ padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#181818', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.5)'; e.currentTarget.style.background = '#1c1c1c'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = '#181818'; }}
                    onClick={handleCreateEmpty}
                >
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#fff', fontWeight: 'bold' }}>New Empty Arena</h2>
                    <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '14px' }}>Start from scratch with no contestants or prompts.</p>
                    <button style={{ padding: '12px 32px', fontSize: '16px', borderRadius: '6px', background: '#C1440E', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }} onClick={handleCreateEmpty}>Create New</button>
                </div>

                <div 
                    style={{ padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#181818', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.5)'; e.currentTarget.style.background = '#1c1c1c'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = '#181818'; }}
                    onClick={handleLoadTemplate}
                >
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#fff', fontWeight: 'bold' }}>AI Image Models Battle</h2>
                    <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '14px' }}>Load a pre-configured template with 5 models and 5 prompts.</p>
                    <button style={{ padding: '12px 32px', fontSize: '16px', borderRadius: '6px', background: '#C1440E', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }} onClick={handleLoadTemplate}>Load Template</button>
                </div>
            </div>

            {templates.length > 0 && (
                <>
                    <h2 style={{ fontSize: '1.1rem', color: '#666', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Templates</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginBottom: '40px' }}>
                        {templates.map(t => (
                            <div
                                key={t.id}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', cursor: 'pointer', transition: 'all 0.2s ease', background: '#141414', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#1a1a1a'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#141414'; }}
                                onClick={async () => {
                                    const newId = await createCompetitionFromTemplate(t.id);
                                    navigate(`/arena/${newId}`);
                                }}
                                tabIndex={0}
                                onKeyDown={async (e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        const newId = await createCompetitionFromTemplate(t.id);
                                        navigate(`/arena/${newId}`);
                                    }
                                }}
                            >
                                <div>
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#fff', fontWeight: 500 }}>{t.name}</h3>
                                    <div style={{ fontSize: '12px', color: '#555' }}>Format Template • Updated: {new Date(t.updatedAt).toLocaleDateString()}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', padding: '4px 8px', transition: 'color 0.2s' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.color = '#C1440E' }}
                                        onMouseLeave={(e) => { e.currentTarget.style.color = '#666' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete('template', t.id, t.name);
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <h2 style={{ fontSize: '1.1rem', color: '#666', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Recent Battles</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginBottom: '40px' }}>
                {competitions.length === 0 ? (
                    <p style={{ color: 'var(--muted)' }}>No recent competitions.</p>
                ) : (
                    competitions.map(c => (
                        <div
                            key={c.id}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', cursor: 'pointer', transition: 'all 0.2s ease', background: '#141414', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#1a1a1a'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#141414'; }}
                            onClick={() => navigate(`/arena/${c.id}`)}
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    navigate(`/arena/${c.id}`);
                                }
                            }}
                        >
                            <div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#fff', fontWeight: 500 }}>{c.title}</h3>
                                <div style={{ fontSize: '12px', color: '#555' }}>Updated: {new Date(c.updatedAt).toLocaleString()}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', padding: '4px 8px', transition: 'color 0.2s' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = '#C1440E' }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = '#666' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete('competition', c.id, c.title);
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', opacity: 0.85 }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--muted)' }}>Import Backup</h3>
                <input type="file" accept=".json" onChange={handleImport} style={{ color: 'var(--text)', background: 'transparent' }} />
            </div>

            <div className="public-listing-section" style={{ marginTop: '24px' }}>
                <h2 style={{ fontSize: '1.1rem', color: 'var(--muted)', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>Explore Community Arenas</h2>
                <PublicArenaList />
            </div>

            {import.meta.env.DEV && (
                <div className="card" style={{ marginTop: '40px', borderColor: 'var(--amber)', borderStyle: 'dashed' }}>
                    <h3 style={{ margin: '0 0 16px 0', color: 'var(--amber)' }}>🛠 Dev Tools (Stress Testing)</h3>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <button className="btn" onClick={async () => {
                            const id = await createGridCompetition(50);
                            navigate(`/arena/${id}`);
                        }}>
                            Generate 50x50 Grid
                        </button>
                        <button className="btn" onClick={async () => {
                            const id = await createGridCompetition(100);
                            navigate(`/arena/${id}`);
                        }}>
                            Generate 100x100 Grid
                        </button>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={!!confirmDelete}
                title={`Delete ${confirmDelete?.type}?`}
                body={<>This will permanently remove <strong>{confirmDelete?.title}</strong> and all its local data.</>}
                confirmLabel="Delete"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setConfirmDelete(null)}
            />
        </div>
    );
}
