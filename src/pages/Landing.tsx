import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../state/store';
import { importCompetition } from '../io';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PublicArenaList } from '../components/PublicArenaList';
import { showToast } from '../components/Toast';
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
            showToast('Competition imported successfully!', 'success');
            navigate(`/arena/${newId}`);
        } catch (err: unknown) {
            showToast(
                err instanceof Error ? `Import failed: ${err.message}` : 'Import failed: unknown error',
                'error'
            );
        } finally {
            // Reset file input so same file can be re-imported
            e.target.value = '';
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
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', width: '100%' }}>
            <div className="container" style={{ maxWidth: '800px', flex: 1, paddingTop: '40px', paddingBottom: '60px', position: 'relative' }}>
                {/* Background Wordmark Removed */}

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px', marginBottom: '60px' }}>
                    <div
                        style={{ padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.background = 'var(--panel-elevated)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--panel)'; }}
                        onClick={handleCreateEmpty}
                    >
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--text)', fontWeight: 'bold' }}>New Empty Arena</h2>
                        <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '14px' }}>Start from scratch with no contestants or prompts.</p>
                        <button style={{ padding: '12px 32px', fontSize: '16px', borderRadius: '6px', background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Create New</button>
                    </div>

                    <div
                        style={{ padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.background = 'var(--panel-elevated)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--panel)'; }}
                        onClick={handleLoadTemplate}
                    >
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--text)', fontWeight: 'bold' }}>AI Image Models Battle</h2>
                        <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '14px' }}>Load a pre-configured template with 5 models and 5 prompts.</p>
                        <button style={{ padding: '12px 32px', fontSize: '16px', borderRadius: '6px', background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Load Template</button>
                    </div>
                </div>

                <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '15px', marginTop: '-36px', marginBottom: '60px', opacity: 0.8 }}>
                    Create AI battles, publish them, and let the community rank the results.
                </p>

                {templates.length > 0 && (
                    <>
                        <h2 style={{ fontSize: '1.1rem', color: '#666', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Templates</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginBottom: '40px' }}>
                            {templates.map(t => (
                                <div
                                    key={t.id}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', cursor: 'pointer', transition: 'all 0.2s ease', background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--panel-elevated)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--panel)'; }}
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
                                        <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: 'var(--text)', fontWeight: 500 }}>{t.name}</h3>
                                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Format Template • Updated: {new Date(t.updatedAt).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px 8px', transition: 'color 0.2s' }}
                                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)' }}
                                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)' }}
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
                        <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--muted)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚔️</div>
                            <p style={{ margin: '0 0 8px 0', fontWeight: 500, color: 'var(--text)' }}>No battles yet</p>
                            <p style={{ margin: 0, fontSize: '14px' }}>Create a new arena above to start your first battle.</p>
                        </div>
                    ) : (
                        competitions.map(c => (
                            <div
                                key={c.id}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', cursor: 'pointer', transition: 'all 0.2s ease', background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--panel-elevated)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--panel)'; }}
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
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: 'var(--text)', fontWeight: 500 }}>{c.title}</h3>
                                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Updated: {new Date(c.updatedAt).toLocaleString()}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px 8px', transition: 'color 0.2s' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)' }}
                                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)' }}
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

                {/* Featured Arenas */}
            <div className="public-listing-section" style={{ marginTop: '24px' }}>
                <h2 style={{ fontSize: '1.1rem', color: 'var(--muted)', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>Featured Arenas</h2>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
                    {[
                        { slug: 'featured-1', title: 'AI Image Generation Showdown', desc: 'Comparing top image generation models side by side.' },
                        { slug: 'featured-2', title: 'LLM Creative Writing Battle', desc: 'Which model writes the best stories?' },
                        { slug: 'featured-3', title: 'Logo Design Arena', desc: 'Evaluating AI-generated logos for quality and creativity.' },
                    ].map(f => (
                        <Link
                            key={f.slug}
                            to={`/p/${f.slug}`}
                            className="card"
                            style={{
                                flex: '1 1 200px', minWidth: '200px', textDecoration: 'none',
                                border: '1px solid var(--accent-border)', padding: '20px',
                                display: 'flex', flexDirection: 'column', gap: '6px',
                                transition: 'all 0.2s',
                            }}
                        >
                            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>{f.title}</h3>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>{f.desc}</p>
                        </Link>
                    ))}
                </div>
            </div>

            <div className="public-listing-section">
                <h2 style={{ fontSize: '1.1rem', color: 'var(--muted)', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>Explore Community Arenas</h2>
                <PublicArenaList />
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

            <footer style={{ background: '#000', padding: '40px 24px', textAlign: 'center', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
                <div style={{ color: 'var(--muted)', fontSize: '13px', display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '16px' }}>
                    <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>İletişim</a>
                    <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Kullanım Koşulları</a>
                    <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Telif Hakkı</a>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                    &copy; {new Date().getFullYear()} Rankmine Arena. Tüm hakları saklıdır.
                </div>
            </footer>
        </div>
    );
}
