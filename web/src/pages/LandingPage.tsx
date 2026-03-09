import { useState } from 'react'
import { Workflow, Sparkles, Zap, Globe, ShoppingBag, Star, ArrowRight, ChevronDown, CreditCard, Layers, Bot, Image, Video, Volume2, FileText } from 'lucide-react'

const TIERS = [
    {
        name: 'Free',
        price: '$0',
        period: 'forever',
        badge: null,
        features: ['3 workflows', '5 nodes each', 'Marketplace access', 'Community support'],
        accent: 'var(--color-smoke-gray)',
    },
    {
        name: 'Pro',
        price: '$29',
        period: '/month',
        badge: 'Popular',
        features: ['10 workflows', '20 nodes each', 'Priority support', 'Analytics', 'Custom branding'],
        accent: 'var(--color-accent)',
    },
    {
        name: 'Max',
        price: '$99',
        period: '/month',
        badge: 'Best Value',
        features: ['Unlimited workflows', 'Unlimited nodes', 'Dedicated support', 'API access', 'White-label', 'Advanced analytics'],
        accent: 'var(--color-warm-amber)',
    },
]

const CAPABILITIES = [
    { icon: <FileText size={32} />, title: 'Text Generation', desc: 'GPT-4o, Claude 3.5, and more LLMs for text processing and generation.' },
    { icon: <Image size={32} />, title: 'Image Generation', desc: 'DALL-E 3, Stable Diffusion XL, Flux Pro for stunning visuals.' },
    { icon: <Volume2 size={32} />, title: 'Audio Generation', desc: 'OpenAI TTS, ElevenLabs for natural speech synthesis.' },
    { icon: <Video size={32} />, title: 'Video Generation', desc: 'Runway Gen-3, Kling 1.5 for AI video creation.' },
    { icon: <Bot size={32} />, title: 'Structured Output', desc: 'JSON schema-based structured data extraction.' },
    { icon: <Layers size={32} />, title: 'Node Chaining', desc: 'Output of one node feeds into the next — build complex pipelines.' },
]

