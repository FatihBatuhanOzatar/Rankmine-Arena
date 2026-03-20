import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import logoUrlDark from '../assets/rankminelogo.png';
import logoUrlLight from '../assets/rankminelogo_dark.png';
import { fetchPublishedArena } from '../api/publish';
import { fetchSubmissions, submitJuryScores } from '../api/submissions';
import type { PublishedArenaPayload } from '../domain/publishedArena';
import type { JurySubmissionPayload, JurySubmissionRow } from '../domain/submissions';
import { aggregateJuryEntries } from '../domain/aggregatePublicArena';
import { computeLeaderboard } from '../domain/leaderboard';
import { computeRoundWinners, computeArenaSummary } from '../domain/battleStats';
import type { Contestant, Round, Entry } from '../domain/models';
import type { LeaderboardRow } from '../domain/leaderboard';
import type { ArenaSummary as ArenaSummaryType } from '../domain/battleStats';
import PublicJuryForm from '../components/PublicJuryForm';

type Status = 'loading' | 'ready' | 'not-found' | 'error';
type ViewMode = 'observer' | 'jury';

const SUBMITTED_KEY = (slug: string) => `jury_submitted_${slug}`;

export default function PublicArena() {
    const { slug } = useParams<{ slug: string }>();
    const [status, setStatus] = useState<Status>(() => slug ? 'loading' : 'not-found');
    const [payload, setPayload] = useState<PublishedArenaPayload | null>(null);
    const [submissions, setSubmissions] = useState<JurySubmissionRow[]>([]);
    const [errorMsg, setErrorMsg] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('observer');
    const [alreadySubmitted, setAlreadySubmitted] = useState<boolean>(() => {
        if (!slug) return false;
        try {
            return !!(localStorage.getItem(SUBMITTED_KEY(slug)) || sessionStorage.getItem(SUBMITTED_KEY(slug)));
        } catch { return false; }
    });

    // ── Fetch published arena + submissions ──────────────────────────
    useEffect(() => {
        if (!slug) return;

        let cancelled = false;
        (async () => {
            try {
                const [row, subs] = await Promise.all([
                    fetchPublishedArena(slug),
                    fetchSubmissions(slug),
                ]);
                if (cancelled) return;
                if (!row) { setStatus('not-found'); return; }
                setPayload(row.payload);
                setSubmissions(subs);
                setStatus('ready');
            } catch (err) {
                if (cancelled) return;
                setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
                setStatus('error');
            }
        })();
        return () => { cancelled = true; };
    }, [slug]);

    // Apply theme from payload
    useEffect(() => {
        if (!payload) return;
        const theme = payload.competition.theme === 'light' ? 'light' : 'neoArcade';
        document.documentElement.setAttribute('data-theme', theme);
        return () => {
            document.documentElement.setAttribute('data-theme', 'neoArcade');
        };
    }, [payload]);

    // ── Jury submit handler ──────────────────────────────────────────
    const handleJurySubmit = useCallback(async (juryName: string, submission: JurySubmissionPayload) => {
        if (!slug || !payload) throw new Error('No arena loaded');

        await submitJuryScores(
            slug,
            juryName,
            submission,
            payload.contestants.length,
            payload.rounds.length
        );

        // Mark as submitted
        try {
            localStorage.setItem(SUBMITTED_KEY(slug), '1');
            sessionStorage.setItem(SUBMITTED_KEY(slug), '1');
        } catch { /* storage unavailable */ }
        setAlreadySubmitted(true);

        // Refetch submissions to update aggregate
        const subs = await fetchSubmissions(slug);
        setSubmissions(subs);
    }, [slug, payload]);

    if (status === 'loading') return <PublicShell><LoadingView /></PublicShell>;
    if (status === 'not-found') return <PublicShell><NotFoundView /></PublicShell>;
    if (status === 'error') return <PublicShell><ErrorView message={errorMsg} /></PublicShell>;
    if (!payload) return null;

    return (
        <PublicShell>
            {viewMode === 'jury' ? (
                <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
                    <PublicJuryForm
                        payload={payload}
                        onSubmit={handleJurySubmit}
                        onCancel={() => setViewMode('observer')}
                    />
                </div>
            ) : (
                <PublicArenaContent
                    payload={payload}
                    submissions={submissions}
                    onJuryClick={() => setViewMode('jury')}
                    alreadySubmitted={alreadySubmitted}
                />
            )}
        </PublicShell>
    );
}

