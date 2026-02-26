import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';

export function AppShell() {
    const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'neoArcade');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'neoArcade' ? 'calm' : 'neoArcade');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            <AppHeader theme={theme} onToggleTheme={toggleTheme} />
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <Outlet />
            </div>
        </div>
    );
}
