import { V2_PROMPTS, injectVars, cleanJSON } from './prompts';
import {
    openai,
    getArticleModel,
    getFastModel,
    getHumanizerModel,
    shouldUseChunkedGeneration,
    getOptimalChunkWords,
    calculateTokenBudget,
} from '../client';
import { fetchSerpIntelligence } from '../../seo/serp-sources';
import { findRelevantInternalLinks } from '../../linker/engine';
import { prisma } from '../../prisma';

// ─── Types ───────────────────────────────────────────────────────────────────────

export interface V2GenerationOptions {
    title: string;
    keyword: string;
    wordCount: number;
    language: string;
    tone: string;
    niche: string;
    articleType: string;
    userPlan?: string;
    includeFaq?: boolean;
    autoInterlink?: boolean;
    blogId?: string;
    existingPostsList?: string;
}

export interface OutlineSection {
    heading: string;
    level: number;
    points: string[];
    subsections?: OutlineSection[];
}

export interface V2OutlineResponse {
    sections: OutlineSection[];
    faqs: Array<{ question: string; shortAnswer: string }>;
    suggestedLabels: string[];
    lsiKeywords?: string[];
    totalWordCount: number;
}

interface GenerationResult {
    content: string;
    finishReason: string | null;
    truncated: boolean;
}

// ─── Validation Helpers ──────────────────────────────────────────────────────────