// ── Shell ────────────────────────────────────────────────────────────

function PublicShell({ children }: { children: React.ReactNode }) {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
            <header className="app-header" style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0 24px',
                height: '48px',
                borderBottom: '1px solid var(--line)',
                background: 'var(--panel)',
                backdropFilter: 'blur(10px)',
                transition: 'height 0.2s ease'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', height: '100%' }}>
                    <Link to="/" className="logo-link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', overflow: 'hidden', textDecoration: 'none', color: 'inherit' }}>
                        <img 
                            src={isLight ? logoUrlLight : logoUrlDark} 
                            alt="Rankmine Logo" 
                            style={{ height: '162px', width: 'auto', transition: 'height 0.2s ease' }} 
                        />
                    </Link>
                    <span style={{
                        background: 'var(--accent)',
                        color: 'var(--bg)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>Public View</span>
                </div>
            </header>
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {children}
            </main>
        </div>
    );
}

// ── Status Views ─────────────────────────────────────────────────────

function LoadingView() {
    return (
        <div className="public-arena-status">
            <div className="public-arena-status-icon">⏳</div>
            <div className="public-arena-status-text">Loading arena…</div>
        </div>
    );
}

function NotFoundView() {
    return (
        <div className="public-arena-status">
            <div className="public-arena-status-icon">🚫</div>
            <div className="public-arena-status-text">Arena not found</div>
            <div className="public-arena-status-sub">This arena may have been removed or the link is invalid.</div>
        </div>
    );
}

function ErrorView({ message }: { message: string }) {
    return (
        <div className="public-arena-status">
            <div className="public-arena-status-icon">⚠️</div>
            <div className="public-arena-status-text">Something went wrong</div>
            <div className="public-arena-status-sub">{message}</div>
        </div>
    );
}

// ── Main Content ─────────────────────────────────────────────────────

interface PublicArenaContentProps {
    payload: PublishedArenaPayload;
    submissions: JurySubmissionRow[];
    onJuryClick: () => void;
    alreadySubmitted: boolean;
}

function PublicArenaContent({ payload, submissions, onJuryClick, alreadySubmitted }: PublicArenaContentProps) {
    const { competition, contestants, rounds, entries } = payload;
    const hasJurySubmissions = submissions.length > 0;

    // ── Which data source to show ────────────────────────────────────
    // Tabs: 'organizer' (published snapshot baseline) | 'jury' (aggregated jury scores)
    const [resultsTab, setResultsTab] = useState<'organizer' | 'jury'>(() =>
        hasJurySubmissions ? 'jury' : 'organizer'
    );

    const [prevSubLength, setPrevSubLength] = useState(submissions.length);
    if (submissions.length !== prevSubLength) {
        setPrevSubLength(submissions.length);
        if (prevSubLength === 0 && submissions.length > 0) {
            setResultsTab('jury');
        }
    }

    // Reconstruct domain-compatible objects for pure compute functions
    const domainContestants: Contestant[] = useMemo(() =>
        contestants.map(c => ({
            id: c.id,
            competitionId: payload.sourceCompetitionId,
            name: c.name,
            orderIndex: c.orderIndex,
            accentColor: c.accentColor,
            createdAt: 0,
        })),
        [contestants, payload.sourceCompetitionId]
    );

    const domainRounds: Round[] = useMemo(() =>
        rounds.map(r => ({
            id: r.id,
            competitionId: payload.sourceCompetitionId,
            title: r.title,
            orderIndex: r.orderIndex,
            weight: r.weight,
            createdAt: 0,
        })),
        [rounds, payload.sourceCompetitionId]
    );

    // Organizer entries (from published snapshot)
    const organizerEntries: Entry[] = useMemo(() =>
        entries.map(e => ({
            id: `${payload.sourceCompetitionId}::${e.roundId}::${e.contestantId}`,
            competitionId: payload.sourceCompetitionId,
            roundId: e.roundId,
            contestantId: e.contestantId,
            score: e.score,
            updatedAt: 0,
        })),
        [entries, payload.sourceCompetitionId]
    );

    // Jury aggregated entries
    const juryEntries: Entry[] = useMemo(() =>
        aggregateJuryEntries(submissions, payload),
        [submissions, payload]
    );

    const activeEntries = resultsTab === 'jury' && hasJurySubmissions ? juryEntries : organizerEntries;

    const activeEntriesById = useMemo(() => {
        const map: Record<string, Entry> = {};
        for (const e of activeEntries) map[e.id] = e;
        return map;
    }, [activeEntries]);

    const displayOrganizerEntries = useMemo(() =>
        organizerEntries.map(e => ({
            roundId: e.roundId,
            contestantId: e.contestantId,
            score: e.score,
        })),
        [organizerEntries]
    );

    const displayJuryEntries = useMemo(() =>
        juryEntries.map(e => ({
            roundId: e.roundId,
            contestantId: e.contestantId,
            score: e.score,
        })),
        [juryEntries]
    );

    const makeId = (compId: string, roundId: string, contestantId: string) =>
        `${compId}::${roundId}::${contestantId}`;

    const leaderboardRows = useMemo(
        () => computeLeaderboard(domainContestants, activeEntries, domainRounds, 'total'),
        [domainContestants, activeEntries, domainRounds]
    );

    const roundWinners = useMemo(
        () => computeRoundWinners(domainRounds, domainContestants, activeEntriesById, makeId, payload.sourceCompetitionId),
        [domainRounds, domainContestants, activeEntriesById, payload.sourceCompetitionId]
    );

    const summary = useMemo(
        () => computeArenaSummary(domainContestants, activeEntries, domainRounds, roundWinners, competition.isWeighted),
        [domainContestants, activeEntries, domainRounds, roundWinners, competition.isWeighted]
    );

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
            {/* Title */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ margin: 0, fontSize: '1.6rem' }}>{competition.title}</h1>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="chip">
                        Score: {competition.scoreMin} – {competition.scoreMax}
                        {competition.scoreUnit ? ` ${competition.scoreUnit}` : ''}
                    </span>
                    <span className="chip">{competition.scoringMode}</span>
                    {competition.isWeighted && <span className="chip">Weighted</span>}
                    {competition.locked && <span className="chip">🏁 Locked</span>}
                </div>
            </div>

            {/* Jury Action Bar */}
            <div className="jury-action-bar">
                {/* Data source tabs */}
                {hasJurySubmissions && (
                    <div className="jury-tabs">
                        <button
                            className={`jury-tab ${resultsTab === 'jury' ? 'jury-tab-active' : ''}`}
                            onClick={() => setResultsTab('jury')}
                        >
                            🗳 Jury Results ({submissions.length})
                        </button>
                        <button
                            className={`jury-tab ${resultsTab === 'organizer' ? 'jury-tab-active' : ''}`}
                            onClick={() => setResultsTab('organizer')}
                        >
                            📋 Organizer Baseline
                        </button>
                    </div>
                )}
                {!hasJurySubmissions && (
                    <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                        No jury submissions yet — showing organizer baseline
                    </div>
                )}

                {/* Jury CTA */}
                <div style={{ marginLeft: 'auto' }}>
                    {alreadySubmitted ? (
                        <span className="jury-submitted-badge">✓ You've submitted</span>
                    ) : (
                        <button className="btnPrimary" onClick={onJuryClick}>
                            🗳 Contribute as Jury
                        </button>
                    )}
                </div>
            </div>

            {/* Layout: sidebar + score table */}
            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* Sidebar: Summary + Leaderboard */}
                <div style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <PublicSummary summary={summary} isWeighted={competition.isWeighted} />
                    <PublicLeaderboard rows={leaderboardRows} />
                </div>

                {/* Score Table */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <PublicScoreTable
                        rounds={rounds}
                        contestants={contestants}
                        organizerEntries={displayOrganizerEntries}
                        juryEntries={displayJuryEntries}
                        payloadEntries={entries}
                        roundWinners={roundWinners}
                        scoringMode={competition.scoringMode}
                        scoreMin={competition.scoreMin}
                        scoreMax={competition.scoreMax}
                        isWeighted={competition.isWeighted}
                        hasJurySubmissions={hasJurySubmissions}
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="public-arena-footer">
                Published {new Date(payload.publishedAt).toLocaleString()}
                {hasJurySubmissions && resultsTab === 'jury' && (
                    <span style={{ marginLeft: '12px' }}>
                        • Jury aggregate from {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
                    </span>
                )}
            </div>
        </div>
    );
}

