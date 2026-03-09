import { internal } from "./_generated/api";

type NvidiaMessage = {
    role: "system" | "user" | "assistant";
    content: string | Array<{ type: "text", text: string } | { type: "image_url", image_url: { url: string } }>;
};

export function extractPromptText(messages: NvidiaMessage[]): {
    systemPrompt: string
    userPromptText: string
    hasImage: boolean
    imageSizeBytes: number
} {
    let systemPrompt = ''
    let userPromptText = ''
    let hasImage = false
    let imageSizeBytes = 0

    for (const msg of messages) {
        if (typeof msg.content === 'string') {
            if (msg.role === 'system') systemPrompt = msg.content
            else userPromptText += msg.content
        } else if (Array.isArray(msg.content)) {
            for (const part of msg.content) {
                if (part.type === 'text' && part.text) {
                    if (msg.role === 'system') systemPrompt = part.text
                    else userPromptText += part.text
                }
                if (part.type === 'image_url' && part.image_url?.url) {
                    hasImage = true
                    imageSizeBytes = part.image_url.url.length
                }
            }
        }
    }

    return { systemPrompt, userPromptText, hasImage, imageSizeBytes }
}

/**
 * Universal wrapper for calling NVIDIA NIMs.
 * Handles fetch, retries, error checking, and automatic AI log saving.
 */
export async function performNvidiaCall(ctx: any, args: {
    model: string,
    messages: NvidiaMessage[],
    temperature?: number,
    maxTokens?: number,
    topP?: number,
    caller?: string,
    responseFormat?: any
}): Promise<string> {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
        throw new Error("NVIDIA_API_KEY is not configured in Convex environment variables.");
    }

    const { model, messages, temperature = 0.7, maxTokens = 2048, topP = 0.9, caller = 'unknown', responseFormat } = args;

    const bodyObj: any = { model, messages, temperature, max_tokens: maxTokens, top_p: topP, stream: false };
    if (responseFormat) {
        bodyObj.response_format = responseFormat;
    }

    const bodyStr = JSON.stringify(bodyObj);
    const requestBodySize = bodyStr.length;
    const promptInfo = extractPromptText(messages);

    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const timestamp = Date.now();

    let httpStatus = 0;
    let responseContent = '';
    let finishReason: string | undefined;
    let promptTokens: number | undefined;
    let completionTokens: number | undefined;
    let totalTokens: number | undefined;
    let errorMessage: string | undefined;
    let status: 'success' | 'error' = 'success';

    console.log(`[NVIDIA API] [${requestId}] Calling model: ${model} (caller: ${caller})`);

    const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
    const MAX_RETRIES = 3;

    try {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                    },
                    body: bodyStr,
                });

                httpStatus = response.status;
                if (!response.ok) {
                    const errorText = await response.text();

                    if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < MAX_RETRIES) {
                        const delay = Math.pow(2, attempt - 1) * 1000;
                        console.log(`[NVIDIA API] [${requestId}] Attempt ${attempt}/${MAX_RETRIES} failed (HTTP ${response.status}). Retrying in ${delay}ms...`);
                        lastError = new Error(`NVIDIA API error (${response.status}): ${errorText}`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }

                    status = 'error';
                    errorMessage = errorText.substring(0, 2000);
                    throw new Error(`NVIDIA API error (${response.status}): ${errorText}`);
                }

                const data = await response.json() as any;
                responseContent = data.choices?.[0]?.message?.content ?? '';
                finishReason = data.choices?.[0]?.finish_reason;
                promptTokens = data.usage?.prompt_tokens;
                completionTokens = data.usage?.completion_tokens;
                totalTokens = data.usage?.total_tokens;

                if (!responseContent) {
                    status = 'error';
                    errorMessage = `Empty content. Finish: ${finishReason}, Tokens: ${completionTokens}`;
                    throw new Error(errorMessage);
                }

                if (attempt > 1) {
                    console.log(`[NVIDIA API] [${requestId}] Succeeded on attempt ${attempt}/${MAX_RETRIES}`);
                }

                return responseContent;
            } catch (fetchErr) {
                lastError = fetchErr instanceof Error ? fetchErr : new Error('Unknown error');

                if (httpStatus === 0 && attempt < MAX_RETRIES) {
                    const delay = Math.pow(2, attempt - 1) * 1000;
                    console.log(`[NVIDIA API] [${requestId}] Attempt ${attempt}/${MAX_RETRIES} failed (network error). Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                throw fetchErr;
            }
        }

        throw lastError || new Error('All retry attempts exhausted');
    } catch (err) {
        if (status !== 'error') {
            status = 'error';
            errorMessage = err instanceof Error ? err.message : 'Unknown error';
        }
        throw err;
    } finally {
        const durationMs = Date.now() - timestamp;

        // Look up model cost for this model
        let inputCostUsd: number | undefined;
        let outputCostUsd: number | undefined;
        let totalCostUsd: number | undefined;

        try {
            const modelCost = await ctx.runQuery(internal.modelCosts.getModelCostInternal, { model });
            if (modelCost && promptTokens && completionTokens) {
                inputCostUsd = (promptTokens / 1000) * modelCost.inputCostPer1k;
                outputCostUsd = (completionTokens / 1000) * modelCost.outputCostPer1k;
                totalCostUsd = inputCostUsd + outputCostUsd;
            }
        } catch {
            // Model cost lookup failed — not critical, just skip
        }

        try {
            await ctx.runMutation(internal.aiLogs.saveLog, {
                requestId,
                model,
                caller,
                timestamp,
                durationMs,
                systemPrompt: promptInfo.systemPrompt.substring(0, 2000),
                userPromptText: promptInfo.userPromptText.substring(0, 2000),
                hasImage: promptInfo.hasImage,
                imageSizeBytes: promptInfo.imageSizeBytes || undefined,
                temperature,
                maxTokens,
                requestBodySize,
                status,
                httpStatus,
                responseContent: responseContent.substring(0, 8000),
                responseSize: responseContent.length,
                finishReason,
                promptTokens,
                completionTokens,
                totalTokens,
                errorMessage,
                inputCostUsd,
                outputCostUsd,
                totalCostUsd,
            });
        } catch (logErr) {
            console.error("[NVIDIA API] Failed to save log entry:", logErr);
        }
    }
}

/**
 * Generates an image using NVIDIA API.
 * Returns a base64 encoded string of the image.
 */
export async function generateImage(prompt: string): Promise<string> {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
        throw new Error("NVIDIA_API_KEY is not configured in Convex environment variables.");
    }

    const response = await fetch('https://integrate.api.nvidia.com/v1/images/generations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            model: "stabilityai/stable-diffusion-xl-base-1.0",
            prompt: prompt.substring(0, 1000),
            n: 1,
            response_format: "b64_json",
            size: "1024x1024"
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`NVIDIA Image API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as any;
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
        throw new Error("NVIDIA Image API did not return b64_json");
    }

    return b64;
}

/**
 * Generates audio (TTS) given a prompt.
 * Returns a base64 encoded MP3 string or equivalent.
 */
export async function generateAudio(prompt: string, voiceId = "alloy"): Promise<string> {
    // In a real scenario, this would call NVIDIA NIM or ElevenLabs/OpenAI TTS endpoints.
    // For the boilerplate, we provide a structured mock response or proxy.
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
        throw new Error("NVIDIA_API_KEY is not configured in Convex environment variables.");
    }

    // Mock implementation for demonstration since exact APIs vary.
    // We simulate a network delay and return a dummy base64 string.
    await new Promise(r => setTimeout(r, 1500));
    const dummyAudioBase64 = "UklGRuQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YcABAAAA" // Tiny valid WAV header
    return dummyAudioBase64;
}

