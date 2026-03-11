import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
type Id<T extends string> = string & { __tableName: T };
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
import toast from 'react-hot-toast'
    Layers, Plus, Trash2, Play, ArrowUp, ArrowDown, Save,
    FileText, Image, Volume2, Video, Bot, ChevronDown, ChevronUp,
    Globe, GlobeLock
} from 'lucide-react'

const NODE_TYPE_ICONS: Record<string, JSX.Element> = {
    text: <FileText size={18} />,
    image: <Image size={18} />,
    audio: <Volume2 size={18} />,
    video: <Video size={18} />,
    object: <Bot size={18} />,
}

const NODE_TYPE_COLORS: Record<string, string> = {
    text: 'var(--color-accent)',
    image: 'var(--color-neon-emerald)',
    audio: 'var(--color-warm-amber)',
    video: '#a78bfa',
    object: '#f472b6',
}

export default function WorkflowBuilderPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const workflow = useQuery(api.workflows.getWorkflowWithNodes, id ? { workflowId: id as Id<"workflows"> } : "skip")
    const models = useQuery(api.credits.getAvailableModels, {})
    const addNode = useMutation(api.workflows.addNode)
    const deleteNode = useMutation(api.workflows.deleteNode)
    const updateNode = useMutation(api.workflows.updateNode)
    const updateWorkflow = useMutation(api.workflows.updateWorkflow)
    const publishWorkflow = useMutation(api.workflows.publishWorkflow)
    const unpublishWorkflow = useMutation(api.workflows.unpublishWorkflow)
    const startRun = useMutation(api.workflowRunner.startRun)

    const [addingNode, setAddingNode] = useState(false)
    const [newNode, setNewNode] = useState({
        name: '',
        type: 'text' as string,
        modelId: '',
        prompt: '',
        outputSchema: '',
    })
    const [expandedNode, setExpandedNode] = useState<string | null>(null)
    const [running, setRunning] = useState(false)

    if (!workflow) {
        return (
            <div className="dashboard-page animate-fade-in">
                <div className="skeleton skeleton--card" style={{ height: '400px' }} />
            </div>
        )
    }

    const handleAddNode = async () => {
        if (!newNode.name || !newNode.modelId || !newNode.prompt) return

        await addNode({
            workflowId: workflow._id,
            name: newNode.name,
            type: newNode.type as any,
            modelId: newNode.modelId,
            prompt: newNode.prompt,
            outputSchema: newNode.type === 'object' ? newNode.outputSchema : undefined,
            estimatedCost: models?.find(m => m.modelId === newNode.modelId)?.costPerUnit ?? 1,
        })

        setNewNode({ name: '', type: 'text', modelId: '', prompt: '', outputSchema: '' })
        setAddingNode(false)
    }

    const handleTestRun = async () => {
        setRunning(true)
        try {
            const result = await startRun({
                workflowId: workflow._id,
                isTestRun: true,
            })
            navigate(`/runs/${result.runId}`)
        } catch (err: any) {
            toast.error(err.message)
        }
        setRunning(false)
    }

    const filteredModels = models?.filter(m => m.type === newNode.type) ?? []

    return (
        <div className="dashboard-page animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                        <Layers size={28} style={{ color: 'var(--color-accent)' }} />
                        {workflow.name}
                    </h1>
                    <p style={{ color: 'var(--color-smoke-gray)', margin: '8px 0 0', fontSize: '0.9rem' }}>
                        {workflow.description}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn--secondary btn--sm" onClick={handleTestRun} disabled={running || workflow.nodes.length === 0}>
                        <Play size={14} /> {running ? 'Running...' : 'Test Run'}
                    </button>
                    {workflow.isPublished ? (
                        <button className="btn btn--secondary btn--sm" onClick={() => unpublishWorkflow({ id: workflow._id })}>
                            <GlobeLock size={14} /> Unpublish
                        </button>
                    ) : (
                        <button className="btn btn--primary btn--sm" onClick={() => publishWorkflow({ id: workflow._id })} disabled={workflow.nodes.length === 0}>
                            <Globe size={14} /> Publish
                        </button>
                    )}
                </div>
            </div>

            {/* Workflow meta */}
            <div className="admin-section" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '24px', fontSize: '0.85rem' }}>
                    <div>
                        <span style={{ color: 'var(--color-smoke-gray)', display: 'block', marginBottom: '4px' }}>Status</span>
                        <span style={{ fontWeight: 600, color: workflow.isPublished ? 'var(--color-neon-emerald)' : 'var(--color-warm-amber)' }}>
                            {workflow.isPublished ? 'Published' : 'Draft'}
                        </span>
                    </div>
                    <div>
                        <span style={{ color: 'var(--color-smoke-gray)', display: 'block', marginBottom: '4px' }}>Nodes</span>
                        <span style={{ fontWeight: 600 }}>{workflow.nodes.length}</span>
                    </div>
                    <div>
                        <span style={{ color: 'var(--color-smoke-gray)', display: 'block', marginBottom: '4px' }}>Total Runs</span>
                        <span style={{ fontWeight: 600 }}>{workflow.totalRuns}</span>
                    </div>
                    <div>
                        <span style={{ color: 'var(--color-smoke-gray)', display: 'block', marginBottom: '4px' }}>Price</span>
                        <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>{workflow.price} credits/run</span>
                    </div>
                </div>
            </div>

            {/* Nodes */}
            <div className="dashboard-section">
                <div className="dashboard-section__header">
                    <h2><Layers size={20} /> Nodes ({workflow.nodes.length})</h2>
                    <button className="btn btn--primary btn--sm" onClick={() => setAddingNode(!addingNode)}>
                        <Plus size={14} /> Add Node
                    </button>
                </div>

                {/* Node list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {workflow.nodes.map((node, i) => (
                        <div
                            key={node._id}
                            className="admin-section"
                            style={{
                                marginBottom: 0,
                                borderLeft: `3px solid ${NODE_TYPE_COLORS[node.type] ?? 'var(--color-accent)'}`,
                                cursor: 'pointer',
                            }}
                            onClick={() => setExpandedNode(expandedNode === node._id ? null : node._id)}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ color: NODE_TYPE_COLORS[node.type], display: 'flex', alignItems: 'center' }}>
                                        {NODE_TYPE_ICONS[node.type]}
                                    </span>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>
                                            <span style={{ color: 'var(--color-smoke-gray)', marginRight: '8px' }}>#{i + 1}</span>
                                            {node.name}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-smoke-gray)' }}>
                                            {node.modelId} · {node.type} · ~{node.estimatedCost} cr
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {node.contextSource && (
                                        <span style={{ fontSize: '0.7rem', background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', padding: '2px 8px', borderRadius: '12px' }}>
                                            ← Node #{(node.contextSource.nodeOrder ?? 0) + 1}
                                        </span>
                                    )}
                                    <button
                                        className="btn btn--danger btn--sm"
                                        onClick={(e) => { e.stopPropagation(); deleteNode({ nodeId: node._id }); }}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                    {expandedNode === node._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                            </div>
                            {expandedNode === node._id && (
                                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--color-smoke-gray)', display: 'block', marginBottom: '4px' }}>PROMPT</label>
                                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '12px', fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                            {node.prompt}
                                        </div>
                                    </div>
                                    {node.outputSchema && (
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--color-smoke-gray)', display: 'block', marginBottom: '4px' }}>OUTPUT SCHEMA</label>
                                            <pre style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '12px', fontSize: '0.8rem', overflow: 'auto' }}>
                                                {node.outputSchema}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {workflow.nodes.length === 0 && (
                        <div className="admin-section" style={{ textAlign: 'center', padding: '48px' }}>
                            <Layers size={40} style={{ color: 'var(--color-smoke-gray)', marginBottom: '12px' }} />
                            <p style={{ color: 'var(--color-smoke-gray)' }}>No nodes yet. Add your first processing node.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Node Form */}
            {addingNode && (
                <div className="admin-section" style={{ marginTop: '16px' }}>
                    <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={18} /> Add Node
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="app-input-wrapper">
                            <label className="app-input-label">Node Name</label>
                            <input
                                className="app-input"
                                value={newNode.name}
                                onChange={(e) => setNewNode({ ...newNode, name: e.target.value })}
                                placeholder="e.g. Generate blog post"
                            />
                        </div>

                        <div className="app-input-wrapper">
                            <label className="app-input-label">Type</label>
                            <div className="app-select-container">
                                <select
                                    className="app-input app-select"
                                    value={newNode.type}
                                    onChange={(e) => setNewNode({ ...newNode, type: e.target.value, modelId: '' })}
                                >
                                    <option value="text">📝 Text Generation</option>
                                    <option value="image">🖼️ Image Generation</option>
                                    <option value="audio">🔊 Audio Generation</option>
                                    <option value="video">🎬 Video Generation</option>
                                    <option value="object">📦 Structured Output (JSON)</option>
                                </select>
                            </div>
                        </div>

                        <div className="app-input-wrapper">
                            <label className="app-input-label">Model</label>
                            <div className="app-select-container">
                                <select
                                    className="app-input app-select"
                                    value={newNode.modelId}
                                    onChange={(e) => setNewNode({ ...newNode, modelId: e.target.value })}
                                >
                                    <option value="">Select model...</option>
                                    {filteredModels.map((m) => (
                                        <option key={m.modelId} value={m.modelId}>
                                            {m.displayName} ({m.costPerUnit} cr/{m.unit})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="app-input-wrapper">
                            <label className="app-input-label">Prompt</label>
                            <textarea
                                className="app-input app-textarea"
                                value={newNode.prompt}
                                onChange={(e) => setNewNode({ ...newNode, prompt: e.target.value })}
                                placeholder="Enter your prompt template..."
                                rows={4}
                            />
                        </div>

                        {newNode.type === 'object' && (
                            <div className="app-input-wrapper">
                                <label className="app-input-label">Output JSON Schema</label>
                                <textarea
                                    className="app-input app-textarea"
                                    value={newNode.outputSchema}
                                    onChange={(e) => setNewNode({ ...newNode, outputSchema: e.target.value })}
                                    placeholder='{"title": "string", "summary": "string", "tags": ["string"]}'
                                    rows={3}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="btn btn--secondary btn--sm" onClick={() => setAddingNode(false)}>Cancel</button>
                            <button
                                className="btn btn--primary btn--sm"
                                onClick={handleAddNode}
                                disabled={!newNode.name || !newNode.modelId || !newNode.prompt}
                            >
                                <Save size={14} /> Add Node
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
