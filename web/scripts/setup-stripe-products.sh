#!/bin/bash
# ============================================================
# {{APP_NAME}} — Stripe Product Setup Script
# Run this once to create all Products & Prices in your Stripe account.
# Requires: stripe CLI logged in (`stripe login`)
# ============================================================

set -euo pipefail

APP="{{APP_SLUG}}"
echo "🚀 Setting up Stripe products for {{APP_NAME}}..."
echo ""

# -----------------------------------------------------------
# 1. Pro Subscription — $9/mo
# -----------------------------------------------------------
echo "Creating: {{APP_NAME}} Pro (\$9/mo subscription)..."
PRO_PRODUCT=$(stripe products create \
  --name="{{APP_NAME}} Pro" \
  --description="Unlimited access, all features, priority support" \
  -d "metadata[app]=$APP" \
  --format=json | grep -o '"id": "prod_[^"]*"' | head -1 | cut -d'"' -f4)

PRO_PRICE=$(stripe prices create \
  --product="$PRO_PRODUCT" \
  --unit-amount=900 \
  --currency=usd \
  -d "recurring[interval]=month" \
  -d "metadata[app]=$APP" \
  -d "metadata[plan]=pro" \
  --format=json | grep -o '"id": "price_[^"]*"' | head -1 | cut -d'"' -f4)

echo "  ✅ Product: $PRO_PRODUCT"
echo "  ✅ Price:   $PRO_PRICE"
echo ""

# -----------------------------------------------------------
# 2. Enterprise Subscription — $29/mo
# -----------------------------------------------------------
echo "Creating: {{APP_NAME}} Enterprise (\$29/mo subscription)..."
ENT_PRODUCT=$(stripe products create \
  --name="{{APP_NAME}} Enterprise" \
  --description="Everything in Pro + API access, team features, dedicated support" \
  -d "metadata[app]=$APP" \
  --format=json | grep -o '"id": "prod_[^"]*"' | head -1 | cut -d'"' -f4)

ENT_PRICE=$(stripe prices create \
  --product="$ENT_PRODUCT" \
  --unit-amount=2900 \
  --currency=usd \
  -d "recurring[interval]=month" \
  -d "metadata[app]=$APP" \
  -d "metadata[plan]=enterprise" \
  --format=json | grep -o '"id": "price_[^"]*"' | head -1 | cut -d'"' -f4)

echo "  ✅ Product: $ENT_PRODUCT"
echo "  ✅ Price:   $ENT_PRICE"
echo ""

# -----------------------------------------------------------
# Summary
# -----------------------------------------------------------
echo "============================================================"
echo "🎉 All products created! Add these to your Convex env:"
echo "============================================================"
echo ""
echo "npx convex env set STRIPE_PRICE_PRO $PRO_PRICE"
echo "npx convex env set STRIPE_PRICE_ENTERPRISE $ENT_PRICE"
echo ""
echo "Don't forget to also set:"
echo "  npx convex env set STRIPE_SECRET_KEY rk_live_xxxxx"
echo "  npx convex env set STRIPE_WEBHOOK_SECRET whsec_xxxxx"
echo "  npx convex env set SITE_URL https://your-production-url.com"
echo ""
