import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Workflow, Plus, Layers, Zap, Star, ShoppingBag, Search,
    FileText, Image, Volume2, Video, Bot, Trash2, Globe, Eye
} from 'lucide-react'

const TYPE_ICONS: Record<string, JSX.Element> = {
    text: <FileText size={14} />,
    image: <Image size={14} />,
    audio: <Volume2 size={14} />,
    video: <Video size={14} />,
    multi: <Layers size={14} />,
}

export default function MyWorkflowsPage() {
    const navigate = useNavigate()
    const workflows = useQuery(api.workflows.getMyWorkflows)
    const createWorkflow = useMutation(api.workflows.createWorkflow)
    const deleteWorkflow = useMutation(api.workflows.deleteWorkflow)
    const balance = useQuery(api.credits.getBalance)

    const [showCreateForm, setShowCreateForm] = useState(false)
    const [newWorkflow, setNewWorkflow] = useState({
        name: '',
        description: '',
        category: 'text',
        price: 10,
    })

    const handleCreate = async () => {
        if (!newWorkflow.name || !newWorkflow.description) return
        const id = await createWorkflow({
            name: newWorkflow.name,
            description: newWorkflow.description,
            category: newWorkflow.category,
            price: newWorkflow.price,
        })
        setShowCreateForm(false)
        setNewWorkflow({ name: '', description: '', category: 'text', price: 10 })
        navigate(`/workflows/${id}`)
    }

    return (
        <div className="dashboard-page animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                    <Workflow size={28} style={{ color: 'var(--color-accent)' }} />
                    My Workflows
                </h1>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {balance && (
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-smoke-gray)', marginRight: '8px' }}>
                            {balance.balance} credits
                        </span>
                    )}
                    <button className="btn btn--primary btn--sm" onClick={() => setShowCreateForm(!showCreateForm)}>
                        <Plus size={14} /> New Workflow
                    </button>
                </div>
            </div>

            {/* Create form */}
            {showCreateForm && (
                <div className="admin-section" style={{ marginBottom: '24px' }}>
                    <h3 style={{ marginBottom: '16px' }}>Create New Workflow</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="app-input-wrapper">
                            <label className="app-input-label">Name</label>
                            <input
                                className="app-input"
                                value={newWorkflow.name}
                                onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                                placeholder="e.g. Blog Post Generator"
                            />
                        </div>
                        <div className="app-input-wrapper">
                            <label className="app-input-label">Description</label>
                            <textarea
                                className="app-input app-textarea"
                                value={newWorkflow.description}
                                onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                                placeholder="What does this workflow do?"
                                rows={2}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="app-input-wrapper">
                                <label className="app-input-label">Category</label>
                                <div className="app-select-container">
                                    <select className="app-input app-select" value={newWorkflow.category} onChange={(e) => setNewWorkflow({ ...newWorkflow, category: e.target.value })}>
                                        <option value="text">Text</option>
                                        <option value="image">Image</option>
                                        <option value="audio">Audio</option>
                                        <option value="video">Video</option>
                                        <option value="multi">Multi-modal</option>
                                    </select>
                                </div>
                            </div>
                            <div className="app-input-wrapper">
                                <label className="app-input-label">Price (credits/run)</label>
                                <input
                                    className="app-input"
                                    type="number"
                                    min={0}
                                    value={newWorkflow.price}
                                    onChange={(e) => setNewWorkflow({ ...newWorkflow, price: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="btn btn--secondary btn--sm" onClick={() => setShowCreateForm(false)}>Cancel</button>
                            <button className="btn btn--primary btn--sm" onClick={handleCreate} disabled={!newWorkflow.name || !newWorkflow.description}>
                                Create Workflow
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Workflow grid */}
            {workflows && workflows.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                    {workflows.map((w) => (
                        <div
                            key={w._id}
                            className="admin-section"
                            style={{ marginBottom: 0, cursor: 'pointer', transition: 'all 0.2s' }}
                            onClick={() => navigate(`/workflows/${w._id}`)}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{w.name}</h3>
                                <span style={{
                                    fontSize: '0.7rem',
                                    padding: '2px 10px',
                                    borderRadius: '12px',
                                    fontWeight: 600,
                                    background: w.isPublished ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                    color: w.isPublished ? 'var(--color-neon-emerald)' : 'var(--color-warm-amber)',
                                }}>
                                    {w.isPublished ? 'Published' : 'Draft'}
                                </span>
                            </div>
                            <p style={{ color: 'var(--color-smoke-gray)', fontSize: '0.85rem', margin: '0 0 12px', lineHeight: 1.5 }}>
                                {w.description}
                            </p>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--color-smoke-gray)' }}>
                                <span>{TYPE_ICONS[w.category ?? 'text']} {w.category ?? 'text'}</span>
                                <span><Layers size={12} /> {w.nodeCount} nodes</span>
                                <span><Zap size={12} /> {w.totalRuns} runs</span>
                                <span style={{ color: 'var(--color-accent)' }}>{w.price} cr</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                <button
                                    className="btn btn--danger btn--sm"
                                    onClick={(e) => { e.stopPropagation(); deleteWorkflow({ id: w._id }); }}
                                    style={{ fontSize: '0.75rem' }}
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="admin-section" style={{ textAlign: 'center', padding: '64px' }}>
                    <Workflow size={48} style={{ color: 'var(--color-smoke-gray)', marginBottom: '16px' }} />
                    <h3 style={{ marginBottom: '8px' }}>No workflows yet</h3>
                    <p style={{ color: 'var(--color-smoke-gray)', marginBottom: '20px' }}>
                        Create your first AI processing workflow.
                    </p>
                    <button className="btn btn--primary" onClick={() => setShowCreateForm(true)}>
                        <Plus size={16} /> Create Workflow
                    </button>
                </div>
            )}
        </div>
    )
}