/** Patterns that indicate AI took shortcuts instead of writing real content */
const PLACEHOLDER_PATTERNS = [
    /\[rest of (?:the )?(?:content|article|section)/i,
    /\[(?:insert|add) .*? here\]/i,
    /\[continue (?:with|from)/i,
    /\[remaining (?:content|sections)/i,
    /\.\.\.(?:content|sections|article) continues/i,
    /remains? (?:the same|unchanged)/i,
    /\[more (?:content|sections|details)/i,
    /\[TODO\]/i,
    /\[PLACEHOLDER\]/i,
];

/** Check if content contains placeholder shortcuts */
function containsPlaceholders(html: string): { found: boolean; matches: string[] } {
    const matches: string[] = [];
    for (const pattern of PLACEHOLDER_PATTERNS) {
        const match = html.match(pattern);
        if (match) {
            matches.push(match[0]);
        }
    }
    return { found: matches.length > 0, matches };
}

/** Fix duplicate ID attributes in HTML (e.g., id="foo" id="bar" -> id="foo") */
function fixDuplicateIds(html: string): string {
    // Match elements with multiple id attributes
    return html.replace(/<(\w+)([^>]*)\s+id="([^"]*)"([^>]*)\s+id="([^"]*)"([^>]*)>/gi,
        (match, tag, before, id1, middle, id2, after) => {
            // Keep the first id attribute only
            console.warn(`[V2 Engine] Fixed duplicate id: "${id1}" and "${id2}" -> keeping "${id1}"`);
            return `<${tag}${before} id="${id1}"${middle}${after}>`;
        }
    );
}

/** Validate article has minimum required structure */
function validateArticleStructure(html: string, targetWordCount: number): {
    valid: boolean;
    warnings: string[];
    wordCount: number;
    h2Count: number;
} {
    const warnings: string[] = [];

    // Count words (strip HTML)
    const textOnly = html.replace(/<[^>]*>/g, ' ');
    const wordCount = textOnly.split(/\s+/).filter(w => w.length > 0).length;

    // Count H2s
    const h2Count = (html.match(/<h2/gi) || []).length;

    // Check for placeholders
    const placeholders = containsPlaceholders(html);
    if (placeholders.found) {
        warnings.push(`Contains placeholder text: ${placeholders.matches.join(', ')}`);
    }

    // Check word count (allow 60% minimum)
    if (wordCount < targetWordCount * 0.6) {
        warnings.push(`Word count ${wordCount} is below 60% of target ${targetWordCount}`);
    }

    // Check H2 count
    if (h2Count < 3) {
        warnings.push(`Only ${h2Count} H2 headings found (expected at least 3)`);
    }

    // Check for proper ending (has conclusion or FAQ at end)
    const hasProperEnding = /<\/(?:p|div|ul|ol|table)>\s*$/i.test(html.trim());
    if (!hasProperEnding) {
        warnings.push('Article appears truncated (no proper closing tag)');
    }

    return {
        valid: warnings.length === 0,
        warnings,
        wordCount,
        h2Count,
    };
}

/** Generate slug from heading text */
function toSlug(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// ─── 1. Generate Outline ─────────────────────────────────────────────────────────

export async function generateTopicalOutline(
    options: V2GenerationOptions
): Promise<V2OutlineResponse> {
    console.log(`[V2 Engine] Generating outline for "${options.title}"...`);

    // Fetch PAA questions for context
    let paaContext = "";
    try {
        const serpLang = options.language?.substring(0, 2) || "en";
        const serpIntel = await fetchSerpIntelligence(options.keyword, "us", serpLang);
        if (serpIntel.paaQuestions.length > 0) {
            paaContext = "PEOPLE ALSO ASK (use for FAQ / Structure):\n" +
                serpIntel.paaQuestions.map(q => `- ${q.question}`).join("\n");
        }
    } catch (e) {
        console.warn("[V2 Engine] SERP fetch failed, proceeding without PAA context.");
    }

    const prompt = injectVars(V2_PROMPTS.OUTLINE_GENERATOR, {
        TITLE: options.title,
        PRIMARY_KEYWORD: options.keyword,
        WORD_COUNT: String(options.wordCount),
        LANGUAGE: options.language,
        TONE: options.tone,
        NICHE: options.niche,
        ARTICLE_TYPE: options.articleType,
        PAA_CONTEXT: paaContext
    });

    const model = getFastModel();
    const response = await openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content || "{}";
    try {
        return JSON.parse(cleanJSON(content)) as V2OutlineResponse;
    } catch (e) {
        throw new Error("Failed to parse outline JSON: " + content.substring(0, 500));
    }
}

// ─── 2. Generate Article Draft ───────────────────────────────────────────────────

export async function generateArticleDraft(
    outline: V2OutlineResponse,
    options: V2GenerationOptions
): Promise<string> {
    const model = getArticleModel(options.userPlan);

    // Check if we need chunked generation for long articles
    if (shouldUseChunkedGeneration(model, options.wordCount)) {
        console.log(`[V2 Engine] Article requires ${options.wordCount} words — using chunked generation`);
        return generateArticleSectionBySection(outline, options);
    }

    console.log(`[V2 Engine] Generating full draft (single-pass)...`);

    // Build TOC - ONLY from main H2 sections, NOT including FAQ sub-questions
    const mainSections = outline.sections.filter(s => s.level === 2);
    const tocLines = mainSections.map((s) => {
        const slug = toSlug(s.heading);
        return `    <li class="toc-h2"><a href="#${slug}">${s.heading}</a></li>`;
    }).join("\n");

    // Add FAQ entry to TOC if FAQ is included
    let faqTocLine = "";
    if (options.includeFaq && outline.faqs?.length > 0) {
        faqTocLine = `\n    <li class="toc-h2"><a href="#faq">Frequently Asked Questions</a></li>`;
    }

    const tocHtml = `<div class="toc">\n<h3>📋 Table of Contents</h3>\n<ul>\n${tocLines}${faqTocLine}\n</ul>\n</div>`;

    // Pre-build FAQ HTML with proper schema (NO id on H3s - only the section H2 has id)
    let faqHtml = "";
    if (options.includeFaq && outline.faqs?.length > 0) {
        faqHtml = outline.faqs.map(faq => `
  <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <h3 itemprop="name">${faq.question}</h3>
    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <p itemprop="text">${faq.shortAnswer}</p>
    </div>
  </div>`).join("");
    }

    // Format outline for AI - use simple numbered format WITHOUT confusing id hints
    const outlineText = mainSections.map((s, i) => {
        const slug = toSlug(s.heading);
        const pts = (s.points || []).map((p: string) => `   - ${p}`).join("\n");
        const subs = (s.subsections || []).map(sub => `   → ${sub.heading}`).join("\n");
        return `${i + 1}. "${s.heading}" (use id="${slug}")\n${pts}${subs ? '\n' + subs : ''}`;
    }).join("\n\n");

    // Build extra instructions (internal links, etc.)
    let extraInstructions = "";
    if (options.existingPostsList) {
        extraInstructions += `\n\n━━━ INTERNAL LINKS (INSERT 3-5 OF THESE NATURALLY IN PARAGRAPH TEXT) ━━━\n${options.existingPostsList}\nRules: natural placement in paragraph text, descriptive anchor (not "click here"), spread across high-value sections.\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    }

    const prompt = injectVars(V2_PROMPTS.ARTICLE_WRITER, {
        PRIMARY_KEYWORD: options.keyword,
        TITLE: options.title,
        TONE: options.tone,
        LANGUAGE: options.language,
        WORD_COUNT: String(options.wordCount),
        OUTLINE_TEXT: outlineText,
        TOC_HTML: tocHtml,
        FAQ_HTML: faqHtml,
        EXTRA_INSTRUCTIONS: extraInstructions
    });

    // Token limit: 2 tokens/word for HTML-heavy content (TOC, tables, images, schema, monetization)
    const maxTokens = Math.min(Math.ceil(options.wordCount * 2), 16000);
    console.log(`[V2 Engine] Article: target=${options.wordCount}w, maxTokens=${maxTokens}, model=${model}`);

    const response = await openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.75,
        max_tokens: maxTokens,
    });

    const finishReason = response.choices[0]?.finish_reason;
    let article = response.choices[0]?.message?.content || "";

    // Check for truncation
    if (finishReason === 'length') {
        console.warn(`[V2 Engine] ⚠️ Article was truncated (finish_reason=length)`);
    }

    // Fix any duplicate ID attributes the AI might have added
    article = fixDuplicateIds(article);

    // Clean markdown artifacts
    article = article
        .replace(/^```html?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();

    // Validate structure
    const validation = validateArticleStructure(article, options.wordCount);
    if (!validation.valid) {
        console.warn(`[V2 Engine] ⚠️ Article validation warnings:`, validation.warnings);
    }
    console.log(`[V2 Engine] Article: ${validation.wordCount} words, ${validation.h2Count} H2s`);

    return article;
}

// ─── 2b. Generate Article Section-by-Section (for long articles) ─────────────────

async function generateSection(
    section: OutlineSection,
    options: V2GenerationOptions,
    model: string,
    previousContent: string
): Promise<string> {
    const slug = toSlug(section.heading);
    const points = (section.points || []).map(p => `- ${p}`).join("\n");
    const subsections = (section.subsections || [])
        .map(sub => `  → ${sub.heading}: ${(sub.points || []).join(", ")}`)
        .join("\n");

    // Calculate target words based on optimal chunk size
    const optimalWords = getOptimalChunkWords(model);
    const targetWords = Math.min(optimalWords, 600); // Cap individual sections

    const prompt = injectVars(V2_PROMPTS.SECTION_WRITER, {
        TITLE: options.title,
        PRIMARY_KEYWORD: options.keyword,
        TONE: options.tone,
        LANGUAGE: options.language,
        SECTION_HEADING: section.heading,
        SECTION_ID: slug,
        SECTION_POINTS: points || "Cover this topic thoroughly",
        SUBSECTIONS: subsections ? `\nSubsections to include:\n${subsections}` : "",
        PREVIOUS_CONTENT: previousContent
            ? `Last paragraph: "${previousContent.slice(-500)}"`
            : "This is the first section after the introduction.",
        TARGET_WORDS: String(targetWords),
    });

    const maxTokens = calculateTokenBudget(model, targetWords + 200);

    const response = await openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.75,
        max_tokens: maxTokens,
    });

    let content = response.choices[0]?.message?.content || "";

    // Clean markdown artifacts
    content = content
        .replace(/^```html?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();

    // Fix duplicate IDs
    content = fixDuplicateIds(content);

    return content;
}

async function generateIntro(
    options: V2GenerationOptions,
    tocHtml: string,
    model: string
): Promise<string> {
    const prompt = injectVars(V2_PROMPTS.INTRO_WRITER, {
        TITLE: options.title,
        PRIMARY_KEYWORD: options.keyword,
        TONE: options.tone,
        LANGUAGE: options.language,
        TOC_HTML: tocHtml,
    });

    const maxTokens = calculateTokenBudget(model, 400);

    const response = await openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.75,
        max_tokens: maxTokens,
    });

    let content = response.choices[0]?.message?.content || "";
    content = content
        .replace(/^```html?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();

    return content;
}

async function generateConclusion(
    options: V2GenerationOptions,
    faqHtml: string,
    takeaways: string[],
    model: string
): Promise<string> {
    const faqSection = faqHtml
        ? `<div class="faq-section" itemscope itemtype="https://schema.org/FAQPage">\n  <h2 id="faq">Frequently Asked Questions</h2>\n${faqHtml}\n</div>`
        : "";

    const prompt = injectVars(V2_PROMPTS.CONCLUSION_WRITER, {
        TITLE: options.title,
        PRIMARY_KEYWORD: options.keyword,
        TONE: options.tone,
        LANGUAGE: options.language,
        TAKEAWAYS: takeaways.map((t, i) => `${i + 1}. ${t}`).join("\n"),
        FAQ_HTML: faqSection,
    });

    const maxTokens = calculateTokenBudget(model, 500);

    const response = await openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.75,
        max_tokens: maxTokens,
    });

    let content = response.choices[0]?.message?.content || "";
    content = content
        .replace(/^```html?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();

    return content;
}

export async function generateArticleSectionBySection(
    outline: V2OutlineResponse,
    options: V2GenerationOptions
): Promise<string> {
    console.log(`[V2 Engine] Using CHUNKED generation for ${options.wordCount}+ word article...`);

    const model = getArticleModel(options.userPlan);
    const mainSections = outline.sections.filter(s => s.level === 2);

    // Build TOC
    const tocLines = mainSections.map((s) => {
        const slug = toSlug(s.heading);
        return `    <li class="toc-h2"><a href="#${slug}">${s.heading}</a></li>`;
    }).join("\n");

    let faqTocLine = "";
    if (options.includeFaq && outline.faqs?.length > 0) {
        faqTocLine = `\n    <li class="toc-h2"><a href="#faq">Frequently Asked Questions</a></li>`;
    }

    const tocHtml = `<div class="toc">\n<h3>📋 Table of Contents</h3>\n<ul>\n${tocLines}${faqTocLine}\n</ul>\n</div>`;

    // Build FAQ HTML
    let faqHtml = "";
    if (options.includeFaq && outline.faqs?.length > 0) {
        faqHtml = outline.faqs.map(faq => `
  <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <h3 itemprop="name">${faq.question}</h3>
    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <p itemprop="text">${faq.shortAnswer}</p>
    </div>
  </div>`).join("");
    }

    // Generate parts
    const parts: string[] = [];

    // 1. Introduction
    console.log(`[V2 Engine] Chunked: Generating introduction...`);
    const intro = await generateIntro(options, tocHtml, model);
    parts.push(intro);

    // 2. Body sections (one by one)
    for (let i = 0; i < mainSections.length; i++) {
        const section = mainSections[i];
        console.log(`[V2 Engine] Chunked: Generating section ${i + 1}/${mainSections.length}: "${section.heading}"`);

        const previousContent = parts.length > 0 ? parts[parts.length - 1] : "";
        const sectionHtml = await generateSection(section, options, model, previousContent);
        parts.push(sectionHtml);

        // Check for placeholders in generated section
        const placeholders = containsPlaceholders(sectionHtml);
        if (placeholders.found) {
            console.warn(`[V2 Engine] ⚠️ Section "${section.heading}" contains placeholders: ${placeholders.matches.join(", ")}`);
        }
    }

    // 3. Conclusion + FAQ
    console.log(`[V2 Engine] Chunked: Generating conclusion...`);
    const takeaways = mainSections.slice(0, 3).map(s => s.heading);
    const conclusion = await generateConclusion(options, faqHtml, takeaways, model);
    parts.push(conclusion);

    // Combine all parts
    const fullArticle = parts.join("\n\n");

    // Final cleanup
    const cleaned = fixDuplicateIds(fullArticle);

    // Validate
    const validation = validateArticleStructure(cleaned, options.wordCount);
    console.log(`[V2 Engine] Chunked result: ${validation.wordCount} words, ${validation.h2Count} H2s`);
    if (!validation.valid) {
        console.warn(`[V2 Engine] ⚠️ Chunked article warnings:`, validation.warnings);
    }

    return cleaned;
}

// ─── 3. Humanize Draft ───────────────────────────────────────────────────────────

export async function humanizeDraft(htmlContent: string): Promise<string> {
    console.log(`[V2 Engine] Humanizing draft...`);

    // Count input words to estimate output tokens needed
    const inputWordCount = htmlContent.replace(/<[^>]*>/g, " ").split(/\s+/).filter(w => w.length > 0).length;

    // Skip humanizer for very long articles to prevent truncation
    if (inputWordCount > 4500) {
        console.log(`[V2 Engine] Humanizer: Article too long (${inputWordCount}w) — skipping to prevent truncation`);
        return htmlContent;
    }

    const prompt = injectVars(V2_PROMPTS.ARTICLE_HUMANIZER, {
        ARTICLE_HTML: htmlContent
    });

    const model = getHumanizerModel();
    // Safe token limit: 1.6 tokens/word for HTML + buffer, capped at 8000
    const maxTokens = Math.min(Math.ceil(inputWordCount * 1.6) + 500, 8000);
    console.log(`[V2 Engine] Humanizer: ${inputWordCount}w → maxTokens=${maxTokens}, model=${model}`);

    const response = await openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: maxTokens,
    });

    const finishReason = response.choices[0]?.finish_reason;
    let humanized = response.choices[0]?.message?.content || "";

    // Check for truncation
    if (finishReason === 'length') {
        console.warn(`[V2 Engine] ⚠️ Humanizer was truncated (finish_reason=length), using original`);
        return htmlContent;
    }

    // Clean markdown artifacts
    humanized = humanized
        .replace(/^```html?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();

    // Verify humanizer didn't truncate or return garbage
    if (!humanized || humanized.length < htmlContent.length * 0.7) {
        console.warn(`[V2 Engine] Humanizer returned insufficient content, using original`);
        return htmlContent;
    }

    // Fix any duplicate IDs introduced during humanization
    humanized = fixDuplicateIds(humanized);

    // Check for placeholder patterns
    const placeholders = containsPlaceholders(humanized);
    if (placeholders.found) {
        console.warn(`[V2 Engine] Humanizer introduced placeholders: ${placeholders.matches.join(', ')}, using original`);
        return htmlContent;
    }

    return humanized;
}

// ─── 4. End-to-End Generation ────────────────────────────────────────────────────

export async function generateArticleEndToEnd(
    options: V2GenerationOptions
) {
    // 1. Outline
    const outline = await generateTopicalOutline(options);

    // 2. Draft
    let htmlContent = await generateArticleDraft(outline, options);

    // 3. Humanize
    htmlContent = await humanizeDraft(htmlContent);

    // 4. Smart Internal Links
    if (options.autoInterlink && options.blogId) {
        console.log(`[V2 Engine] Injecting internal links...`);
        try {
            const cachedPosts = await prisma.cachedPost.findMany({
                where: { blogId: options.blogId },
                orderBy: { publishedAt: 'desc' },
                take: 100
            });
            if (cachedPosts.length > 0) {
                const relevantLinks = findRelevantInternalLinks(
                    options.keyword,
                    options.title,
                    cachedPosts.map(p => ({ title: p.title, url: p.url })),
                    5
                );

                // Simple regex-based injection for exact/partial matches in paragraph text
                if (relevantLinks.length > 0) {
                    for (const link of relevantLinks) {
                        const anchor = link.title.toLowerCase().split(' ').slice(0, 3).join(' ');
                        const regex = new RegExp(`(?<!<[^>]*)\\b(${anchor})\\b(?![^<]*>)`, 'i');
                        htmlContent = htmlContent.replace(regex, `<a href="${link.url}">$1</a>`);
                    }
                }
            }
        } catch (e) {
            console.error("[V2 Engine] Internal linking failed:", e);
        }
    }

    // Final validation
    const validation = validateArticleStructure(htmlContent, options.wordCount);

    return {
        articleHtml: htmlContent,
        outline,
        validation,
    };
}
