import { memo, useMemo, useCallback, useRef } from 'react';
import { useStore } from '../../state/store';
import { computeLeaderboard, type RankingMode } from '../../domain';
import { useState } from 'react';

interface LeaderboardProps {
    revealMode: 'live' | 'reveal';
    isRevealed: boolean;
    onReveal: () => void;
}

export const Leaderboard = memo(function Leaderboard({ revealMode, isRevealed, onReveal }: LeaderboardProps) {
    const contestants = useStore(s => s.contestants);
    const entriesById = useStore(s => s.entriesById);
    const rounds = useStore(s => s.rounds);
    const activeCompetition = useStore(s => s.activeCompetition);
    const [rankingMode, setRankingMode] = useState<RankingMode>('total');
    const [prevIsWeighted, setPrevIsWeighted] = useState(activeCompetition?.isWeighted);

    if (activeCompetition?.isWeighted !== prevIsWeighted) {
        setPrevIsWeighted(activeCompetition?.isWeighted);
        if (activeCompetition?.isWeighted) {
            if (rankingMode === 'total') setRankingMode('weighted-total');
            if (rankingMode === 'average') setRankingMode('weighted-average');
        } else {
            if (rankingMode === 'weighted-total') setRankingMode('total');
            if (rankingMode === 'weighted-average') setRankingMode('average');
        }
    }

    const derivedEntries = useMemo(() => Object.values(entriesById), [entriesById]);

    const sortedRows = useMemo(() => {
        return computeLeaderboard(contestants, derivedEntries, rounds, rankingMode);
    }, [contestants, derivedEntries, rounds, rankingMode]);

    // Unsorted: maintain contestant panel order
    const unsortedRows = useMemo(() => {
        return computeLeaderboard(contestants, derivedEntries, rounds, rankingMode)
            .sort((a, b) => {
                const aIdx = contestants.findIndex(c => c.id === a.contestant.id);
                const bIdx = contestants.findIndex(c => c.id === b.contestant.id);
                return aIdx - bIdx;
            });
    }, [contestants, derivedEntries, rounds, rankingMode]);

    const isLive = revealMode === 'live';
    const showSorted = isLive || isRevealed;
    const displayRows = showSorted ? sortedRows : unsortedRows;

    // Refs for FLIP animation
    const rowRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
    const flipDone = useRef(false);

    const setRowRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
        rowRefs.current.set(id, el);
    }, []);

    // Capture positions before reveal to drive FLIP from onReveal click handler
    const capturedPositions = useRef<Map<string, number>>(new Map());

    const handleRevealClick = useCallback(() => {
        // Capture current positions BEFORE ordering changes
        const positions = new Map<string, number>();
        rowRefs.current.forEach((el, id) => {
            if (el) positions.set(id, el.getBoundingClientRect().top);
        });
        capturedPositions.current = positions;
        flipDone.current = false;

        // Trigger parent state change (this will cause re-render with sorted order)
        onReveal();

        // After next paint, apply FLIP
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                rowRefs.current.forEach((el, id) => {
                    if (!el) return;
                    const oldTop = capturedPositions.current.get(id);
                    if (oldTop === undefined) return;
                    const newTop = el.getBoundingClientRect().top;
                    const delta = oldTop - newTop;
                    if (delta === 0) return;

                    // First: set transform to old position (no transition)
                    el.style.transition = 'none';
                    el.style.transform = `translateY(${delta}px)`;

                    // Force reflow
                    el.getBoundingClientRect();

                    // Last: animate to new position
                    el.style.transition = 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
                    el.style.transform = '';
                });
                flipDone.current = true;
            });
        });
    }, [onReveal]);

    // Winner glow: first sorted row
    const winnerId = sortedRows.length > 0 ? sortedRows[0].contestant.id : null;

    return (
        <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', paddingRight: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Leaderboard</h2>
                <select
                    className="input"
                    value={rankingMode}
                    onChange={(e) => setRankingMode(e.target.value as RankingMode)}
                    style={{ padding: '4px 8px', fontSize: '13px', width: 'auto' }}
                >
                    <option value="total">Total Score</option>
                    <option value="average">Average Score</option>
                    {activeCompetition?.isWeighted && <option value="weighted-total">Weighted Total</option>}
                    {activeCompetition?.isWeighted && <option value="weighted-average">Weighted Average</option>}
                </select>
            </div>

            {/* Reveal mode: hidden overlay */}
            {revealMode === 'reveal' && !isRevealed && (
                <div style={{
                    padding: '16px',
                    textAlign: 'center',
                    background: 'var(--panel)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    marginBottom: '8px'
                }}>
                    <div style={{ color: 'var(--muted)', marginBottom: '12px', fontSize: '14px', letterSpacing: '0.5px' }}>
                        🔒 Results Hidden
                    </div>
                    <button
                        className="btnPrimary"
                        onClick={handleRevealClick}
                        style={{ padding: '8px 24px' }}
                    >
                        ⚡ Reveal Results
                    </button>
                </div>
            )}

            {displayRows.map((row, idx) => {
                const id = row.contestant.id;
                const rank = showSorted ? idx + 1 : '?';
                const isWinner = showSorted && isRevealed && id === winnerId && revealMode === 'reveal';
                const isLiveWinner = isLive && idx === 0 && sortedRows.length > 0;

                return (
                    <div
                        key={id}
                        ref={setRowRef(id)}
                        className={`card ${(isWinner || isLiveWinner) ? 'winner-glow' : ''}`}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '12px 16px',
                            marginBottom: '8px',
                        }}
                    >
                        <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'var(--border)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: '12px',
                            fontWeight: 'bold'
                        }}>
                            {rank}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold' }}>{row.contestant.name}</div>
                            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{row.progressText}</div>
                        </div>
                        <div style={{
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            color: 'var(--accent)',
                            ...((!isLive && !isRevealed) ? { filter: 'blur(8px)', userSelect: 'none' as const } : {})
                        }}>
                            {row.displayScore}
                        </div>
                    </div>
                );
            })}
        </div>
    );
});
