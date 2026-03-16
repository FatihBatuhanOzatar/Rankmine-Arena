import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPublishedArena } from '../api/publish';
import type { PublishedArenaPayload } from '../domain/publishedArena';
import { computeLeaderboard } from '../domain/leaderboard';
import { computeRoundWinners, computeArenaSummary } from '../domain/battleStats';
import type { Contestant, Round, Entry } from '../domain/models';

type Status = 'loading' | 'ready' | 'not-found' | 'error';

export default function PublicArena() {
    const { slug } = useParams<{ slug: string }>();
    const [status, setStatus] = useState<Status>(() => slug ? 'loading' : 'not-found');
    const [payload, setPayload] = useState<PublishedArenaPayload | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (!slug) return;

        let cancelled = false;
        (async () => {
            try {
                const row = await fetchPublishedArena(slug);
                if (cancelled) return;
                if (!row) { setStatus('not-found'); return; }
                setPayload(row.payload);
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
            // Restore default on unmount
            document.documentElement.setAttribute('data-theme', 'neoArcade');
        };
    }, [payload]);

    if (status === 'loading') return <PublicShell><LoadingView /></PublicShell>;
    if (status === 'not-found') return <PublicShell><NotFoundView /></PublicShell>;
    if (status === 'error') return <PublicShell><ErrorView message={errorMsg} /></PublicShell>;
    if (!payload) return null;

    return (
        <PublicShell>
            <PublicArenaContent payload={payload} />
        </PublicShell>
    );
}

// ── Shell ────────────────────────────────────────────────────────────

function PublicShell({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
            <header className="public-arena-header">
                <span className="public-arena-brand">⚔ Rankmine Arena</span>
                <span className="public-arena-badge">Public View</span>
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

function PublicArenaContent({ payload }: { payload: PublishedArenaPayload }) {
    const { competition, contestants, rounds, entries } = payload;

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

    const domainEntries: Entry[] = useMemo(() =>
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

    const entriesById = useMemo(() => {
        const map: Record<string, Entry> = {};
        for (const e of domainEntries) map[e.id] = e;
        return map;
    }, [domainEntries]);

    const makeId = (compId: string, roundId: string, contestantId: string) =>
        `${compId}::${roundId}::${contestantId}`;

    const leaderboardRows = useMemo(
        () => computeLeaderboard(domainContestants, domainEntries, domainRounds, 'total'),
        [domainContestants, domainEntries, domainRounds]
    );

    const roundWinners = useMemo(
        () => computeRoundWinners(domainRounds, domainContestants, entriesById, makeId, payload.sourceCompetitionId),
        [domainRounds, domainContestants, entriesById, payload.sourceCompetitionId]
    );

    const summary = useMemo(
        () => computeArenaSummary(domainContestants, domainEntries, domainRounds, roundWinners, competition.isWeighted),
        [domainContestants, domainEntries, domainRounds, roundWinners, competition.isWeighted]
    );

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
            {/* Title */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ margin: 0, fontSize: '1.6rem' }}>{competition.title}</h1>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <span className="chip">
                        Score: {competition.scoreMin} – {competition.scoreMax}
                        {competition.scoreUnit ? ` ${competition.scoreUnit}` : ''}
                    </span>
                    <span className="chip">{competition.scoringMode}</span>
                    {competition.isWeighted && <span className="chip">Weighted</span>}
                    {competition.locked && <span className="chip">🏁 Locked</span>}
                </div>
            </div>

            {/* Layout: sidebar + score table */}
            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* Sidebar: Summary + Leaderboard */}
                <div style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Summary */}
                    <PublicSummary summary={summary} isWeighted={competition.isWeighted} />
                    {/* Leaderboard */}
                    <PublicLeaderboard rows={leaderboardRows} />
                </div>

                {/* Score Table */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <PublicScoreTable
                        rounds={rounds}
                        contestants={contestants}
                        entries={entries}
                        roundWinners={roundWinners}
                        scoringMode={competition.scoringMode}
                        scoreMin={competition.scoreMin}
                        scoreMax={competition.scoreMax}
                        isWeighted={competition.isWeighted}
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="public-arena-footer">
                Published {new Date(payload.publishedAt).toLocaleString()}
            </div>
        </div>
    );
}

// ── Public Leaderboard ───────────────────────────────────────────────

import type { LeaderboardRow } from '../domain/leaderboard';

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

import type { ArenaSummary as ArenaSummaryType } from '../domain/battleStats';

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
    entries: PublishedArenaPayload['entries'];
    roundWinners: Map<string, string[]>;
    scoringMode: string;
    scoreMin: number;
    scoreMax: number;
    isWeighted: boolean;
}

function PublicScoreTable({ rounds, contestants, entries, roundWinners, scoringMode, scoreMin, scoreMax, isWeighted }: PublicScoreTableProps) {
    // Build a lookup: `${roundId}::${contestantId}` → score
    const scoreLookup = useMemo(() => {
        const map = new Map<string, number | undefined>();
        for (const e of entries) {
            map.set(`${e.roundId}::${e.contestantId}`, e.score);
        }
        return map;
    }, [entries]);

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

        return <span style={{ fontWeight: 600 }}>{score}</span>;
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
                                        <span style={{ marginLeft: '8px', color: 'var(--muted)', fontSize: '11px' }}>
                                            ×{r.weight.toFixed(1)}
                                        </span>
                                    )}
                                </td>
                                {contestants.map(c => {
                                    const score = scoreLookup.get(`${r.id}::${c.id}`);
                                    const isWinner = winners.includes(c.id);
                                    return (
                                        <td
                                            key={c.id}
                                            className={isWinner ? 'round-winner-cell' : ''}
                                            style={{
                                                textAlign: 'center',
                                                padding: '10px 8px',
                                                border: '1px solid var(--border)',
                                            }}
                                        >
                                            {renderScore(score)}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                    {rounds.length === 0 && (
                        <tr>
                            <td colSpan={contestants.length + 1} style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>
                                No rounds.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
