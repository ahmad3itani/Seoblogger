import { SYSTEM_PROMPTS } from "./prompts";
import { generateAndHostImage } from "../cloudflare/image-generator";
import { openai, getModelForPlan } from "./client";

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
    const systemPrompt = injectVars(SYSTEM_PROMPTS.TITLE_GENERATOR, {
        KEYWORD: options.keyword,
    });

    const userPrompt = `Generate 5 SEO-optimized blog post titles for:

Primary Keyword: ${options.keyword}
Language: ${options.language || "English"}
Tone: ${options.tone || "informational"}
Niche: ${options.niche || "general"}
Article Type: ${options.articleType || "blog post"}

Return ONLY a JSON array of 5 title strings. No explanation.`;

    const model = getModelForPlan(options.userPlan);
    
    let response;
    try {
        response = await openai.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: systemPrompt + "\n\nOutput only valid JSON." },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.8,
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

    const model = getModelForPlan(options.userPlan);
    
    const response = await openai.chat.completions.create({
        model: model,
        messages: [
            { role: "system", content: systemPrompt + "\n\nOutput ONLY valid JSON and nothing else." },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "{}";
    try {
        return JSON.parse(cleanJSON(content));
    } catch {
        return { sections: [], faqs: [], suggestedLabels: [], totalWordCount: 0 };
    }
}

// ─── GENERATE FULL ARTICLE ───────────────────────────────────────────────────
export async function generateArticle(
    title: string,
    outline: Outline,
    options: GenerationOptions
): Promise<string> {
    const systemPrompt = injectVars(SYSTEM_PROMPTS.ARTICLE_WRITER, {
        PRIMARY_KEYWORD: options.keyword,
        WORD_COUNT: String(options.wordCount || 2000),
    });

    // Build dynamic content type instructions
    let contentTypeInstructions = "";
    
    if (options.includeComparisonTable) {
        contentTypeInstructions += `\n\nCOMPARISON TABLE REQUIRED:
- Create a detailed HTML comparison table using <table>, <thead>, <tbody>, <tr>, <th>, <td>
- Compare 3-5 options/products/methods related to the keyword
- Include columns: Name, Key Features, Pros, Cons, Price/Rating, Best For
- Make it visually scannable with clear headers
- Place the table in a relevant section (e.g., "Comparison of Top Options")`;
    }
    
    if (options.includeRecipe) {
        contentTypeInstructions += `\n\nRECIPE FORMAT REQUIRED:
- Include a structured recipe section with:
  * Prep Time, Cook Time, Total Time, Servings
  * Ingredients list (use <ul> with precise measurements)
  * Step-by-step instructions (use <ol> with numbered steps)
  * Optional: Nutrition facts, Tips, Variations
- Format as a clear, easy-to-follow recipe card
- Use <strong> for ingredient amounts and key instructions`;
    }
    
    if (options.includeProsCons) {
        contentTypeInstructions += `\n\nPROS & CONS REQUIRED:
- Create a dedicated "Pros and Cons" section
- Use two columns or lists:
  * ✅ Pros: Use <ul> with positive points (5-7 items)
  * ❌ Cons: Use <ul> with limitations/drawbacks (3-5 items)
- Be honest and balanced
- Place after the main description/overview section`;
    }
    
    if (options.includeStepByStep) {
        contentTypeInstructions += `\n\nSTEP-BY-STEP GUIDE REQUIRED:
- Create a detailed step-by-step tutorial section
- Use <ol> for numbered steps (minimum 5-10 steps)
- Each step should include:
  * Clear action-oriented heading
  * Detailed explanation (2-3 sentences)
  * Optional: Tips, warnings, or pro advice
- Make it actionable and easy to follow
- Consider adding "What You'll Need" subsection before steps`;
    }

    const userPrompt = `Write a complete article for Blogger based on this outline:

Title: ${title}
Primary Keyword: ${options.keyword}
Target Word Count: ${options.wordCount || 2000}
Language: ${options.language || "English"}
Tone: ${options.tone || "informational"}
Niche: ${options.niche || "general"}
Article Type: ${options.articleType || "blog post"}
${options.brandVoice ? `Brand Voice Instructions: ${options.brandVoice}` : ""}
${options.existingPostsList ? `\nInternal Linking: Where natural and relevant, insert 2-3 HTML anchor (<a>) links pointing to these existing posts:\n${options.existingPostsList}` : ""}
${options.affiliateLinks && options.affiliateLinks.length > 0 ? `\nAffiliate Links: Naturally integrate these links as contextual text links or recommendation sections:\n- ${options.affiliateLinks.join("\n- ")}\n` : ""}
${contentTypeInstructions}

OUTLINE TO FOLLOW:
${JSON.stringify(outline, null, 2)}

REMEMBER:
- Start with a TLDR paragraph, then the first <h2>
- No <h1> tags (Blogger uses the title field)
- Clean HTML only: <p>, <h2>, <h3>, <h4>, <ul>, <ol>, <li>, <table>, <strong>, <em>, <a>, <blockquote>
- Use the keyword 10-15 times naturally
- Every paragraph max 3 sentences
- CRITICAL: You MUST write EXACTLY ${options.wordCount || 2000} words. This is a strict requirement. Do not write less.
- If the target is 4000 words, write 4000 words. If 2000, write 2000. Match the exact target.
- Return ONLY the HTML article body. No markdown. No explanations.`;

    const model = getModelForPlan(options.userPlan);
    
    // Calculate max tokens: words * 1.5 (tokens per word) * 1.5 (safety margin)
    const targetWords = options.wordCount || 2000;
    const maxTokens = Math.ceil(targetWords * 1.5 * 1.5);
    
    console.log(`📝 Article Generation: Target=${targetWords} words, MaxTokens=${maxTokens}, Model=${model}`);
    
    const response = await openai.chat.completions.create({
        model: model,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.8, // Higher temperature for more verbose output
        max_tokens: maxTokens, // Ensure enough tokens for target word count
    });

    let article = response.choices[0]?.message?.content || "";

    // Clean up any markdown artifacts the LLM might inject
    article = article
        .replace(/^```html?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();

    // Count words in generated article
    const wordCount = article.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
    const percentageOfTarget = Math.round((wordCount / targetWords) * 100);
    
    console.log(`✅ Article Generated: ${wordCount} words (${percentageOfTarget}% of ${targetWords} target)`);
    
    if (wordCount < targetWords * 0.8) {
        console.warn(`⚠️ WARNING: Article is significantly shorter than target (${wordCount} vs ${targetWords})`);
    }

    return article;
}

// ─── GENERATE FAQs ───────────────────────────────────────────────────────────
export async function generateFAQ(
    keyword: string,
    articleContent: string,
    language?: string,
    niche?: string,
    userPlan?: string
): Promise<FAQ[]> {
    const systemPrompt = injectVars(SYSTEM_PROMPTS.FAQ_GENERATOR, {
        PRIMARY_KEYWORD: keyword,
    });

    const userPrompt = `Generate FAQs for this blog post:

Primary Keyword: ${keyword}
Language: ${language || "English"}
Niche: ${niche || "general"}
Article summary (first 800 chars): ${articleContent.replace(/<[^>]*>/g, "").substring(0, 800)}

Return ONLY a valid JSON array of objects with "question" and "answer" keys.`;

    const model = getModelForPlan(userPlan);

    const response = await openai.chat.completions.create({
        model,
        messages: [
            { role: "system", content: systemPrompt + "\n\nOutput ONLY valid JSON." },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
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

    const model = getModelForPlan(userPlan);

    const response = await openai.chat.completions.create({
        model,
        messages: [
            { role: "system", content: systemPrompt + "\n\nOutput ONLY valid JSON." },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.6,
    });

    const content = response.choices[0]?.message?.content || "{}";
    try {
        return JSON.parse(cleanJSON(content));
    } catch {
        return { metaDescription: title, excerpt: "" };
    }
}

// ─── IMAGE STYLE VARIATIONS ─────────────────────────────────────────────────
const IMAGE_STYLES: Array<{ type: "featured" | "content" | "social" | "process"; style: string }> = [
    { type: "featured", style: "hero product photography, centered composition, shallow depth of field, bokeh background" },
    { type: "content", style: "overhead flat lay arrangement, geometric layout, clean white surface, editorial style" },
    { type: "process", style: "close-up detail shot, macro photography, showing texture and craftsmanship, dramatic lighting" },
    { type: "social", style: "lifestyle scene in natural environment, warm golden hour lighting, authentic and candid feel" },
    { type: "content", style: "wide angle environmental shot, showing full scene and context, deep depth of field, architectural perspective" },
    { type: "process", style: "side angle product shot with props, complementary colors, moody studio lighting, premium aesthetic" },
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
        // Pick a varied style based on image index to ensure diversity
        const styleVariation = IMAGE_STYLES[imageIndex !== undefined ? imageIndex % IMAGE_STYLES.length : 0];
        const actualType = imageIndex !== undefined && imageIndex > 0 ? styleVariation.type : imageType;

        // Build the image prompt from templates
        let templatePrompt: string;
        switch (actualType) {
            case "content":
                templatePrompt = SYSTEM_PROMPTS.IMAGE_CONTENT;
                break;
            case "social":
                templatePrompt = SYSTEM_PROMPTS.IMAGE_SOCIAL;
                break;
            case "process":
                templatePrompt = SYSTEM_PROMPTS.IMAGE_PROCESS;
                break;
            default:
                templatePrompt = SYSTEM_PROMPTS.IMAGE_FEATURED;
        }

        const basePrompt = injectVars(templatePrompt, { PRIMARY_KEYWORD: keyword });

        // Build context-aware prompt with section info for variety
        const contextInfo = sectionContext 
            ? `\nThis image is for a section titled: "${sectionContext}". Make the image specifically relevant to this section topic, not just the general keyword.`
            : "";
        
        const styleInfo = imageIndex !== undefined 
            ? `\nStyle direction: ${styleVariation.style}`
            : "";

        // Enhance with AI for a unique, context-aware prompt
        const promptResponse = await openai.chat.completions.create({
            model: getModelForPlan(),
            messages: [
                { role: "system", content: SYSTEM_PROMPTS.IMAGE_PROMPT_GENERATOR },
                {
                    role: "user",
                    content: `Create a UNIQUE image prompt for a "${actualType}" blog image about "${title}" (keyword: "${keyword}").${contextInfo}${styleInfo}

Base template: ${basePrompt}

IMPORTANT: 
- Make this image DISTINCTLY DIFFERENT from other images in the article
- Focus on the specific section topic, not just the keyword
- Use a different angle, composition, and subject matter than a typical flat lay
- Be creative and specific about what objects/scenes should appear

Return a single refined prompt string (100-150 words).`,
                },
            ],
            temperature: 0.9,
        });

        const imagePrompt =
            promptResponse.choices[0]?.message?.content?.replace(/^["']|["']$/g, "").trim() ||
            basePrompt;

        // Generate SEO-friendly alt text
        const altText = sectionContext 
            ? `${sectionContext} - ${keyword}`.substring(0, 125)
            : `${title} - ${keyword}`.substring(0, 125);

        // Get negative prompt
        const negativePrompt = SYSTEM_PROMPTS.IMAGE_FEATURED_NEGATIVE;

        // Generate and host image with Cloudflare Workers AI
        console.log(`Generating ${actualType} image (#${(imageIndex || 0) + 1}) with Cloudflare Workers AI...`);
        const result = await generateAndHostImage(imagePrompt, keyword, actualType, negativePrompt, altText);

        return result;
    } catch (err) {
        console.error("AI Image Generation failed:", err);
        return { url: "", altText: `${keyword} - ${imageType} image` };
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
        ? await generateFAQ(options.keyword, article, options.language, options.niche)
        : [];
    const meta = await generateMeta(selectedTitle, article, options.keyword, options.language);

    let image;
    if (options.includeImages) {
        image = await generateFeaturedImage(selectedTitle, options.keyword);
    }

    return { titles, selectedTitle, outline, article, faqs, meta, image };
}
