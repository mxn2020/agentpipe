import { useAction, useQuery, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { MissingConfigDialog } from '../components/MissingConfigDialog'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

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

export default function PricingPage() {
    const { isAuthenticated } = useConvexAuth()
    const subscription = useQuery(api.stripe.getSubscription)
    const createCheckout = useAction(api.stripe.createCheckoutSession)
    const getActivePlans = useAction(api.stripe.getActivePlans)
    const navigate = useNavigate()
    const [configError, setConfigError] = useState<string | null>(null)
    const [plans, setPlans] = useState<Plan[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getActivePlans()
            .then(data => {
                // Filter plans intended for this app (or show all if not configured)
                const appPlans = data.filter((p: Plan) => p.appSlug === 'agentpipe' || p.appSlug === 'unknown')
                setPlans(appPlans)
            })
            .catch(err => {
                const msg = err instanceof Error ? err.message : String(err)
                if (msg.includes('not configured')) setConfigError(msg)
                console.error(err)
            })
            .finally(() => setLoading(false))
    }, [getActivePlans])

    const handleUpgrade = async (planKey: string, priceId: string) => {
        if (!isAuthenticated) {
            navigate('/login')
            return
        }
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

    const currentPlan = subscription?.plan ?? 'free'

    return (
        <div className="pricing-page">
            {configError && (
                <MissingConfigDialog
                    message={configError}
                    onClose={() => setConfigError(null)}
                />
            )}
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl, 48px)' }}>
                <h1>Simple, Transparent Pricing</h1>
                <p style={{ color: 'var(--color-smoke-gray, #999)', fontSize: '1.1rem', marginTop: '8px' }}>
                    Start free. Upgrade when you're ready.
                </p>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
                    <Loader2 size={48} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                </div>
            ) : (
                <div className="pricing-grid">
                    <div className="pricing-card">
                        <div className="pricing-card__header">
                            <h2>Free</h2>
                            <div className="pricing-card__price">$0<span>/mo</span></div>
                        </div>
                        <ul className="pricing-card__features">
                            <li>✅ Basic features</li>
                            <li>✅ Limited monthly usage</li>
                            <li>✅ Community support</li>
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
                                {plan.features.map((feature, i) => (
                                    <li key={i}>✅ {feature}</li>
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
