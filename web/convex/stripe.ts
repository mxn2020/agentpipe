import { action, mutation, internalMutation, query, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { auth } from "./auth";

// ── Helpers ──────────────────────────────────────────────────

async function createOrGetCustomer(
    stripeKey: string,
    userId: string,
    email?: string,
    existingCustomerId?: string,
): Promise<string> {
    if (existingCustomerId) return existingCustomerId;

    const params = new URLSearchParams({
        "metadata[app]": "agentpipe",
        "metadata[userId]": userId,
    });
    if (email) params.set("email", email);

    const response = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${stripeKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Stripe customer creation failed: ${error}`);
    }

    const customer = await response.json();
    return customer.id;
}

// ── Internal Queries ─────────────────────────────────────────

export const getProfileByStripeCustomerId = internalQuery({
    args: { stripeCustomerId: v.string() },
    handler: async (ctx, { stripeCustomerId }) => {
        return await ctx.db
            .query("userProfiles")
            .filter((q) => q.eq(q.field("stripeCustomerId"), stripeCustomerId))
            .first();
    },
});

// ── Queries ──────────────────────────────────────────────────

// Fetch active plans directly from Stripe for the public Pricing page
export const getActivePlans = action({
    args: {},
    handler: async (ctx) => {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

        const response = await fetch("https://api.stripe.com/v1/products?active=true&expand[]=data.default_price", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${stripeKey}`,
            },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Stripe API error: ${error}`);
        }

        const data = await response.json();

        // Map to public facing interface
        return data.data.map((product: any) => {
            const price = product.default_price;
            let features = [];
            try {
                if (product.metadata && product.metadata.features) {
                    features = JSON.parse(product.metadata.features);
                }
            } catch (e) {
                // ignore
            }

            return {
                id: product.id,
                name: product.name,
                description: product.description,
                planKey: product.metadata?.plan || "unknown",
                appSlug: product.metadata?.app || "",
                features,
                price: price ? {
                    id: price.id,
                    amount: price.unit_amount, // in cents
                    currency: price.currency,
                    interval: price.recurring?.interval, // month/year
                } : null,
            };
        });
    },
});

export const getSubscription = query({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) return null;

        const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (!profile) return null;

        return {
            plan: profile.plan ?? "free",
            stripeCustomerId: profile.stripeCustomerId,
        };
    },
});

// ── Mutations ────────────────────────────────────────────────

export const updateSubscription = mutation({
    args: {
        stripeCustomerId: v.string(),
        plan: v.string(),
    },
    handler: async (ctx, { stripeCustomerId, plan }) => {
        const profile = await ctx.db
            .query("userProfiles")
            .filter((q) => q.eq(q.field("stripeCustomerId"), stripeCustomerId))
            .first();

        if (profile) {
            await ctx.db.patch(profile._id, { plan: plan as "free" | "pro" | "max" | "enterprise" });
        }
    },
});

export const setStripeCustomerId = internalMutation({
    args: {
        customerId: v.string(),
        userId: v.string(),
    },
    handler: async (ctx, { customerId, userId }) => {
        const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (profile) {
            await ctx.db.patch(profile._id, { stripeCustomerId: customerId });
        }
    },
});

export const activateSubscription = internalMutation({
    args: {
        userId: v.string(),
        stripeCustomerId: v.string(),
        plan: v.string(),
    },
    handler: async (ctx, { userId, stripeCustomerId, plan }) => {
        const typedPlan = plan as "free" | "pro" | "max" | "enterprise";
        let profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (!profile) {
            console.log(`[activateSubscription] No profile for userId=${userId}, creating one...`);
            await ctx.db.insert("userProfiles", {
                userId,
                name: "",
                role: "user",
                plan: typedPlan,
                stripeCustomerId,
                createdAt: Date.now(),
            });
            return;
        }

        await ctx.db.patch(profile._id, {
            plan: typedPlan,
            stripeCustomerId,
        });
    },
});

// ── Actions ──────────────────────────────────────────────────

export const createCheckoutSession = action({
    args: {
        priceId: v.string(),
        planKey: v.string(), // "pro", "enterprise", etc.
    },
    handler: async (ctx, { priceId, planKey }) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

        const siteUrl = process.env.SITE_URL ?? "http://localhost:5173";

        const profile = await ctx.runQuery(internal.users.getProfileByUserId, { userId });
        const customerId = await createOrGetCustomer(
            stripeKey, userId, undefined, profile?.stripeCustomerId ?? undefined,
        );

        if (!profile?.stripeCustomerId) {
            await ctx.runMutation(internal.stripe.setStripeCustomerId, { customerId, userId });
        }

        const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${stripeKey}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                "mode": "subscription",
                "customer": customerId,
                "success_url": `${siteUrl}/pricing?success=true`,
                "cancel_url": `${siteUrl}/pricing?canceled=true`,
                "line_items[0][price]": priceId,
                "line_items[0][quantity]": "1",
                "metadata[app]": "agentpipe",
                "metadata[userId]": userId,
                "metadata[plan]": planKey,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Stripe error: ${error}`);
        }

        const session = await response.json();
        return { url: session.url };
    },
});

export const createPortalSession = action({
    args: {},
    handler: async (ctx): Promise<{ url: string }> => {
        const userId: string | null = await auth.getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const stripeKey: string | undefined = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

        const siteUrl: string = process.env.SITE_URL ?? "http://localhost:5173";

        const profile = await ctx.runQuery(
            internal.users.getProfileByUserId, { userId }
        );
        if (!profile?.stripeCustomerId) {
            throw new Error("No Stripe customer found. Subscribe first.");
        }

        const portalResponse: globalThis.Response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${stripeKey}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                customer: profile.stripeCustomerId,
                return_url: `${siteUrl}/billing`,
            }),
        });

        if (!portalResponse.ok) {
            const errorText: string = await portalResponse.text();
            throw new Error(`Stripe Portal error: ${errorText}`);
        }

        const portalSession: { url: string } = await portalResponse.json();
        return { url: portalSession.url };
    },
});

export const handleSubscriptionActive = action({
    args: {
        userId: v.string(),
        stripeCustomerId: v.string(),
        plan: v.string(),
    },
    handler: async (ctx, { userId, stripeCustomerId, plan }) => {
        console.log(`[handleSubscriptionActive] userId=${userId}, customerId=${stripeCustomerId}, plan=${plan}`);
        await ctx.runMutation(internal.stripe.activateSubscription, {
            userId,
            stripeCustomerId,
            plan,
        });
        console.log(`[handleSubscriptionActive] Done`);
    },
});
