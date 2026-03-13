/**
 * Stage 2: AI-Powered Analysis (Cheap Model)
 * 
 * Uses a smaller/cheaper model to analyze:
 * - Readability findings with specific recommendations
 * - Helpfulness gaps (does it answer the query? actionable?)
 * - Originality warnings (generic/commodity content detection)
 * - Trust/claim risk annotations
 * 
 * This stage does NOT rewrite — only analyzes and produces structured flags.
 */

import { openai, getModelForUser } from "@/lib/ai/client";
import type { QualityFlag } from "./deterministic";

export interface AiAnalysisInput {
    articleHtml: string;
    articleTitle: string;
    primaryTopic?: string;
    targetAudience?: string;
    brandVoice?: string;
}

export interface AiAnalysisResult {
    helpfulnessScore: number;
    originalityScore: number;
    flags: QualityFlag[];
    summary: string;
}

/**
 * Run AI-powered analysis on the article (cheap model).
 * Produces helpfulness + originality scores and detailed flags.
 */
export async function runAiAnalysis(
    userId: string,
    input: AiAnalysisInput
): Promise<AiAnalysisResult> {
    const model = await getModelForUser(userId);

    // Strip HTML to text excerpt for analysis (keep it under token limits)
    const textExcerpt = input.articleHtml
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 4000);

    const systemPrompt = `You are a professional editorial quality reviewer. You analyze articles for helpfulness, originality, readability issues, and trust concerns.

You must return a JSON object with this exact structure:
{
  "helpfulnessScore": 0-100,
  "originalityScore": 0-100,
  "summary": "2-3 sentence editorial summary",
  "flags": [
    {
      "flagType": "helpfulness|originality|readability|trust|specificity",
      "severity": "critical|warning|info|suggestion",
      "category": "helpfulness|originality|readability|trust|specificity",
      "message": "Clear description of the issue",
      "suggestedFix": "Specific actionable recommendation",
      "beforeSnippet": "problematic text if applicable or null",
      "afterSnippet": "suggested improvement if applicable or null"
    }
  ]
}

Scoring guidance:
- Helpfulness: Does the article answer the main query early? Is it actionable? Does it help someone make a decision? Does it avoid fluff?
- Originality: Does the article have a unique angle? Or is it generic commodity content that could appear on any website? Does it have specific examples, comparisons, decision-making help?

Flag types to look for:
- Generic/cliché intros ("In today's digital world...")
- Vague advice without steps or specifics
- Missing "when to use / when not to" guidance
- No unique angle or differentiating examples
- Commodity content that doesn't help the reader decide anything
- Sections that state the obvious without adding value
- Missing practical steps or actionable takeaways
- Content that restates the heading without adding new information

Rules:
- Do NOT flag things that are actually fine
- Do NOT invent personal experience
- Do NOT suggest adding fake statistics
- Be specific in your recommendations
- Maximum 12 flags total
- Focus on the most impactful improvements`;

    const userPrompt = `Analyze this article for helpfulness and originality:

TITLE: ${input.articleTitle}
TOPIC: ${input.primaryTopic || "general"}
TARGET AUDIENCE: ${input.targetAudience || "general readers"}
${input.brandVoice ? `BRAND VOICE: ${input.brandVoice}` : ""}

ARTICLE TEXT:
${textExcerpt}

Return your analysis as JSON.`;

    try {
        const response = await openai.chat.completions.create({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.3,
            response_format: { type: "json_object" },
        });

        const raw = response.choices[0]?.message?.content || "{}";
        let parsed: any;
        try {
            parsed = JSON.parse(raw);
        } catch {
            parsed = {};
        }

        const flags: QualityFlag[] = (parsed.flags || []).map((f: any) => ({
            flagType: f.flagType || "helpfulness",
            severity: ["critical", "warning", "info", "suggestion"].includes(f.severity) ? f.severity : "info",
            category: f.category || f.flagType || "helpfulness",
            locationRef: f.locationRef || null,
            message: f.message || "Issue detected",
            suggestedFix: f.suggestedFix || null,
            beforeSnippet: f.beforeSnippet || null,
            afterSnippet: f.afterSnippet || null,
        }));

        return {
            helpfulnessScore: clampScore(parsed.helpfulnessScore),
            originalityScore: clampScore(parsed.originalityScore),
            flags,
            summary: parsed.summary || "Analysis complete.",
        };
    } catch (error: any) {
        console.error("AI analysis failed:", error);
        return {
            helpfulnessScore: 50,
            originalityScore: 50,
            flags: [],
            summary: "AI analysis could not be completed.",
        };
    }
}

function clampScore(val: any): number {
    if (typeof val !== "number") return 50;
    return Math.max(0, Math.min(100, Math.round(val)));
}
