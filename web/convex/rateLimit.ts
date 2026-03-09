import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Simple token-bucket rate limiter using the rateLimits table.
 * Configure limits per action below.
 */

const RATE_LIMITS: Record<string, { maxTokens: number; refillPerSecond: number }> = {
    // Add your rate-limited actions here:
    aiCall: { maxTokens: 10, refillPerSecond: 0.05 },       // ~3/min burst
    generate: { maxTokens: 5, refillPerSecond: 0.03 },      // ~5 burst, slower refill
};

export const checkRateLimit = internalMutation({
    args: {
        userId: v.string(),
        action: v.string(),
    },
    handler: async (ctx, { userId, action }) => {
        const config = RATE_LIMITS[action];
        if (!config) return; // No limit configured

        const key = `${userId}:${action}`;
        const existing = await ctx.db
            .query("rateLimits")
            .withIndex("by_key", (q) => q.eq("key", key))
            .first();

        const now = Date.now();

        if (!existing) {
            await ctx.db.insert("rateLimits", {
                key,
                tokens: config.maxTokens - 1,
                lastRefill: now,
            });
            return;
        }

        const elapsed = (now - existing.lastRefill) / 1000;
        const refilled = Math.min(
            config.maxTokens,
            existing.tokens + elapsed * config.refillPerSecond
        );

        if (refilled < 1) {
            throw new Error(
                `Rate limit exceeded for ${action}. Please wait a moment before trying again.`
            );
        }

        await ctx.db.patch(existing._id, {
            tokens: refilled - 1,
            lastRefill: now,
        });
    },
});
