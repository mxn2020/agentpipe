import { useState, useEffect } from 'react'

const COOKIE_KEY = 'agentpipe-cookie-consent'

export default function CookieBanner() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const consent = localStorage.getItem(COOKIE_KEY)
        if (!consent) {
            const timer = setTimeout(() => setVisible(true), 1500)
            return () => clearTimeout(timer)
        }
    }, [])

    const accept = () => {
        localStorage.setItem(COOKIE_KEY, 'accepted')
        setVisible(false)
    }

    const decline = () => {
        localStorage.setItem(COOKIE_KEY, 'declined')
        setVisible(false)
    }

    if (!visible) return null

    return (
        <div className="cookie-banner">
            <div className="cookie-banner__content">
                <p className="cookie-banner__text">
                    🍪 We use cookies to improve your experience. By continuing, you agree to our{' '}
                    <a href="/privacy">Privacy Policy</a>.
                </p>
                <div className="cookie-banner__actions">
                    <button className="btn btn--ghost cookie-banner__btn" onClick={decline}>
                        Decline
                    </button>
                    <button className="btn btn--primary cookie-banner__btn" onClick={accept}>
                        Accept
                    </button>
                </div>
            </div>
        </div>
    )
}
