import { Component, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, errorMessage: '' };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, errorMessage: error.message || 'Unknown error' };
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: 'var(--bg, #0e0e0e)',
                color: 'var(--text, #e0e0e0)',
                padding: '24px',
                textAlign: 'center',
                gap: '16px',
            }}>
                <div style={{ fontSize: '3rem' }}>⚠️</div>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>
                    Something went wrong
                </h1>
                <p style={{ margin: 0, color: 'var(--muted, #666)', maxWidth: '400px', fontSize: '14px' }}>
                    An unexpected error occurred. Your local data is safe.
                </p>
                {import.meta.env.DEV && this.state.errorMessage && (
                    <pre style={{
                        background: 'rgba(255,0,0,0.1)',
                        border: '1px solid rgba(255,0,0,0.3)',
                        borderRadius: '4px',
                        padding: '12px',
                        fontSize: '12px',
                        maxWidth: '600px',
                        overflow: 'auto',
                        textAlign: 'left',
                    }}>
                        {this.state.errorMessage}
                    </pre>
                )}
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button
                        onClick={this.handleReload}
                        style={{
                            padding: '10px 24px',
                            background: 'var(--accent, #C1440E)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '14px',
                        }}
                    >
                        Reload Page
                    </button>
                    <button
                        onClick={this.handleGoHome}
                        style={{
                            padding: '10px 24px',
                            background: 'transparent',
                            color: 'var(--text, #e0e0e0)',
                            border: '1px solid var(--line, rgba(255,255,255,0.12))',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                        }}
                    >
                        Go to Landing
                    </button>
                </div>
            </div>
        );
    }
}
