import { useState, useEffect, useCallback } from 'react'
import { useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { SkeletonCard } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import { Plus, Archive, Loader2, DollarSign, Edit2 } from 'lucide-react'
import { Input, Select, Textarea } from '@geenius-ui/react-css'

type Plan = {
    id: string
    name: string
    description?: string
    planKey: string
    appSlug: string
    active: boolean
    features: string[]
    price?: {
        id: string
        amount: number
        currency: string
        interval?: string
    }
}

export default function AdminStripePage() {
    const fetchPlans = useAction(api.stripeAdmin.listPlans)
    const createPlanAction = useAction(api.stripeAdmin.createPlan)
    const updatePlanAction = useAction(api.stripeAdmin.updatePlan)
    const archivePlanAction = useAction(api.stripeAdmin.archivePlan)
    const { showToast } = useToast()

    const [plans, setPlans] = useState<Plan[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    // Form state
    const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [planKey, setPlanKey] = useState('')
    const [appSlug, setAppSlug] = useState('agentpipe')
    const [amount, setAmount] = useState('') // dollars 
    const [interval, setInterval] = useState<'month' | 'year' | 'none'>('month')
    const [features, setFeatures] = useState('')

    const loadPlans = useCallback(async () => {
        setLoading(true)
        try {
            const data = await fetchPlans()
            setPlans(data)
        } catch (err) {
            console.error(err)
            showToast('Failed to load plans', 'error')
        } finally {
            setLoading(false)
        }
    }, [fetchPlans, showToast])

    useEffect(() => {
        loadPlans()
    }, [loadPlans])

    const handleOpenCreate = () => {
        setEditingPlanId(null)
        setName('')
        setDescription('')
        setPlanKey('')
        setAppSlug('agentpipe')
        setAmount('')
        setInterval('month')
        setFeatures('')
        setIsCreateModalOpen(true)
    }

    const handleOpenEdit = (plan: Plan) => {
        setEditingPlanId(plan.id)
        setName(plan.name)
        setDescription(plan.description || '')
        setPlanKey(plan.planKey)
        setAppSlug(plan.appSlug)
        setAmount(plan.price ? (plan.price.amount / 100).toString() : '')
        setInterval((plan.price?.interval as 'month' | 'year') || 'none')
        setFeatures(plan.features.join('\n'))
        setIsCreateModalOpen(true)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        const featureList = features.split('\n').map((f) => f.trim()).filter(Boolean)

        try {
            if (editingPlanId) {
                // Find existing plan to get priceId (needed for clients validation)
                const existingPlan = plans.find(p => p.id === editingPlanId)
                await updatePlanAction({
                    productId: editingPlanId,
                    priceId: existingPlan?.price?.id,
                    name,
                    description,
                    features: featureList,
                })
                showToast('Plan updated successfully', 'success')
            } else {
                await createPlanAction({
                    name,
                    description,
                    unitAmount: Math.round(parseFloat(amount) * 100),
                    currency: 'usd',
                    interval: interval === 'none' ? undefined : interval,
                    features: featureList,
                    planKey,
                    appSlug,
                })
                showToast('Plan created successfully', 'success')
            }
            setIsCreateModalOpen(false)
            loadPlans()
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            showToast(msg, 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleArchive = async (productId: string) => {
        if (!confirm('Are you sure you want to archive this plan? It will no longer be visible to new users, but existing subscriptions will continue.')) return

        try {
            await archivePlanAction({ productId })
            showToast('Plan archived successfully', 'success')
            loadPlans()
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            showToast(msg, 'error')
        }
    }

    return (
        <div className="admin-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1>💳 Stripe Admin</h1>
                <button className="btn btn--primary" onClick={handleOpenCreate} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Plus size={16} /> Create Plan
                </button>
            </div>

            <p style={{ color: 'var(--color-smoke-gray)', marginBottom: '32px' }}>
                Manage Stripe Products and Prices dynamically. The active plans here will be displayed on the public Pricing and Billing pages.
            </p>

            {loading ? (
                <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            ) : plans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 24px', background: 'var(--color-obsidian)', borderRadius: 'var(--radius-lg)' }}>
                    <DollarSign size={48} style={{ color: 'var(--color-smoke-gray)', margin: '0 auto 16px', opacity: 0.5 }} />
                    <h3 style={{ marginBottom: '8px' }}>No plans found</h3>
                    <p style={{ color: 'var(--color-smoke-gray)', marginBottom: '24px' }}>Create your first product and price in Stripe.</p>
                    <button className="btn btn--primary" onClick={handleOpenCreate}>Create Plan</button>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
                    {plans.map((plan) => (
                        <div key={plan.id} style={{
                            background: 'var(--color-obsidian)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '24px',
                            border: '1px solid var(--color-space-blue)',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <h3 style={{ margin: 0 }}>{plan.name}</h3>
                                        <span style={{
                                            background: plan.active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            color: plan.active ? '#10B981' : '#EF4444',
                                            padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600
                                        }}>
                                            {plan.active ? 'Active' : 'Archived'}
                                        </span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-smoke-gray)' }}>{plan.description}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--color-ice-white)' }}>
                                        ${plan.price ? (plan.price.amount / 100).toFixed(2) : '0.00'}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-smoke-gray)' }}>
                                        {plan.price?.interval ? `per ${plan.price.interval}` : 'one-time'}
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '24px', flexGrow: 1 }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-smoke-gray)', marginBottom: '8px', display: 'flex', gap: '16px' }}>
                                    <span><strong>Key:</strong> <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px' }}>{plan.planKey}</code></span>
                                    <span><strong>App:</strong> {plan.appSlug}</span>
                                </div>
                                <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--color-gray)', fontSize: '0.85rem' }}>
                                    {plan.features.slice(0, 3).map((f, i) => <li key={i}>{f}</li>)}
                                    {plan.features.length > 3 && <li>+{plan.features.length - 3} more...</li>}
                                </ul>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn--secondary" style={{ flexGrow: 1, display: 'flex', justifyContent: 'center', gap: '8px' }} onClick={() => handleOpenEdit(plan)}>
                                    <Edit2 size={14} /> Edit
                                </button>
                                {plan.active && (
                                    <button
                                        className="btn btn--secondary"
                                        style={{ color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.2)' }}
                                        onClick={() => handleArchive(plan.id)}
                                    >
                                        <Archive size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isCreateModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 100, padding: '24px'
                }}>
                    <div style={{
                        background: 'var(--color-midnight)',
                        border: '1px solid var(--color-space-blue)',
                        borderRadius: 'var(--radius-xl)',
                        padding: '32px',
                        width: '100%',
                        maxWidth: '500px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                    }}>
                        <h2 style={{ marginBottom: '24px' }}>{editingPlanId ? 'Edit Plan' : 'Create Stripe Plan'}</h2>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="login-form__field">
                                <Input label="Internal App Slug" value={appSlug} onChange={e => setAppSlug(e.target.value)} required />
                                <small style={{ color: 'var(--color-smoke-gray)', fontSize: '0.75rem', marginTop: '4px' }}>Determines which app this shows up on.</small>
                            </div>
                            <div className="login-form__field">
                                <Input label="Internal Plan Key" value={planKey} onChange={e => setPlanKey(e.target.value)} placeholder="e.g. pro, enterprise, topup_40" required />
                                <small style={{ color: 'var(--color-smoke-gray)', fontSize: '0.75rem', marginTop: '4px' }}>Used by your codebase to identify the plan.</small>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid var(--color-space-blue)', margin: '8px 0' }} />

                            <div className="login-form__field">
                                <Input label="Public Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pro Subscription" required />
                            </div>
                            <div className="login-form__field">
                                <Input label="Public Description" value={description} onChange={e => setDescription(e.target.value)} />
                            </div>

                            {!editingPlanId && (
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <div className="login-form__field" style={{ flexGrow: 1 }}>
                                        <Input label="Price (USD)" type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="9.00" required />
                                    </div>
                                    <div className="login-form__field" style={{ flexGrow: 1 }}>
                                        <Select label="Billing Interval" value={interval} onChange={e => setInterval(e.target.value as any)}>
                                            <option value="month">Monthly</option>
                                            <option value="year">Yearly</option>
                                            <option value="none">One-time</option>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {editingPlanId && (
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--color-gray)' }}>
                                    ⚠️ Price and billing interval cannot be changed on an existing plan. Create a new plan instead if you need structural changes.
                                </div>
                            )}

                            <div className="login-form__field" style={{ marginBottom: ('24px' as any) }}>
                                <Textarea label="Features (one per line)" rows={5} value={features} onChange={e => setFeatures(e.target.value)} placeholder="Feature 1&#10;Feature 2&#10;Feature 3" required />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn--secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn--primary" disabled={saving} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {saving && <Loader2 size={14} className="animate-spin" />}
                                    {saving ? 'Saving...' : editingPlanId ? 'Update Plan' : 'Create Plan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
