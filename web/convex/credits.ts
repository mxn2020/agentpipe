import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

// ── Queries ──────────────────────────────────────────────────

export const getBalance = query({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) return null;

        const account = await ctx.db
            .query("creditAccounts")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (!account) return { balance: 0, totalPurchased: 0, totalUsed: 0 };

        return {
            balance: account.balance,
            totalPurchased: account.totalPurchased,
            totalUsed: account.totalUsed,
            lastTopUpAt: account.lastTopUpAt,
        };
    },
});

export const getTransactionHistory = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, { limit }) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) return [];

        return await ctx.db
            .query("creditTransactions")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .order("desc")
            .take(limit ?? 50);
    },
});

// ── Internal Mutations ───────────────────────────────────────

export const ensureAccount = internalMutation({
    args: { userId: v.string() },
    handler: async (ctx, { userId }) => {
        const existing = await ctx.db
            .query("creditAccounts")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (!existing) {
            await ctx.db.insert("creditAccounts", {
                userId,
                balance: 0,
                totalPurchased: 0,
                totalUsed: 0,
            });
        }
    },
});

export const addCredits = internalMutation({
    args: {
        userId: v.string(),
        amount: v.number(),
        description: v.string(),
        metadata: v.optional(v.string()),
    },
    handler: async (ctx, { userId, amount, description, metadata }) => {
        const account = await ctx.db
            .query("creditAccounts")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (!account) throw new Error("Credit account not found");
        if (amount <= 0) throw new Error("Amount must be positive");

        const newBalance = account.balance + amount;

        await ctx.db.patch(account._id, {
            balance: newBalance,
            totalPurchased: account.totalPurchased + amount,
            lastTopUpAt: Date.now(),
        });

        await ctx.db.insert("creditTransactions", {
            userId,
            type: "purchase",
            amount,
            balanceAfter: newBalance,
            description,
            metadata,
            createdAt: Date.now(),
        });

        return { newBalance };
    },
});

// ── Available Models ─────────────────────────────────────────

export const getAvailableModels = query({
    args: { type: v.optional(v.string()) },
    handler: async (ctx, { type }) => {
        if (type) {
            return await ctx.db
                .query("availableModels")
                .withIndex("by_type", (q) => q.eq("type", type as any))
                .collect();
        }
        return await ctx.db.query("availableModels").collect();
    },
});

export const seedDefaultModels = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();
        if (profile?.role !== "admin") throw new Error("Admin only");

        const existing = await ctx.db.query("availableModels").first();
        if (existing) return { seeded: false };

        const models = [
            // Text models
            { modelId: "gpt-4o", displayName: "GPT-4o", provider: "openai", type: "text" as const, description: "Best overall text model", costPerUnit: 2, unit: "request" },
            { modelId: "gpt-4o-mini", displayName: "GPT-4o Mini", provider: "openai", type: "text" as const, description: "Fast and affordable text model", costPerUnit: 1, unit: "request" },
            { modelId: "claude-3.5-sonnet", displayName: "Claude 3.5 Sonnet", provider: "anthropic", type: "text" as const, description: "Excellent reasoning and writing", costPerUnit: 2, unit: "request" },
            // Image models
            { modelId: "dall-e-3", displayName: "DALL-E 3", provider: "openai", type: "image" as const, description: "High-quality image generation", costPerUnit: 5, unit: "image" },
            { modelId: "stable-diffusion-xl", displayName: "Stable Diffusion XL", provider: "stability", type: "image" as const, description: "Open-source image generation", costPerUnit: 3, unit: "image" },
            { modelId: "flux-pro", displayName: "Flux Pro", provider: "black-forest-labs", type: "image" as const, description: "State-of-the-art image generation", costPerUnit: 4, unit: "image" },
            // Audio models
            { modelId: "tts-1-hd", displayName: "OpenAI TTS HD", provider: "openai", type: "audio" as const, description: "High quality text-to-speech", costPerUnit: 2, unit: "minute" },
            { modelId: "elevenlabs-multilingual", displayName: "ElevenLabs Multilingual", provider: "elevenlabs", type: "audio" as const, description: "Best natural speech synthesis", costPerUnit: 4, unit: "minute" },
            // Video models
            { modelId: "runway-gen3", displayName: "Runway Gen-3 Alpha", provider: "runway", type: "video" as const, description: "AI video generation from text/image", costPerUnit: 15, unit: "second" },
            { modelId: "kling-1.5", displayName: "Kling 1.5", provider: "kling", type: "video" as const, description: "Video generation from text or image", costPerUnit: 12, unit: "second" },
            // Object/structured output
            { modelId: "gpt-4o-structured", displayName: "GPT-4o Structured", provider: "openai", type: "object" as const, description: "Structured JSON output", costPerUnit: 2, unit: "request" },
        ];

        for (const model of models) {
            await ctx.db.insert("availableModels", {
                ...model,
                isActive: true,
                createdAt: Date.now(),
            });
        }

        return { seeded: true, count: models.length };
    },
});

// ── Subscription Tier Seed ───────────────────────────────────

export const seedSubscriptionTiers = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();
        if (profile?.role !== "admin") throw new Error("Admin only");

        const existing = await ctx.db.query("subscriptionTiers").first();
        if (existing) return { seeded: false };

        const tiers = [
            {
                name: "free",
                displayName: "Free",
                priceUsd: 0,
                maxWorkflows: 3,
                maxNodesPerWorkflow: 5,
                features: ["3 workflows", "5 nodes each", "Marketplace access", "Community support"],
                isActive: true,
                sortOrder: 1,
            },
            {
                name: "pro",
                displayName: "Pro",
                priceUsd: 29,
                maxWorkflows: 10,
                maxNodesPerWorkflow: 20,
                features: ["10 workflows", "20 nodes each", "Priority support", "Analytics", "Custom branding"],
                isActive: true,
                sortOrder: 2,
            },
            {
                name: "max",
                displayName: "Max",
                priceUsd: 99,
                maxWorkflows: -1,
                maxNodesPerWorkflow: -1,
                features: ["Unlimited workflows", "Unlimited nodes", "Dedicated support", "API access", "White-label", "Advanced analytics"],
                isActive: true,
                sortOrder: 3,
            },
        ];

        for (const tier of tiers) {
            await ctx.db.insert("subscriptionTiers", tier);
        }

        return { seeded: true };
    },
});
