import { AlertTriangle, X } from 'lucide-react'

interface Props {
    title?: string
    message: string
    onClose: () => void
}

export function MissingConfigDialog({ title = "Configuration Missing", message, onClose }: Props) {
    // Extract the missing key from the message if possible
    // e.g. "STRIPE_SECRET_KEY not configured" -> "STRIPE_SECRET_KEY"
    const missingKeyMatch = message.match(/([A-Z_]+)\s+not configured/)
    const missingKey = missingKeyMatch ? missingKeyMatch[1] : 'API_KEY'

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(10, 14, 28, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 24,
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                background: 'var(--gradient-card, linear-gradient(135deg, #1f1111 0%, #0A0A0A 100%))',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: 'var(--radius-xl, 24px)',
                padding: '48px 40px',
                maxWidth: 420,
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 16px 64px rgba(239, 68, 68, 0.15)',
                position: 'relative',
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: 20, right: 20,
                        background: 'none', border: 'none', color: 'var(--color-smoke-gray, #94A3B8)', cursor: 'pointer'
                    }}
                >
                    <X size={20} />
                </button>
                <div style={{ color: 'var(--color-hot-red, var(--color-danger, #EF4444))', marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                    <AlertTriangle size={48} strokeWidth={1.5} />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8, color: 'var(--color-ice-white, #F8FAFC)' }}>
                    {title}
                </h2>
                <p style={{ color: 'var(--color-smoke-gray, #94A3B8)', fontSize: '0.95rem', marginBottom: 24 }}>
                    The backend is missing a required environment variable to perform this action.
                </p>
                <div style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: 'var(--radius-sm, 8px)',
                    padding: 'var(--space-md, 16px)',
                    textAlign: 'left',
                    fontSize: 13,
                    color: 'var(--color-smoke-gray, #94A3B8)',
                    lineHeight: 1.8,
                }}>
                    <div style={{ fontWeight: 700, color: 'var(--color-ice-white, #F8FAFC)', marginBottom: 8 }}>Setup required:</div>
                    <div style={{ marginBottom: 4 }}>1. Run the following command locally:</div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: 4, fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-ice-white, #fff)', marginBottom: 12 }}>
                        npx convex env set {missingKey} "your_key_here"
                    </div>
                    <div>2. Or add it in the <a href="https://dashboard.convex.dev" target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent, #60A5FA)', textDecoration: 'none' }}>Convex Dashboard</a></div>
                </div>
            </div>
        </div>
    )
}
