// ─────────────────────────────────────────────────────────────────────────────
// DEPRECATED: Legacy Generation Engine
// The core article generation and outlining functions have been moved to 
// @/lib/ai/v2-engine for strictly enforcing #1 ranking Blogger SEO quality.
// Functions here (like generateTitles) are maintained only for backward compatibility.
// ─────────────────────────────────────────────────────────────────────────────

import { SYSTEM_PROMPTS } from "./prompts";
import { generateAndHostImage } from "../cloudflare/image-generator";
import { openai, getFastModel, getHumanizerModel, getArticleModel } from "./client";
import type { CompetitorData, CompetitorHeading } from "@/types/api";

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
    competitorData?: CompetitorData;
    includeFaq?: boolean;
    includeImages?: boolean;
    numInlineImages?: number;
    includeToc?: boolean;
    includeInternalLinks?: boolean;
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
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        const status = (err as { status?: number })?.status;
        console.error("Title generation error:", message, status);
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

// ─── BUILD FEATURE-AWARE OUTLINE INSTRUCTIONS ─────────────────────────────────
function buildOutlineFeatureInstructions(options: GenerationOptions): string {
    const features: string[] = [];

    if (options.includeComparisonTable) {
        features.push(`COMPARISON TABLE SECTION: You MUST include a dedicated H2 section for a comparison table (e.g., "Comparing [Keyword] Options" or "[A] vs [B] vs [C]: Which is Best?"). Plan for a table with 4+ rows and 3+ columns.`);
    }

    if (options.includeRecipe) {
        features.push(`RECIPE SECTION: You MUST include a dedicated H2 section for the recipe with subsections for: Ingredients list, Step-by-step Instructions, Prep/Cook Time, and Tips.`);
    }

    if (options.includeProsCons) {
        features.push(`PROS & CONS SECTION: You MUST include a dedicated H2 section analyzing pros and cons (e.g., "Pros and Cons of [Keyword]" or "Advantages and Disadvantages"). Plan for 5-7 pros and 3-5 cons with explanations.`);
    }

    if (options.includeStepByStep) {
        features.push(`STEP-BY-STEP GUIDE SECTION: You MUST include a dedicated H2 section with numbered steps (e.g., "How to [Keyword]: Step-by-Step Guide"). Plan for at least 7 detailed steps with tips per step.`);
    }

    if (features.length === 0) {
        return "";
    }

    return `\n\n━━━ MANDATORY CONTENT FEATURES (USER SELECTED) ━━━
The user has explicitly enabled these features. You MUST create dedicated outline sections for each:

${features.map((f, i) => `${i + 1}. ${f}`).join("\n\n")}

These sections are NON-NEGOTIABLE. Include them in your outline structure.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

// ─── GENERATE OUTLINE ────────────────────────────────────────────────────────
export async function generateOutline(
    title: string,
    options: GenerationOptions
): Promise<Outline> {
    const systemPrompt = injectVars(SYSTEM_PROMPTS.OUTLINE_GENERATOR, {
        WORD_COUNT: String(options.wordCount || 2000),
    });

    // Build feature-aware instructions
    const featureInstructions = buildOutlineFeatureInstructions(options);

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
${options.competitorData.headings?.map((h: CompetitorHeading) => `- [${h.level?.toUpperCase?.() || "H2"}] ${h.text}`).join("\n") || "N/A"}

Analyze what they cover, find gaps in their content, and create a MORE comprehensive outline. Your headings should be more engaging and better optimized for search intent.
` : ""}
${featureInstructions}

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
// Dynamically enables/disables features based on user's toggle selections
// THESE ARE MANDATORY — the AI MUST include enabled features
function buildContentTypeInstructions(options: GenerationOptions): string {
    let instructions = "\n\n╔══════════════════════════════════════════════════════════════════════╗";
    instructions += "\n║  🚨 MANDATORY CONTENT FEATURES — USER SELECTED (MUST INCLUDE)  🚨    ║";
    instructions += "\n╚══════════════════════════════════════════════════════════════════════╝";
    instructions += "\n\nThe following features are REQUIRED. Your article will be REJECTED if any ✅ feature is missing.";

    // === TABLE OF CONTENTS ===
    if (options.includeToc !== false) {
        instructions += `

┌─────────────────────────────────────────────────────────────────────┐
│ ✅ TABLE OF CONTENTS — MANDATORY                                    │
└─────────────────────────────────────────────────────────────────────┘
REQUIREMENT: Add a Table of Contents IMMEDIATELY after the introduction.
FORMAT: HTML list with anchor links to all main H2 sections.
EXAMPLE:
<div class="toc">
<h3>📋 Table of Contents</h3>
<ul>
<li><a href="#section-slug">Section Title</a></li>
</ul>
</div>
EXCLUDE: FAQ and Conclusion from TOC.
⚠️ ARTICLE WILL BE REJECTED IF TOC IS MISSING.`;
    } else {
        instructions += `\n\n⛔ TABLE OF CONTENTS: SKIP — Do NOT include any Table of Contents.`;
    }

    // === FAQ ===
    if (options.includeFaq !== false) {
        instructions += `

┌─────────────────────────────────────────────────────────────────────┐
│ ✅ FAQ SECTION — MANDATORY                                          │
└─────────────────────────────────────────────────────────────────────┘
REQUIREMENT: Include an FAQ section with 4-6 questions BEFORE the conclusion.
FORMAT: H2 heading "Frequently Asked Questions" followed by H3 questions.
Each answer: 40-60 words, direct, standalone.
Include keyword variations. Target "People Also Ask" queries.
⚠️ ARTICLE WILL BE REJECTED IF FAQ IS MISSING.`;
    } else {
        instructions += `\n\n⛔ FAQ SECTION: SKIP — Do NOT include any FAQ section.`;
    }

    // === IMAGES ===
    if (options.includeImages !== false) {
        const count = options.numInlineImages || 3;
        instructions += `

┌─────────────────────────────────────────────────────────────────────┐
│ ✅ IMAGE PLACEHOLDERS — MANDATORY (minimum ${Math.max(count, 4)} images)              │
└─────────────────────────────────────────────────────────────────────┘
REQUIREMENT: Insert [IMAGE: description] placeholders at these positions:
- 1st image: IMMEDIATELY after introduction (before first H2)
- Additional images: After every 2 H2 sections
FORMAT: [IMAGE: ultra realistic, detailed scene description of [topic], professional photography, clean composition]
Descriptions MUST be detailed (15-25 words) and match section context.
⚠️ ARTICLE WILL BE REJECTED IF FEWER THAN ${Math.max(count, 4)} IMAGE PLACEHOLDERS.`;
    } else {
        instructions += `\n\n⛔ IMAGE PLACEHOLDERS: SKIP — Do NOT include any [IMAGE:] placeholders.`;
    }

    // === INTERNAL LINKS ===
    if (options.includeInternalLinks !== false) {
        instructions += `

┌─────────────────────────────────────────────────────────────────────┐
│ ✅ INTERNAL LINKS — MANDATORY (3-5 links)                           │
└─────────────────────────────────────────────────────────────────────┘
REQUIREMENT: Include 3-5 internal links naturally in paragraph text.
Same niche/topic cluster ONLY. Contextually relevant anchor text.
FORMAT: <a href="[URL]">descriptive anchor text</a>
⚠️ If no internal URLs provided, skip this requirement.`;
    } else {
        instructions += `\n\n⛔ INTERNAL LINKS: SKIP — Do NOT include internal links.`;
    }

    // === EXTERNAL LINKS ===
    if (options.includeExternalLinks !== false) {
        instructions += `

┌─────────────────────────────────────────────────────────────────────┐
│ ✅ EXTERNAL LINKS — MANDATORY (2-3 authority links)                 │
└─────────────────────────────────────────────────────────────────────┘
REQUIREMENT: Include 2-3 external links to authoritative sources.
ONLY trusted sources: Wikipedia, official sites, major publications.
⛔ NEVER make up URLs. Only use URLs you are 100% certain exist.`;
    } else {
        instructions += `\n\n⛔ EXTERNAL LINKS: SKIP — Do NOT include external links.`;
    }

    // === COMPARISON TABLE ===
    if (options.includeComparisonTable) {
        instructions += `

╔═════════════════════════════════════════════════════════════════════╗
║ ✅ COMPARISON TABLE — MANDATORY (User explicitly requested this!)   ║
╚═════════════════════════════════════════════════════════════════════╝
REQUIREMENT: Create a DETAILED comparison table in its own H2 section.
TITLE: Use a heading like "Comparing [Options]" or "[A] vs [B]: Full Comparison"
FORMAT:
<h2 id="comparison">Comparing [Topic] Options</h2>
<table>
  <thead><tr><th>Feature</th><th>Option A</th><th>Option B</th><th>Option C</th></tr></thead>
  <tbody>
    <tr><td>Feature 1</td><td>Detail</td><td>Detail</td><td>Detail</td></tr>
    <!-- Minimum 4 rows -->
  </tbody>
</table>
MINIMUM: 3 columns, 4+ rows with SPECIFIC data points.
⚠️⚠️ CRITICAL: ARTICLE WILL BE REJECTED IF COMPARISON TABLE IS MISSING. ⚠️⚠️`;
    } else {
        instructions += `\n\n⛔ COMPARISON TABLE: SKIP — Do NOT include any comparison table.`;
    }

    // === RECIPE FORMAT ===
    if (options.includeRecipe) {
        instructions += `

╔═════════════════════════════════════════════════════════════════════╗
║ ✅ RECIPE FORMAT — MANDATORY (User explicitly requested this!)      ║
╚═════════════════════════════════════════════════════════════════════╝
REQUIREMENT: Include a complete recipe section with ALL of these components:

<h2 id="recipe">[Recipe Name] Recipe</h2>
<p><strong>Prep Time:</strong> X minutes | <strong>Cook Time:</strong> Y minutes | <strong>Total Time:</strong> Z minutes | <strong>Servings:</strong> N</p>

<h3>Ingredients</h3>
<ul>
  <li>Exact measurement - ingredient</li>
  <!-- List ALL ingredients with precise measurements -->
</ul>

<h3>Instructions</h3>
<ol>
  <li><strong>Step Name:</strong> Detailed instruction.</li>
  <!-- Minimum 5 detailed steps -->
</ol>

<h3>Chef's Tips</h3>
<ul><li>Pro tip 1</li><li>Pro tip 2</li></ul>

⚠️⚠️ CRITICAL: ARTICLE WILL BE REJECTED IF RECIPE IS MISSING OR INCOMPLETE. ⚠️⚠️`;
    }

    // === PROS & CONS ===
    if (options.includeProsCons) {
        instructions += `

╔═════════════════════════════════════════════════════════════════════╗
║ ✅ PROS & CONS — MANDATORY (User explicitly requested this!)        ║
╚═════════════════════════════════════════════════════════════════════╝
REQUIREMENT: Create a dedicated Pros & Cons section:

<h2 id="pros-cons">Pros and Cons of [Topic]</h2>

<h3>✅ Pros (Advantages)</h3>
<ul>
  <li><strong>Pro Title:</strong> 1-2 sentence explanation of WHY this is an advantage.</li>
  <!-- Include 5-7 specific advantages -->
</ul>

<h3>❌ Cons (Disadvantages)</h3>
<ul>
  <li><strong>Con Title:</strong> 1-2 sentence honest explanation of the drawback.</li>
  <!-- Include 3-5 honest drawbacks -->
</ul>

⚠️⚠️ CRITICAL: ARTICLE WILL BE REJECTED IF PROS/CONS SECTION IS MISSING. ⚠️⚠️`;
    }

    // === STEP-BY-STEP ===
    if (options.includeStepByStep) {
        instructions += `

╔═════════════════════════════════════════════════════════════════════╗
║ ✅ STEP-BY-STEP GUIDE — MANDATORY (User explicitly requested this!) ║
╚═════════════════════════════════════════════════════════════════════╝
REQUIREMENT: Create a detailed step-by-step guide section:

<h2 id="how-to">How to [Do Thing]: Step-by-Step Guide</h2>

<ol>
  <li>
    <strong>Step 1: Action Title</strong>
    <p>Detailed explanation of what to do, why it matters, and tips.</p>
  </li>
  <!-- MINIMUM 7 detailed steps -->
</ol>

Each step MUST include:
- Bold action heading
- Detailed explanation (2-4 sentences)
- Tips or best practices where relevant

⚠️⚠️ CRITICAL: ARTICLE WILL BE REJECTED IF STEP-BY-STEP GUIDE IS MISSING. ⚠️⚠️`;
    }

    instructions += `

╔══════════════════════════════════════════════════════════════════════╗
║                    END MANDATORY CONTENT FEATURES                    ║
╚══════════════════════════════════════════════════════════════════════╝
FINAL CHECK: Before outputting, verify ALL ✅ features above are present.
Missing ANY mandatory feature = instant rejection.`;

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

// ─── VALIDATE CONTENT FEATURES ────────────────────────────────────────────────
function validateContentFeatures(article: string, options: GenerationOptions): {
    valid: boolean;
    missing: string[];
} {
    const missing: string[] = [];

    // Check for TOC
    if (options.includeToc !== false) {
        const hasToc = /<div[^>]*class="toc"/.test(article) ||
                       /Table of Contents/i.test(article) ||
                       /<ul[^>]*>[\s\S]*?<a href="#/.test(article);
        if (!hasToc) {
            missing.push("Table of Contents");
        }
    }

    // Check for comparison table
    if (options.includeComparisonTable) {
        const hasTable = /<table[\s\S]*?<\/table>/i.test(article);
        if (!hasTable) {
            missing.push("Comparison Table");
        }
    }

    // Check for recipe
    if (options.includeRecipe) {
        const hasRecipe = /Prep Time|Cook Time|Ingredients/i.test(article) &&
                          /<ol[\s\S]*?<\/ol>/i.test(article);
        if (!hasRecipe) {
            missing.push("Recipe Format");
        }
    }

    // Check for pros & cons
    if (options.includeProsCons) {
        const hasPros = /Pros|Advantages/i.test(article);
        const hasCons = /Cons|Disadvantages/i.test(article);
        if (!hasPros || !hasCons) {
            missing.push("Pros & Cons Section");
        }
    }

    // Check for step-by-step
    if (options.includeStepByStep) {
        const hasSteps = /Step[\s-]?(?:by[\s-]?Step|1|One)/i.test(article) &&
                         /<ol[\s\S]*?<\/ol>/i.test(article);
        if (!hasSteps) {
            missing.push("Step-by-Step Guide");
        }
    }

    // Check for image placeholders
    if (options.includeImages !== false) {
        const imageCount = (article.match(/\[IMAGE:/gi) || []).length;
        const minImages = options.numInlineImages || 3;
        if (imageCount < Math.min(minImages, 2)) { // Allow some flexibility
            missing.push(`Image Placeholders (found ${imageCount}, need ${minImages})`);
        }
    }

    return {
        valid: missing.length === 0,
        missing
    };
}

// ─── GENERATE ARTICLE (smart router) ─────────────────────────────────────────
// Routes to single-pass (≤3000 words) or section-by-section (>3000 words).
// Includes word count enforcement and feature validation with retry.
export async function generateArticle(
    title: string,
    outline: Outline,
    options: GenerationOptions
): Promise<string> {
    const targetWords = options.wordCount || 2000;
    // Use section-by-section for large articles (>3000 words)
    const useSectionBySection = targetWords > 3000;

    const MAX_RETRIES = 2;
    let bestArticle = "";
    let bestWordCount = 0;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        let article: string;

        if (useSectionBySection) {
            console.log(`📋 [Attempt ${attempt}] Using section-by-section generation (${targetWords} words)`);
            article = await generateArticleSectionBySection(title, outline, options);
        } else {
            console.log(`📋 [Attempt ${attempt}] Using single-pass generation (${targetWords} words)`);
            article = await generateArticleSinglePass(title, outline, options);
        }

        // Count words
        const wordCount = article.replace(/<[^>]*>/g, " ").split(/\s+/).filter(w => w.length > 0).length;
        const pct = Math.round((wordCount / targetWords) * 100);
        console.log(`📊 [Attempt ${attempt}] Article: ${wordCount} words (${pct}% of ${targetWords} target)`);

        // Track best attempt
        if (wordCount > bestWordCount) {
            bestWordCount = wordCount;
            bestArticle = article;
        }

        // Validate content features
        const featureValidation = validateContentFeatures(article, options);
        if (!featureValidation.valid) {
            console.warn(`⚠️ [Attempt ${attempt}] Missing features: ${featureValidation.missing.join(", ")}`);
        }

        // Check if word count is acceptable (at least 75% of target)
        const wordCountOk = wordCount >= targetWords * 0.75;

        // Check if features are present (or it's the last attempt)
        const featuresOk = featureValidation.valid || attempt === MAX_RETRIES;

        if (wordCountOk && featuresOk) {
            console.log(`✅ Article accepted on attempt ${attempt}: ${wordCount} words`);
            if (!featureValidation.valid) {
                console.warn(`⚠️ Some features still missing after ${attempt} attempts: ${featureValidation.missing.join(", ")}`);
            }
            return article;
        }

        // Log retry reason
        if (!wordCountOk) {
            console.warn(`⚠️ [Attempt ${attempt}] Word count too low: ${wordCount}/${targetWords} (${pct}%). Retrying...`);
        }
    }

    // Return best attempt if all retries failed
    console.warn(`⚠️ Returning best attempt after ${MAX_RETRIES} retries: ${bestWordCount} words`);
    return bestArticle;
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
