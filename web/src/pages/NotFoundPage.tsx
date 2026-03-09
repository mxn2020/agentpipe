import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
    const navigate = useNavigate()

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: 'calc(100vh - 300px)',
            textAlign: 'center', padding: 'var(--space-2xl) var(--space-md)'
        }}>
            <div style={{ fontSize: '6rem', marginBottom: 'var(--space-md)' }}>🔍</div>
            <h1 style={{ fontSize: '2.5rem', marginBottom: 'var(--space-sm)' }}>404</h1>
            <p style={{ color: 'var(--color-smoke-gray)', fontSize: '1.1rem', marginBottom: 'var(--space-xl)' }}>
                This page doesn't exist.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                <button className="btn btn--primary" onClick={() => navigate('/')}>
                    Go Home
                </button>
                <button className="btn btn--secondary" onClick={() => navigate(-1)}>
                    Go Back
                </button>
            </div>
        </div>
    )
}