export default function LandingPage() {
    const [openFaq, setOpenFaq] = useState<number | null>(null)

    const faqs = [
        {
            q: 'How does the node-based workflow system work?',
            a: 'Each workflow is a chain of processing nodes. Each node performs one AI operation (text, image, audio, video, or structured JSON). The output of one node can be used as context for the next — for example, generate a blog post → create an image from it → narrate it with TTS.',
        },
        {
            q: 'How does the marketplace work?',
            a: 'Creators build workflows and set a credit price. When someone runs your workflow from the marketplace, they pay your price. You earn 80% of the credits, the platform keeps 20%.',
        },
        {
            q: 'What do test runs cost?',
            a: 'Test runs cost the estimated model cost in credits. You pay for the actual AI usage while perfecting your workflow before publishing.',
        },
        {
            q: 'How does context chaining work for video?',
            a: 'For video generation nodes, you can use the last or first frame of a previous video node as context. This allows smooth scene transitions and continuations.',
        },
        {
            q: 'What is the structured output (object) node?',
            a: 'Object nodes let you define a JSON schema alongside your prompt. The AI outputs structured data matching your schema. You can then select any JSON key to use as context for subsequent nodes.',
        },
    ]

    return (
        <div className="landing-page">
            {/* ── Hero ────────────────────────────────────── */}
            <section className="landing-hero">
                <div className="landing-hero__content">
                    <div className="landing-hero__badge">
                        <Workflow size={14} />
                        <span>AI Workflow Platform</span>
                    </div>
                    <h1 className="landing-hero__title">
                        Build, Sell & Run<br />
                        <span className="landing-hero__title-accent">AI Processing Workflows</span>
                    </h1>
                    <p className="landing-hero__tagline">
                        Create node-based AI workflows with text, image, audio, and video models.
                        Publish to the marketplace and earn credits from every run.
                    </p>
                    <div className="landing-hero__actions">
                        <a href="/login" className="btn btn--primary btn--lg">
                            <Zap size={20} />
                            Start Building Free
                        </a>
                        <a href="#marketplace" className="btn btn--secondary btn--lg">
                            <ShoppingBag size={20} />
                            Browse Marketplace
                        </a>
                    </div>
                </div>
            </section>

            {/* ── Capabilities ────────────────────────────── */}
            <section className="landing-features">
                <h2 className="landing-section__title">AI Models at Your Fingertips</h2>
                <div className="landing-features__grid">
                    {CAPABILITIES.map((cap) => (
                        <div key={cap.title} className="landing-feature">
                            <div className="landing-feature__icon" style={{ color: 'var(--color-accent)' }}>
                                {cap.icon}
                            </div>
                            <h3>{cap.title}</h3>
                            <p>{cap.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── How It Works ────────────────────────────── */}
            <section className="landing-features">
                <h2 className="landing-section__title">How It Works</h2>
                <div className="landing-steps">
                    {[
                        { icon: <Layers size={28} />, title: 'Design Your Workflow', desc: 'Add nodes for text, image, audio, or video generation. Chain them together with context mapping.' },
                        { icon: <Zap size={28} />, title: 'Test & Refine', desc: 'Run test executions with your own credits. Fine-tune prompts and model selections.' },
                        { icon: <ShoppingBag size={28} />, title: 'Publish & Earn', desc: 'Set your price and publish to the marketplace. Earn 80% of credits from every run.' },
                    ].map((step, i) => (
                        <div key={i} className="landing-step">
                            <div className="landing-step__number">{i + 1}</div>
                            <div className="landing-step__icon">{step.icon}</div>
                            <h3>{step.title}</h3>
                            <p>{step.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Pricing ─────────────────────────────────── */}
            <section className="landing-features" id="pricing">
                <h2 className="landing-section__title">Plans</h2>
                <p className="landing-section__subtitle">
                    Start free. Upgrade for more workflows and nodes.
                </p>
                <div className="pricing-grid">
                    {TIERS.map((tier) => (
                        <div
                            key={tier.name}
                            className={`pricing-card ${tier.badge === 'Popular' ? 'pricing-card--popular' : ''}`}
                        >
                            {tier.badge && <div className="pricing-card__badge">{tier.badge}</div>}
                            <div className="pricing-card__header">
                                <h3>{tier.name}</h3>
                                <div className="pricing-card__price">
                                    <span className="pricing-card__amount">{tier.price}</span>
                                    <span className="pricing-card__period">{tier.period}</span>
                                </div>
                            </div>
                            <ul className="pricing-card__features">
                                {tier.features.map((f) => (
                                    <li key={f}>
                                        <Sparkles size={14} style={{ color: tier.accent }} /> {f}
                                    </li>
                                ))}
                            </ul>
                            <a href="/login" className="btn btn--primary" style={{ width: '100%', justifyContent: 'center' }}>
                                Get Started
                            </a>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Marketplace Preview ─────────────────────── */}
            <section className="landing-features" id="marketplace">
                <h2 className="landing-section__title">Marketplace</h2>
                <p className="landing-section__subtitle">
                    Browse and run community workflows. Or publish your own and earn credits.
                </p>
                <div className="landing-features__grid">
                    {[
                        { title: 'Blog Post Generator', desc: 'Generate SEO-optimized blog posts with images and meta descriptions.', nodes: 4, runs: '1.2k', rating: 4.8, price: 15 },
                        { title: 'Social Media Pack', desc: 'Create matching posts for Twitter, Instagram, and LinkedIn from one brief.', nodes: 6, runs: '890', rating: 4.6, price: 20 },
                        { title: 'Product Video Creator', desc: 'Generate product showcase videos from text descriptions and images.', nodes: 5, runs: '340', rating: 4.9, price: 35 },
                    ].map((w) => (
                        <div key={w.title} className="landing-feature" style={{ textAlign: 'left' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <h3 style={{ margin: 0 }}>{w.title}</h3>
                                <span style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: '0.9rem' }}>{w.price} cr</span>
                            </div>
                            <p>{w.desc}</p>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--color-smoke-gray)', marginTop: '12px' }}>
                                <span><Layers size={12} /> {w.nodes} nodes</span>
                                <span><Zap size={12} /> {w.runs} runs</span>
                                <span><Star size={12} style={{ color: 'var(--color-warm-amber)' }} /> {w.rating}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── FAQ ─────────────────────────────────────── */}
            <section className="landing-features">
                <h2 className="landing-section__title">FAQ</h2>
                <div className="faq-list">
                    {faqs.map((faq, i) => (
                        <div
                            key={i}
                            className={`faq-item ${openFaq === i ? 'faq-item--open' : ''}`}
                            onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        >
                            <div className="faq-item__question">
                                {faq.q}
                                <ChevronDown
                                    size={18}
                                    className="faq-item__icon"
                                    style={{
                                        transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0)',
                                        transition: 'transform 0.2s',
                                    }}
                                />
                            </div>
                            {openFaq === i && <div className="faq-item__answer">{faq.a}</div>}
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CTA ─────────────────────────────────────── */}
            <section className="landing-cta">
                <h2>Build Your First AI Workflow</h2>
                <p>Free tier includes 3 workflows with up to 5 nodes each. No credit card required.</p>
                <a href="/login" className="btn btn--primary btn--lg">
                    <Zap size={20} />
                    Start Building Free
                </a>
            </section>
        </div>
    )
}
