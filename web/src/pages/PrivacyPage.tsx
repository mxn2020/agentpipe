export default function PrivacyPage() {
    return (
        <div className="legal-page">
            <h1>Privacy Policy</h1>
            <p className="legal-page__updated">Last updated: {"{{ YEAR }}"}</p>

            <section>
                <h2>1. Information We Collect</h2>
                <p>We collect your email address and name when you create an account. We also collect usage data to improve our services.</p>
            </section>

            <section>
                <h2>2. How We Use Your Information</h2>
                <p>We use your information to provide and improve {"{{ APP_NAME }}"}, process payments, and communicate with you about your account.</p>
            </section>

            <section>
                <h2>3. AI Data Processing</h2>
                <p>Inputs and outputs from AI interactions are logged for quality assurance and service improvement. Logs are retained for a limited period.</p>
            </section>

            <section>
                <h2>4. Third-Party Services</h2>
                <p>We use Stripe for payment processing, Convex for data storage, NVIDIA for AI processing, and Vercel for hosting and analytics.</p>
            </section>

            <section>
                <h2>5. Data Security</h2>
                <p>We implement industry-standard security measures to protect your data. All data is encrypted in transit and at rest.</p>
            </section>

            <section>
                <h2>6. Your Rights</h2>
                <p>You can request deletion of your account and all associated data at any time via the Settings page.</p>
            </section>

            <section>
                <h2>7. Contact</h2>
                <p>For privacy-related questions, please contact us at privacy@example.com.</p>
            </section>
        </div>
    )
}
