import { useState } from 'react';
import { useStore } from '../../state/store';
import { ConfirmDialog } from '../ConfirmDialog';

export function ManageContestants({ onClose }: { onClose: () => void }) {
    const { contestants, addContestant, renameContestant, removeContestant } = useStore();
    const [newName, setNewName] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<{ id: string, name: string } | null>(null);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newName.trim();
        if (!trimmed) return;
        await addContestant(trimmed);
        setNewName('');
    };

    const handleDelete = (id: string, name: string) => {
        setConfirmDelete({ id, name });
    };

    const handleDeleteConfirm = async () => {
        if (confirmDelete) {
            await removeContestant(confirmDelete.id);
            setConfirmDelete(null);
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
                    <h2 style={{ margin: 0 }}>Manage Contestants</h2>
                    <button className="btn" onClick={onClose} style={{ padding: '4px 8px' }}>✕</button>
                </div>

                <div className="divider" style={{ margin: '0 0 16px 0' }} />

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {contestants.length === 0 ? (
                        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px' }}>No contestants yet.</p>
                    ) : (
                        contestants.map(c => (
                            <div key={c.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input
                                    className="input"
                                    defaultValue={c.name}
                                    onBlur={(e) => {
                                        const trimmed = e.target.value.trim();
                                        if (trimmed && trimmed !== c.name) {
                                            renameContestant(c.id, trimmed);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.currentTarget.blur();
                                        }
                                    }}
                                    style={{ flex: 1 }}
                                />
                                <button className="btn" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }} onClick={() => handleDelete(c.id, c.name)}>
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
                        placeholder="New contestant name..."
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <button type="submit" className="btnPrimary" disabled={!newName.trim()}>Add</button>
                </form>
            </div>

            <ConfirmDialog
                isOpen={!!confirmDelete}
                title="Delete contestant?"
                body={<>Are you sure you want to delete contestant <strong>{confirmDelete?.name}</strong>?<br /><br />This will permanently delete all scores and notes associated with this contestant.</>}
                confirmLabel="Delete"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setConfirmDelete(null)}
            />
        </div>
    );
}
