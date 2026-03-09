import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useConvexAuth } from 'convex/react'
import { Loader2 } from 'lucide-react'

interface Props {
    children: ReactNode
}

export function AuthGuard({ children }: Props) {
    const { isAuthenticated, isLoading } = useConvexAuth()

    if (isLoading) {
        return (
            <div className="auth-loading">
                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
                <p style={{ color: 'var(--color-smoke-gray)', marginTop: 'var(--space-md)' }}>Loading...</p>
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    return <>{children}</>
}

export function RedirectIfAuth({ children }: Props) {
    const { isAuthenticated, isLoading } = useConvexAuth()

    if (isLoading) {
        return (
            <div className="auth-loading">
                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
            </div>
        )
    }

    if (isAuthenticated) {
        return <Navigate to="/app" replace />
    }

    return <>{children}</>
}
