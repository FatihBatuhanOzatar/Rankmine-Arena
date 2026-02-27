import { useState } from 'react';
import { useStore } from '../../state/store';

export function SaveTemplateModal({ onClose }: { onClose: () => void }) {
    const { activeCompetition, addTemplateFromCompetition } = useStore();
    const [name, setName] = useState(activeCompetition?.title || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        setIsSaving(true);
        await addTemplateFromCompetition(trimmed);
        setIsSaving(false);
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
                style={{ width: '400px', maxWidth: '90vw', display: 'flex', flexDirection: 'column' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Save as Template</h2>
                    <button className="btn" onClick={onClose} style={{ padding: '4px 8px' }}>✕</button>
                </div>

                <div className="divider" style={{ margin: '0 0 16px 0' }} />

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>Template Name</label>
                        <input
                            autoFocus
                            className="input"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            style={{ width: '100%' }}
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button type="button" className="btn" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btnPrimary" disabled={!name.trim() || isSaving}>
                            {isSaving ? 'Saving...' : 'Save Template'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
