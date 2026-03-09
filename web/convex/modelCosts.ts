import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getModelCostInternal = internalQuery({
    args: { model: v.string() },
    handler: async (ctx, { model }) => {
        return await ctx.db
            .query("modelCosts")
            .withIndex("by_model", (q) => q.eq("model", model))
            .first();
    },
});


export const getAll = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("modelCosts").collect();
    },
});

export const getByModel = query({
    args: { model: v.string() },
    handler: async (ctx, { model }) => {
        return await ctx.db
            .query("modelCosts")
            .withIndex("by_model", (q) => q.eq("model", model))
            .first();
    },
});

export const upsert = mutation({
    args: {
        model: v.string(),
        displayName: v.optional(v.string()),
        inputCostPer1k: v.number(),
        outputCostPer1k: v.number(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("modelCosts")
            .withIndex("by_model", (q) => q.eq("model", args.model))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                displayName: args.displayName,
                inputCostPer1k: args.inputCostPer1k,
                outputCostPer1k: args.outputCostPer1k,
                updatedAt: Date.now(),
            });
            return existing._id;
        }

        return await ctx.db.insert("modelCosts", {
            model: args.model,
            displayName: args.displayName,
            inputCostPer1k: args.inputCostPer1k,
            outputCostPer1k: args.outputCostPer1k,
            updatedAt: Date.now(),
        });
    },
});
