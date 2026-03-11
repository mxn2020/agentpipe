import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AuthGuard, RedirectIfAuth } from './components/AuthGuard'
import { SubscriptionGuard } from './components/SubscriptionGuard'
import CookieBanner from './components/CookieBanner'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import HelpPage from './pages/HelpPage'
import MyWorkflowsPage from './pages/MyWorkflowsPage'
import WorkflowBuilderPage from './pages/WorkflowBuilderPage'
import SettingsPage from './pages/SettingsPage'
import NotFoundPage from './pages/NotFoundPage'
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'
import ProfilePage from './pages/ProfilePage'
import AuditLogsPage from './pages/AuditLogsPage'
import LogsPage from './pages/LogsPage'

function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <Layout>
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/login" element={<RedirectIfAuth><LoginPage /></RedirectIfAuth>} />
                        <Route path="/help" element={<HelpPage />} />
                        <Route path="/terms" element={<TermsPage />} />
                        <Route path="/privacy" element={<PrivacyPage />} />
                        {/* App routes */}
                        <Route path="/workflows" element={<AuthGuard><MyWorkflowsPage /></AuthGuard>} />
                        <Route path="/workflows/:id" element={<AuthGuard><WorkflowBuilderPage /></AuthGuard>} />
                        <Route path="/profile" element={<AuthGuard><ProfilePage /></AuthGuard>} />
                        <Route path="/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
                        {/* Admin routes */}
                        <Route path="/audit-logs" element={<AuthGuard><SubscriptionGuard><AuditLogsPage /></SubscriptionGuard></AuthGuard>} />
                        <Route path="/logs" element={<AuthGuard><SubscriptionGuard><LogsPage /></SubscriptionGuard></AuthGuard>} />
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                    <CookieBanner />
                </Layout>
            </BrowserRouter>
            <Toaster position="bottom-right" />
        </ErrorBoundary>
    )
}

export default App
