import { useState } from 'react';
import { useStore } from '../../state/store';

export function ManageRounds({ onClose }: { onClose: () => void }) {
    const { rounds, addRound, renameRound, removeRound } = useStore();
    const [newTitle, setNewTitle] = useState('');

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newTitle.trim();
        if (!trimmed) return;
        await addRound(trimmed);
        setNewTitle('');
    };

    const handleDelete = async (id: string, title: string) => {
        if (confirm(`Are you sure you want to delete round "${title}"?\n\nThis will permanently delete all scores and notes associated with this round.`)) {
            await removeRound(id);
        }
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
                    <h2 style={{ margin: 0 }}>Manage Rounds</h2>
                    <button className="btn" onClick={onClose} style={{ padding: '4px 8px' }}>✕</button>
                </div>

                <div className="divider" style={{ margin: '0 0 16px 0' }} />

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {rounds.length === 0 ? (
                        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px' }}>No rounds yet.</p>
                    ) : (
                        rounds.map(r => (
                            <div key={r.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input
                                    className="input"
                                    defaultValue={r.title}
                                    onBlur={(e) => {
                                        const trimmed = e.target.value.trim();
                                        if (trimmed && trimmed !== r.title) {
                                            renameRound(r.id, trimmed);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.currentTarget.blur();
                                        }
                                    }}
                                    style={{ flex: 1 }}
                                />
                                <button className="btn" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }} onClick={() => handleDelete(r.id, r.title)}>
                                    Delete
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="divider" style={{ margin: '0 0 16px 0' }} />

                <form onSubmit={handleAdd} style={{ display: 'flex', gap: '8px' }}>
                    <input
                        className="input"
                        placeholder="New round title..."
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <button type="submit" className="btnPrimary" disabled={!newTitle.trim()}>Add</button>
                </form>
            </div>
        </div>
    );
}
