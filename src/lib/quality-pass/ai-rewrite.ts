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
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";
import { humanizeArticle } from "@/lib/ai/generate";
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

    // Use the same high-quality system prompt as article generation
    const systemPrompt = SYSTEM_PROMPTS.ARTICLE_WRITER;

    const userPrompt = `ENHANCE AND OPTIMIZE this article to premium SEO standards:

CURRENT TITLE: ${input.articleTitle}
PRIMARY KEYWORD: ${input.articleTitle.split(' ').slice(0, 3).join(' ')} (extract from title)
TARGET AUDIENCE: ${input.targetAudience || "general readers"}
BRAND VOICE: ${input.brandVoice || "clear, practical, trustworthy"}
LANGUAGE: ${input.language || "English"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUALITY ISSUES TO FIX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${improvements}

${userContextBlock}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENHANCEMENT REQUIREMENTS (CRITICAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. FIX ALL IDENTIFIED ISSUES ABOVE

2. ENHANCE SEO OPTIMIZATION:
   - Ensure primary keyword appears 10-15 times naturally throughout
   - Add 3-5 external links to authoritative sources (Wikipedia, .gov, .edu, official sites)
   - Format: <a href="URL" target="_blank" rel="noopener noreferrer">descriptive anchor text</a>
   - Strengthen first 100 words with keyword and value proposition

3. IMPROVE CONTENT QUALITY:
   - Write in FULL, RICH PARAGRAPHS (4-6 sentences, 80-120 words each)
   - NEVER use bullet points in main content sections (only for lists/steps if specifically needed)
   - Add specific examples, data, and actionable insights
   - Use natural, conversational tone with contractions
   - Vary sentence length dramatically for better readability
   - Remove all robotic AI patterns ("In today's world", "It's important to note", etc.)

4. MAINTAIN STRUCTURE:
   - Keep all existing H2/H3 headings unless they're generic
   - Preserve all HTML formatting, tables, and existing links
   - Keep images and media intact
   - Improve heading quality if needed (make them compelling and keyword-optimized)

5. E-E-A-T SIGNALS:
   - Add authoritative external references
   - Include specific, verifiable information
   - Show expertise through detailed explanations
   - Be honest about limitations where appropriate

CURRENT ARTICLE HTML:
${input.articleHtml}

OUTPUT:
- Return the complete enhanced HTML article body
- Then add "---CHANGES---" followed by a summary of improvements
- No markdown wrapping, ready for Blogger
- Must be comprehensive, valuable, and SEO-optimized`;

    let output = "";
    try {
        // Step 1: Generate enhanced content with full SEO optimization
        const inputCharCount = input.articleHtml.length;
        const estimatedTokens = Math.ceil(inputCharCount / 4);
        const maxTokens = Math.min(estimatedTokens * 3, 16000);
        
        console.log(`📝 Quality Pass: Enhancing ${inputCharCount} chars, MaxTokens=${maxTokens}`);
        
        const response = await openai.chat.completions.create({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: maxTokens,
        });

        let rawOutput = response.choices[0]?.message?.content || "";
        
        if (!rawOutput) {
            throw new Error("AI model returned empty response. Please try again.");
        }
        
        // Clean markdown wrapping
        rawOutput = rawOutput.replace(/^```html?\s*/i, "").replace(/```\s*$/i, "").trim();
        
        // Step 2: Run humanizer pass to make it sound natural
        console.log("🧠 Running humanizer on quality-pass content...");
        const keyword = input.articleTitle.split(' ').slice(0, 3).join(' ');
        output = await humanizeArticle(rawOutput, {
            keyword,
            articleType: "blog post",
            tone: input.brandVoice || "professional, conversational",
            language: input.language,
        });
        
    } catch (error: any) {
        console.error("AI rewrite API error:", error);
        throw new Error(
            error.message || 
            "AI rewrite failed. This could be due to rate limits or API issues. Please try again in a moment."
        );
    }

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
