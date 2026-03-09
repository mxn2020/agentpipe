import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// ── Default Prompts ──────────────────────────────────────────
// Replace these with your app-specific AI prompts.

const DEFAULT_PROMPTS = [
    {
        promptId: "main_system",
        name: "Main System Prompt",
        content: `You are a helpful AI assistant for AgentPipe.
Respond clearly, concisely, and accurately.

CRITICAL: Respond with ONLY a raw JSON object. No markdown, no code fences.
Your entire response must start with { and end with }.`,
        description: "The primary system prompt for AI interactions.",
    },
    {
        promptId: "main_user",
        name: "Main User Prompt",
        content: `User input: "{{input}}"

Process this input and respond in the expected JSON format.`,
        description: "The user prompt template for primary AI calls.",
    },
];

// ── Queries ──────────────────────────────────────────────────

export const getPrompts = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("aiPrompts").collect();
    },
});

export const getPromptContent = internalQuery({
    args: { promptId: v.string() },
    handler: async (ctx, { promptId }) => {
        const prompt = await ctx.db
            .query("aiPrompts")
            .withIndex("by_prompt_id", (q) => q.eq("promptId", promptId))
            .first();
        return prompt?.content;
    },
});

// ── Mutations ────────────────────────────────────────────────

export const updatePrompt = mutation({
    args: {
        id: v.id("aiPrompts"),
        content: v.string(),
    },
    handler: async (ctx, { id, content }) => {
        await ctx.db.patch(id, {
            content,
            updatedAt: Date.now(),
        });
    },
});

export const seedPrompts = mutation({
    args: {},
    handler: async (ctx) => {
        const existing = await ctx.db.query("aiPrompts").collect();
        const existingIds = new Set(existing.map((p) => p.promptId));

        let added = 0;
        for (const prompt of DEFAULT_PROMPTS) {
            if (!existingIds.has(prompt.promptId)) {
                await ctx.db.insert("aiPrompts", {
                    ...prompt,
                    updatedAt: Date.now(),
                });
                added++;
            }
        }
        return `Seeded ${added} missing prompts.`;
    },
});

export const reseedPrompts = mutation({
    args: {},
    handler: async (ctx) => {
        const existing = await ctx.db.query("aiPrompts").collect();
        const existingMap = new Map(existing.map((p) => [p.promptId, p._id]));

        let updated = 0;
        let added = 0;
        for (const prompt of DEFAULT_PROMPTS) {
            const existingId = existingMap.get(prompt.promptId);
            if (existingId) {
                await ctx.db.replace(existingId, {
                    ...prompt,
                    updatedAt: Date.now(),
                });
                updated++;
            } else {
                await ctx.db.insert("aiPrompts", {
                    ...prompt,
                    updatedAt: Date.now(),
                });
                added++;
            }
        }
        return `Reseeded: ${updated} updated, ${added} added.`;
    },
});
