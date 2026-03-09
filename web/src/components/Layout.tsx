import { useState, useEffect, type ReactNode } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom' // Added useLocation
import { useConvexAuth, useQuery, useMutation } from 'convex/react'
import { useAuthActions } from "@convex-dev/auth/react"
import { api } from '../../convex/_generated/api'
import { Sparkles, Menu, X } from 'lucide-react'
import { useDevLogger } from '../hooks/useDevLogger' // Added this import

interface LayoutProps {
    children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
    const { isAuthenticated } = useConvexAuth()
    const { signOut } = useAuthActions()
    const me = useQuery(api.users.getMe)
    const ensureProfile = useMutation(api.users.ensureProfile)
    const navigate = useNavigate()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const location = useLocation() // Added this
    const logger = useDevLogger('Layout') // Added this

    // Auto-create profile if authenticated user doesn't have one
    useEffect(() => {
        logger.debug('Layout mounted', { context: { path: location.pathname } });
        if (isAuthenticated) {
            ensureProfile()
                .catch(err => console.error("Failed to ensure profile:", err))
        }
    }, [isAuthenticated, ensureProfile, location.pathname, logger])

    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [mobileMenuOpen])

    return (
        <div className="app">
            <header className="app__header">
                <Link to="/" className="app__logo">
                    <Sparkles className="app__logo-icon" />
                    {"{{ APP_NAME }}"}
                </Link>

                <button
                    className="app__mobile-toggle"
                    onClick={() => setMobileMenuOpen(o => !o)}
                    aria-label="Toggle menu"
                >
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                <nav className={`app__nav ${mobileMenuOpen ? 'app__nav--open' : ''}`}>
                    <Link to="/" className="app__nav-link" onClick={() => setMobileMenuOpen(false)}>Home</Link>
                    {isAuthenticated && <Link to="/app" className="app__nav-link" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>}
                    <Link to="/pricing" className="app__nav-link" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
                    <Link to="/help" className="app__nav-link" onClick={() => setMobileMenuOpen(false)}>Help</Link>
                    {isAuthenticated && <Link to="/profile" className="app__nav-link" onClick={() => setMobileMenuOpen(false)}>Profile</Link>}
                    {isAuthenticated && me?.role === 'admin' && (
                        <>
                            <Link to="/admin" className="app__nav-link" onClick={() => setMobileMenuOpen(false)}>⚙️ Admin</Link>
                            <Link to="/admin/stripe" className="app__nav-link" onClick={() => setMobileMenuOpen(false)}>💳 Billing</Link>
                            <Link to="/audit-logs" className="app__nav-link" onClick={() => setMobileMenuOpen(false)}>📋 Logs</Link>
                            <Link to="/model-tests" className="app__nav-link" onClick={() => setMobileMenuOpen(false)}>🧪 Models</Link>
                        </>
                    )}
                    {isAuthenticated ? (
                        <>
                            <Link to="/settings" className="app__nav-link" onClick={() => setMobileMenuOpen(false)}>Settings</Link>
                            <button className="app__nav-link" onClick={() => { signOut(); navigate('/'); setMobileMenuOpen(false); }}>
                                Sign Out
                            </button>
                        </>
                    ) : (
                        <Link to="/login" className="app__nav-link" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
                    )}
                </nav>
            </header>

            <main className="app__main container" style={{ marginTop: 'var(--space-2xl)', paddingBottom: 'var(--space-3xl)' }}>
                {children}
            </main>

            <footer className="app__footer">
                <p>{"{{ APP_NAME }}"} — AI-powered application</p>
                <div className="app__footer-links">
                    <Link to="/terms">Terms of Service</Link>
                    <Link to="/privacy">Privacy Policy</Link>
                    <Link to="/help">Help</Link>
                </div>
            </footer>
        </div>
    )
}
