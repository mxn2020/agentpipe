import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
    ...authTables,

    // ── User Profiles ────────────────────────────────────────────
    userProfiles: defineTable({
        userId: v.string(),
        name: v.optional(v.string()),
        role: v.union(v.literal("user"), v.literal("admin")),
        plan: v.optional(v.union(v.literal("free"), v.literal("pro"), v.literal("max"))),
        createdAt: v.optional(v.number()),
    }).index("by_userId", ["userId"]),

    // ── Subscription Tiers ───────────────────────────────────────
    // Free: 3 workflows, 5 nodes each
    // Pro: 10 workflows, 20 nodes each
    // Max: unlimited workflows + nodes
    subscriptionTiers: defineTable({
        name: v.string(),                 // "free", "pro", "max"
        displayName: v.string(),
        priceUsd: v.number(),             // Monthly price
        maxWorkflows: v.number(),         // -1 = unlimited
        maxNodesPerWorkflow: v.number(),  // -1 = unlimited
        features: v.array(v.string()),
        isActive: v.boolean(),
        sortOrder: v.number(),
    })
        .index("by_name", ["name"])
        .index("by_isActive", ["isActive", "sortOrder"]),

    // ── Credits ──────────────────────────────────────────────────
    creditAccounts: defineTable({
        userId: v.string(),
        balance: v.number(),
        totalPurchased: v.number(),
        totalUsed: v.number(),
        lastTopUpAt: v.optional(v.number()),
    }).index("by_userId", ["userId"]),

    creditTransactions: defineTable({
        userId: v.string(),
        type: v.union(v.literal("purchase"), v.literal("debit"), v.literal("refund"), v.literal("bonus")),
        amount: v.number(),
        balanceAfter: v.number(),
        description: v.string(),
        metadata: v.optional(v.string()),
        createdAt: v.number(),
    })
        .index("by_userId", ["userId", "createdAt"])
        .index("by_type", ["type", "createdAt"]),

    // ── Crypto Payments ──────────────────────────────────────────
    cryptoPayments: defineTable({
        userId: v.string(),
        provider: v.string(),
        externalId: v.string(),
        status: v.union(
            v.literal("pending"),
            v.literal("confirmed"),
            v.literal("failed"),
            v.literal("expired"),
        ),
        amountUsd: v.number(),
        creditsToAdd: v.number(),
        currency: v.optional(v.string()),
        txHash: v.optional(v.string()),
        paymentUrl: v.optional(v.string()),
        expiresAt: v.optional(v.number()),
        confirmedAt: v.optional(v.number()),
        createdAt: v.number(),
    })
        .index("by_userId", ["userId", "createdAt"])
        .index("by_externalId", ["externalId"])
        .index("by_status", ["status"]),

    // ── Workflows ────────────────────────────────────────────────
    // A workflow is a chain of AI processing nodes created by a user.
    workflows: defineTable({
        userId: v.string(),              // Creator
        name: v.string(),
        description: v.string(),
        slug: v.string(),                // URL-friendly identifier
        // Marketplace
        isPublished: v.boolean(),        // Listed on marketplace
        price: v.number(),               // Credits charged per run (set by creator)
        category: v.optional(v.string()), // "text", "image", "video", "audio", "multi"
        tags: v.array(v.string()),
        // Stats
        totalRuns: v.number(),
        totalRevenue: v.number(),        // Credits earned by creator
        avgRating: v.optional(v.number()),
        ratingCount: v.number(),
        // Status
        status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
        // Metadata
        thumbnailStorageId: v.optional(v.id("_storage")),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_userId", ["userId", "createdAt"])
        .index("by_slug", ["slug"])
        .index("by_status", ["status", "createdAt"])
        .index("by_category", ["category", "createdAt"])
        .searchIndex("search_name", { searchField: "name", filterFields: ["status", "category"] }),

    // ── Workflow Nodes ────────────────────────────────────────────
    // Each node in a workflow performs one AI operation.
    workflowNodes: defineTable({
        workflowId: v.id("workflows"),
        // Positioning in the workflow
        order: v.number(),               // Execution order (0-indexed)
        // Node configuration
        name: v.string(),                // e.g. "Generate blog post", "Create image"
        type: v.union(
            v.literal("text"),           // Text generation (LLM)
            v.literal("image"),          // Image generation
            v.literal("audio"),          // Audio generation (TTS)
            v.literal("video"),          // Video generation
            v.literal("object"),         // Structured JSON output
        ),
        // AI config
        modelId: v.string(),            // e.g. "gpt-4o", "dall-e-3", "stable-diffusion-xl"
        prompt: v.string(),             // System/user prompt template
        // Context mapping — which output from a previous node feeds into this node
        contextSource: v.optional(v.object({
            nodeOrder: v.number(),       // Which node to pull output from (by order)
            outputKey: v.optional(v.string()), // For object nodes: which JSON key to use
            contextType: v.union(
                v.literal("full_output"),      // Use the entire output as context
                v.literal("json_key"),         // Use a specific JSON key (for object nodes)
                v.literal("last_frame"),       // Use last frame of video
                v.literal("first_frame"),      // Use first frame of video
            ),
        })),
        // For "object" type: JSON schema definition
        outputSchema: v.optional(v.string()), // JSON: { "title": "string", "summary": "string", ... }
        // Model parameters
        temperature: v.optional(v.number()),
        maxTokens: v.optional(v.number()),
        // Credit cost estimate for this node
        estimatedCost: v.number(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_workflowId", ["workflowId", "order"]),

    // ── Available Models ─────────────────────────────────────────
    // Admin-configured models available for nodes.
    availableModels: defineTable({
        modelId: v.string(),             // e.g. "gpt-4o"
        displayName: v.string(),         // "GPT-4o"
        provider: v.string(),            // "openai", "anthropic", "stability", "runway"
        type: v.union(
            v.literal("text"),
            v.literal("image"),
            v.literal("audio"),
            v.literal("video"),
            v.literal("object"),
        ),
        description: v.string(),
        costPerUnit: v.number(),         // Credits per use (1 request/image/minute)
        unit: v.string(),                // "request", "image", "minute", "second"
        isActive: v.boolean(),
        config: v.optional(v.string()),  // JSON: model-specific config
        createdAt: v.number(),
    })
        .index("by_modelId", ["modelId"])
        .index("by_type", ["type"])
        .index("by_provider", ["provider"]),

    // ── Workflow Runs ────────────────────────────────────────────
    // Tracks each execution of a workflow.
    workflowRuns: defineTable({
        workflowId: v.id("workflows"),
        userId: v.string(),              // Who ran it (could be creator or marketplace buyer)
        isTestRun: v.boolean(),          // Test runs charged to creator
        status: v.union(
            v.literal("pending"),
            v.literal("running"),
            v.literal("completed"),
            v.literal("failed"),
            v.literal("cancelled"),
        ),
        // Input/Output
        input: v.optional(v.string()),   // JSON: user-provided input variables
        output: v.optional(v.string()),  // JSON: final output from last node
        // Cost
        totalCreditsCharged: v.number(),
        // Node progress
        currentNodeOrder: v.optional(v.number()),
        totalNodes: v.number(),
        // Timing
        startedAt: v.optional(v.number()),
        completedAt: v.optional(v.number()),
        errorMessage: v.optional(v.string()),
        createdAt: v.number(),
    })
        .index("by_workflowId", ["workflowId", "createdAt"])
        .index("by_userId", ["userId", "createdAt"])
        .index("by_status", ["status"]),

    // ── Node Executions ──────────────────────────────────────────
    // Tracks each node's execution within a workflow run.
    nodeExecutions: defineTable({
        runId: v.id("workflowRuns"),
        nodeId: v.id("workflowNodes"),
        order: v.number(),
        status: v.union(
            v.literal("pending"),
            v.literal("running"),
            v.literal("completed"),
            v.literal("failed"),
            v.literal("skipped"),
        ),
        // Input context (resolved from previous node)
        inputContext: v.optional(v.string()),
        // Output
        output: v.optional(v.string()),  // Text, URL, JSON, etc.
        outputType: v.optional(v.string()), // "text", "image_url", "audio_url", "video_url", "json"
        // Cost
        creditsCharged: v.number(),
        // Provider response
        modelId: v.string(),
        providerRequestId: v.optional(v.string()),
        durationMs: v.optional(v.number()),
        // Error
        errorMessage: v.optional(v.string()),
        createdAt: v.number(),
        completedAt: v.optional(v.number()),
    })
        .index("by_runId", ["runId", "order"]),

    // ── Workflow Ratings ─────────────────────────────────────────
    workflowRatings: defineTable({
        workflowId: v.id("workflows"),
        userId: v.string(),
        rating: v.number(),              // 1-5
        review: v.optional(v.string()),
        createdAt: v.number(),
    })
        .index("by_workflowId", ["workflowId"])
        .index("by_userId_workflowId", ["userId", "workflowId"]),

    // ── AI Prompts (CMS) ─────────────────────────────────────────
    aiPrompts: defineTable({
        promptId: v.string(),
        name: v.string(),
        content: v.string(),
        description: v.string(),
        updatedAt: v.number(),
    }).index("by_prompt_id", ["promptId"]),

    // ── AI Call Logs ─────────────────────────────────────────────
    aiLogs: defineTable({
        requestId: v.string(),
        model: v.string(),
        caller: v.string(),
        timestamp: v.number(),
        durationMs: v.number(),
        systemPrompt: v.string(),
        userPromptText: v.string(),
        hasImage: v.boolean(),
        imageSizeBytes: v.optional(v.number()),
        temperature: v.optional(v.number()),
        maxTokens: v.optional(v.number()),
        requestBodySize: v.number(),
        status: v.union(v.literal("success"), v.literal("error")),
        httpStatus: v.number(),
        responseContent: v.string(),
        responseSize: v.number(),
        finishReason: v.optional(v.string()),
        promptTokens: v.optional(v.number()),
        completionTokens: v.optional(v.number()),
        totalTokens: v.optional(v.number()),
        errorMessage: v.optional(v.string()),
        inputCostUsd: v.optional(v.number()),
        outputCostUsd: v.optional(v.number()),
        totalCostUsd: v.optional(v.number()),
    })
        .index("by_timestamp", ["timestamp"])
        .index("by_model_timestamp", ["model", "timestamp"])
        .index("by_caller", ["caller"])
        .index("by_status", ["status"]),

    // ── Dev Logs ─────────────────────────────────────────────────
    devLogs: defineTable({
        level: v.union(v.literal("debug"), v.literal("info"), v.literal("warn"), v.literal("error")),
        message: v.string(),
        context: v.optional(v.string()),
        component: v.string(),
        userId: v.optional(v.string()),
    })
        .index("by_level", ["level"])
        .index("by_component", ["component"]),

    // ── Audit Logs ───────────────────────────────────────────────
    auditLogs: defineTable({
        action: v.string(),
        category: v.union(v.literal("auth"), v.literal("admin"), v.literal("system"), v.literal("billing")),
        userId: v.optional(v.string()),
        targetId: v.optional(v.string()),
        details: v.string(),
        ipAddress: v.optional(v.string()),
        timestamp: v.number(),
    })
        .index("by_timestamp", ["timestamp"])
        .index("by_category", ["category", "timestamp"])
        .index("by_userId", ["userId", "timestamp"])
        .index("by_action", ["action", "timestamp"]),

    // ── Rate Limiting ────────────────────────────────────────────
    rateLimits: defineTable({
        key: v.string(),
        tokens: v.number(),
        lastRefill: v.number(),
    }).index("by_key", ["key"]),
});
