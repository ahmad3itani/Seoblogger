// ─────────────────────────────────────────────────────────────────────────────
// DEPRECATED: Legacy Generation Engine
// The core article generation and outlining functions have been moved to 
// @/lib/ai/v2-engine for strictly enforcing #1 ranking Blogger SEO quality.
// Functions here (like generateTitles) are maintained only for backward compatibility.
// ─────────────────────────────────────────────────────────────────────────────

import { SYSTEM_PROMPTS } from "./prompts";
import { generateAndHostImage } from "../cloudflare/image-generator";
import { openai, getModelForPlan, getFastModel, getHumanizerModel, getArticleModel } from "./client";

// Helper to inject variables into prompt templates
function injectVars(prompt: string, vars: Record<string, string>): string {
    let result = prompt;
    for (const [key, value] of Object.entries(vars)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }
    return result;
}

// Helper to safely extract JSON from LLM responses containing conversational filler or markdown
function cleanJSON(str: string): string {
    const text = str.trim();
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    const lastBrace = text.lastIndexOf('}');
    const lastBracket = text.lastIndexOf(']');

    let start = -1;
    let end = -1;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        start = firstBrace;
        end = lastBrace;
    } else if (firstBracket !== -1) {
        start = firstBracket;
        end = lastBracket;
    }

    if (start !== -1 && end !== -1 && end > start) {
        return text.substring(start, end + 1);
    }

    return text;
}

export interface GenerationOptions {
    keyword: string;
    language?: string;
    tone?: string;
    niche?: string;
    articleType?: string;
    wordCount?: number;
    brandVoice?: string;
    existingPostsList?: string;
    affiliateLinks?: string[];
    competitorData?: any;
    includeFaq?: boolean;
    includeImages?: boolean;
    numInlineImages?: number;
    includeComparisonTable?: boolean;
    includeRecipe?: boolean;
    includeProsCons?: boolean;
    includeStepByStep?: boolean;
    includeExternalLinks?: boolean;
    // Real SERP sources to use for external links (prevents hallucinated URLs)
    serpSources?: string; // Pre-formatted string from formatSourcesForPrompt()
    // PAA questions for smarter FAQ generation
    paaQuestions?: string[]; // Real "People Also Ask" questions from SERP
    userPlan?: string; // User's subscription plan for model selection
}

export interface OutlineSection {
    heading: string;
    level: number;
    points: string[];
    wordCount?: number;
    subsections?: OutlineSection[];
}

export interface Outline {
    sections: OutlineSection[];
    faqs: { question: string; shortAnswer: string }[];
    suggestedLabels: string[];
    totalWordCount: number;
}

export interface FAQ {
    question: string;
    answer: string;
}

export interface MetaOutput {
    metaDescription: string;
    excerpt: string;
}

