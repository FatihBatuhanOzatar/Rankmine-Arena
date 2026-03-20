/* eslint-disable react-refresh/only-export-components */
import { useState, useCallback, useEffect, useRef } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
}

let _nextId = 0;
let _addToast: ((msg: string, type: ToastType) => void) | null = null;

/** Imperative toast trigger — call from anywhere. */
export function showToast(message: string, type: ToastType = 'info') {
    _addToast?.(message, type);
}

const TYPE_COLORS: Record<ToastType, string> = {
    success: 'rgba(34,197,94,0.9)',
    error: 'rgba(220,53,69,0.9)',
    warning: 'rgba(201,162,39,0.9)',
    info: 'rgba(193,68,14,0.9)',
};

const DURATION = 3500;

export function ToastContainer() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

    const add = useCallback((message: string, type: ToastType) => {
        const id = ++_nextId;
        setToasts(prev => [...prev, { id, message, type }]);
        const timer = setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
            timers.current.delete(id);
        }, DURATION);
        timers.current.set(id, timer);
    }, []);

    useEffect(() => {
        _addToast = add;
        return () => { _addToast = null; };
    }, [add]);

    if (toasts.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            pointerEvents: 'none',
        }}>
            {toasts.map(t => (
                <div
                    key={t.id}
                    style={{
                        background: TYPE_COLORS[t.type],
                        color: '#fff',
                        padding: '10px 20px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: 600,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                        animation: 'toast-slide-in 0.25s ease-out',
                        pointerEvents: 'auto',
                    }}
                >
                    {t.message}
                </div>
            ))}
        </div>
    );
}
