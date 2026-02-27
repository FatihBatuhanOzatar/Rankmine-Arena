import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import { importCompetition } from '../io';
import { ConfirmDialog } from '../components/ConfirmDialog';

export default function Landing() {
    const navigate = useNavigate();
    const { competitions, templates, loadCompetitions, loadTemplates, createCompetition, createFromTemplate, createCompetitionFromTemplate, deleteCompetition, deleteTemplate } = useStore();

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
        <div className="container" style={{ maxWidth: '800px', paddingTop: '40px' }}>
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

            {templates.length > 0 && (
                <>
                    <h2>Templates</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' }}>
                        {templates.map(t => (
                            <div
                                key={t.id}
                                className="card recent-battle-card"
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s' }}
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
                                    <h3 style={{ margin: '0 0 4px 0' }}>{t.name}</h3>
                                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Format Template • Updated: {new Date(t.updatedAt).toLocaleDateString()}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        className="btn"
                                        style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }}
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

            <h2>Recent Battles</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' }}>
                {competitions.length === 0 ? (
                    <p style={{ color: 'var(--muted)' }}>No recent competitions.</p>
                ) : (
                    competitions.map(c => (
                        <div
                            key={c.id}
                            className="card recent-battle-card"
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s' }}
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
                                <h3 style={{ margin: '0 0 4px 0' }}>{c.title}</h3>
                                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Updated: {new Date(c.updatedAt).toLocaleString()}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    className="btn"
                                    style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }}
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

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h3 style={{ margin: 0 }}>Import Backup</h3>
                <input type="file" accept=".json" onChange={handleImport} style={{ color: 'var(--text)', background: 'transparent' }} />
            </div>

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
