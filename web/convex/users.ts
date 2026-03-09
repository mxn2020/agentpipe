import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

// ── Internal helpers (for actions like stripe webhooks) ──────

export const getProfileByUserId = internalQuery({
    args: { userId: v.string() },
    handler: async (ctx, { userId }) => {
        return await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();
    },
});

export const updatePlanInternal = internalMutation({
    args: {
        profileId: v.id("userProfiles"),
        plan: v.union(v.literal("free"), v.literal("pro"), v.literal("enterprise")),
        stripeCustomerId: v.optional(v.string()),
    },
    handler: async (ctx, { profileId, plan, stripeCustomerId }) => {
        const patch: any = { plan };
        if (stripeCustomerId) patch.stripeCustomerId = stripeCustomerId;
        await ctx.db.patch(profileId, patch);
    },
});

export const ensureProfileInternal = internalMutation({
    args: { userId: v.string() },
    handler: async (ctx, { userId }) => {
        const existing = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (!existing) {
            await ctx.db.insert("userProfiles", {
                userId,
                name: "",
                role: "user",
                plan: "free",
                createdAt: Date.now(),
            });
        }
    },
});

// ── Queries ──────────────────────────────────────────────────

export const getMe = query({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) return null;

        const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (!profile) {
            const authUser = await ctx.db.get(userId);
            return {
                _id: userId,
                email: authUser?.email ?? "",
                name: authUser?.name ?? "",
                role: "user" as const,
                plan: "free" as const,
                hasProfile: false,
            };
        }

        const authUser = await ctx.db.get(userId);
        return {
            ...profile,
            email: authUser?.email ?? "",
            hasProfile: true,
        };
    },
});

export const listUsers = query({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) return [];

        const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (profile?.role !== "admin") return [];

        return await ctx.db.query("userProfiles").collect();
    },
});

// ── Mutations ────────────────────────────────────────────────

export const ensureProfile = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const existing = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (!existing) {
            const authUser = await ctx.db.get(userId);
            await ctx.db.insert("userProfiles", {
                userId: userId,
                name: authUser?.name ?? "",
                role: "user",
                plan: "free",
                createdAt: Date.now(),
            });
        }
    },
});

export const setRole = mutation({
    args: {
        profileId: v.id("userProfiles"),
        role: v.union(v.literal("user"), v.literal("admin")),
    },
    handler: async (ctx, { profileId, role }) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const myProfile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (myProfile?.role !== "admin") throw new Error("Not authorized");

        const targetProfile = await ctx.db.get(profileId);
        const oldRole = targetProfile?.role ?? "unknown";

        await ctx.db.patch(profileId, { role });

        await ctx.db.insert("auditLogs", {
            action: "admin.role_change",
            category: "admin",
            userId,
            targetId: profileId,
            details: JSON.stringify({
                message: `Changed role from ${oldRole} to ${role}`,
                oldRole,
                newRole: role,
                targetUserId: targetProfile?.userId,
            }),
            timestamp: Date.now(),
        });
    },
});

export const updateProfile = mutation({
    args: {
        name: v.string(),
    },
    handler: async (ctx, { name }) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (profile) {
            await ctx.db.patch(profile._id, { name });
        }
    },
});

export const deleteAccount = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (profile) {
            await ctx.db.delete(profile._id);
        }

        // TODO: Delete app-specific user data here

        await ctx.db.insert("auditLogs", {
            action: "user.account_deleted",
            category: "auth",
            userId,
            details: JSON.stringify({ message: "User deleted their account" }),
            timestamp: Date.now(),
        });
    },
});

export const bootstrapAdmin = mutation({
    args: { email: v.string() },
    handler: async (ctx, { email }) => {
        const users = await ctx.db.query("users").collect();
        const user = users.find((u: any) => u.email === email);
        if (!user) throw new Error(`No user found with email: ${email}`);

        const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", user._id))
            .first();

        if (profile) {
            await ctx.db.patch(profile._id, { role: "admin" });
            return { status: "updated", profileId: profile._id };
        } else {
            const id = await ctx.db.insert("userProfiles", {
                userId: user._id,
                name: user.name ?? "",
                role: "admin",
                plan: "free",
                createdAt: Date.now(),
            });
            return { status: "created", profileId: id };
        }
    },
});

export const fixUserProfile = mutation({
    args: {
        email: v.string(),
        plan: v.union(v.literal("free"), v.literal("pro"), v.literal("enterprise")),
        role: v.union(v.literal("user"), v.literal("admin")),
    },
    handler: async (ctx, { email, plan, role }) => {
        const users = await ctx.db.query("users").collect();
        const user = users.find((u: any) => u.email === email);
        if (!user) throw new Error(`No user found: ${email}`);

        const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", user._id))
            .first();

        if (!profile) throw new Error(`No profile found for: ${email}`);

        await ctx.db.patch(profile._id, { plan, role });

        return { status: "fixed", profileId: profile._id, plan, role };
    },
});
