import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const LOG_LEVELS = v.union(
    v.literal("debug"),
    v.literal("info"),
    v.literal("warn"),
    v.literal("error")
);

export const log = mutation({
    args: {
        level: LOG_LEVELS,
        message: v.string(),
        context: v.optional(v.any()),
        component: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        let userId = null;
        try {
            userId = await getAuthUserId(ctx);
        } catch {
            // Ignore auth errors for background/system logs
        }

        return await ctx.db.insert("devLogs", {
            level: args.level,
            message: args.message,
            context: args.context !== undefined ? JSON.stringify(args.context) : undefined,
            component: args.component || 'system',
            userId: userId ?? undefined,
        });
    },
});

export const list = query({
    args: {
        limit: v.optional(v.number()),
        level: v.optional(LOG_LEVELS),
        component: v.optional(v.string()),
    },
    handler: async (ctx: any, args: any) => {
        // Must be admin to view dev logs
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q: any) => q.eq("userId", userId))
            .first();

        if (profile?.role !== "admin") return [];

        const limit = args.limit ?? 100;
        let q = ctx.db.query("devLogs").order("desc");

        if (args.level) {
            q = ctx.db.query("devLogs")
                .withIndex("by_level", (q: any) => q.eq("level", args.level!))
                .order("desc");
        }

        const rawLogs = await q.take(limit);

        // Filter by component in memory if needed (and if we aren't already filtering by level using the index)
        let filteredLogs = rawLogs;
        if (args.component) {
            filteredLogs = filteredLogs.filter((log: any) => log.component === args.component);
        }

        return filteredLogs;
    },
});

// CRON job target to clean up old logs
export const clearOldLogs = internalMutation({
    args: {
        daysToKeep: v.optional(v.number()),
    },
    handler: async (ctx: any, args: any) => {
        const days = args.daysToKeep ?? 7;
        const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);

        // Find standard logs older than the cutoff
        const oldLogs = await ctx.db
            .query("devLogs")
            .withIndex("by_creation_time", (q: any) => q.lt("_creationTime", cutoffTime))
            .take(500); // Batch delete to avoid hitting convex mutation limits

        let deletedCount = 0;
        for (const log of oldLogs) {
            // We might want to retain errors longer, so skip them if they are errors
            if (log.level !== 'error') {
                await ctx.db.delete(log._id);
                deletedCount++;
            }
        }

        console.log(`Cleared ${deletedCount} old dev logs.`);
        return deletedCount;
    },
});
