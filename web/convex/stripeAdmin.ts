import { action } from "./_generated/server";
import { v } from "convex/values";

export const listPlans = action({
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

        // Map Stripe objects to our UI-friendly format
        return data.data.map((product: any) => {
            const price = product.default_price;
            let features = [];
            try {
                if (product.metadata && product.metadata.features) {
                    features = JSON.parse(product.metadata.features);
                }
            } catch (e) {
                console.error("Failed to parse features metadata for product", product.id);
            }

            return {
                id: product.id,
                name: product.name,
                description: product.description,
                app: product.metadata?.app,
                planType: product.metadata?.plan,
                active: product.active,
                features,
                price: price ? {
                    id: price.id,
                    amount: price.unit_amount,
                    currency: price.currency,
                    interval: price.recurring?.interval,
                } : null,
            };
        });
    },
});

export const createPlan = action({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        unitAmount: v.number(), // in cents
        currency: v.string(),
        interval: v.optional(v.union(v.literal("month"), v.literal("year"))), // if undefined, it's one-time
        features: v.array(v.string()),
        planKey: v.string(), // e.g. "pro", "enterprise", "topup_40"
        appSlug: v.string(), // "vidiq", "geenius-template", etc.
    },
    handler: async (ctx, args) => {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

        // 1. Create Product
        const productParams = new URLSearchParams({
            name: args.name,
            "metadata[app]": args.appSlug,
            "metadata[plan]": args.planKey,
            "metadata[features]": JSON.stringify(args.features),
        });
        if (args.description) productParams.set("description", args.description);

        const prodResponse = await fetch("https://api.stripe.com/v1/products", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${stripeKey}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: productParams,
        });

        if (!prodResponse.ok) {
            const error = await prodResponse.text();
            throw new Error(`Failed to create product: ${error}`);
        }
        const product = await prodResponse.json();

        // 2. Create Default Price
        const priceParams = new URLSearchParams({
            product: product.id,
            currency: args.currency,
            unit_amount: args.unitAmount.toString(),
            "metadata[app]": args.appSlug,
            "metadata[plan]": args.planKey,
        });

        if (args.interval) {
            priceParams.set("recurring[interval]", args.interval);
        }

        const priceResponse = await fetch("https://api.stripe.com/v1/prices", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${stripeKey}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: priceParams,
        });

        if (!priceResponse.ok) {
            const error = await priceResponse.text();
            throw new Error(`Failed to create price: ${error}`);
        }
        const price = await priceResponse.json();

        // 3. Set Default Price onto Product
        await fetch(`https://api.stripe.com/v1/products/${product.id}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${stripeKey}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                default_price: price.id,
            }),
        });

        return { productId: product.id, priceId: price.id };
    },
});

export const updatePlan = action({
    args: {
        productId: v.string(),
        priceId: v.optional(v.string()), // we need to know what price to check for existing clients
        name: v.string(),
        description: v.optional(v.string()),
        features: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

        // Validation Rule: Do not allow modifications if subscriptions/payments exist for this price
        if (args.priceId) {
            // Check for subscriptions attached to this price
            const subsResponse = await fetch(`https://api.stripe.com/v1/subscriptions?price=${args.priceId}&status=active&limit=1`, {
                method: "GET",
                headers: { Authorization: `Bearer ${stripeKey}` },
            });
            const subsData = await subsResponse.json();

            if (subsData.data && subsData.data.length > 0) {
                throw new Error("Cannot modify a plan that has active clients. Please archive it and create a new version.");
            }

            // Note: You could also check one-time payments if an interval isn't set.
            // But for simplicity, we prevent changing Subscriptions mostly since those are recurring contracts.
        }

        // Apply product updates
        const productParams = new URLSearchParams({
            name: args.name,
            "metadata[features]": JSON.stringify(args.features),
        });
        if (args.description) productParams.set("description", args.description);

        const prodResponse = await fetch(`https://api.stripe.com/v1/products/${args.productId}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${stripeKey}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: productParams,
        });

        if (!prodResponse.ok) {
            const error = await prodResponse.text();
            throw new Error(`Failed to update product: ${error}`);
        }

        return { success: true };
    },
});

export const archivePlan = action({
    args: {
        productId: v.string(),
    },
    handler: async (ctx, args) => {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

        // Mark the product as inactive (archives it from list products call)
        const response = await fetch(`https://api.stripe.com/v1/products/${args.productId}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${stripeKey}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                active: "false",
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to archive product: ${error}`);
        }

        return { success: true };
    },
});
