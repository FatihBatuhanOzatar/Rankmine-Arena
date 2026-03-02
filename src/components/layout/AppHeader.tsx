import { Link, useLocation } from 'react-router-dom';
import logoUrlDark from '../../assets/rankminelogo.png';
import logoUrlLight from '../../assets/rankminelogo_dark.png';

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', height: '100%' }}>
                <Link to="/" className="logo-link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', overflow: 'hidden', textDecoration: 'none', color: 'inherit' }}>
                    <img src={theme === 'light' ? logoUrlLight : logoUrlDark} alt="Rankmine Logo" style={{ height: isArena ? '162px' : '192px', width: 'auto', transition: 'height 0.2s ease' }} />
                    {!isArena && <span style={{ fontWeight: 600, fontSize: '1.25rem', letterSpacing: '0.5px' }}></span>}
                </Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {isArena ? (
                    <Link to="/" className="btn" style={{ padding: '4px 12px', fontSize: '14px' }}>← Back to Landing</Link>
                ) : (
                    <button className="btn" onClick={onToggleTheme} title="Toggle Theme">
                        {theme === 'neoArcade' ? '🔮 Neo-Arcade' : '☀️ Light'}
                    </button>
                )}
            </div>
        </header>
    );
}
