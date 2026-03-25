import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import {
    MODEL_ROLES,
    MODEL_REGISTRY,
    getModelForPlan as getModelFromRegistry,
    getModelConfig,
    getSafeOutputTokens,
    getMaxOutputTokens,
    calculateTokenBudget,
    shouldUseChunkedGeneration,
    getOptimalChunkWords,
    estimateCost,
} from "./model-config";

// ─── OpenRouter Client ────────────────────────────────────────────────────────
let _openai: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
    if (!_openai) {
        _openai = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || (() => { throw new Error("OPENROUTER_API_KEY is not set. Add it to your environment variables."); })(),
            defaultHeaders: {
                "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
                "X-Title": "BloggerSEO",
            },
        });
    }
    return _openai;
}

export const openai = new Proxy({} as OpenAI, {
    get(_target, prop: string | symbol) {
        const client = getOpenAIClient();
        return client[prop as keyof OpenAI];
    },
});

// ─── Model Catalog (Re-exported from model-config.ts) ─────────────────────────
// Single source of truth is now in model-config.ts
// This export is for backward compatibility with existing imports
export const MODELS = MODEL_ROLES;

// ─── Plan → Article Model ────────────────────────────────────────────────────
export function getArticleModel(planName?: string): string {
    const model = getModelFromRegistry(planName);
    console.log(`🤖 Article model: plan="${planName || "free"}" → ${model}`);
    return model;
}

// ─── Backward-compatible wrapper used by older callers ────────────────────────
export function getModelForPlan(planName?: string): string {
    return getArticleModel(planName);
}

// ─── Fast model for structured tasks ─────────────────────────────────────────
export function getFastModel(): string {
    return MODEL_ROLES.FAST;
}

// ─── Humanizer model ──────────────────────────────────────────────────────────
export function getHumanizerModel(): string {
    return MODEL_ROLES.HUMANIZER;
}

// ─── Re-export model-config utilities for consumers ───────────────────────────
export {
    MODEL_REGISTRY,
    MODEL_ROLES,
    getModelConfig,
    getSafeOutputTokens,
    getMaxOutputTokens,
    calculateTokenBudget,
    shouldUseChunkedGeneration,
    getOptimalChunkWords,
    estimateCost,
};

// ─── DB lookup helpers ────────────────────────────────────────────────────────
export async function getUserPlanName(userId: string): Promise<string> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { plan: true },
        });
        return user?.plan?.name || "free";
    } catch {
        return "free";
    }
}

export async function getModelForUser(userId: string): Promise<string> {
    const planName = await getUserPlanName(userId);
    return getArticleModel(planName);
}
