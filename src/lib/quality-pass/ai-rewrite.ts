/**
 * Stage 3: AI-Powered Rewrite (Stronger Model)
 * 
 * Uses the stronger model ONLY for actual content improvement:
 * - Intro rewrite
 * - Section flow improvement
 * - Specificity boosts
 * - FAQ cleanup
 * - Conclusion polish
 * - Full polished HTML output
 * 
 * Receives structured input from Stage 1 + Stage 2 so it knows
 * exactly what to fix. Never gets "make this better" — always gets
 * a specific improvement mandate.
 */

import { openai, getModelForUser } from "@/lib/ai/client";
import type { QualityFlag } from "./deterministic";

export interface RewriteInput {
    articleHtml: string;
    articleTitle: string;
    flags: QualityFlag[];
    brandVoice?: string;
    targetAudience?: string;
    language?: string;
    userContext?: {
        personalExample?: string;
        lessonLearned?: string;
        targetCountry?: string;
        productsOrServices?: string;
        screenshotNotes?: string;
        internalLinksToInclude?: string;
        tonePreference?: string;
    };
}

export interface RewriteResult {
    newHtml: string;
    newTitle: string;
    changeSummary: string;
    changesApplied: string[];
    wordCountBefore: number;
    wordCountAfter: number;
}

export async function runQualityRewrite(
    userId: string,
    input: RewriteInput
): Promise<RewriteResult> {
    const model = await getModelForUser(userId);

    // Build a focused improvement mandate from the flags
    const improvements = buildImprovementMandate(input.flags);

    const userContextBlock = buildUserContext(input.userContext);

    const systemPrompt = `You are a professional editorial writer. Your job is to improve an existing article draft for clarity, specificity, originality, helpfulness, and natural reading flow.

Critical rules:
- Output clean HTML suitable for Blogger (no <html>, <head>, <body> tags — just the post content)
- Do NOT wrap output in markdown code blocks
- Use H2 for main sections, H3 for subsections
- Preserve existing images, embeds, and media by keeping their HTML tags intact
- Do NOT invent personal experience, fake case studies, or made-up statistics
- Do NOT keyword-stuff or use manipulative SEO phrasing
- Do NOT add empty filler or generic padding
- Write helpful, people-first content
- Maintain the same core topic and factual claims
- Fix awkward phrasing, repetitive wording, weak transitions, and robotic rhythm
- Make vague statements more concrete and specific
- Remove commodity/generic language and add useful angle
- Ensure the intro answers the reader's likely question quickly
- Preserve HTML structure, links, and formatting
- Keep the same language as the original unless told otherwise
- Every paragraph should deliver value — no throat-clearing

What you must NOT do:
- Do not add fake expertise or authority
- Do not add unsupported statistics
- Do not over-promise or use guarantee language
- Do not change the factual meaning of any claim
- Do not remove existing links unless they're clearly broken
- Do not add "In today's digital landscape" or similar filler`;

    const userPrompt = `Improve this article based on the specific issues identified below.

CURRENT TITLE: ${input.articleTitle}
TARGET AUDIENCE: ${input.targetAudience || "general readers"}
BRAND VOICE: ${input.brandVoice || "clear, practical, trustworthy"}
LANGUAGE: ${input.language || "same as original"}

SPECIFIC IMPROVEMENTS NEEDED:
${improvements}

${userContextBlock}

CURRENT ARTICLE HTML:
${input.articleHtml}

Generate the complete improved article HTML. Also suggest an improved title if the current one is weak or generic.

After the HTML, add a line "---CHANGES---" followed by a brief summary of what you changed and why.`;

    let output = "";
    try {
        const response = await openai.chat.completions.create({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.6,
            max_tokens: 8000,
        });

        output = response.choices[0]?.message?.content || "";
        
        if (!output) {
            throw new Error("AI model returned empty response. Please try again.");
        }
    } catch (error: any) {
        console.error("AI rewrite API error:", error);
        throw new Error(
            error.message || 
            "AI rewrite failed. This could be due to rate limits or API issues. Please try again in a moment."
        );
    }

    // Clean markdown wrapping
    output = output.replace(/^```html?\s*/i, "").replace(/```\s*$/i, "").trim();

    // Split HTML and change summary
    let newHtml = output;
    let changeSummary = "";
    const changesSplit = output.split("---CHANGES---");
    if (changesSplit.length > 1) {
        newHtml = changesSplit[0].trim();
        changeSummary = changesSplit[1].trim();
    }

    // Extract title if AI suggested one
    let newTitle = input.articleTitle;
    const titleMatch = changeSummary.match(/(?:title|Title)[:\s]+["']?([^"'\n]+)["']?/);
    if (titleMatch) {
        newTitle = titleMatch[1].trim();
    }

    // Count words
    const wordCountBefore = input.articleHtml.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    const wordCountAfter = newHtml.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;

    // Parse changes
    const changesApplied = changeSummary
        .split(/\n/)
        .map((l) => l.replace(/^[-•*]\s*/, "").trim())
        .filter((l) => l.length > 10);

    return {
        newHtml,
        newTitle,
        changeSummary: changeSummary || "Article improved for clarity, specificity, and readability.",
        changesApplied,
        wordCountBefore,
        wordCountAfter,
    };
}

