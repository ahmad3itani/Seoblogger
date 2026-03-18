import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

// ─── OpenRouter Client ────────────────────────────────────────────────────────
let _openai: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
    if (!_openai) {
        _openai = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || "missing-key",
            defaultHeaders: {
                "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
                "X-Title": "BloggerSEO",
            },
        });
    }
    return _openai;
}

export const openai = new Proxy({} as OpenAI, {
    get(_target, prop) {
        return (getOpenAIClient() as any)[prop];
    },
});

// ─── Model Catalog ─────────────────────────────────────────────────────────────
// Cost/quality tiers tuned for content generation workloads.
// All prices are approximate OpenRouter rates per 1M tokens (input/output).
//
//  deepseek/deepseek-chat         $0.14 / $0.28   — Excellent quality, best $/quality
//  google/gemini-flash-1.5        $0.075 / $0.30  — Ultra fast, great for JSON tasks
//  anthropic/claude-3.5-haiku-…   $0.80 / $4.00   — Stronger instruction-following
//  anthropic/claude-3.5-sonnet-…  $3.00 / $15.00  — Best overall quality, pro tier

export const MODELS = {
    // Structural tasks (titles, outlines, FAQ, meta) — need reliable JSON output
    FAST: "deepseek/deepseek-chat",

    // Free plan article body — very good quality at near-zero cost
    FREE_ARTICLE: "deepseek/deepseek-chat",

    // Starter plan — strong creative writing + instruction following
    STARTER_ARTICLE: "anthropic/claude-3.5-haiku-20241022",

    // Pro / Enterprise — highest quality output
    PRO_ARTICLE: "anthropic/claude-3.5-sonnet-20241022",

    // Humanizer pass — DeepSeek excels at natural, human-sounding writing
    HUMANIZER: "deepseek/deepseek-chat",
} as const;

// ─── Plan → Article Model ────────────────────────────────────────────────────
export function getArticleModel(planName?: string): string {
    const plan = planName?.toLowerCase() || "free";
    let model: string;

    if (plan === "enterprise" || plan === "pro") {
        model = MODELS.PRO_ARTICLE;
    } else if (plan === "starter") {
        model = MODELS.STARTER_ARTICLE;
    } else {
        model = MODELS.FREE_ARTICLE;
    }

    console.log(`🤖 Article model: plan="${plan}" → ${model}`);
    return model;
}

// ─── Backward-compatible wrapper used by older callers ────────────────────────
export function getModelForPlan(planName?: string): string {
    return getArticleModel(planName);
}

// ─── Fast model for structured tasks ─────────────────────────────────────────
export function getFastModel(): string {
    return MODELS.FAST;
}

// ─── Humanizer model ──────────────────────────────────────────────────────────
export function getHumanizerModel(): string {
    return MODELS.HUMANIZER;
}

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
