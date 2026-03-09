# {{APP_NAME}} — API Design

Document your API endpoints and data contracts here.

## Convex Functions

### Queries
- `users.getMe` — Get current user profile
- `stripe.getSubscription` — Get current subscription status
- `auditLog.list` — List audit logs (admin)
- `modelCosts.getAll` — Get model pricing

### Mutations
- `users.ensureProfile` — Create profile on first login
- `users.updateProfile` — Update display name
- `users.deleteAccount` — Delete account + all data
- `prompts.updatePrompt` — Edit an AI prompt

### Actions
- `stripe.createCheckoutSession` — Start Stripe checkout
- `stripe.createPortalSession` — Open Stripe portal
