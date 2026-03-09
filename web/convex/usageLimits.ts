import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Plan limits configuration.
 * Free: limited monthly usage. Pro/Enterprise: unlimited.
 */
const PLAN_LIMITS = {
    free: { monthlyUsage: 10 },
    pro: { monthlyUsage: Infinity },
    enterprise: { monthlyUsage: Infinity },
} as const;

type PlanType = keyof typeof PLAN_LIMITS;

function getMonthStart(): number {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

/**
 * Check if the user can perform an action given their plan, and increment usage.
 * Throws if the user exceeds their plan limit.
 */
export const checkAndIncrementUsage = internalMutation({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, { userId }) => {
        const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (!profile) throw new Error("User profile not found");

        const plan = (profile.plan ?? "free") as PlanType;
        const limits = PLAN_LIMITS[plan];

        // Auto-reset monthly counter if past month boundary
        const monthStart = getMonthStart();
        const needsReset = !profile.usageResetAt || profile.usageResetAt < monthStart;

        const currentUsage = needsReset ? 0 : (profile.monthlyUsageCount ?? 0);

        if (currentUsage >= limits.monthlyUsage) {
            throw new Error(
                `You've reached your monthly limit of ${limits.monthlyUsage} uses on the ${plan} plan. Upgrade to continue!`
            );
        }

        await ctx.db.patch(profile._id, {
            monthlyUsageCount: currentUsage + 1,
            ...(needsReset ? { usageResetAt: Date.now() } : {}),
        });
    },
});
