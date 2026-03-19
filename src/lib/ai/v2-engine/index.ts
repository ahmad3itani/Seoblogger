import { V2_PROMPTS, injectVars, cleanJSON } from './prompts';
import { openai, getArticleModel, getFastModel, getHumanizerModel } from '../client';
import { fetchSerpIntelligence, formatSourcesForPrompt } from '../../seo/serp-sources';
import { findRelevantInternalLinks, formatLinksForPrompt } from '../../linker/engine';
import { prisma } from '../../prisma';

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
}

export interface V2OutlineResponse {
    sections: any[];
    faqs: Array<{ question: string; shortAnswer: string }>;
    suggestedLabels: string[];
    lsiKeywords?: string[];
    totalWordCount: number;
}

/**
 * 1. Generate the Topical Outline using SERP Data
 */
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
        throw new Error("Failed to parse outline JSON: " + content);
    }
}

/**
 * 2. Generate the Main Article Draft
 */
export async function generateArticleDraft(
    outline: V2OutlineResponse,
    options: V2GenerationOptions
): Promise<string> {
    console.log(`[V2 Engine] Generating full draft...`);

    const toSlug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    
    // Pre-build TOC
    const tocLines = outline.sections.map((s) => {
        const slug = toSlug(s.heading);
        return `    <li class="toc-h2"><a href="#${slug}">${s.heading}</a></li>`;
    }).join("\n");
    const tocHtml = `<div class="toc">\n<h3>Table of Contents</h3>\n<ul>\n${tocLines}\n</ul>\n</div>`;

    // Pre-build FAQ Schema if requested
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

    // Format outline text for AI context
    const outlineText = outline.sections.map((s, i) => {
        const slug = toSlug(s.heading);
        const pts = (s.points || []).map((p: string) => `   - ${p}`).join("\n");
        return `${i + 1}. ${s.heading} [h2 id="${slug}"]\n${pts}`;
    }).join("\n\n");

    const prompt = injectVars(V2_PROMPTS.ARTICLE_WRITER, {
        PRIMARY_KEYWORD: options.keyword,
        TITLE: options.title,
        TONE: options.tone,
        LANGUAGE: options.language,
        WORD_COUNT: String(options.wordCount),
        OUTLINE_TEXT: outlineText,
        TOC_HTML: tocHtml,
        FAQ_HTML: faqHtml,
        EXTRA_INSTRUCTIONS: ""
    });

    const model = getArticleModel(options.userPlan);
    const response = await openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.75, // Slightly creative
        max_tokens: 32000, // Massive context to avoid truncation
    });

    return response.choices[0]?.message?.content || "";
}

/**
 * 3. Humanize the Draft
 */
export async function humanizeDraft(htmlContent: string): Promise<string> {
    console.log(`[V2 Engine] Humanizing draft...`);
    const prompt = injectVars(V2_PROMPTS.ARTICLE_HUMANIZER, {
        ARTICLE_HTML: htmlContent
    });

    const model = getHumanizerModel();
    const response = await openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 32000,
    });

    return response.choices[0]?.message?.content || htmlContent;
}

/**
 * 4. All-In-One End-to-End Bulk Generation
 * Wraps all the steps for the Bulk Generator Route so it yields #1 ranking quality
 */
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
                // Since this happens post-generation, we strictly replace text inside <p> tags
                if (relevantLinks.length > 0) {
                    for (const link of relevantLinks) {
                        const anchor = link.title.toLowerCase().split(' ').slice(0, 3).join(' '); // A simple short anchor
                        const regex = new RegExp(`(?<!<[^>]*)\\b(${anchor})\\b(?![^<]*>)`, 'i');
                        htmlContent = htmlContent.replace(regex, `<a href="${link.url}">$1</a>`);
                    }
                }
            }
        } catch (e) {
            console.error("[V2 Engine] Internal linking failed:", e);
        }
    }

    return {
        articleHtml: htmlContent,
        outline,
    };
}
