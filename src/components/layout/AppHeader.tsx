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
                <button 
                    onClick={onToggleTheme} 
                    title="Toggle Theme"
                    style={{ 
                        width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px',
                        cursor: 'pointer', color: 'var(--muted)', transition: 'all 0.2s', padding: 0
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                >
                    {theme === 'neoArcade' ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                    )}
                </button>
            </div>
        </header>
    );
}
