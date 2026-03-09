import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { auth } from "./auth";

// ── Queries ──────────────────────────────────────────────────

/**
 * Get all workflows for the authenticated user.
 */
export const getMyWorkflows = query({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) return [];

        const workflows = await ctx.db
            .query("workflows")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .order("desc")
            .collect();

        // Attach node count
        const withNodes = await Promise.all(
            workflows.map(async (w) => {
                const nodes = await ctx.db
                    .query("workflowNodes")
                    .withIndex("by_workflowId", (q) => q.eq("workflowId", w._id))
                    .collect();
                return { ...w, nodeCount: nodes.length };
            }),
        );

        return withNodes;
    },
});

/**
 * Get a single workflow with its nodes.
 */
export const getWorkflowWithNodes = query({
    args: { workflowId: v.id("workflows") },
    handler: async (ctx, { workflowId }) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) return null;

        const workflow = await ctx.db.get(workflowId);
        if (!workflow || workflow.userId !== userId) return null;

        const nodes = await ctx.db
            .query("workflowNodes")
            .withIndex("by_workflowId", (q) => q.eq("workflowId", workflowId))
            .collect();

        return { ...workflow, nodes: nodes.sort((a, b) => a.order - b.order) };
    },
});

/**
 * Marketplace: Get published workflows.
 */
export const getMarketplaceWorkflows = query({
    args: {
        category: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { category, limit }) => {
        let query = ctx.db
            .query("workflows")
            .withIndex("by_status", (q) => q.eq("status", "published"));

        const workflows = await query.order("desc").take(limit ?? 50);

        const filtered = category
            ? workflows.filter((w) => w.category === category)
            : workflows;

        // Attach creator info + node count
        const enriched = await Promise.all(
            filtered.map(async (w) => {
                const profile = await ctx.db
                    .query("userProfiles")
                    .withIndex("by_userId", (q) => q.eq("userId", w.userId))
                    .first();
                const nodes = await ctx.db
                    .query("workflowNodes")
                    .withIndex("by_workflowId", (q) => q.eq("workflowId", w._id))
                    .collect();
                return {
                    ...w,
                    creatorName: profile?.name ?? "Anonymous",
                    nodeCount: nodes.length,
                };
            }),
        );

        return enriched;
    },
});

/**
 * Search marketplace workflows.
 */
export const searchWorkflows = query({
    args: { query: v.string() },
    handler: async (ctx, { query: searchQuery }) => {
        const results = await ctx.db
            .query("workflows")
            .withSearchIndex("search_name", (q) =>
                q.search("name", searchQuery).eq("status", "published"),
            )
            .take(20);

        return results;
    },
});

// ── Mutations ────────────────────────────────────────────────

/**
 * Create a new workflow.
 */
export const createWorkflow = mutation({
    args: {
        name: v.string(),
        description: v.string(),
        category: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        price: v.optional(v.number()),
    },
    handler: async (ctx, { name, description, category, tags, price }) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        // Check plan limits
        const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        const plan = profile?.plan ?? "free";
        const existingWorkflows = await ctx.db
            .query("workflows")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .collect();

        const limits = { free: 3, pro: 10, max: Infinity };
        if (existingWorkflows.length >= (limits[plan as keyof typeof limits] ?? 3)) {
            throw new Error(`Workflow limit reached for ${plan} plan. Upgrade to create more.`);
        }

        // Generate slug
        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")
            + "-" + Date.now().toString(36);

        const workflowId = await ctx.db.insert("workflows", {
            userId,
            name,
            description,
            slug,
            isPublished: false,
            price: price ?? 0,
            category,
            tags: tags ?? [],
            totalRuns: 0,
            totalRevenue: 0,
            ratingCount: 0,
            status: "draft",
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        return workflowId;
    },
});

/**
 * Update workflow metadata.
 */
export const updateWorkflow = mutation({
    args: {
        id: v.id("workflows"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        price: v.optional(v.number()),
    },
    handler: async (ctx, { id, ...updates }) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const workflow = await ctx.db.get(id);
        if (!workflow || workflow.userId !== userId) throw new Error("Not found");

        const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined),
        );

        await ctx.db.patch(id, { ...cleanUpdates, updatedAt: Date.now() });
    },
});

/**
 * Publish a workflow to the marketplace.
 */
export const publishWorkflow = mutation({
    args: { id: v.id("workflows") },
    handler: async (ctx, { id }) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const workflow = await ctx.db.get(id);
        if (!workflow || workflow.userId !== userId) throw new Error("Not found");

        // Must have at least one node
        const nodes = await ctx.db
            .query("workflowNodes")
            .withIndex("by_workflowId", (q) => q.eq("workflowId", id))
            .collect();

        if (nodes.length === 0) throw new Error("Workflow must have at least one node to publish.");

        await ctx.db.patch(id, {
            status: "published",
            isPublished: true,
            updatedAt: Date.now(),
        });
    },
});

/**
 * Unpublish a workflow.
 */
export const unpublishWorkflow = mutation({
    args: { id: v.id("workflows") },
    handler: async (ctx, { id }) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const workflow = await ctx.db.get(id);
        if (!workflow || workflow.userId !== userId) throw new Error("Not found");

        await ctx.db.patch(id, {
            status: "draft",
            isPublished: false,
            updatedAt: Date.now(),
        });
    },
});

/**
 * Delete a workflow and all its nodes.
 */
export const deleteWorkflow = mutation({
    args: { id: v.id("workflows") },
    handler: async (ctx, { id }) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const workflow = await ctx.db.get(id);
        if (!workflow || workflow.userId !== userId) throw new Error("Not found");

        // Delete nodes
        const nodes = await ctx.db
            .query("workflowNodes")
            .withIndex("by_workflowId", (q) => q.eq("workflowId", id))
            .collect();

        for (const node of nodes) {
            await ctx.db.delete(node._id);
        }

        await ctx.db.delete(id);
    },
});

