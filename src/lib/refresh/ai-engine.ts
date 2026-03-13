/**
 * AI Refresh Engine
 * 
 * Generates structured refresh plans and content using AI.
 * Never sends "refresh this post for SEO" — always sends a structured packet.
 * 
 * Two-model strategy:
 * - Fast model for diagnosis text, plan notes, FAQ candidates
 * - Stronger model for section rewrites, full refresh drafts
 */

import { openai, getModelForUser } from "@/lib/ai/client";
import type { DiagnosisResult } from "./diagnosis";

// ─── Types ───────────────────────────────────────────────────────

export interface RefreshPlanInput {
    post: {
        postId: string;
        url: string;
        title: string;
        publishedAt: string;
        bodyHtml: string;
        bodyTextExcerpt: string;
    };
    performance: {
        clicksLast28: number | null;
        clicksPrev28: number | null;
        impressionsLast28: number | null;
        impressionsPrev28: number | null;
        ctrLast28: number | null;
        avgPositionLast28: number | null;
    };
    diagnosis: {
        thinSections: string[];
        missingSubtopics: string[];
        introQuality: string;
        faqPresent: boolean;
        conclusionPresent: boolean;
        headingStructure: string;
        outdatedSignals: string[];
        snippetReadiness: string;
    };
    existingHeadings: { tag: string; text: string }[];
    brandVoice?: string;
    language?: string;
}

export interface GeneratedRefreshPlan {
    whyRefresh: string;
    whatToAdd: string;
    whatToKeep: string;
    whatToRemove: string;
    proposedOutline: { heading: string; action: "keep" | "expand" | "add" | "rewrite" }[];
    proposedFaqs: { question: string; answer: string }[];
    subtopicsToAdd: string[];
    suggestedTitle: string;
    expectedImpact: "high" | "medium" | "low";
    confidence: number;
}

export interface RefreshContentInput {
    post: {
        title: string;
        bodyHtml: string;
        url: string;
    };
    plan: GeneratedRefreshPlan;
    mode: "section" | "full";
    sectionsToRewrite?: string[]; // Section headings to rewrite (for section mode)
    brandVoice?: string;
    language?: string;
}

export interface GeneratedRefreshContent {
    newTitle: string;
    newHtml: string;
    sectionsExpanded: string[];
    subtopicsAdded: string[];
    faqsAdded: number;
    confidence: number;
}

// ─── Plan Generation (fast model) ────────────────────────────────