/**
 * Transcribes audio to text (ASR) via NVIDIA NIM or compatible endpoint.
 */
export async function transcribeAudio(base64Audio: string): Promise<string> {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
        throw new Error("NVIDIA_API_KEY is not configured in Convex environment variables.");
    }

    // Convert base64 wrapper to what backend expects (for demo we use a dummy wrapper)
    await new Promise(r => setTimeout(r, 1000));
    return "This is a dummy transcription. Integrate with an actual ASR endpoint like NVIDIA Nemo or Whisper here.";
}

/**
 * Generates a short video (Text-to-Video)
 */
export async function generateVideo(prompt: string): Promise<string> {
    // Boilerplate stub for Text2Video models (e.g. SVD, Runway, Sora)
    await new Promise(r => setTimeout(r, 2000));
    return "https://www.w3schools.com/html/mov_bbb.mp4"; // Return a dummy video URL
}

import { action } from "./_generated/server";
import { v } from "convex/values";

export const callModel = action({
    args: {
        model: v.string(),
        messages: v.any(), // array of objects
        temperature: v.optional(v.number()),
        maxTokens: v.optional(v.number()),
        topP: v.optional(v.number()),
        caller: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        return await performNvidiaCall(ctx, {
            model: args.model,
            messages: args.messages,
            temperature: args.temperature,
            maxTokens: args.maxTokens,
            topP: args.topP,
            caller: args.caller || "frontend",
        });
    }
});

export const generateImageAction = action({
    args: { prompt: v.string() },
    handler: async (ctx, args) => {
        return await generateImage(args.prompt);
    }
});

export const generateAudioAction = action({
    args: { prompt: v.string(), voiceId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        return await generateAudio(args.prompt, args.voiceId);
    }
});

export const transcribeAudioAction = action({
    args: { base64Audio: v.string() },
    handler: async (ctx, args) => {
        return await transcribeAudio(args.base64Audio);
    }
});

export const generateVideoAction = action({
    args: { prompt: v.string() },
    handler: async (ctx, args) => {
        return await generateVideo(args.prompt);
    }
});