// ── Public Leaderboard ───────────────────────────────────────────────

function PublicLeaderboard({ rows }: { rows: LeaderboardRow[] }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Leaderboard</h2>
            {rows.map((row, idx) => {
                const isWinner = idx === 0 && row.displayScore > 0;
                return (
                    <div
                        key={row.contestant.id}
                        className={`card ${isWinner ? 'winner-glow' : ''}`}
                        style={{ display: 'flex', alignItems: 'center', padding: '12px 16px' }}
                    >
                        <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: 'var(--border)', display: 'flex',
                            justifyContent: 'center', alignItems: 'center',
                            marginRight: '12px', fontWeight: 'bold'
                        }}>
                            {idx + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold' }}>{row.contestant.name}</div>
                            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{row.progressText}</div>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                            {row.displayScore}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Public Summary ───────────────────────────────────────────────────

function PublicSummary({ summary, isWeighted }: { summary: ArenaSummaryType; isWeighted: boolean }) {
    if (!summary.overallWinner) {
        return (
            <div className="card arena-summary">
                <h3 style={{ margin: 0, fontSize: '0.9rem', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--muted)' }}>
                    ⚔ Battle Summary
                </h3>
                <div style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px', marginTop: '12px' }}>
                    No scores yet
                </div>
            </div>
        );
    }

    const scoreKey = isWeighted ? 'weightedTotal' : 'totalScore';

    return (
        <div className="card arena-summary">
            <h3 style={{ margin: 0, fontSize: '0.9rem', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--muted)' }}>
                ⚔ Battle Summary
            </h3>
            <div className="winner-glow" style={{ padding: '8px 12px', borderRadius: '8px', marginTop: '12px', marginBottom: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {summary.isTied ? 'Tied at Top' : 'Overall Winner'}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent-text)' }}>
                    🏆 {summary.overallWinner.contestantName}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    {summary.overallWinner[scoreKey]} pts
                </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                        <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 500 }}>Name</th>
                        <th style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 500 }}>Wins</th>
                        <th style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 500 }}>Avg</th>
                        <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 500 }}>
                            {isWeighted ? 'W. Total' : 'Total'}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {summary.contestantStats.map(cs => (
                        <tr key={cs.contestantId} style={{ borderBottom: '1px solid var(--border)', opacity: cs[scoreKey] > 0 || cs.averageScore > 0 ? 1 : 0.5 }}>
                            <td style={{ padding: '5px 6px', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cs.contestantName}</td>
                            <td style={{ padding: '5px 6px', textAlign: 'center' }}>{cs.roundsWon}</td>
                            <td style={{ padding: '5px 6px', textAlign: 'center' }}>{cs.averageScore}</td>
                            <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 600, color: 'var(--accent-text)' }}>{cs[scoreKey]}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ── Public Score Table (read-only) ───────────────────────────────────

interface PublicScoreTableProps {
    rounds: PublishedArenaPayload['rounds'];
    contestants: PublishedArenaPayload['contestants'];
    organizerEntries: { roundId: string; contestantId: string; score?: number }[];
    juryEntries: { roundId: string; contestantId: string; score?: number }[];
    payloadEntries: PublishedArenaPayload['entries'];
    roundWinners: Map<string, string[]>;
    scoringMode: string;
    scoreMin: number;
    scoreMax: number;
    isWeighted: boolean;
    hasJurySubmissions: boolean;
}

function PublicScoreTable({ rounds, contestants, organizerEntries, juryEntries, payloadEntries, roundWinners, scoringMode, scoreMin, scoreMax, isWeighted, hasJurySubmissions }: PublicScoreTableProps) {
    const organizerLookup = useMemo(() => {
        const map = new Map<string, number | undefined>();
        for (const e of organizerEntries) {
            map.set(`${e.roundId}::${e.contestantId}`, e.score);
        }
        return map;
    }, [organizerEntries]);

    const juryLookup = useMemo(() => {
        const map = new Map<string, number | undefined>();
        for (const e of juryEntries) {
            map.set(`${e.roundId}::${e.contestantId}`, e.score);
        }
        return map;
    }, [juryEntries]);

    const assetLookup = useMemo(() => {
        const map = new Map<string, string>();
        for (const e of payloadEntries) {
            if (e.publicAssetUrl) {
                map.set(`${e.roundId}::${e.contestantId}`, e.publicAssetUrl);
            }
        }
        return map;
    }, [payloadEntries]);

    const renderScore = (score: number | undefined) => {
        if (score === undefined) return <span style={{ color: 'var(--muted)' }}>–</span>;

        if (scoringMode === 'stars') {
            const totalStars = Math.max(0, Math.ceil(scoreMax - scoreMin));
            return (
                <span style={{ display: 'inline-flex', gap: '2px' }}>
                    {Array.from({ length: totalStars }).map((_, i) => {
                        const starVal = scoreMin + i + 1;
                        const filled = score >= starVal;
                        return (
                            <svg key={i} viewBox="0 0 24 24" width="14" height="14" style={{
                                fill: filled ? '#FFC107' : 'transparent',
                                stroke: filled ? '#FFC107' : 'var(--muted)',
                                strokeWidth: '2px',
                            }}>
                                <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
                            </svg>
                        );
                    })}
                </span>
            );
        }

        return <span style={{ fontWeight: 600, fontSize: '1.2rem' }}>{scoringMode === 'slider' ? score.toFixed(1) : score}</span>;
    };

    return (
        <div className="public-score-table-wrapper">
            <table className="public-score-table">
                <thead>
                    <tr>
                        <th className="public-col-round">Round / Prompt</th>
                        {contestants.map(c => (
                            <th key={c.id} className="public-col-contestant">{c.name}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rounds.map(r => {
                        const winners = roundWinners.get(r.id) ?? [];
                        return (
                            <tr key={r.id}>
                                <td className="public-round-cell">
                                    {r.title}
                                    {isWeighted && (
                                        <div style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '4px' }}>
                                            Weight: {r.weight.toFixed(1)}
                                        </div>
                                    )}
                                </td>
                                {contestants.map(c => {
                                    const orgScore = organizerLookup.get(`${r.id}::${c.id}`);
                                    const juryScore = juryLookup.get(`${r.id}::${c.id}`);
                                    const assetUrl = assetLookup.get(`${r.id}::${c.id}`);
                                    const isWinner = winners.includes(c.id);
                                    return (
                                        <td
                                            key={c.id}
                                            className={isWinner ? 'round-winner-cell public-score-cell' : 'public-score-cell'}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
                                                {assetUrl && (
                                                    <div style={{ marginBottom: '8px', borderRadius: '4px', overflow: 'hidden', background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                        <img src={assetUrl} alt="Entry content" style={{ maxWidth: '100%', maxHeight: '120px', objectFit: 'contain' }} loading="lazy" />
                                                    </div>
                                                )}
                                                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)', padding: '6px 8px', borderRadius: '4px' }}>
                                                        <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>Baseline</span>
                                                        {renderScore(orgScore)}
                                                    </div>
                                                    {hasJurySubmissions && (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--accent-alpha)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--accent)' }}>
                                                            <span style={{ fontSize: '11px', color: 'var(--accent)', textTransform: 'uppercase' }}>Community</span>
                                                            <div style={{ color: 'var(--accent)' }}>
                                                                {renderScore(juryScore)}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                    {rounds.length === 0 && (
                        <tr>
                            <td colSpan={contestants.length + 1} style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)' }}>
                                No rounds mapped for this arena.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
