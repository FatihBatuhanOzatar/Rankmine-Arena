import { Link, useLocation } from 'react-router-dom';
import logoUrl from '../../assets/rankminelogo.png';

interface AppHeaderProps {
    theme: string;
    onToggleTheme: () => void;
}

export function AppHeader({ theme, onToggleTheme }: AppHeaderProps) {
    const location = useLocation();
    const isArena = location.pathname.startsWith('/arena/');

    return (
        <header className="app-header" style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 24px',
            height: isArena ? '48px' : '64px',
            borderBottom: '1px solid var(--line)',
            background: 'var(--panel)',
            backdropFilter: 'blur(10px)',
            transition: 'height 0.2s ease'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit' }}>
                    <img src={logoUrl} alt="Rankmine Logo" style={{ height: isArena ? '102px' : '140px', width: 'auto', transition: 'height 0.2s ease' }} />
                    {!isArena && <span style={{ fontWeight: 600, fontSize: '1.25rem', letterSpacing: '0.5px' }}></span>}
                </Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {isArena ? (
                    <Link to="/" className="btn" style={{ padding: '4px 12px', fontSize: '14px' }}>← Back to Landing</Link>
                ) : (
                    <button className="btn" onClick={onToggleTheme} title="Toggle Theme">
                        {theme === 'neoArcade' ? '🔮 Neo-Arcade' : '☁️ Calm'}
                    </button>
                )}
            </div>
        </header>
    );
}
