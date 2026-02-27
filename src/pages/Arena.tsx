import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../state/store';
import { Leaderboard } from '../components/arena/Leaderboard';
import { ScoreTable } from '../components/arena/ScoreTable';
import { GalleryView } from '../components/arena/GalleryView';
import { ManageContestants } from '../components/arena/ManageContestants';
import { ManageRounds } from '../components/arena/ManageRounds';
import { ManageSettings } from '../components/arena/ManageSettings';
import { SaveTemplateModal } from '../components/arena/SaveTemplateModal';
import { exportCompetition } from '../io';

export default function Arena() {
    const { id } = useParams();
    const { loadArena, unloadArena, activeCompetition, updateCompetition } = useStore();
    const [showContestants, setShowContestants] = useState(false);
    const [showRounds, setShowRounds] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);
    const [showTip, setShowTip] = useState(() => !localStorage.getItem('arenaTipsSeen'));

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleStr, setTitleStr] = useState('');

    const [isCompact, setIsCompact] = useState(() => localStorage.getItem('rm_compact_mode') === 'true');
    const [viewMode, setViewMode] = useState<'grid' | 'gallery'>('grid');

    const handleGalleryNavigate = useCallback((rowIdx: number, colIdx: number) => {
        setViewMode('grid');
        // Wait for Grid to render, then scroll + highlight
        requestAnimationFrame(() => {
            setTimeout(() => {
                const cellId = `cell-${rowIdx}-${colIdx}`;
                const el = document.getElementById(cellId);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                    // Brief highlight pulse
                    const td = el.closest('td');
                    if (td) {
                        td.style.transition = 'box-shadow 0.3s';
                        td.style.boxShadow = '0 0 0 3px var(--accent), inset 0 0 20px var(--accent-glow)';
                        setTimeout(() => {
                            td.style.boxShadow = '';
                            setTimeout(() => { td.style.transition = ''; }, 350);
                        }, 1200);
                    }
                }
            }, 80);
        });
    }, []);

    const dismissTip = () => {
        localStorage.setItem('arenaTipsSeen', 'true');
        setShowTip(false);
    };

    useEffect(() => {
        if (id) {
            loadArena(id);
        }
        return () => unloadArena();
    }, [id, loadArena, unloadArena]);

    if (!id) return <div>No Arena ID</div>;
    if (!activeCompetition) return <div className="container">Loading...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Top Bar */}
            <header style={{
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 24px',
                borderBottom: '1px solid var(--line)',
                background: 'var(--panel)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {isEditingTitle ? (
                        <input
                            autoFocus
                            className="input"
                            value={titleStr}
                            onChange={e => setTitleStr(e.target.value)}
                            onBlur={() => {
                                setIsEditingTitle(false);
                                if (titleStr.trim() && titleStr !== activeCompetition.title) {
                                    updateCompetition(activeCompetition.id, { title: titleStr.trim() });
                                }
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                } else if (e.key === 'Escape') {
                                    setTitleStr(activeCompetition.title);
                                    setIsEditingTitle(false);
                                }
                            }}
                            style={{ margin: 0, fontSize: '1.2rem', padding: '4px 8px' }}
                        />
                    ) : (
                        <h1
                            style={{ margin: 0, fontSize: '1.2rem', cursor: 'pointer' }}
                            onClick={() => {
                                setTitleStr(activeCompetition.title);
                                setIsEditingTitle(true);
                            }}
                            title="Click to rename"
                        >
                            {activeCompetition.title}
                        </h1>
                    )}

                    <span
                        className="chip"
                        onClick={() => setShowSettings(true)}
                        title="Configure Scoring"
                        style={{
                            fontFamily: 'monospace',
                            border: '1px solid var(--border)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        Score: {activeCompetition.scoreMin} - {activeCompetition.scoreMax}{activeCompetition.scoreUnit ? ` ${activeCompetition.scoreUnit}` : ''}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {/* View Mode Toggle */}
                    <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <button
                            className="btn"
                            onClick={() => setViewMode('grid')}
                            style={{
                                borderRadius: 0, border: 'none',
                                background: viewMode === 'grid' ? 'var(--accent)' : 'transparent',
                                color: viewMode === 'grid' ? '#000' : 'var(--text)',
                                fontWeight: viewMode === 'grid' ? 700 : 400,
                                padding: '0 14px', fontSize: '13px',
                            }}
                        >Grid</button>
                        <button
                            className="btn"
                            onClick={() => setViewMode('gallery')}
                            style={{
                                borderRadius: 0, border: 'none', borderLeft: '1px solid var(--border)',
                                background: viewMode === 'gallery' ? 'var(--accent)' : 'transparent',
                                color: viewMode === 'gallery' ? '#000' : 'var(--text)',
                                fontWeight: viewMode === 'gallery' ? 700 : 400,
                                padding: '0 14px', fontSize: '13px',
                            }}
                        >Gallery</button>
                    </div>

                    <button
                        className="btn"
                        onClick={() => {
                            const next = !isCompact;
                            setIsCompact(next);
                            localStorage.setItem('rm_compact_mode', String(next));
                        }}
                        title="Toggle Compact Columns"
                        style={{ padding: '0 12px', fontSize: '16px' }}
                    >
                        🗜️
                    </button>
                    <button className="btn" onClick={() => setShowSaveTemplate(true)}>Save as Template</button>
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
            {showSaveTemplate && <SaveTemplateModal onClose={() => setShowSaveTemplate(false)} />}
            {showContestants && <ManageContestants onClose={() => setShowContestants(false)} />}
            {showRounds && <ManageRounds onClose={() => setShowRounds(false)} />}
            {showSettings && <ManageSettings onClose={() => setShowSettings(false)} />}

            {/* Main Layout */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'hidden', gap: '24px' }}>
                {showTip && (
                    <div style={{ padding: '12px 16px', background: 'var(--accent)', color: '#000', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span><strong>Tip:</strong> Use arrow keys to navigate. Drag row/column headers to reorder.</span>
                        <button onClick={dismissTip} style={{ padding: '4px 12px', background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#000', fontWeight: 'bold' }}>Got it</button>
                    </div>
                )}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden', gap: '24px' }}>
                    {viewMode === 'grid' ? (
                        <>
                            <Leaderboard />
                            <ScoreTable isCompact={isCompact} />
                        </>
                    ) : (
                        <GalleryView onNavigateToCell={handleGalleryNavigate} />
                    )}
                </div>
            </main>
        </div>
    );
}