/**
 * Build a focused improvement mandate from the analysis flags.
 * Groups by category and provides specific instructions.
 */
function buildImprovementMandate(flags: QualityFlag[]): string {
    if (flags.length === 0) return "General polish for clarity and flow.";

    const grouped = new Map<string, QualityFlag[]>();
    for (const flag of flags) {
        const key = flag.category;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(flag);
    }

    const sections: string[] = [];

    for (const [category, categoryFlags] of grouped) {
        const label = CATEGORY_LABELS[category] || category;
        const items = categoryFlags
            .filter((f) => f.severity !== "info" || categoryFlags.length <= 3)
            .slice(0, 5)
            .map((f) => {
                let line = `  - ${f.message}`;
                if (f.suggestedFix) line += ` → Fix: ${f.suggestedFix}`;
                return line;
            })
            .join("\n");
        sections.push(`${label}:\n${items}`);
    }

    return sections.join("\n\n");
}

const CATEGORY_LABELS: Record<string, string> = {
    readability: "READABILITY ISSUES",
    repetition: "REPETITION ISSUES",
    structure: "STRUCTURE ISSUES",
    trust: "TRUST & CLAIM RISK",
    helpfulness: "HELPFULNESS GAPS",
    originality: "ORIGINALITY ISSUES",
    specificity: "SPECIFICITY ISSUES",
    naturalness: "NATURALNESS ISSUES",
    blogger_safety: "HTML SAFETY ISSUES",
};

/**
 * Build optional user context block for more grounded content.
 */
function buildUserContext(ctx?: RewriteInput["userContext"]): string {
    if (!ctx) return "";

    const parts: string[] = [];
    if (ctx.personalExample) parts.push(`USER'S REAL EXAMPLE (use this in the article): ${ctx.personalExample}`);
    if (ctx.lessonLearned) parts.push(`LESSON LEARNED (incorporate naturally): ${ctx.lessonLearned}`);
    if (ctx.targetCountry) parts.push(`TARGET COUNTRY/MARKET: ${ctx.targetCountry}`);
    if (ctx.productsOrServices) parts.push(`PRODUCTS/SERVICES MENTIONED: ${ctx.productsOrServices}`);
    if (ctx.screenshotNotes) parts.push(`SCREENSHOT/VISUAL NOTES: ${ctx.screenshotNotes} (add placeholder: [SCREENSHOT: description])`);
    if (ctx.internalLinksToInclude) parts.push(`INTERNAL LINKS TO INCLUDE: ${ctx.internalLinksToInclude}`);
    if (ctx.tonePreference) parts.push(`TONE PREFERENCE: ${ctx.tonePreference}`);

    if (parts.length === 0) return "";
    return `\nUSER-PROVIDED CONTEXT (use to make the article more real and grounded):\n${parts.join("\n")}\n`;
}
