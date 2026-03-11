import { useQuery, useAction, useConvexAuth } from 'convex/react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import { CreditCard, Check, ArrowLeft, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { MissingConfigDialog } from '../components/MissingConfigDialog'
import toast from 'react-hot-toast'

type Plan = {
    id: string
    name: string
    description?: string
    planKey: string
    appSlug: string
    features: string[]
    price?: {
        id: string
        amount: number
        currency: string
        interval?: string
    }
}

export default function BillingPage() {
    const { isAuthenticated } = useConvexAuth()
    const subscription = useQuery(api.stripe.getSubscription)
    const createCheckout = useAction(api.stripe.createCheckoutSession)
    const getActivePlans = useAction(api.stripe.getActivePlans)
    const navigate = useNavigate()
    const [configError, setConfigError] = useState<string | null>(null)
    const [plans, setPlans] = useState<Plan[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!isAuthenticated) return

        getActivePlans()
            .then(data => {
                const appPlans = data.filter((p: Plan) => p.appSlug === 'agentpipe' || p.appSlug === 'unknown')
                setPlans(appPlans)
            })
            .catch(err => {
                const msg = err instanceof Error ? err.message : String(err)
                if (msg.includes('not configured')) setConfigError(msg)
                console.error(err)
            })
            .finally(() => setLoading(false))
    }, [isAuthenticated, getActivePlans])

    if (!isAuthenticated) {
        navigate('/login')
        return null
    }

    const currentPlan = subscription?.plan ?? 'free'

    const handleUpgrade = async (planKey: string, priceId: string) => {
        try {
            const { url } = await createCheckout({ planKey, priceId })
            if (url) window.location.assign(url)
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            if (msg.includes('not configured')) {
                setConfigError(msg)
            } else {
                toast.error(msg)
            }
        }
    }

    return (
        <div className="billing-page">
            {configError && (
                <MissingConfigDialog
                    message={configError}
                    onClose={() => setConfigError(null)}
                />
            )}
            <div style={{ marginBottom: '32px' }}>
                <Link to="/settings" className="btn btn--ghost" style={{ marginBottom: '16px', display: 'inline-flex' }}>
                    <ArrowLeft size={16} /> Back to Settings
                </Link>
                <h1><CreditCard size={28} style={{ verticalAlign: 'middle', marginRight: '8px' }} />Billing & Subscription</h1>
                <p style={{ color: 'var(--color-smoke-gray)', marginTop: '8px' }}>
                    Manage your subscription and billing preferences
                </p>
            </div>

            {/* Current Plan Banner */}
            <div className="billing-current">
                <div className="billing-current__info">
                    <span className="plan-badge plan-badge--lg">{currentPlan.toUpperCase()}</span>
                    <span style={{ color: 'var(--color-smoke-gray)' }}>
                        {currentPlan === 'free' ? 'You are on the free plan' : `Your ${currentPlan} subscription is active`}
                    </span>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
                    <Loader2 size={48} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                </div>
            ) : (
                <div className="pricing-grid" style={{ marginTop: '32px' }}>
                    <div className="pricing-card">
                        <div className="pricing-card__header">
                            <h2>Free</h2>
                            <div className="pricing-card__price">$0<span>/mo</span></div>
                        </div>
                        <ul className="pricing-card__features">
                            <li><Check size={16} style={{ color: 'var(--color-neon-emerald)' }} /> Basic features</li>
                            <li><Check size={16} style={{ color: 'var(--color-neon-emerald)' }} /> Limited monthly usage</li>
                            <li><Check size={16} style={{ color: 'var(--color-neon-emerald)' }} /> Community support</li>
                        </ul>
                        <button className="btn btn--secondary pricing-card__btn" disabled={currentPlan === 'free'}>
                            {currentPlan === 'free' ? '✅ Current Plan' : 'Downgrade'}
                        </button>
                    </div>

                    {plans.map((plan) => (
                        <div key={plan.id} className="pricing-card">
                            <div className="pricing-card__header">
                                <h2>{plan.name}</h2>
                                <div className="pricing-card__price">
                                    ${plan.price ? (plan.price.amount / 100).toFixed(0) : '0'}
                                    {plan.price?.interval && <span>/{plan.price.interval === 'month' ? 'mo' : 'yr'}</span>}
                                </div>
                            </div>

                            {plan.description && (
                                <p style={{ color: 'var(--color-smoke-gray)', fontSize: '0.9rem', marginBottom: '16px' }}>
                                    {plan.description}
                                </p>
                            )}

                            <ul className="pricing-card__features">
                                {plan.features.map((f, i) => (
                                    <li key={i}><Check size={16} style={{ color: 'var(--color-neon-emerald)' }} /> {f}</li>
                                ))}
                            </ul>

                            <button
                                className={`btn ${currentPlan === plan.planKey ? 'btn--secondary' : 'btn--primary'} pricing-card__btn`}
                                disabled={currentPlan === plan.planKey}
                                onClick={() => handleUpgrade(plan.planKey, plan.price!.id)}
                            >
                                {currentPlan === plan.planKey ? '✅ Current Plan' : `Upgrade to ${plan.name}`}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