// ── Node Mutations ───────────────────────────────────────────

/**
 * Add a node to a workflow.
 */
export const addNode = mutation({
    args: {
        workflowId: v.id("workflows"),
        name: v.string(),
        type: v.union(
            v.literal("text"),
            v.literal("image"),
            v.literal("audio"),
            v.literal("video"),
            v.literal("object"),
        ),
        modelId: v.string(),
        prompt: v.string(),
        contextSource: v.optional(v.object({
            nodeOrder: v.number(),
            outputKey: v.optional(v.string()),
            contextType: v.union(
                v.literal("full_output"),
                v.literal("json_key"),
                v.literal("last_frame"),
                v.literal("first_frame"),
            ),
        })),
        outputSchema: v.optional(v.string()),
        temperature: v.optional(v.number()),
        maxTokens: v.optional(v.number()),
        estimatedCost: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const workflow = await ctx.db.get(args.workflowId);
        if (!workflow || workflow.userId !== userId) throw new Error("Not found");

        // Check node limits
        const existingNodes = await ctx.db
            .query("workflowNodes")
            .withIndex("by_workflowId", (q) => q.eq("workflowId", args.workflowId))
            .collect();

        const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        const plan = profile?.plan ?? "free";
        const nodeLimits = { free: 5, pro: 20, max: Infinity };
        if (existingNodes.length >= (nodeLimits[plan as keyof typeof nodeLimits] ?? 5)) {
            throw new Error(`Node limit reached for ${plan} plan (max ${nodeLimits[plan as keyof typeof nodeLimits]}). Upgrade to add more.`);
        }

        const order = existingNodes.length;

        const nodeId = await ctx.db.insert("workflowNodes", {
            workflowId: args.workflowId,
            order,
            name: args.name,
            type: args.type,
            modelId: args.modelId,
            prompt: args.prompt,
            contextSource: args.contextSource,
            outputSchema: args.outputSchema,
            temperature: args.temperature,
            maxTokens: args.maxTokens,
            estimatedCost: args.estimatedCost ?? 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        await ctx.db.patch(args.workflowId, { updatedAt: Date.now() });
        return nodeId;
    },
});

/**
 * Update a node.
 */
export const updateNode = mutation({
    args: {
        nodeId: v.id("workflowNodes"),
        name: v.optional(v.string()),
        prompt: v.optional(v.string()),
        modelId: v.optional(v.string()),
        contextSource: v.optional(v.object({
            nodeOrder: v.number(),
            outputKey: v.optional(v.string()),
            contextType: v.union(
                v.literal("full_output"),
                v.literal("json_key"),
                v.literal("last_frame"),
                v.literal("first_frame"),
            ),
        })),
        outputSchema: v.optional(v.string()),
        temperature: v.optional(v.number()),
        maxTokens: v.optional(v.number()),
    },
    handler: async (ctx, { nodeId, ...updates }) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const node = await ctx.db.get(nodeId);
        if (!node) throw new Error("Node not found");

        const workflow = await ctx.db.get(node.workflowId);
        if (!workflow || workflow.userId !== userId) throw new Error("Not authorized");

        const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined),
        );

        await ctx.db.patch(nodeId, { ...cleanUpdates, updatedAt: Date.now() });
    },
});

/**
 * Delete a node and reorder remaining nodes.
 */
export const deleteNode = mutation({
    args: { nodeId: v.id("workflowNodes") },
    handler: async (ctx, { nodeId }) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const node = await ctx.db.get(nodeId);
        if (!node) throw new Error("Node not found");

        const workflow = await ctx.db.get(node.workflowId);
        if (!workflow || workflow.userId !== userId) throw new Error("Not authorized");

        await ctx.db.delete(nodeId);

        // Reorder remaining nodes
        const remaining = await ctx.db
            .query("workflowNodes")
            .withIndex("by_workflowId", (q) => q.eq("workflowId", node.workflowId))
            .collect();

        const sorted = remaining.sort((a, b) => a.order - b.order);
        for (let i = 0; i < sorted.length; i++) {
            if (sorted[i].order !== i) {
                await ctx.db.patch(sorted[i]._id, { order: i, updatedAt: Date.now() });
            }
        }
    },
});

/**
 * Reorder nodes within a workflow.
 */
export const reorderNodes = mutation({
    args: {
        workflowId: v.id("workflows"),
        nodeIds: v.array(v.id("workflowNodes")),
    },
    handler: async (ctx, { workflowId, nodeIds }) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const workflow = await ctx.db.get(workflowId);
        if (!workflow || workflow.userId !== userId) throw new Error("Not authorized");

        for (let i = 0; i < nodeIds.length; i++) {
            await ctx.db.patch(nodeIds[i], { order: i, updatedAt: Date.now() });
        }

        await ctx.db.patch(workflowId, { updatedAt: Date.now() });
    },
});

// ── Internal Queries ─────────────────────────────────────────

export const getWorkflowInternal = internalQuery({
    args: { workflowId: v.id("workflows") },
    handler: async (ctx, { workflowId }) => {
        return await ctx.db.get(workflowId);
    },
});

export const getNodesForWorkflow = internalQuery({
    args: { workflowId: v.id("workflows") },
    handler: async (ctx, { workflowId }) => {
        const nodes = await ctx.db
            .query("workflowNodes")
            .withIndex("by_workflowId", (q) => q.eq("workflowId", workflowId))
            .collect();
        return nodes.sort((a, b) => a.order - b.order);
    },
});