// ─── GENERATE SEO TITLES ─────────────────────────────────────────────────────
export async function generateTitles(
    options: GenerationOptions
): Promise<string[]> {
    // Titles are a structured JSON task — use the fast model
    const model = getFastModel();

    const userPrompt = `Generate 5 SEO-optimized blog post titles.

Primary Keyword: ${options.keyword}
Language: ${options.language || "English"}
Tone: ${options.tone || "informational"}
Niche: ${options.niche || "general"}
Article Type: ${options.articleType || "blog post"}

Return ONLY a JSON array of 5 title strings. No explanation, no markdown.`;

    let response;
    try {
        response = await openai.chat.completions.create({
            model,
            messages: [
                { role: "system", content: SYSTEM_PROMPTS.TITLE_GENERATOR + "\n\nOutput only valid JSON. No markdown code fences." },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.8,
            max_tokens: 512,
        });
    } catch (err: any) {
        console.error("Title generation error:", err.message, err.status);
        throw err;
    }

    const content = response.choices[0]?.message?.content || "[]";
    try {
        const parsed = JSON.parse(cleanJSON(content));
        return Array.isArray(parsed) ? parsed : parsed.titles || [];
    } catch {
        return [];
    }
}

// ─── GENERATE OUTLINE ────────────────────────────────────────────────────────
export async function generateOutline(
    title: string,
    options: GenerationOptions
): Promise<Outline> {
    const systemPrompt = injectVars(SYSTEM_PROMPTS.OUTLINE_GENERATOR, {
        WORD_COUNT: String(options.wordCount || 2000),
    });

    const userPrompt = `Create a comprehensive article outline for:

Title: ${title}
Primary Keyword: ${options.keyword}
Target Word Count: ${options.wordCount || 2000}
Language: ${options.language || "English"}
Tone: ${options.tone || "informational"}
Niche: ${options.niche || "general"}
Article Type: ${options.articleType || "blog post"}
${options.brandVoice ? `Brand Voice Instructions: ${options.brandVoice}` : ""}
${options.competitorData ? `
COMPETITOR INTELLIGENCE — BUILD A SUPERIOR OUTLINE:
Competitor Title: ${options.competitorData.title}
Competitor Description: ${options.competitorData.description}
Competitor Headings:
${options.competitorData.headings?.map((h: any) => `- [${h.level?.toUpperCase?.() || "H2"}] ${h.text}`).join("\n") || "N/A"}

Analyze what they cover, find gaps in their content, and create a MORE comprehensive outline. Your headings should be more engaging and better optimized for search intent.
` : ""}

Return ONLY valid JSON matching the required format. No explanation.`;

    // Outline is a structured JSON task — use the fast model
    const model = getFastModel();

    const response = await openai.chat.completions.create({
        model,
        messages: [
            { role: "system", content: systemPrompt + "\n\nOutput ONLY valid JSON. No markdown code fences, no explanation." },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content || "{}";
    try {
        return JSON.parse(cleanJSON(content));
    } catch {
        return { sections: [], faqs: [], suggestedLabels: [], totalWordCount: 0 };
    }
}

// ─── BUILD CONTENT-TYPE INSTRUCTIONS ────────────────────────────────────────
function buildContentTypeInstructions(options: GenerationOptions): string {
    let instructions = "\n\n━━━ CRITICAL CONTENT REQUIREMENTS ━━━";
    
    // Paragraph length enforcement
    instructions += `\n\nPARAGRAPH LENGTH RULES (MANDATORY):
- Each paragraph MUST be 150-250 words minimum
- Break long paragraphs only at natural topic shifts
- Use 3-5 sentences per paragraph minimum
- Add depth, examples, and explanations - NO short paragraphs`;
    
    if (options.includeComparisonTable) {
        instructions += `\n\n✅ COMPARISON TABLE REQUIRED:
Create a detailed HTML comparison table with <table>, <thead>, <tbody>.
Minimum 3 columns, 5 rows. Include specific data points, not generic descriptions.
Place after the section that discusses the items being compared.
Example format:
<table>
<thead><tr><th>Feature</th><th>Option A</th><th>Option B</th></tr></thead>
<tbody><tr><td>Price</td><td>$50</td><td>$75</td></tr></tbody>
</table>`;
    }
    if (options.includeRecipe) {
        instructions += `\n\n✅ RECIPE SECTION REQUIRED:
Include complete recipe with:
- Prep Time, Cook Time, Total Time, Servings
- Ingredients as <ul> with exact measurements
- Instructions as <ol> with detailed numbered steps
- Optional: Tips section with <ul>`;
    }
    if (options.includeProsCons) {
        instructions += `\n\n✅ PROS & CONS SECTION REQUIRED:
Create dedicated "Pros and Cons" section with:
- <h3>✅ Pros</h3> followed by <ul> with 5-7 specific advantages
- <h3>❌ Cons</h3> followed by <ul> with 3-5 honest drawbacks
- Each point should be 1-2 sentences explaining WHY it's a pro/con`;
    }
    if (options.includeStepByStep) {
        instructions += `\n\n✅ STEP-BY-STEP GUIDE REQUIRED:
Create "Step-by-Step Guide" section with:
- <ol> with minimum 7 detailed numbered steps
- Each step: <strong>Action heading</strong> + 3-4 sentence explanation
- Include tips, warnings, or best practices for each step`;
    }
    
    instructions += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
    return instructions;
}

// ─── BUILD LINKING BLOCK ─────────────────────────────────────────────────────
function buildLinkingBlock(options: GenerationOptions): string {
    const parts: string[] = [];

    if (options.existingPostsList) {
        parts.push(`\n━━━ INTERNAL LINKS (INSERT 2-3 OF THESE) ━━━
${options.existingPostsList}
Rules: natural placement in paragraph text, descriptive anchor (not "click here"), spread across sections.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    }

    if (options.affiliateLinks && options.affiliateLinks.length > 0) {
        parts.push(`\nAffiliate links (integrate naturally as recommendations):\n- ${options.affiliateLinks.join("\n- ")}`);
    }

    if (options.includeExternalLinks === false) {
        parts.push(`\nDo NOT include any external links.`);
    } else if (options.serpSources) {
        parts.push(`\n${options.serpSources}`);
    } else {
        parts.push(`\nExternal links: only include if you are 100% certain the URL exists. Wikipedia and official root domains (who.int, cdc.gov) are safe. Never construct or guess specific paths.`);
    }

    return parts.join("\n");
}

// ─── GENERATE FULL ARTICLE (single-pass, ≤3000 words) ───────────────────────
async function generateArticleSinglePass(
    title: string,
    outline: Outline,
    options: GenerationOptions
): Promise<string> {
    const targetWords = options.wordCount || 2000;
    const model = getArticleModel(options.userPlan);

    const systemPrompt = injectVars(SYSTEM_PROMPTS.ARTICLE_WRITER, {
        PRIMARY_KEYWORD: options.keyword,
        WORD_COUNT: String(targetWords),
        LANGUAGE: options.language || "English",
    });

    const userPrompt = `Write the complete article for Blogger.

Title: ${title}
Primary Keyword: ${options.keyword}
Target: ${targetWords} words
Language: ${options.language || "English"}
Tone: ${options.tone || "informational"}
Niche: ${options.niche || "general"}
Article Type: ${options.articleType || "blog post"}
${options.brandVoice ? `Brand Voice: ${options.brandVoice}` : ""}
${buildLinkingBlock(options)}
${buildContentTypeInstructions(options)}

OUTLINE:
${JSON.stringify(outline, null, 2)}

Output: ONLY the Blogger-compatible HTML body. Start with the TLDR <p>, then first <h2>. No markdown, no code fences.`;

    // Safe token limit: 1.5 tokens/word for HTML, capped at 8000
    const maxTokens = Math.min(Math.ceil(targetWords * 1.5), 8000);
    console.log(`📝 Single-pass: target=${targetWords}w, maxTokens=${maxTokens}, model=${model}`);

    const response = await openai.chat.completions.create({
        model,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.75,
        max_tokens: maxTokens,
    });

    return cleanMarkdown(response.choices[0]?.message?.content || "");
}

// ─── GENERATE ARTICLE SECTION BY SECTION (long articles > 3000 words) ────────
async function generateArticleSectionBySection(
    title: string,
    outline: Outline,
    options: GenerationOptions
): Promise<string> {
    const targetWords = options.wordCount || 2000;
    const model = getArticleModel(options.userPlan);
    const sections = outline.sections || [];
    const totalSections = sections.length;
    const linkingBlock = buildLinkingBlock(options);
    const contentTypeInstructions = buildContentTypeInstructions(options);

    console.log(`📝 Section-by-section: ${totalSections} sections, target=${targetWords}w, model=${model}`);

    const parts: string[] = [];

    // ── TLDR + intro section ──────────────────────────────────────────────────
    const introSection = sections[0] || { heading: "Introduction", level: 2, points: [] };
    const introWordTarget = introSection.wordCount || Math.round(targetWords * 0.12);

    const tldrPrompt = injectVars(SYSTEM_PROMPTS.SECTION_WRITER, {
        PRIMARY_KEYWORD: options.keyword,
        ARTICLE_TITLE: title,
        TONE: options.tone || "informational",
        ARTICLE_TYPE: options.articleType || "blog post",
        LANGUAGE: options.language || "English",
        SECTION_WORD_COUNT: String(introWordTarget),
    });

    const tldrUserPrompt = `Write the opening of this article.

FIRST: Write the TLDR paragraph (before the H2). 2-3 sentences. Direct answer to: "${options.keyword}". Uses keyword in sentence 1. Optimized as a featured snippet. Start this paragraph with a <p> tag.

THEN: Write the first full section:
Heading: ${introSection.heading}
Points to cover: ${JSON.stringify(introSection.points)}
Subsections: ${JSON.stringify(introSection.subsections || [])}
Target: ${introWordTarget} words for this section.
${linkingBlock ? `Linking context (place 1 internal link here if available):\n${linkingBlock}` : ""}

Output: Clean HTML only. TLDR <p> first, then <h2> for the section.`;

    const tldrResponse = await openai.chat.completions.create({
        model,
        messages: [
            { role: "system", content: tldrPrompt },
            { role: "user", content: tldrUserPrompt },
        ],
        temperature: 0.75,
        max_tokens: Math.min(Math.ceil(introWordTarget * 1.8), 2000),
    });
    parts.push(cleanMarkdown(tldrResponse.choices[0]?.message?.content || ""));

    // ── Middle sections ───────────────────────────────────────────────────────
    const remainingSections = sections.slice(1);
    const wordsUsed = introWordTarget;
    const wordsLeft = targetWords - wordsUsed;
    const wordsPerSection = Math.round(wordsLeft / Math.max(remainingSections.length, 1));

    for (let i = 0; i < remainingSections.length; i++) {
        const section = remainingSections[i];
        const sectionTarget = section.wordCount || wordsPerSection;
        const isLast = i === remainingSections.length - 1;

        // Inject content-type instructions and linking into middle or last section
        const sectionExtra =
            i === Math.floor(remainingSections.length / 2) ? contentTypeInstructions : "";
        const linkExtra =
            i === Math.floor(remainingSections.length / 3) && linkingBlock
                ? `\nPlace 1 internal link naturally here if relevant:\n${linkingBlock}`
                : "";

        const sectionSystemPrompt = injectVars(SYSTEM_PROMPTS.SECTION_WRITER, {
            PRIMARY_KEYWORD: options.keyword,
            ARTICLE_TITLE: title,
            TONE: options.tone || "informational",
            ARTICLE_TYPE: options.articleType || "blog post",
            LANGUAGE: options.language || "English",
            SECTION_WORD_COUNT: String(sectionTarget),
        });

        const sectionUserPrompt = `Write section ${i + 2} of ${totalSections} for the article "${title}".

Heading: ${section.heading}
Level: H${section.level}
Points to cover: ${JSON.stringify(section.points)}
Subsections: ${JSON.stringify(section.subsections || [])}
Target: ${sectionTarget} words
${isLast ? `This is the CONCLUSION section. Summarize key takeaways. Use "${options.keyword}" at least twice. End with a strong, specific call-to-action.` : ""}
${sectionExtra}
${linkExtra}

Output: Clean HTML only. Start with <h${section.level}> tag.`;

        const sectionResponse = await openai.chat.completions.create({
            model,
            messages: [
                { role: "system", content: sectionSystemPrompt },
                { role: "user", content: sectionUserPrompt },
            ],
            temperature: 0.75,
            max_tokens: Math.min(Math.ceil(sectionTarget * 1.8), 3000),
        });

        parts.push(cleanMarkdown(sectionResponse.choices[0]?.message?.content || ""));
        console.log(`  ✓ Section ${i + 2}/${totalSections}: "${section.heading}"`);
    }

    return parts.join("\n\n");
}

// ─── CLEAN MARKDOWN ARTIFACTS ────────────────────────────────────────────────
function cleanMarkdown(text: string): string {
    return text
        .replace(/^```html?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();
}

// ─── GENERATE ARTICLE (smart router) ─────────────────────────────────────────
// Routes to single-pass (≤3000 words) or section-by-section (>3000 words).
export async function generateArticle(
    title: string,
    outline: Outline,
    options: GenerationOptions
): Promise<string> {
    const targetWords = options.wordCount || 2000;
    const useSectionBySection = targetWords > 3000;

    let article: string;

    if (useSectionBySection) {
        console.log(`📋 Using section-by-section generation (${targetWords} words)`);
        article = await generateArticleSectionBySection(title, outline, options);
    } else {
        article = await generateArticleSinglePass(title, outline, options);
    }

    // Count words and log
    const wordCount = article.replace(/<[^>]*>/g, " ").split(/\s+/).filter(w => w.length > 0).length;
    const pct = Math.round((wordCount / targetWords) * 100);
    console.log(`✅ Article: ${wordCount} words (${pct}% of ${targetWords} target)`);
    if (wordCount < targetWords * 0.75) {
        console.warn(`⚠️ Article significantly shorter than target: ${wordCount}/${targetWords}`);
    }

    return article;
}

// ─── HUMANIZE ARTICLE ────────────────────────────────────────────────────────
export async function humanizeArticle(
    articleHtml: string,
    options: {
        keyword: string;
        articleType?: string;
        niche?: string;
        tone?: string;
        language?: string;
        userPlan?: string;
    }
): Promise<string> {
    const systemPrompt = SYSTEM_PROMPTS.ARTICLE_HUMANIZER;
    
    const userPrompt = `Humanize and polish this article. Make it read like a real human expert wrote it — not AI.

PRIMARY KEYWORD: ${options.keyword}
ARTICLE TYPE: ${options.articleType || "blog post"}
NICHE: ${options.niche || "general"}
TONE: ${options.tone || "professional, conversational"}
LANGUAGE: ${options.language || "English"}

ARTICLE TO HUMANIZE:
${articleHtml}

CRITICAL REMINDERS:
- Preserve ALL links (<a> tags) exactly as they are — do not remove or modify any href
- Preserve ALL tables, blockquotes, and structural HTML
- Keep H2/H3 heading text intact (SEO headings must not change)
- Vary sentence lengths dramatically — mix short and long
- Use contractions, rhetorical questions, and natural transitions
- Eliminate robotic AI patterns and corporate speak
- Make every paragraph feel like it was written by someone who actually knows the topic
- Output ONLY clean HTML — no markdown, no explanations`;

    // Humanizer uses DeepSeek — excellent at natural writing, very cheap
    const model = getHumanizerModel();

    const inputWordCount = articleHtml.replace(/<[^>]*>/g, " ").split(/\s+/).filter(w => w.length > 0).length;

    // DeepSeek has a large output window, but we still cap reasonably.
    // If article is very long (>4000 words), skip humanizer to be safe.
    if (inputWordCount > 4000) {
        console.log(`⚠️ Humanizer: Article too long (${inputWordCount}w) — skipping to prevent truncation`);
        return articleHtml;
    }

    const maxTokens = Math.min(Math.ceil(inputWordCount * 1.6) + 400, 8000);
    console.log(`🧠 Humanizer: ${inputWordCount}w → maxTokens=${maxTokens}, model=${model}`);
    
    try {
        const response = await openai.chat.completions.create({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.85,
            max_tokens: maxTokens,
        });

        let humanized = response.choices[0]?.message?.content || "";
        
        // Clean markdown artifacts
        humanized = humanized
            .replace(/^```html?\s*/i, "")
            .replace(/\s*```\s*$/i, "")
            .trim();
        
        // Check if humanizer completed the article (allow for slight compression)
        if (!humanized || humanized.length < articleHtml.length * 0.7) {
            console.warn(`⚠️ Humanizer returned insufficient content (${humanized.length} vs ${articleHtml.length} chars), using original article`);
            return articleHtml;
        }
        
        // Check if article was truncated (ends abruptly without closing tags)
        const hasProperEnding = humanized.includes('</div>') || humanized.includes('</p>') || humanized.includes('</h2>');
        if (!hasProperEnding) {
            console.warn("⚠️ Humanizer output appears truncated (no closing tags), using original article");
            return articleHtml;
        }
        
        const humanizedWordCount = humanized.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
        const ratio = Math.round((humanizedWordCount / inputWordCount) * 100);
        console.log(`✅ Humanizer complete: ${humanizedWordCount} words (${ratio}% of original ${inputWordCount})`);
        
        // Verify links were preserved
        const originalLinkCount = (articleHtml.match(/<a\s/gi) || []).length;
        const humanizedLinkCount = (humanized.match(/<a\s/gi) || []).length;
        if (originalLinkCount > 0 && humanizedLinkCount < originalLinkCount * 0.5) {
            console.warn(`⚠️ Humanizer dropped too many links (${originalLinkCount} → ${humanizedLinkCount}), using original`);
            return articleHtml;
        }
        
        return humanized;
    } catch (error) {
        console.error("❌ Humanizer failed, using original article:", error);
        return articleHtml;
    }
}

// ─── GENERATE FAQs ───────────────────────────────────────────────────────────
export async function generateFAQ(
    keyword: string,
    articleContent: string,
    language?: string,
    niche?: string,
    userPlan?: string,
    paaQuestions?: string[] // Real "People Also Ask" questions from SERP
): Promise<FAQ[]> {
    const systemPrompt = injectVars(SYSTEM_PROMPTS.FAQ_GENERATOR, {
        PRIMARY_KEYWORD: keyword,
    });

    const paaContext = paaQuestions && paaQuestions.length > 0
        ? `\nREAL SEARCH QUESTIONS (from Google's "People Also Ask" — PRIORITIZE these as your FAQ questions):
${paaQuestions.map(q => `- ${q}`).join("\n")}
These are questions real users search for. Use them as the basis for your FAQ answers.\n`
        : "";

    const userPrompt = `Generate FAQs for this blog post:

Primary Keyword: ${keyword}
Language: ${language || "English"}
Niche: ${niche || "general"}
Article summary (first 800 chars): ${articleContent.replace(/<[^>]*>/g, "").substring(0, 800)}
${paaContext}
Return ONLY a valid JSON array of objects with "question" and "answer" keys.`;

    // FAQs are structured JSON — use the fast model
    const model = getFastModel();

    const response = await openai.chat.completions.create({
        model,
        messages: [
            { role: "system", content: systemPrompt + "\n\nOutput ONLY valid JSON. No markdown code fences." },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content || "[]";
    try {
        const parsed = JSON.parse(cleanJSON(content));
        return Array.isArray(parsed) ? parsed : parsed.faqs || [];
    } catch {
        return [];
    }
}

// ─── GENERATE META DESCRIPTION ───────────────────────────────────────────────
export async function generateMeta(
    title: string,
    articleContent: string,
    keyword?: string,
    language?: string,
    userPlan?: string
): Promise<MetaOutput> {
    const systemPrompt = injectVars(SYSTEM_PROMPTS.META_GENERATOR, {
        PRIMARY_KEYWORD: keyword || title,
    });

    const userPrompt = `Generate meta description and excerpt for:

Title: ${title}
Primary Keyword: ${keyword || title}
Language: ${language || "English"}
Article summary (first 800 chars): ${articleContent.replace(/<[^>]*>/g, "").substring(0, 800)}

Return ONLY valid JSON with "metaDescription" and "excerpt" keys.`;

    // Meta is structured JSON — use the fast model
    const model = getFastModel();

    const response = await openai.chat.completions.create({
        model,
        messages: [
            { role: "system", content: systemPrompt + "\n\nOutput ONLY valid JSON. No markdown code fences." },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.6,
        max_tokens: 512,
    });

    const content = response.choices[0]?.message?.content || "{}";
    try {
        return JSON.parse(cleanJSON(content));
    } catch {
        return { metaDescription: title, excerpt: "" };
    }
}

// ─── IMAGE TYPE ROTATION ─────────────────────────────────────────────────────
// Ensures each image in an article has a different composition style
const IMAGE_TYPE_ROTATION: Array<"featured" | "content" | "social" | "process"> = [
    "featured", "content", "process", "social", "content", "process",
];

// ─── GENERATE IMAGE ──────────────────────────────────────────────────────────
export async function generateFeaturedImage(
    title: string,
    keyword: string,
    imageType: "featured" | "content" | "social" | "process" = "featured",
    sectionContext?: string,
    imageIndex?: number
): Promise<{ url: string; altText: string }> {
    try {
        // Rotate image type for visual variety across the article
        const actualType = imageIndex !== undefined && imageIndex > 0
            ? IMAGE_TYPE_ROTATION[imageIndex % IMAGE_TYPE_ROTATION.length]
            : imageType;

        // Pick the base template for the type
        const templateMap: Record<string, string> = {
            content: SYSTEM_PROMPTS.IMAGE_CONTENT,
            social: SYSTEM_PROMPTS.IMAGE_SOCIAL,
            process: SYSTEM_PROMPTS.IMAGE_PROCESS,
            featured: SYSTEM_PROMPTS.IMAGE_FEATURED,
        };
        const basePrompt = injectVars(templateMap[actualType] || SYSTEM_PROMPTS.IMAGE_FEATURED, {
            PRIMARY_KEYWORD: keyword,
        });

        // Use fast model for prompt enhancement (cheap + fast enough)
        const promptResponse = await openai.chat.completions.create({
            model: getFastModel(),
            messages: [
                { role: "system", content: SYSTEM_PROMPTS.IMAGE_PROMPT_GENERATOR },
                {
                    role: "user",
                    content: `Create a unique FLUX.1 image prompt for a "${actualType}" blog image.
Topic: "${title}"
Keyword: "${keyword}"
${sectionContext ? `Section context: "${sectionContext}" — make the image specifically relevant to this section` : ""}
${imageIndex && imageIndex > 0 ? "Make this distinctly different from the hero/featured image — different angle, subject, and composition." : ""}

Base template to refine:
${basePrompt}

Return a single descriptive paragraph (80–120 words). No bullet points, no explanation.`,
                },
            ],
            temperature: 0.85,
            max_tokens: 250,
        });

        const imagePrompt =
            promptResponse.choices[0]?.message?.content?.replace(/^["'`]|["'`]$/g, "").trim() ||
            basePrompt;

        // SEO-friendly alt text
        const altText = sectionContext
            ? `${sectionContext} — ${keyword}`.substring(0, 120)
            : `${title} — ${keyword}`.substring(0, 120);

        console.log(`🖼️ Image ${(imageIndex || 0) + 1} (${actualType}): ${imagePrompt.substring(0, 80)}...`);

        const result = await generateAndHostImage(
            imagePrompt,
            keyword,
            actualType,
            SYSTEM_PROMPTS.IMAGE_FEATURED_NEGATIVE,
            altText
        );

        return result;
    } catch (err) {
        console.error("Image generation failed:", err);
        return { url: "", altText: `${keyword} - ${imageType}` };
    }
}

// ─── FULL PIPELINE ───────────────────────────────────────────────────────────
export async function generateFullArticle(
    options: GenerationOptions
): Promise<{
    titles: string[];
    selectedTitle: string;
    outline: Outline;
    article: string;
    faqs: FAQ[];
    meta: MetaOutput;
    image?: { url: string; altText: string };
}> {
    const titles = await generateTitles(options);
    const selectedTitle = titles[0] || `Article about ${options.keyword}`;
    const outline = await generateOutline(selectedTitle, options);
    const article = await generateArticle(selectedTitle, outline, options);
    const faqs = options.includeFaq !== false
        ? await generateFAQ(options.keyword, article, options.language, options.niche, options.userPlan, options.paaQuestions)
        : [];
    const meta = await generateMeta(selectedTitle, article, options.keyword, options.language);

    let image;
    if (options.includeImages) {
        image = await generateFeaturedImage(selectedTitle, options.keyword);
    }

    return { titles, selectedTitle, outline, article, faqs, meta, image };
}
