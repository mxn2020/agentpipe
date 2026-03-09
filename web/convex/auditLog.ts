import { mutation, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

export const log = mutation({
    args: {
        action: v.string(),
        category: v.union(v.literal("auth"), v.literal("admin"), v.literal("system"), v.literal("billing")),
        targetId: v.optional(v.string()),
        details: v.string(),
    },
    handler: async (ctx, { action, category, targetId, details }) => {
        const userId = await auth.getUserId(ctx);
        await ctx.db.insert("auditLogs", {
            action,
            category,
            userId: userId ?? undefined,
            targetId,
            details,
            timestamp: Date.now(),
        });
    },
});

export const logSystem = internalMutation({
    args: {
        action: v.string(),
        category: v.union(v.literal("auth"), v.literal("admin"), v.literal("system"), v.literal("billing")),
        userId: v.optional(v.string()),
        targetId: v.optional(v.string()),
        details: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("auditLogs", {
            ...args,
            timestamp: Date.now(),
        });
    },
});

export const list = query({
    args: {
        category: v.optional(v.union(v.literal("auth"), v.literal("admin"), v.literal("system"), v.literal("billing"))),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { category, limit }) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) return [];

        const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (profile?.role !== "admin") return [];

        const maxResults = limit ?? 100;

        if (category) {
            return await ctx.db
                .query("auditLogs")
                .withIndex("by_category", (q) => q.eq("category", category))
                .order("desc")
                .take(maxResults);
        }

        return await ctx.db
            .query("auditLogs")
            .order("desc")
            .take(maxResults);
    },
});

export const stats = query({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) return null;

        const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (profile?.role !== "admin") return null;

        const last24h = Date.now() - 24 * 60 * 60 * 1000;
        const recentLogs = await ctx.db
            .query("auditLogs")
            .withIndex("by_timestamp", (q) => q.gte("timestamp", last24h))
            .collect();

        const byCategory: Record<string, number> = {};
        for (const log of recentLogs) {
            byCategory[log.category] = (byCategory[log.category] ?? 0) + 1;
        }

        return {
            total24h: recentLogs.length,
            byCategory,
        };
    },
});
