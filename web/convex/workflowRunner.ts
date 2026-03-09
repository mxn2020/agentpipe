import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { auth } from "./auth";

// ── Queries ──────────────────────────────────────────────────

/**
 * Get runs for a workflow.
 */
export const getRunsForWorkflow = query({
    args: { workflowId: v.id("workflows"), limit: v.optional(v.number()) },
    handler: async (ctx, { workflowId, limit }) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) return [];

        return await ctx.db
            .query("workflowRuns")
            .withIndex("by_workflowId", (q) => q.eq("workflowId", workflowId))
            .order("desc")
            .take(limit ?? 20);
    },
});

/**
 * Get a specific run with its node executions.
 */
export const getRunWithExecutions = query({
    args: { runId: v.id("workflowRuns") },
    handler: async (ctx, { runId }) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) return null;

        const run = await ctx.db.get(runId);
        if (!run || run.userId !== userId) return null;

        const executions = await ctx.db
            .query("nodeExecutions")
            .withIndex("by_runId", (q) => q.eq("runId", runId))
            .collect();

        return { ...run, executions: executions.sort((a, b) => a.order - b.order) };
    },
});

/**
 * Get my run history across all workflows.
 */
export const getMyRuns = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, { limit }) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) return [];

        const runs = await ctx.db
            .query("workflowRuns")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .order("desc")
            .take(limit ?? 30);

        // Attach workflow names
        const enriched = await Promise.all(
            runs.map(async (run) => {
                const workflow = await ctx.db.get(run.workflowId);
                return { ...run, workflowName: workflow?.name ?? "Unknown" };
            }),
        );

        return enriched;
    },
});

// ── Mutations ────────────────────────────────────────────────

/**
 * Start a workflow run.
 * For test runs, charges the creator.
 * For marketplace runs, charges the buyer at the workflow's price.
 */
export const startRun = mutation({
    args: {
        workflowId: v.id("workflows"),
        isTestRun: v.boolean(),
        input: v.optional(v.string()),
    },
    handler: async (ctx, { workflowId, isTestRun, input }) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const workflow = await ctx.db.get(workflowId);
        if (!workflow) throw new Error("Workflow not found");

        // Only creator can test run; marketplace run requires published
        if (isTestRun && workflow.userId !== userId) {
            throw new Error("Only the creator can test run this workflow");
        }
        if (!isTestRun && !workflow.isPublished) {
            throw new Error("Workflow is not published");
        }

        const nodes = await ctx.db
            .query("workflowNodes")
            .withIndex("by_workflowId", (q) => q.eq("workflowId", workflowId))
            .collect();

        if (nodes.length === 0) throw new Error("Workflow has no nodes");

        // Calculate total estimated cost
        const totalEstimatedCost = nodes.reduce((sum, n) => sum + n.estimatedCost, 0);
        const chargeAmount = isTestRun ? totalEstimatedCost : workflow.price;

        // Check credits
        const account = await ctx.db
            .query("creditAccounts")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (!account || account.balance < chargeAmount) {
            throw new Error(
                `Insufficient credits. Required: ${chargeAmount}, Available: ${account?.balance ?? 0}`,
            );
        }

        // Debit credits
        const newBalance = account.balance - chargeAmount;
        await ctx.db.patch(account._id, {
            balance: newBalance,
            totalUsed: account.totalUsed + chargeAmount,
        });

        await ctx.db.insert("creditTransactions", {
            userId,
            type: "debit",
            amount: -chargeAmount,
            balanceAfter: newBalance,
            description: `${isTestRun ? "Test run" : "Run"}: ${workflow.name}`,
            metadata: JSON.stringify({ workflowId }),
            createdAt: Date.now(),
        });

        // Create run record
        const runId = await ctx.db.insert("workflowRuns", {
            workflowId,
            userId,
            isTestRun,
            status: "running",
            input,
            totalCreditsCharged: chargeAmount,
            currentNodeOrder: 0,
            totalNodes: nodes.length,
            startedAt: Date.now(),
            createdAt: Date.now(),
        });

        // Create node execution records
        const sortedNodes = nodes.sort((a, b) => a.order - b.order);
        for (const node of sortedNodes) {
            await ctx.db.insert("nodeExecutions", {
                runId,
                nodeId: node._id,
                order: node.order,
                status: node.order === 0 ? "running" : "pending",
                creditsCharged: 0,
                modelId: node.modelId,
                createdAt: Date.now(),
            });
        }

        // Update workflow stats
        await ctx.db.patch(workflowId, {
            totalRuns: workflow.totalRuns + 1,
            totalRevenue: isTestRun ? workflow.totalRevenue : workflow.totalRevenue + chargeAmount,
        });

        // Revenue share: credit the creator (minus platform fee) for marketplace runs
        if (!isTestRun && workflow.userId !== userId) {
            const creatorShare = Math.floor(chargeAmount * 0.8); // 80% to creator
            const creatorAccount = await ctx.db
                .query("creditAccounts")
                .withIndex("by_userId", (q) => q.eq("userId", workflow.userId))
                .first();

            if (creatorAccount) {
                await ctx.db.patch(creatorAccount._id, {
                    balance: creatorAccount.balance + creatorShare,
                    totalPurchased: creatorAccount.totalPurchased + creatorShare,
                });

                await ctx.db.insert("creditTransactions", {
                    userId: workflow.userId,
                    type: "bonus",
                    amount: creatorShare,
                    balanceAfter: creatorAccount.balance + creatorShare,
                    description: `Revenue from "${workflow.name}" run`,
                    metadata: JSON.stringify({ runId, buyerUserId: userId }),
                    createdAt: Date.now(),
                });
            }
        }

        // In production: schedule the actual node execution via action
        // await ctx.scheduler.runAfter(0, internal.executor.executeNode, { runId, nodeOrder: 0 });

        return { runId, totalNodes: nodes.length, creditsCharged: chargeAmount };
    },
});

