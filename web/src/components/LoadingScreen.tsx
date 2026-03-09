export default function LoadingScreen() {
    return (
        <div className="loading-screen" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            gap: '16px',
        }}>
            <div className="loading-spinner" style={{
                width: '48px',
                height: '48px',
                border: '3px solid var(--color-border, rgba(255,255,255,0.1))',
                borderTopColor: 'var(--color-accent, #8b5cf6)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ color: 'var(--color-smoke-gray, #999)', fontSize: '0.95rem' }}>Loading…</p>
        </div>
    )
}
