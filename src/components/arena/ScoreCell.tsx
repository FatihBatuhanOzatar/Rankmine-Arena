import { memo, useCallback } from 'react';
import { useStore } from '../../state/store';

interface ScoreCellProps {
    roundId: string;
    contestantId: string;
    entryId: string;
    min: number;
    max: number;
}

export const ScoreCell = memo(function ScoreCell({ roundId, contestantId, entryId, min, max }: ScoreCellProps) {
    // Subscribe specifically to THIS cell's data to avoid grid-wide re-renders
    const entry = useStore(useCallback(s => s.entriesById[entryId], [entryId]));
    const upsertEntry = useStore(s => s.upsertEntry);

    const val = entry?.score ?? '';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let parsed: number | undefined = undefined;
        if (e.target.value !== '') {
            parsed = parseInt(e.target.value, 10);
            if (isNaN(parsed)) return;
            // Clamp visually
            if (parsed > max) parsed = max;
            if (parsed < min) parsed = min;
        }
        upsertEntry(roundId, contestantId, parsed);
    };

    return (
        <td style={{ border: '1px solid var(--border)', padding: '0', textAlign: 'center' }}>
            <input
                type="number"
                value={val}
                onChange={handleChange}
                min={min}
                max={max}
                className="input"
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
                placeholder="-"
            />
        </td>
    );
});
