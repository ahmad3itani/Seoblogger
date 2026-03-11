import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

// Shared OpenAI client via OpenRouter
export const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
    defaultHeaders: {
        "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
        "X-Title": "BloggerSEO",
    }
});

// Model selection based on user plan
const PREMIUM_MODEL = "openai/gpt-4o";
const FREE_MODEL = "openai/gpt-4o-mini";

export function getModelForPlan(planName?: string): string {
    const plan = planName?.toLowerCase() || "free";
    const isPremium = plan === "pro" || plan === "enterprise";
    const selectedModel = isPremium ? PREMIUM_MODEL : FREE_MODEL;
    console.log(`🤖 Model Selection: Plan="${plan}" → ${selectedModel} ${isPremium ? "(PREMIUM)" : "(FREE)"}`);
    return selectedModel;
}

// Fetch user's plan name from database
export async function getUserPlanName(userId: string): Promise<string> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { plan: true },
        });
        return user?.plan?.name || "free";
    } catch (error) {
        console.error("Error fetching user plan:", error);
        return "free";
    }
}

// Get model for a specific user by their ID
export async function getModelForUser(userId: string): Promise<string> {
    const planName = await getUserPlanName(userId);
    return getModelForPlan(planName);
}