/**
 * Complete a node execution and advance to the next node.
 */
export const completeNodeExecution = internalMutation({
    args: {
        runId: v.id("workflowRuns"),
        nodeOrder: v.number(),
        output: v.string(),
        outputType: v.string(),
        creditsCharged: v.number(),
        durationMs: v.number(),
        providerRequestId: v.optional(v.string()),
    },
    handler: async (ctx, { runId, nodeOrder, output, outputType, creditsCharged, durationMs, providerRequestId }) => {
        const run = await ctx.db.get(runId);
        if (!run) throw new Error("Run not found");

        // Update this node's execution
        const executions = await ctx.db
            .query("nodeExecutions")
            .withIndex("by_runId", (q) => q.eq("runId", runId))
            .collect();

        const currentExec = executions.find((e) => e.order === nodeOrder);
        if (!currentExec) throw new Error("Node execution not found");

        await ctx.db.patch(currentExec._id, {
            status: "completed",
            output,
            outputType,
            creditsCharged,
            durationMs,
            providerRequestId,
            completedAt: Date.now(),
        });

        // Check if there's a next node
        const nextOrder = nodeOrder + 1;
        if (nextOrder < run.totalNodes) {
            // Advance to next node
            const nextExec = executions.find((e) => e.order === nextOrder);
            if (nextExec) {
                await ctx.db.patch(nextExec._id, { status: "running" });
            }
            await ctx.db.patch(runId, { currentNodeOrder: nextOrder });

            // Schedule next node execution
            // await ctx.scheduler.runAfter(0, internal.executor.executeNode, { runId, nodeOrder: nextOrder });
        } else {
            // All nodes completed — finalize run
            await ctx.db.patch(runId, {
                status: "completed",
                output,
                completedAt: Date.now(),
            });
        }
    },
});

/**
 * Fail a node execution and the run.
 */
export const failNodeExecution = internalMutation({
    args: {
        runId: v.id("workflowRuns"),
        nodeOrder: v.number(),
        errorMessage: v.string(),
    },
    handler: async (ctx, { runId, nodeOrder, errorMessage }) => {
        const run = await ctx.db.get(runId);
        if (!run) throw new Error("Run not found");

        const executions = await ctx.db
            .query("nodeExecutions")
            .withIndex("by_runId", (q) => q.eq("runId", runId))
            .collect();

        const currentExec = executions.find((e) => e.order === nodeOrder);
        if (currentExec) {
            await ctx.db.patch(currentExec._id, {
                status: "failed",
                errorMessage,
                completedAt: Date.now(),
            });
        }

        // Mark remaining nodes as skipped
        for (const exec of executions) {
            if (exec.order > nodeOrder && exec.status === "pending") {
                await ctx.db.patch(exec._id, { status: "skipped" });
            }
        }

        // Fail the run
        await ctx.db.patch(runId, {
            status: "failed",
            errorMessage: `Node ${nodeOrder + 1} failed: ${errorMessage}`,
            completedAt: Date.now(),
        });
    },
});

// ── Ratings ──────────────────────────────────────────────────

export const rateWorkflow = mutation({
    args: {
        workflowId: v.id("workflows"),
        rating: v.number(),
        review: v.optional(v.string()),
    },
    handler: async (ctx, { workflowId, rating, review }) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        if (rating < 1 || rating > 5) throw new Error("Rating must be 1-5");

        // Check if already rated
        const existing = await ctx.db
            .query("workflowRatings")
            .withIndex("by_userId_workflowId", (q) =>
                q.eq("userId", userId).eq("workflowId", workflowId),
            )
            .first();

        if (existing) {
            // Update existing rating
            await ctx.db.patch(existing._id, { rating, review, createdAt: Date.now() });
        } else {
            // New rating
            await ctx.db.insert("workflowRatings", {
                workflowId,
                userId,
                rating,
                review,
                createdAt: Date.now(),
            });
        }

        // Recalculate average
        const allRatings = await ctx.db
            .query("workflowRatings")
            .withIndex("by_workflowId", (q) => q.eq("workflowId", workflowId))
            .collect();

        const avg = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;

        await ctx.db.patch(workflowId, {
            avgRating: Math.round(avg * 10) / 10,
            ratingCount: allRatings.length,
        });
    },
});
