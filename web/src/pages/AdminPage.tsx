import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { SkeletonCard } from '../components/Skeleton'
import { Select, Textarea } from '@geenius-ui/react-css'

export default function AdminPage() {
    const prompts = useQuery(api.prompts.getPrompts)
    const updatePrompt = useMutation(api.prompts.updatePrompt)
    const seedPrompts = useMutation(api.prompts.seedPrompts)
    const [editingPrompt, setEditingPrompt] = useState<string | null>(null)
    const [promptDraft, setPromptDraft] = useState<string>('')
    const [activeTab, setActiveTab] = useState<'prompts' | 'users'>('prompts')

    const users = useQuery(api.users.listUsers)
    const setRole = useMutation(api.users.setRole)

    return (
        <div className="admin-page">
            <h1>⚙️ Admin Dashboard</h1>

            <div className="admin-tabs">
                <button
                    className={`admin-tab ${activeTab === 'prompts' ? 'admin-tab--active' : ''}`}
                    onClick={() => setActiveTab('prompts')}
                >
                    📝 Prompt Management
                </button>
                <button
                    className={`admin-tab ${activeTab === 'users' ? 'admin-tab--active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    👥 User Management
                </button>
            </div>

            {activeTab === 'prompts' && (
                <div className="admin-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2>📝 System Prompts CMS</h2>
                        <button className="btn btn--secondary" style={{ fontSize: '0.85rem' }} onClick={() => seedPrompts({})}>
                            🌱 Seed Defaults
                        </button>
                    </div>
                    <p style={{ color: '#999', marginBottom: '16px' }}>
                        Edit the exact prompts sent to the LLMs. Changes take effect immediately.
                    </p>

                    <div className="admin-prompts">
                        {prompts?.map((prompt: any) => (
                            <div key={prompt._id} className="admin-prompt-card">
                                <div className="admin-prompt-header">
                                    <div>
                                        <h3>{prompt.name}</h3>
                                        <div className="admin-prompt-desc">{prompt.description}</div>
                                    </div>
                                    <div className="admin-prompt-meta">
                                        Last updated: {new Date(prompt.updatedAt).toLocaleString()}
                                    </div>
                                </div>

                                {editingPrompt === prompt.promptId ? (
                                    <div className="admin-prompt-editor">
                                        <Textarea
                                            value={promptDraft}
                                            onChange={(e) => setPromptDraft(e.target.value)}
                                            rows={8}
                                        />
                                        <div className="admin-prompt-actions" style={{ marginTop: '12px' }}>
                                            <button className="btn btn--secondary" style={{ fontSize: '0.85rem' }} onClick={() => setEditingPrompt(null)}>
                                                Cancel
                                            </button>
                                            <button
                                                className="btn btn--primary" style={{ fontSize: '0.85rem' }}
                                                onClick={async () => {
                                                    await updatePrompt({ id: prompt._id, content: promptDraft })
                                                    setEditingPrompt(null)
                                                }}
                                            >
                                                Save Prompt
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="admin-prompt-view">
                                        <pre className="admin-prompt-content">{prompt.content}</pre>
                                        <button
                                            className="btn btn--secondary" style={{ fontSize: '0.85rem' }}
                                            onClick={() => {
                                                setPromptDraft(prompt.content)
                                                setEditingPrompt(prompt.promptId)
                                            }}
                                        >
                                            Edit Prompt
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="admin-section">
                    <h2>👥 User Management</h2>
                    <p style={{ color: '#999', marginBottom: '16px' }}>
                        Manage users and their roles.
                    </p>

                    <div className="admin-users">
                        {users === undefined ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <SkeletonCard />
                                <SkeletonCard />
                            </div>
                        ) : users.length === 0 ? (
                            <p style={{ color: '#666' }}>No users found (or you're not an admin).</p>
                        ) : (
                            users.map((user: any) => (
                                <div key={user._id} className="admin-user-card">
                                    <div>
                                        <strong>{user.name || 'Unnamed'}</strong>
                                        <span style={{ color: '#999', marginLeft: '8px' }}>{user.role}</span>
                                    </div>
                                    <div>
                                        <Select
                                            value={user.role}
                                            onChange={(e) => setRole({ profileId: user._id, role: e.target.value as any })}
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                        </Select>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
