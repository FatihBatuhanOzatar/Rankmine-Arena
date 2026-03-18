import { useState, useMemo, useCallback, useRef } from 'react';
import type { PublishedArenaPayload } from '../domain/publishedArena';
import { validateSubmissionPayload } from '../domain/submissions';
import type { JurySubmissionPayload } from '../domain/submissions';

interface PublicJuryFormProps {
    payload: PublishedArenaPayload;
    onSubmit: (juryName: string, submission: JurySubmissionPayload) => Promise<void>;
    onCancel: () => void;
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export default function PublicJuryForm({ payload, onSubmit, onCancel }: PublicJuryFormProps) {
    const { competition, contestants, rounds } = payload;

    const [juryName, setJuryName] = useState('');
    const [scores, setScores] = useState<Map<string, number | undefined>>(() => {
        const map = new Map<string, number | undefined>();
        for (const r of rounds) {
            for (const c of contestants) {
                map.set(`${r.id}::${c.id}`, undefined);
            }
        }
        return map;
    });
    const [submitState, setSubmitState] = useState<SubmitState>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const updateScore = useCallback((roundId: string, contestantId: string, value: number | undefined) => {
        setScores(prev => {
            const next = new Map(prev);
            next.set(`${roundId}::${contestantId}`, value);
            return next;
        });
    }, []);

    const filledCount = useMemo(() => {
        let count = 0;
        for (const v of scores.values()) {
            if (v !== undefined) count++;
        }
        return count;
    }, [scores]);

    const totalCells = rounds.length * contestants.length;
    const allFilled = filledCount === totalCells;

    const assetLookup = useMemo(() => {
        const map = new Map<string, string>();
        for (const e of payload.entries) {
            if (e.publicAssetUrl) {
                map.set(`${e.roundId}::${e.contestantId}`, e.publicAssetUrl);
            }
        }
        return map;
    }, [payload.entries]);

    const handleSubmit = useCallback(async () => {
        // Build payload
        const entries = Array.from(scores.entries()).map(([key, score]) => {
            const [roundId, contestantId] = key.split('::');
            return { roundId, contestantId, score: score! };
        });

        const submissionPayload: JurySubmissionPayload = { entries };

        // Validate
        const validation = validateSubmissionPayload(submissionPayload, payload);
        if (!validation.valid) {
            setErrorMsg(validation.error ?? 'Validation failed.');
            setSubmitState('error');
            return;
        }

        setSubmitState('submitting');
        setErrorMsg('');

        try {
            await onSubmit(juryName || 'Anonymous', submissionPayload);
            setSubmitState('success');
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Submission failed.');
            setSubmitState('error');
        }
    }, [scores, payload, juryName, onSubmit]);

    const handleNavigate = useCallback((currentRow: number, currentCol: number, rowDelta: number, colDelta: number) => {
        const nextRow = currentRow + rowDelta;
        const nextCol = currentCol + colDelta;

        if (nextRow < 0 || nextRow >= rounds.length) return;
        if (nextCol < 0 || nextCol >= contestants.length) return;

        const nextId = `jury-cell-${nextRow}-${nextCol}`;
        const elem = document.getElementById(nextId) as HTMLInputElement | null;

        if (elem) {
            elem.focus();
            setTimeout(() => elem.select(), 0);
        }
    }, [rounds.length, contestants.length]);

    if (submitState === 'success') {
        return (
            <div className="jury-success-panel">
                <div className="jury-success-icon">✅</div>
                <div className="jury-success-text">Scores submitted successfully!</div>
                <div className="jury-success-sub">Thank you for contributing as a jury member.</div>
                <button className="btn" onClick={onCancel} style={{ marginTop: '16px' }}>
                    Back to Results
                </button>
            </div>
        );
    }

    return (
        <div className="jury-form-container">
            {/* Header */}
            <div className="jury-form-header">
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.3rem' }}>🗳 Jury Scoring</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                        Score each contestant for every round. All cells must be filled.
                    </p>
                </div>
                <button className="btn" onClick={onCancel} disabled={submitState === 'submitting'}>
                    Cancel
                </button>
            </div>

            {/* Jury Name */}
            <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Your Name (optional)
                </label>
                <input
                    className="input"
                    type="text"
                    placeholder="Anonymous"
                    value={juryName}
                    onChange={e => setJuryName(e.target.value)}
                    maxLength={50}
                    disabled={submitState === 'submitting'}
                    style={{ width: '260px', maxWidth: '100%' }}
                />
            </div>

            {/* Scoring Grid */}
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
                        {rounds.map((r, rIdx) => (
                            <tr key={r.id}>
                                <td className="public-round-cell">
                                    {r.title}
                                    {competition.isWeighted && (
                                        <div style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '4px' }}>
                                            Weight: {r.weight.toFixed(1)}
                                        </div>
                                    )}
                                </td>
                                {contestants.map((c, cIdx) => {
                                    const assetUrl = assetLookup.get(`${r.id}::${c.id}`);
                                    return (
                                        <td key={c.id} className="public-score-cell" style={{ padding: '8px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
                                                {assetUrl && (
                                                    <div style={{ marginBottom: '8px', borderRadius: '4px', overflow: 'hidden', background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                        <img src={assetUrl} alt="Entry content" style={{ maxWidth: '100%', maxHeight: '120px', objectFit: 'contain' }} loading="lazy" />
                                                    </div>
                                                )}
                                                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                    <JuryCellInput
                                                        value={scores.get(`${r.id}::${c.id}`)}
                                                        onChange={v => updateScore(r.id, c.id, v)}
                                                        scoringMode={competition.scoringMode}
                                                        scoreMin={competition.scoreMin}
                                                        scoreMax={competition.scoreMax}
                                                        scoreStep={competition.scoreStep}
                                                        disabled={submitState === 'submitting'}
                                                        rowIdx={rIdx}
                                                        colIdx={cIdx}
                                                        onNavigate={(rd, cd) => handleNavigate(rIdx, cIdx, rd, cd)}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Progress + Submit */}
            <div className="jury-form-footer">
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    {filledCount} / {totalCells} cells scored
                </div>

                {submitState === 'error' && (
                    <div className="jury-error">{errorMsg}</div>
                )}

                <button
                    className="btnPrimary"
                    onClick={handleSubmit}
                    disabled={!allFilled || submitState === 'submitting'}
                    style={{ minWidth: '160px' }}
                >
                    {submitState === 'submitting' ? 'Submitting…' : 'Submit Scores'}
                </button>
            </div>
        </div>
    );
}

// ── Cell Input ───────────────────────────────────────────────────────

interface JuryCellInputProps {
    value: number | undefined;
    onChange: (v: number | undefined) => void;
    scoringMode: string;
    scoreMin: number;
    scoreMax: number;
    scoreStep: number;
    disabled: boolean;
    rowIdx: number;
    colIdx: number;
    onNavigate: (rowDelta: number, colDelta: number) => void;
}

function JuryCellInput({ value, onChange, scoringMode, scoreMin, scoreMax, scoreStep, disabled, rowIdx, colIdx, onNavigate }: JuryCellInputProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [draftValue, setDraftValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const val = value ?? '';

    const commit = useCallback(() => {
        if (!isEditing) return;
        setIsEditing(false);

        const trimmed = draftValue.trim();
        if (trimmed === '') {
            if (val !== '') onChange(undefined);
            return;
        }

        let parsed = parseFloat(trimmed);
        if (isNaN(parsed)) return;

        if (parsed > scoreMax) parsed = scoreMax;
        if (parsed < scoreMin) parsed = scoreMin;

        parsed = Math.round(parsed / scoreStep) * scoreStep;
        parsed = parseFloat(parsed.toFixed(5));

        if (parsed !== val) {
            onChange(parsed);
        }
    }, [isEditing, draftValue, val, scoreMax, scoreMin, scoreStep, onChange]);

    const handleFocus = () => {
        if (disabled) return;
        setIsEditing(true);
        setDraftValue(val !== '' ? String(val) : '');
    };

    const handleBlur = () => {
        commit();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDraftValue(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setIsEditing(false);
            setDraftValue(val !== '' ? String(val) : ''); // Revert visually
            inputRef.current?.blur();
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            commit();
            inputRef.current?.blur();
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            commit();
            onNavigate(-1, 0);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            commit();
            onNavigate(1, 0);
        } else if (e.key === 'ArrowLeft') {
            if (inputRef.current && inputRef.current.selectionStart === 0) {
                e.preventDefault();
                commit();
                onNavigate(0, -1);
            }
        } else if (e.key === 'ArrowRight') {
            const len = (isEditing ? draftValue : String(val)).length;
            if (inputRef.current && inputRef.current.selectionStart === len) {
                e.preventDefault();
                commit();
                onNavigate(0, 1);
            }
        }
    };

    const handleSliderPointerDown = () => {
        if (disabled) return;
        setIsEditing(true);
        setDraftValue(val !== '' ? String(val) : String(scoreMin));
    };

    if (scoringMode === 'slider') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>
                    {isEditing ? draftValue : (val === '' ? '-' : val)}
                </span>
                <input
                    ref={inputRef}
                    id={`jury-cell-${rowIdx}-${colIdx}`}
                    type="range"
                    min={scoreMin}
                    max={scoreMax}
                    step={scoreStep}
                    value={isEditing ? draftValue : (val === '' ? scoreMin : val)}
                    onChange={handleChange}
                    onPointerDown={handleSliderPointerDown}
                    onPointerUp={() => commit()}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    style={{ width: '80px', cursor: disabled ? 'default' : 'pointer' }}
                />
            </div>
        );
    }

    if (scoringMode === 'stars') {
        const totalStars = Math.max(0, Math.ceil(scoreMax - scoreMin));
        return (
            <span
                style={{ display: 'inline-flex', gap: '2px', cursor: disabled ? 'default' : 'pointer' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ref={inputRef as any}
                id={`jury-cell-${rowIdx}-${colIdx}`}
                tabIndex={disabled ? -1 : 0}
                onKeyDown={handleKeyDown}
            >
                {Array.from({ length: totalStars }).map((_, i) => {
                    const starVal = scoreMin + i + 1;
                    const filled = value !== undefined && value >= starVal;
                    return (
                        <svg
                            key={i}
                            viewBox="0 0 24 24"
                            width="18"
                            height="18"
                            style={{
                                fill: filled ? '#FFC107' : 'transparent',
                                stroke: filled ? '#FFC107' : 'var(--muted)',
                                strokeWidth: '2px',
                                cursor: disabled ? 'default' : 'pointer',
                            }}
                            onClick={() => !disabled && onChange(starVal)}
                        >
                            <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
                        </svg>
                    );
                })}
            </span>
        );
    }

    // Default: numeric
    return (
        <input
            ref={inputRef}
            id={`jury-cell-${rowIdx}-${colIdx}`}
            className="input cell-input"
            type="text"
            inputMode="decimal"
            value={isEditing ? draftValue : val}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="-"
            style={{
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                border: 'none',
                borderRadius: 0,
                textAlign: 'center',
                background: 'transparent',
                fontSize: '16px',
            }}
        />
    );
}
