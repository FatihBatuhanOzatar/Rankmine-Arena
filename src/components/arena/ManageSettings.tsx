import { useState } from 'react';
import { useStore } from '../../state/store';
import type { Competition } from '../../domain';

export function ManageSettings({ onClose }: { onClose: () => void }) {
    const { activeCompetition, updateCompetition } = useStore();

    const [minStr, setMinStr] = useState(String(activeCompetition?.scoreMin ?? 0));
    const [maxStr, setMaxStr] = useState(String(activeCompetition?.scoreMax ?? 10));
    const [stepStr, setStepStr] = useState(String(activeCompetition?.scoreStep ?? 1));
    const [unit, setUnit] = useState(activeCompetition?.scoreUnit || '');
    const [mode, setMode] = useState<Competition['scoringMode']>(activeCompetition?.scoringMode || 'numeric');

    if (!activeCompetition) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const scoreMin = parseFloat(minStr);
        const scoreMax = parseFloat(maxStr);
        const scoreStep = parseFloat(stepStr);

        if (isNaN(scoreMin) || isNaN(scoreMax) || isNaN(scoreStep)) {
            alert('Min, Max, and Step must be valid numbers.');
            return;
        }

        if (scoreMin >= scoreMax) {
            alert('Min score must be strictly less than Max score.');
            return;
        }

        if (scoreStep <= 0) {
            alert('Step must be strictly positive.');
            return;
        }

        if (mode === 'stars' && (scoreMax - scoreMin) / scoreStep > 10) {
            alert('Stars mode is only recommended for ranges with 10 or fewer steps. Please use slider or numeric.');
            // Just a warning, let's strictly enforce the user's requirement "Only valid if (scoreMax - scoreMin) <= 10"
            if (scoreMax - scoreMin > 10) {
                alert('Stars mode is only valid if (max - min) <= 10.');
                return;
            }
        }

        await updateCompetition(activeCompetition.id, {
            scoreMin,
            scoreMax,
            scoreStep,
            scoreUnit: unit.trim() || undefined,
            scoringMode: mode
        });

        onClose();
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}
        >
            <div
                className="card"
                onClick={e => e.stopPropagation()}
                style={{ width: '500px', maxWidth: '90vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ margin: 0 }}>Scoring Configuration</h2>
                    <button className="btn" onClick={onClose} style={{ padding: '4px 8px' }}>✕</button>
                </div>

                <div className="divider" style={{ margin: '0 0 16px 0' }} />

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>Min Score</label>
                            <input className="input" type="number" step="any" required value={minStr} onChange={e => setMinStr(e.target.value)} style={{ width: '100%' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>Max Score</label>
                            <input className="input" type="number" step="any" required value={maxStr} onChange={e => setMaxStr(e.target.value)} style={{ width: '100%' }} />
                        </div>
                        <div style={{ width: '80px' }}>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>Step</label>
                            <input className="input" type="number" step="any" required value={stepStr} onChange={e => setStepStr(e.target.value)} style={{ width: '100%' }} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>Unit Label (optional)</label>
                            <input className="input" type="text" placeholder="e.g. pts, %" value={unit} onChange={e => setUnit(e.target.value)} style={{ width: '100%' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>Input Mode</label>
                            <select className="input" value={mode} onChange={e => setMode(e.target.value as Competition['scoringMode'])} style={{ width: '100%', cursor: 'pointer', background: 'var(--bg)' }}>
                                <option value="numeric">Numeric Keypad</option>
                                <option value="slider">Range Slider</option>
                                <option value="stars">Star Rating</option>
                            </select>
                        </div>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                        Note: Changing these settings instantly updates the grid. Existing scores are preserved but will be clamped to the new bounds upon next edit.
                    </p>

                    <div className="divider" style={{ margin: '8px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button type="button" className="btn" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btnPrimary">Save Settings</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
