import { Sparkles } from 'lucide-react'

/**
 * This is the main app page — the user's primary workspace.
 * Replace this with your app-specific functionality.
 */
export default function AppHome() {
    return (
        <div className="app-home">
            <div className="app-home__hero">
                <Sparkles size={48} style={{ color: 'var(--color-accent)' }} />
                <h1>Welcome to {"{{ APP_NAME }}"}</h1>
                <p style={{ color: 'var(--color-smoke-gray)', maxWidth: '600px', margin: '16px auto 0', lineHeight: 1.7 }}>
                    This is your main application page. Replace this content with your app-specific features
                    and functionality. The boilerplate includes authentication, payments, admin tools, and
                    AI integration — everything you need to build a production-ready AI app.
                </p>
            </div>

            <div className="app-home__cards">
                <div className="app-home__card">
                    <h3>🔐 Authentication</h3>
                    <p>Email/password auth with Convex Auth. Profile management included.</p>
                </div>
                <div className="app-home__card">
                    <h3>💳 Payments</h3>
                    <p>Stripe integration with checkout, portal, and webhook handling.</p>
                </div>
                <div className="app-home__card">
                    <h3>🤖 AI Pipeline</h3>
                    <p>NVIDIA NIM integration with logging, rate limiting, and prompt CMS.</p>
                </div>
                <div className="app-home__card">
                    <h3>⚙️ Admin Panel</h3>
                    <p>User management, prompt editing, and audit log viewer.</p>
                </div>
            </div>
        </div>
    )
}
