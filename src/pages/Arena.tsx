import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import { Leaderboard } from '../components/arena/Leaderboard';
import { ArenaSummary } from '../components/arena/ArenaSummary';
import { ScoreTable } from '../components/arena/ScoreTable';
import { GalleryView } from '../components/arena/GalleryView';
import { ManageContestants } from '../components/arena/ManageContestants';
import { ManageRounds } from '../components/arena/ManageRounds';
import { ManageSettings } from '../components/arena/ManageSettings';
import { SaveTemplateModal } from '../components/arena/SaveTemplateModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { exportCompetition } from '../io';
import { buildPublishedPayload } from '../domain/publishedArena';
import { publishArena, unpublishArena } from '../api/publish';
import { showToast } from '../components/Toast';

export default function Arena() {
    const { id } = useParams();
    const navigate = useNavigate();
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
    const [showAllImages, setShowAllImages] = useState(false);

    // Phase 4: Reveal Mode
    const [revealMode, setRevealMode] = useState<'live' | 'reveal'>('live');
    const [isRevealed, setIsRevealed] = useState(false);

    const locked = activeCompetition?.locked ?? false;

    // Phase 5: Publish
    const contestants = useStore(s => s.contestants);
    const rounds = useStore(s => s.rounds);
    const entriesById = useStore(s => s.entriesById);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isUnpublishing, setIsUnpublishing] = useState(false);
    const [publishError, setPublishError] = useState<string | null>(null);
    const [showExportConfirm, setShowExportConfirm] = useState(false);
    const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
    const [missingImagesDialogCount, setMissingImagesDialogCount] = useState(0);

    const publishedSlug = activeCompetition?.publishedSlug ?? null;
    const publicUrl = publishedSlug ? `${window.location.origin}/p/${publishedSlug}` : null;

    const handlePublish = useCallback(async () => {
        if (!activeCompetition || isPublishing) return;

        // Rate limit 60s
        const lastPublishStr = localStorage.getItem('rm_last_publish');
        if (lastPublishStr) {
            const lastTime = parseInt(lastPublishStr);
            if (Date.now() - lastTime < 60000) {
                 showToast('Please wait a minute before publishing another arena.', 'error');
                 return;
            }
            
            // Daily limit constraint optionally
            const dailyStr = localStorage.getItem('rm_daily_publishes');
            let daily = dailyStr ? JSON.parse(dailyStr) : { date: new Date().toLocaleDateString(), count: 0 };
            if (daily.date !== new Date().toLocaleDateString()) {
                daily = { date: new Date().toLocaleDateString(), count: 0 };
            }
            if (daily.count >= 5) {
                showToast('Daily publish limit reached (Max 5). Try again tomorrow.', 'error');
                return;
            }
        }
        setIsPublishing(true);
        setPublishError(null);
        try {
            const entries = Object.values(entriesById);
            const payload = buildPublishedPayload(activeCompetition, contestants, rounds, entries);
            const slug = crypto.randomUUID().slice(0, 8);
            const result = await publishArena(payload, slug);
            await updateCompetition(activeCompetition.id, { publishedSlug: slug, publishedAt: Date.now() });
            showToast('Arena published successfully!', 'success');
            
            // Record limit
            localStorage.setItem('rm_last_publish', Date.now().toString());
            const dailyStr = localStorage.getItem('rm_daily_publishes');
            let daily = dailyStr ? JSON.parse(dailyStr) : { date: new Date().toLocaleDateString(), count: 0 };
            if (daily.date !== new Date().toLocaleDateString()) daily = { date: new Date().toLocaleDateString(), count: 0 };
            daily.count++;
            localStorage.setItem('rm_daily_publishes', JSON.stringify(daily));

            if (result?.skippedAssets && result.skippedAssets > 0) {
                showToast(`${result.skippedAssets} image(s) could not be uploaded`, 'warning');
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Publish failed';
            setPublishError(msg);
            // Auto-dismiss after 8 seconds
            setTimeout(() => setPublishError(prev => prev === msg ? null : prev), 8000);
        } finally {
            setIsPublishing(false);
        }
    }, [activeCompetition, contestants, rounds, entriesById, isPublishing, updateCompetition]);

    const handleUnpublish = useCallback(async () => {
        if (!activeCompetition || !publishedSlug || isUnpublishing) return;
        setIsUnpublishing(true);
        try {
            await unpublishArena(publishedSlug);
            await updateCompetition(activeCompetition.id, { publishedSlug: undefined, publishedAt: undefined });
            showToast('Arena unpublished successfully.', 'success');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unpublish failed';
            setPublishError(msg);
            setTimeout(() => setPublishError(prev => prev === msg ? null : prev), 8000);
        } finally {
            setIsUnpublishing(false);
            setShowUnpublishConfirm(false);
        }
    }, [activeCompetition, publishedSlug, isUnpublishing, updateCompetition]);

    const handleExport = useCallback(async () => {
        if (!activeCompetition) return;
        setShowExportConfirm(false);
        try {
            await exportCompetition(activeCompetition.id);
            showToast('Export downloaded', 'success');
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Export failed', 'error');
        }
    }, [activeCompetition]);

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

    // Computed Quality Gate Check
    const publishGate = useMemo(() => {
        const res = { disabled: false, reason: '' };
        if (!activeCompetition) return { disabled: true, reason: 'Loading...' };

        if (!activeCompetition.title || activeCompetition.title.length < 5) return { disabled: true, reason: 'Title must be at least 5 characters' };
        if (/^(New Competition|Untitled Arena)( \d+)?$/.test(activeCompetition.title)) return { disabled: true, reason: 'Please give your arena a custom title' };
        if (contestants.length < 2) return { disabled: true, reason: 'At least 2 contestants required' };
        if (rounds.length < 1) return { disabled: true, reason: 'At least 1 round required' };
        
        let missingScore = 0;
        let missingImage = 0;
        for (const r of rounds) {
            for (const c of contestants) {
                const entry = entriesById[`${activeCompetition.id}::${r.id}::${c.id}`];
                if (!entry || entry.score === undefined) missingScore++;
                if (!entry || !entry.assetId) missingImage++;
            }
        }
        if (missingScore > 0) return { disabled: true, reason: `Missing scores in ${missingScore} cell(s)` };
        if (missingImage > 0) return { disabled: true, reason: `Missing images in ${missingImage} cell(s)` };
        
        return res;
    }, [activeCompetition, contestants, rounds, entriesById]);

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

    if (!id) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px', color: 'var(--muted)' }}>
            <div style={{ fontSize: '2.5rem' }}>🚫</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>No Arena Found</div>
            <div style={{ fontSize: '14px' }}>This arena does not exist or the link is invalid.</div>
            <button className="btn" onClick={() => navigate('/')}>← Back to Landing</button>
        </div>
    );
    if (!activeCompetition) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px' }}>
            <div style={{ fontSize: '2rem', animation: 'toast-slide-in 0.5s ease' }}>⏳</div>
            <div style={{ color: 'var(--muted)', fontSize: '14px' }}>Loading arena…</div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Top Bar */}
            {/* Top Bar - Two Row Redesign */}
            <header style={{
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--panel)',
                borderBottom: '1px solid var(--border)'
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
                    <button className="btn" onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: '13px', padding: 0 }}>
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

                        {/* Show All Images Toggle (only useful in grid) */}
                        {viewMode === 'grid' && (
                            <button
                                className="btn"
                                onClick={() => setShowAllImages(v => !v)}
                                title={showAllImages ? "Hide cell images" : "Show cell images"}
                                style={{ padding: '0 8px', display: 'flex', alignItems: 'center', height: '26px', background: showAllImages ? 'var(--accent)' : 'transparent', color: showAllImages ? '#fff' : 'var(--muted)', border: 'none', borderRadius: '4px', fontSize: '13px' }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                </svg>
                                {showAllImages ? 'Hide Images' : 'Show Images'}
                            </button>
                        )}

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
                        <button className="btn" onClick={() => setShowExportConfirm(true)} style={{ background: 'transparent', border: 'none', fontSize: '12px', fontWeight: 500, padding: 0 }}>Export JSON</button>
                        
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
                                            showToast('Link copied to clipboard!', 'success');
                                        }
                                    }}
                                    title={publicUrl ?? ''}
                                    style={{ fontSize: '12px', fontWeight: 500, background: 'transparent', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                    Copy Link
                                </button>
                                <button
                                    className="btn"
                                    onClick={() => setShowUnpublishConfirm(true)}
                                    disabled={isUnpublishing}
                                    title="Unpublish Arena"
                                    style={{ fontSize: '12px', fontWeight: 500, background: 'transparent', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: '4px', opacity: isUnpublishing ? 0.5 : 1 }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                                    {isUnpublishing ? 'Unpublishing...' : 'Unpublish'}
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {publishGate.disabled && (
                                    <span style={{ color: 'var(--danger)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                                        {publishGate.reason}
                                    </span>
                                )}
                                <button
                                    className="btn"
                                    onClick={handlePublish}
                                    disabled={isPublishing || publishGate.disabled}
                                    title={publishGate.reason || "Publish to Community"}
                                    style={{ 
                                        fontSize: '12px', fontWeight: 500, background: 'transparent', border: 'none', padding: 0, 
                                        opacity: (isPublishing || publishGate.disabled) ? 0.3 : 1, display: 'flex', alignItems: 'center', gap: '4px',
                                        cursor: publishGate.disabled ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                    {isPublishing ? 'Publishing…' : 'Publish'}
                                </button>
                            </div>
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
            <ConfirmDialog
                isOpen={showExportConfirm}
                title="Export Arena"
                body={<>Images are not included in JSON export. They remain local-only. Do you want to continue?</>}
                confirmLabel="Export"
                onConfirm={handleExport}
                onCancel={() => setShowExportConfirm(false)}
            />
            <ConfirmDialog
                isOpen={showUnpublishConfirm}
                title="Unpublish Arena"
                body={<>This will remove the arena from public discovery and invalidate the shared link. Your local workspace will remain intact.</>}
                confirmLabel="Unpublish"
                onConfirm={handleUnpublish}
                onCancel={() => setShowUnpublishConfirm(false)}
            />
            <ConfirmDialog
                isOpen={missingImagesDialogCount > 0}
                title="Missing Images"
                body={<>You cannot publish this arena yet. There {missingImagesDialogCount === 1 ? 'is' : 'are'} <strong>{missingImagesDialogCount}</strong> cell{missingImagesDialogCount !== 1 ? 's' : ''} missing an image.</>}
                confirmLabel="Got it"
                cancelLabel="Cancel"
                onConfirm={() => setMissingImagesDialogCount(0)}
                onCancel={() => setMissingImagesDialogCount(0)}
            />

            {/* Main Layout */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'hidden', gap: '24px' }}>
                {showTip && (
                    <div style={{ padding: '12px 16px', background: 'var(--accent)', color: 'var(--bg)', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span><strong>Tip:</strong> Use arrow keys to navigate. Drag row/column headers to reorder.</span>
                        <button onClick={dismissTip} style={{ padding: '4px 12px', background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'var(--bg)', fontWeight: 'bold' }}>Got it</button>
                    </div>
                )}
                {/* Empty Arena Onboarding */}
                {contestants.length === 0 && rounds.length === 0 && !locked && (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        padding: '48px 24px', gap: '16px', textAlign: 'center',
                        border: '1px dashed var(--border)', borderRadius: '8px', background: 'var(--panel)',
                    }}>
                        <div style={{ fontSize: '2.5rem' }}>⚔️</div>
                        <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Your arena is empty</h2>
                        <p style={{ margin: 0, color: 'var(--muted)', maxWidth: '400px', fontSize: '14px' }}>
                            Add contestants and rounds to start your battle. You can also load a template from the landing page.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            <button className="btnPrimary" onClick={() => setShowContestants(true)} style={{ padding: '10px 20px' }}>+ Add Contestants</button>
                            <button className="btn" onClick={() => setShowRounds(true)} style={{ padding: '10px 20px' }}>+ Add Rounds</button>
                        </div>
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
                                    background: 'var(--panel)',
                                    border: '1px solid var(--border)',
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
                                <ScoreTable isCompact={isCompact} locked={locked} showImages={showAllImages} />
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
