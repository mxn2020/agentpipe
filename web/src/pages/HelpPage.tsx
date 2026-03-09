import { useState } from 'react'

const FAQ_ITEMS = [
    {
        q: "What is AgentPipe?",
        a: "AgentPipe is an AI-powered application that helps you work smarter. Build, sell & run AI processing workflows"
    },
    {
        q: "What AI models do you use?",
        a: "We use state-of-the-art language models through NVIDIA NIMs for all AI features."
    },
    {
        q: "Is there a free plan?",
        a: "Yes! The free plan includes basic features with limited monthly usage. Upgrade to Pro for unlimited access."
    },
    {
        q: "How do I cancel my subscription?",
        a: "Go to Settings → Manage Billing. You can cancel anytime and keep access until the end of your billing period."
    },
    {
        q: "Is my data secure?",
        a: "Yes. We use Convex for our backend, which provides enterprise-grade security, encryption, and access controls."
    },
]

export default function HelpPage() {
    const [openIdx, setOpenIdx] = useState<number | null>(null)

    return (
        <div className="help-page">
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl, 48px)' }}>
                <h1>❓ Help Center</h1>
                <p style={{ color: 'var(--color-smoke-gray, #999)', fontSize: '1.1rem', marginTop: '8px' }}>
                    Got questions? We've got answers.
                </p>
            </div>

            <div className="faq-list">
                {FAQ_ITEMS.map((item, i) => (
                    <div
                        key={i}
                        className={`faq-item ${openIdx === i ? 'faq-item--open' : ''}`}
                        onClick={() => setOpenIdx(openIdx === i ? null : i)}
                    >
                        <div className="faq-item__question">
                            <span>{item.q}</span>
                            <span className="faq-item__icon">{openIdx === i ? '−' : '+'}</span>
                        </div>
                        {openIdx === i && (
                            <div className="faq-item__answer">{item.a}</div>
                        )}
                    </div>
                ))}
            </div>

            <div className="help-contact" style={{ textAlign: 'center', marginTop: 'var(--space-2xl, 48px)' }}>
                <h2>Still need help?</h2>
                <p style={{ color: 'var(--color-smoke-gray, #999)', marginTop: '8px', marginBottom: '16px' }}>
                    Reach out to us and we'll get back to you ASAP.
                </p>
                <a href="mailto:support@example.com" className="btn btn--primary">
                    📧 Contact Support
                </a>
            </div>
        </div>
    )
}
