import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../state/store';
import { Leaderboard } from '../components/arena/Leaderboard';
import { ArenaSummary } from '../components/arena/ArenaSummary';
import { ScoreTable } from '../components/arena/ScoreTable';
import { GalleryView } from '../components/arena/GalleryView';
import { ManageContestants } from '../components/arena/ManageContestants';
import { ManageRounds } from '../components/arena/ManageRounds';
import { ManageSettings } from '../components/arena/ManageSettings';
import { SaveTemplateModal } from '../components/arena/SaveTemplateModal';
import { exportCompetition } from '../io';
import { buildPublishedPayload } from '../domain/publishedArena';
import { publishArena } from '../api/publish';

export default function Arena() {
    const { id } = useParams();
    const { loadArena, unloadArena, activeCompetition, updateCompetition, toggleLock } = useStore();
    const [showContestants, setShowContestants] = useState(false);
    const [showRounds, setShowRounds] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);
    const [showTip, setShowTip] = useState(() => !localStorage.getItem('arenaTipsSeen'));

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleStr, setTitleStr] = useState('');
    const [panelOpen, setPanelOpen] = useState(true);

    const [isCompact, setIsCompact] = useState(() => localStorage.getItem('rm_compact_mode') === 'true');
    const [viewMode, setViewMode] = useState<'grid' | 'gallery'>('grid');

    // Phase 4: Reveal Mode
    const [revealMode, setRevealMode] = useState<'live' | 'reveal'>('live');
    const [isRevealed, setIsRevealed] = useState(false);

    const locked = activeCompetition?.locked ?? false;

    // Phase 5: Publish
    const contestants = useStore(s => s.contestants);
    const rounds = useStore(s => s.rounds);
    const entriesById = useStore(s => s.entriesById);
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishError, setPublishError] = useState<string | null>(null);

    const publishedSlug = activeCompetition?.publishedSlug ?? null;
    const publicUrl = publishedSlug ? `${window.location.origin}/p/${publishedSlug}` : null;

    const handlePublish = useCallback(async () => {
        if (!activeCompetition || isPublishing) return;
        setIsPublishing(true);
        setPublishError(null);
        try {
            const entries = Object.values(entriesById);
            const payload = buildPublishedPayload(activeCompetition, contestants, rounds, entries);
            const slug = crypto.randomUUID().slice(0, 8);
            await publishArena(payload, slug);
            await updateCompetition(activeCompetition.id, { publishedSlug: slug, publishedAt: Date.now() });
        } catch (err) {
            setPublishError(err instanceof Error ? err.message : 'Publish failed');
        } finally {
            setIsPublishing(false);
        }
    }, [activeCompetition, contestants, rounds, entriesById, isPublishing, updateCompetition]);

    const handleReveal = useCallback(() => {
        setIsRevealed(true);
    }, []);

    const handleRevealModeChange = useCallback((mode: 'live' | 'reveal') => {
        setRevealMode(mode);
        if (mode === 'reveal') {
            setIsRevealed(false);
        }
    }, []);

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
            {/* Top Bar - Two Row Redesign */}
            <header style={{
                display: 'flex',
                flexDirection: 'column',
                background: '#111111',
                borderBottom: '1px solid rgba(255,255,255,0.06)'
            }}>
                {/* Row 1: Arena Identity */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)'
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
                                style={{ margin: 0, fontSize: '1.2rem', cursor: locked ? 'default' : 'pointer' }}
                                onClick={() => {
                                    if (locked) return;
                                    setTitleStr(activeCompetition.title);
                                    setIsEditingTitle(true);
                                }}
                                title={locked ? 'Arena is locked' : 'Click to rename'}
                            >
                                {activeCompetition.title}
                            </h1>
                        )}

                        <span
                            className="chip"
                            onClick={() => { if (!locked) setShowSettings(true); }}
                            title={locked ? 'Arena is locked' : 'Configure Scoring'}
                            style={{
                                fontFamily: 'monospace',
                                border: '1px solid var(--border)',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-card)',
                                fontSize: '12px',
                                cursor: locked ? 'default' : 'pointer',
                                opacity: locked ? 0.5 : 1,
                            }}
                        >
                            Score: {activeCompetition.scoreMin} - {activeCompetition.scoreMax}{activeCompetition.scoreUnit ? ` ${activeCompetition.scoreUnit}` : ''}
                        </span>
                    </div>
                    {/* Back to Landing */}
                    <button className="btn" onClick={() => window.location.href = '/'} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: '13px', padding: 0 }}>
                        ← Back to Landing
                    </button>
                </div>

                {/* Row 2: Controls Bar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 24px'
                }}>
                    {/* LEFT GROUP: View Toggles */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {/* Pill-shaped View Mode Toggle */}
                        <div style={{ display: 'flex', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)' }}>
                            <button
                                className="btn"
                                onClick={() => setViewMode('grid')}
                                style={{
                                    borderRadius: 0, border: 'none',
                                    background: viewMode === 'grid' ? 'var(--accent)' : 'transparent',
                                    color: viewMode === 'grid' ? '#fff' : 'var(--text)',
                                    fontWeight: viewMode === 'grid' ? 600 : 400,
                                    padding: '4px 16px', fontSize: '12px',
                                }}
                            >Grid</button>
                            <button
                                className="btn"
                                onClick={() => setViewMode('gallery')}
                                style={{
                                    borderRadius: 0, border: 'none', borderLeft: '1px solid rgba(255,255,255,0.15)',
                                    background: viewMode === 'gallery' ? 'var(--accent)' : 'transparent',
                                    color: viewMode === 'gallery' ? '#fff' : 'var(--text)',
                                    fontWeight: viewMode === 'gallery' ? 600 : 400,
                                    padding: '4px 16px', fontSize: '12px',
                                }}
                            >Gallery</button>
                        </div>

                        {/* Pill-shaped Reveal Mode Toggle */}
                        <div style={{ display: 'flex', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)' }}>
                            <button
                                className="btn"
                                onClick={() => handleRevealModeChange('live')}
                                style={{
                                    borderRadius: 0, border: 'none',
                                    background: revealMode === 'live' ? 'var(--accent)' : 'transparent',
                                    color: revealMode === 'live' ? '#fff' : 'var(--text)',
                                    fontWeight: revealMode === 'live' ? 600 : 400,
                                    padding: '4px 16px', fontSize: '12px',
                                }}
                            >Live</button>
                            <button
                                className="btn"
                                onClick={() => handleRevealModeChange('reveal')}
                                style={{
                                    borderRadius: 0, border: 'none', borderLeft: '1px solid rgba(255,255,255,0.15)',
                                    background: revealMode === 'reveal' ? 'var(--accent)' : 'transparent',
                                    color: revealMode === 'reveal' ? '#fff' : 'var(--text)',
                                    fontWeight: revealMode === 'reveal' ? 600 : 400,
                                    padding: '4px 16px', fontSize: '12px',
                                }}
                            >Reveal</button>
                        </div>

                        {/* Layout Icon Button */}
                        <button
                            className="btn"
                            onClick={() => {
                                const next = !isCompact;
                                setIsCompact(next);
                                localStorage.setItem('rm_compact_mode', String(next));
                            }}
                            title="Toggle Compact Columns"
                            style={{ padding: '0 8px', display: 'flex', alignItems: 'center', height: '26px', background: 'transparent', border: 'none', fontSize: '16px', color: 'var(--muted)' }}
                        >
                            🗜️
                        </button>
                    </div>

                    {/* RIGHT GROUP: Actions */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button className="btn" onClick={() => setShowSaveTemplate(true)} style={{ background: 'transparent', border: 'none', fontSize: '12px', fontWeight: 500, padding: 0 }}>Save as Template</button>
                        <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.1)' }} />
                        <button
                            className="btn"
                            onClick={() => setShowContestants(true)}
                            disabled={locked}
                            title={locked ? 'Arena is locked' : undefined}
                            style={{ opacity: locked ? 0.5 : 1, background: 'transparent', border: 'none', fontSize: '12px', fontWeight: 500, padding: 0 }}
                        >Manage Contestants</button>
                        <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.1)' }} />
                        <button
                            className="btn"
                            onClick={() => setShowRounds(true)}
                            disabled={locked}
                            title={locked ? 'Arena is locked' : undefined}
                            style={{ opacity: locked ? 0.5 : 1, background: 'transparent', border: 'none', fontSize: '12px', fontWeight: 500, padding: 0 }}
                        >Manage Rounds</button>
                        <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.1)' }} />
                        <button className="btn" onClick={async () => {
                            if (confirm("Images are not included in JSON export. They remain local-only. Continue?")) {
                                await exportCompetition(activeCompetition.id);
                            }
                        }} style={{ background: 'transparent', border: 'none', fontSize: '12px', fontWeight: 500, padding: 0 }}>Export JSON</button>
                        
                        <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.1)' }} />

                        {/* Lock/Unlock Button */}
                        <button
                            className={locked ? 'btnPrimary' : 'btn'}
                            onClick={() => toggleLock()}
                            title={locked ? 'Unlock Arena' : 'Lock Arena'}
                            style={{ fontSize: '12px', fontWeight: 500, padding: 0, background: 'transparent', border: 'none', color: locked ? 'var(--accent)' : 'var(--text)' }}
                        >
                            {locked ? '🔓 Unlock' : '🔒 Lock Arena'}
                        </button>

                        <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.1)' }} />

                        {/* Phase 5: Publish */}
                        {publishedSlug ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ background: 'var(--accent)', color: '#fff', fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase' }}>Published</span>
                                <button
                                    className="btn"
                                    onClick={() => {
                                        if (publicUrl) {
                                            navigator.clipboard.writeText(publicUrl);
                                        }
                                    }}
                                    title={publicUrl ?? ''}
                                    style={{ fontSize: '12px', fontWeight: 500, background: 'transparent', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                    Copy Link
                                </button>
                            </div>
                        ) : (
                            <button
                                className="btn"
                                onClick={handlePublish}
                                disabled={isPublishing}
                                style={{ fontSize: '12px', fontWeight: 500, background: 'transparent', border: 'none', padding: 0, opacity: isPublishing ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                {isPublishing ? 'Publishing…' : 'Publish'}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Publish error */}
            {publishError && (
                <div style={{ padding: '8px 24px', background: 'rgba(220, 53, 69, 0.15)', borderBottom: '1px solid var(--danger)', color: 'var(--danger)', textAlign: 'center', fontSize: '13px' }}>
                    ⚠ {publishError}
                </div>
            )}

            {/* Locked Banner */}
            {locked && (
                <div className="locked-banner">
                    🏁 Battle Completed — Scores are locked
                </div>
            )}

            {/* Modals */}
            {showSaveTemplate && <SaveTemplateModal onClose={() => setShowSaveTemplate(false)} />}
            {showContestants && !locked && <ManageContestants onClose={() => setShowContestants(false)} />}
            {showRounds && !locked && <ManageRounds onClose={() => setShowRounds(false)} />}
            {showSettings && !locked && <ManageSettings onClose={() => setShowSettings(false)} />}

            {/* Main Layout */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'hidden', gap: '24px' }}>
                {showTip && (
                    <div style={{ padding: '12px 16px', background: 'var(--accent)', color: '#000', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span><strong>Tip:</strong> Use arrow keys to navigate. Drag row/column headers to reorder.</span>
                        <button onClick={dismissTip} style={{ padding: '4px 12px', background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#000', fontWeight: 'bold' }}>Got it</button>
                    </div>
                )}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                    {viewMode === 'grid' ? (
                        <>
                            {/* Toggle Panel Button */}
                            <button
                                onClick={() => setPanelOpen(v => !v)}
                                title={panelOpen ? "Close panel" : "Open panel"}
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: '4px',
                                    zIndex: 60,
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: '#161616',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    pointerEvents: 'auto',
                                    color: panelOpen ? 'var(--accent)' : 'var(--muted)',
                                    padding: '4px'
                                }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="9" y1="3" x2="9" y2="21"></line>
                                </svg>
                            </button>
                            
                            {/* Drawer Panel Wrapper */}
                            <div 
                                className="side-panel-wrapper"
                                style={{
                                    width: panelOpen ? '352px' : '0px',
                                    minWidth: panelOpen ? '352px' : '0px',
                                    marginRight: panelOpen ? '24px' : '0px',
                                    overflow: 'hidden',
                                    transition: 'width 250ms ease, min-width 250ms ease, margin-right 250ms ease',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: '100%',
                                    flexShrink: 0
                                }}
                            >
                                {/* Fixed Width Inner Content ensures no squashing during slide */}
                                <div style={{
                                    width: '352px',
                                    minWidth: '352px',
                                    paddingLeft: '32px', // space for absolute toggle button
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '16px',
                                    overflowY: 'auto',
                                    height: '100%',
                                    paddingBottom: '24px'
                                }}>
                                    <ArenaSummary />
                                    <Leaderboard
                                        revealMode={revealMode}
                                        isRevealed={isRevealed}
                                        onReveal={handleReveal}
                                    />
                                </div>
                            </div>
                            
                            {/* Score Table Container */}
                            <div 
                                className="arena-content" 
                                style={{ 
                                    flex: 1, 
                                    height: '100%',
                                    display: 'flex',
                                    overflow: 'hidden',
                                    marginLeft: panelOpen ? '0px' : '32px',
                                    transition: 'margin-left 250ms ease'
                                }}
                            >
                                <ScoreTable isCompact={isCompact} locked={locked} />
                            </div>
                        </>
                    ) : (
                        <GalleryView onNavigateToCell={handleGalleryNavigate} />
                    )}
                </div>
            </main>
        </div>
    );
}