export async function generateRefreshPlan(
    userId: string,
    input: RefreshPlanInput
): Promise<GeneratedRefreshPlan> {
    const model = await getModelForUser(userId);

    const systemPrompt = `You are a professional SEO content strategist. Your job is to analyze an existing blog post and create a structured refresh plan.

You will receive:
- The post's current title, URL, and content excerpt
- Search performance data (clicks, impressions, CTR, position)
- A content diagnosis (weak sections, missing subtopics, outdated signals)
- The current heading structure

Your task is to produce a JSON refresh plan.

Rules:
- Be specific about what sections to add, expand, or rewrite
- Suggest practical FAQs that real users would search for
- Focus on topical coverage, helpfulness, and completeness
- Do NOT suggest keyword stuffing or manipulative tactics
- Use "related subtopics" and "supporting terms" — never "LSI keywords"
- Preserve the core topic and intent of the original post
- Output valid JSON only, no markdown wrapping`;

    const userPrompt = `Analyze this blog post and create a refresh plan:

POST TITLE: ${input.post.title}
POST URL: ${input.post.url}
PUBLISHED: ${input.post.publishedAt}
LANGUAGE: ${input.language || "en"}

CURRENT HEADINGS:
${input.existingHeadings.map((h) => `${h.tag}: ${h.text}`).join("\n")}

CONTENT EXCERPT (first 2000 chars):
${input.post.bodyTextExcerpt.slice(0, 2000)}

SEARCH PERFORMANCE:
- Clicks (last 28 days): ${input.performance.clicksLast28 ?? "N/A"}
- Clicks (prev 28 days): ${input.performance.clicksPrev28 ?? "N/A"}
- Impressions (last 28 days): ${input.performance.impressionsLast28 ?? "N/A"}
- Impressions (prev 28 days): ${input.performance.impressionsPrev28 ?? "N/A"}
- CTR: ${input.performance.ctrLast28 != null ? (input.performance.ctrLast28 * 100).toFixed(1) + "%" : "N/A"}
- Avg Position: ${input.performance.avgPositionLast28?.toFixed(1) ?? "N/A"}

CONTENT DIAGNOSIS:
- Intro quality: ${input.diagnosis.introQuality}
- Heading structure: ${input.diagnosis.headingStructure}
- FAQ present: ${input.diagnosis.faqPresent}
- Conclusion present: ${input.diagnosis.conclusionPresent}
- Snippet readiness: ${input.diagnosis.snippetReadiness}
- Thin sections: ${input.diagnosis.thinSections.join(", ") || "none"}
- Missing subtopics: ${input.diagnosis.missingSubtopics.join(", ") || "none detected"}
- Outdated signals: ${input.diagnosis.outdatedSignals.join(", ") || "none"}

${input.brandVoice ? `BRAND VOICE: ${input.brandVoice}` : ""}

Return a JSON object with this exact structure:
{
  "whyRefresh": "1-2 sentence explanation of why this post should be refreshed",
  "whatToAdd": "What new content/sections should be added",
  "whatToKeep": "What existing content is good and should be preserved",
  "whatToRemove": "What should be removed or significantly reworked (be conservative)",
  "proposedOutline": [
    { "heading": "Section Title", "action": "keep|expand|add|rewrite" }
  ],
  "proposedFaqs": [
    { "question": "Practical question users ask", "answer": "Concise helpful answer" }
  ],
  "subtopicsToAdd": ["subtopic 1", "subtopic 2"],
  "suggestedTitle": "Improved title if needed, or same title",
  "expectedImpact": "high|medium|low",
  "confidence": 75
}`;

    const response = await openai.chat.completions.create({
        model,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
        response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content || "{}";
    let parsed: any;
    try {
        parsed = JSON.parse(raw);
    } catch {
        parsed = {};
    }

    return {
        whyRefresh: parsed.whyRefresh || "Content needs updating for better search performance.",
        whatToAdd: parsed.whatToAdd || "",
        whatToKeep: parsed.whatToKeep || "",
        whatToRemove: parsed.whatToRemove || "",
        proposedOutline: Array.isArray(parsed.proposedOutline) ? parsed.proposedOutline : [],
        proposedFaqs: Array.isArray(parsed.proposedFaqs) ? parsed.proposedFaqs : [],
        subtopicsToAdd: Array.isArray(parsed.subtopicsToAdd) ? parsed.subtopicsToAdd : [],
        suggestedTitle: parsed.suggestedTitle || input.post.title,
        expectedImpact: ["high", "medium", "low"].includes(parsed.expectedImpact) ? parsed.expectedImpact : "medium",
        confidence: typeof parsed.confidence === "number" ? Math.min(100, Math.max(0, parsed.confidence)) : 70,
    };
}

// ─── Content Generation (stronger model) ─────────────────────────

export async function generateRefreshContent(
    userId: string,
    input: RefreshContentInput
): Promise<GeneratedRefreshContent> {
    const model = await getModelForUser(userId);

    const outlineStr = input.plan.proposedOutline
        .map((o) => `[${o.action.toUpperCase()}] ${o.heading}`)
        .join("\n");

    const faqStr = input.plan.proposedFaqs
        .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
        .join("\n\n");

    const systemPrompt = `You are a professional content writer specializing in blog post optimization. You will refresh an existing blog post based on a structured plan.

Critical rules:
- Output clean HTML suitable for Blogger (no <html>, <head>, <body> tags — just the post content)
- Do NOT wrap output in markdown code blocks
- Use H2 for main sections, H3 for subsections
- Preserve existing images, embeds, and media by keeping their HTML tags intact
- Keep the same core topic and writing tone
- Expand thin sections with useful, practical content
- Add FAQ section if specified in the plan
- Add missing subtopics naturally within relevant sections
- Do NOT keyword-stuff or use manipulative phrasing
- Write helpful, people-first content
- Use the same language as the original post
- Include internal link placeholders where appropriate: [INTERNAL_LINK: topic]
- Every paragraph should provide value — no filler text`;

    let userPrompt: string;

    if (input.mode === "section") {
        const sectionsToRewrite = input.sectionsToRewrite || [];
        userPrompt = `Refresh the following blog post by rewriting ONLY these sections: ${sectionsToRewrite.join(", ")}
Also add any new sections from the plan.

CURRENT TITLE: ${input.post.title}
SUGGESTED NEW TITLE: ${input.plan.suggestedTitle}

REFRESH PLAN OUTLINE:
${outlineStr}

SUBTOPICS TO ADD: ${input.plan.subtopicsToAdd.join(", ") || "none"}

FAQS TO ADD:
${faqStr || "none"}

${input.brandVoice ? `BRAND VOICE: ${input.brandVoice}` : ""}
${input.language ? `LANGUAGE: ${input.language}` : ""}

CURRENT POST HTML:
${input.post.bodyHtml}

Generate the complete updated post HTML with the specified sections refreshed and new sections added.`;
    } else {
        userPrompt = `Perform a full refresh of the following blog post based on the plan.

CURRENT TITLE: ${input.post.title}
SUGGESTED NEW TITLE: ${input.plan.suggestedTitle}

WHY REFRESH: ${input.plan.whyRefresh}

REFRESH PLAN OUTLINE:
${outlineStr}

WHAT TO ADD: ${input.plan.whatToAdd}
WHAT TO KEEP: ${input.plan.whatToKeep}
WHAT TO REMOVE: ${input.plan.whatToRemove}

SUBTOPICS TO ADD: ${input.plan.subtopicsToAdd.join(", ") || "none"}

FAQS TO ADD:
${faqStr || "none"}

${input.brandVoice ? `BRAND VOICE: ${input.brandVoice}` : ""}
${input.language ? `LANGUAGE: ${input.language}` : ""}

CURRENT POST HTML:
${input.post.bodyHtml}

Generate the complete refreshed post HTML. Preserve existing media and structure where the plan says "keep". Expand or rewrite sections as indicated.`;
    }

    const response = await openai.chat.completions.create({
        model,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 8000,
    });

    let newHtml = response.choices[0]?.message?.content || "";

    // Clean up markdown wrapping if present
    newHtml = newHtml.replace(/^```html?\s*/i, "").replace(/```\s*$/i, "").trim();

    // Count changes
    const subtopicsAdded = input.plan.subtopicsToAdd.filter((st) =>
        newHtml.toLowerCase().includes(st.toLowerCase().split(" ")[0])
    );

    return {
        newTitle: input.plan.suggestedTitle || input.post.title,
        newHtml,
        sectionsExpanded: input.plan.proposedOutline
            .filter((o) => o.action === "expand" || o.action === "rewrite")
            .map((o) => o.heading),
        subtopicsAdded,
        faqsAdded: input.plan.proposedFaqs.length,
        confidence: input.plan.confidence,
    };
}
