import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Loader2 } from 'lucide-react'

interface Props {
    children: ReactNode
}

/**
 * Wraps routes that require a paid subscription.
 * - If not authenticated → redirects to /login
 * - If authenticated but plan === 'free' → redirects to /pricing
 * - If authenticated with pro/enterprise plan → renders children
 * - Admins always pass through
 */
export function SubscriptionGuard({ children }: Props) {
    const { isAuthenticated, isLoading } = useConvexAuth()
    const me = useQuery(api.users.getMe)
    const location = useLocation()

    if (isLoading || (isAuthenticated && me === undefined)) {
        return (
            <div className="auth-loading">
                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
                <p style={{ color: 'var(--color-smoke-gray, #999)', marginTop: '16px' }}>Loading...</p>
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location }} />
    }

    // Admins always pass
    if (me?.role === 'admin') {
        return <>{children}</>
    }

    // Free users → pricing page
    if (!me?.plan || me.plan === 'free') {
        return <Navigate to="/pricing" replace state={{ needSubscription: true }} />
    }

    return <>{children}</>
}
