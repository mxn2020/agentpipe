import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveTestResult = mutation({
    args: {
        testRunId: v.string(),
        model: v.string(),
        mode: v.string(),
        imageSize: v.number(),
        startedAt: v.number(),
        completedAt: v.number(),
        durationMs: v.number(),
        promptTokens: v.number(),
        completionTokens: v.number(),
        totalTokens: v.number(),
        rawResponse: v.string(),
        parsedResult: v.optional(v.string()),
        parseSuccess: v.boolean(),
        hasAllFields: v.boolean(),
        qualityNotes: v.optional(v.string()),
        status: v.string(),
        errorMessage: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("modelTests", args);
    },
});

export const getTestRuns = query({
    args: {},
    handler: async (ctx) => {
        const tests = await ctx.db
            .query("modelTests")
            .withIndex("by_startedAt")
            .order("desc")
            .take(200);

        const runs = new Map<string, {
            testRunId: string;
            startedAt: number;
            models: string[];
            totalTests: number;
            successCount: number;
            avgDurationMs: number;
        }>();

        for (const test of tests) {
            const existing = runs.get(test.testRunId);
            if (existing) {
                existing.models.push(test.model);
                existing.totalTests++;
                if (test.status === "success") existing.successCount++;
                existing.avgDurationMs = (existing.avgDurationMs * (existing.totalTests - 1) + test.durationMs) / existing.totalTests;
            } else {
                runs.set(test.testRunId, {
                    testRunId: test.testRunId,
                    startedAt: test.startedAt,
                    models: [test.model],
                    totalTests: 1,
                    successCount: test.status === "success" ? 1 : 0,
                    avgDurationMs: test.durationMs,
                });
            }
        }

        return Array.from(runs.values()).sort((a, b) => b.startedAt - a.startedAt);
    },
});

export const getTestsByRun = query({
    args: { testRunId: v.string() },
    handler: async (ctx, { testRunId }) => {
        return await ctx.db
            .query("modelTests")
            .withIndex("by_testRunId", (q) => q.eq("testRunId", testRunId))
            .collect();
    },
});

export const deleteTestRun = mutation({
    args: { testRunId: v.string() },
    handler: async (ctx, { testRunId }) => {
        const tests = await ctx.db
            .query("modelTests")
            .withIndex("by_testRunId", (q) => q.eq("testRunId", testRunId))
            .collect();

        for (const test of tests) {
            await ctx.db.delete(test._id);
        }
        return tests.length;
    },
});
