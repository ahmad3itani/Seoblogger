/**
 * Internal Linking AI Suggestion System
 * 
 * Takes a structured opportunity object and uses AI to:
 * 1. Choose the best anchor text
 * 2. Minimally rewrite the source paragraph to include the link
 * 3. Return a validated, structured result
 */

import { openai } from "@/lib/ai/client";

export interface LinkSuggestionInput {
    sourceUrl: string;
    sourceTitle: string;
    targetUrl: string;
    targetTitle: string;
    sourceParagraphHtml: string;
    sourceParagraphText: string;
    candidatePhrases: string[];
    targetIncomingCount: number;
}

export interface LinkSuggestionResult {
    anchorText: string;
    newParagraphHtml: string;
    reason: string;
    confidence: number;
}

export async function generateLinkSuggestion(
    input: LinkSuggestionInput
): Promise<LinkSuggestionResult | null> {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `You are an expert SEO internal linking assistant. Your ONLY job is to insert ONE natural internal link into a paragraph.

RULES — FOLLOW EXACTLY:
1. Pick the BEST anchor text from the candidate phrases, or create a slightly better variant (2-5 words, descriptive, NOT generic)
2. Rewrite the paragraph MINIMALLY — change as few words as possible
3. Insert exactly ONE <a> tag linking to the target URL
4. The link must read naturally — a human should not notice it was inserted by a tool
5. NEVER use generic anchors like "click here", "this post", "read more", "here"
6. NEVER add more than one link
7. NEVER remove existing content or links
8. NEVER change the meaning of the paragraph
9. Keep the same HTML structure — only modify the text to include the <a> tag
10. The anchor text should be descriptive of what the target page is about

OUTPUT FORMAT (strict JSON):
{
  "anchorText": "the exact text used as anchor",
  "newParagraphHtml": "the full paragraph HTML with the new <a href='TARGET_URL' title='TARGET_TITLE'>anchor text</a> inserted",
  "reason": "Brief explanation of why this anchor and placement works",
  "confidence": 0.0-1.0
}

If you genuinely cannot find a natural place to insert the link, return:
{ "anchorText": "", "newParagraphHtml": "", "reason": "No natural insertion point found", "confidence": 0 }`
                },
                {
                    role: "user",
                    content: `INSERT AN INTERNAL LINK INTO THIS PARAGRAPH:

SOURCE PAGE: "${input.sourceTitle}"
SOURCE URL: ${input.sourceUrl}

TARGET PAGE: "${input.targetTitle}" (currently has ${input.targetIncomingCount} internal links)
TARGET URL: ${input.targetUrl}

CANDIDATE ANCHOR PHRASES (found in the paragraph):
${input.candidatePhrases.map((p, i) => `${i + 1}. "${p}"`).join("\n")}

ORIGINAL PARAGRAPH HTML:
${input.sourceParagraphHtml}

ORIGINAL PARAGRAPH TEXT:
${input.sourceParagraphText}

Return the JSON with the minimally rewritten paragraph containing exactly one <a> link to ${input.targetUrl}.`
                },
            ],
            temperature: 0.3,
            max_tokens: 1500,
        });

        const rawJson = completion.choices[0]?.message?.content || "{}";
        const result = JSON.parse(rawJson);

        // Validate the result
        if (!result.anchorText || !result.newParagraphHtml || result.confidence === 0) {
            return null;
        }

        // Validation: ensure the target URL is in the output
        if (!result.newParagraphHtml.includes(input.targetUrl)) {
            return null;
        }

        // Validation: ensure only one new link was added
        const linkCount = (result.newParagraphHtml.match(/<a\s/gi) || []).length;
        const originalLinkCount = (input.sourceParagraphHtml.match(/<a\s/gi) || []).length;
        if (linkCount > originalLinkCount + 1) {
            return null;
        }

        // Validation: anchor text is not generic
        const genericAnchors = ["click here", "here", "this", "read more", "this post", "this article", "link"];
        if (genericAnchors.includes(result.anchorText.toLowerCase().trim())) {
            return null;
        }

        // Validation: anchor length is reasonable (2-8 words)
        const anchorWordCount = result.anchorText.trim().split(/\s+/).length;
        if (anchorWordCount < 1 || anchorWordCount > 10) {
            return null;
        }

        return {
            anchorText: result.anchorText,
            newParagraphHtml: result.newParagraphHtml,
            reason: result.reason || "Natural anchor placement",
            confidence: Math.min(Math.max(result.confidence || 0.5, 0), 1),
        };
    } catch (error) {
        console.error("Link suggestion AI error:", error);
        return null;
    }
}
