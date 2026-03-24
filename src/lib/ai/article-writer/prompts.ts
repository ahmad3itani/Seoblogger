// ─── Article Writer Workflow Prompts ─────────────────────────────────
// Adapted from Cody Article Writer for BloggerSEO web platform

import type { StyleGuideSettings, ResearchSource } from "./types";

// Helper to format style guide into prompt context
function formatStyleContext(style: StyleGuideSettings): string {
  const toneLabel = style.voice.tone <= 3 ? "casual" : style.voice.tone <= 6 ? "balanced" : "professional";
  const humorLabel = style.voice.humor <= 3 ? "serious" : style.voice.humor <= 6 ? "moderate wit" : "playful";
  const opinionLabel = style.voice.opinion <= 3 ? "balanced/neutral" : style.voice.opinion <= 6 ? "moderately opinionated" : "strongly opinionated";
  const techLabel = style.voice.technical <= 3 ? "accessible/simple" : style.voice.technical <= 6 ? "moderate depth" : "highly technical";

  return `
STYLE GUIDE:
Voice: ${toneLabel} tone (${style.voice.tone}/10), ${humorLabel} humor (${style.voice.humor}/10), ${opinionLabel} (${style.voice.opinion}/10), ${techLabel} technical depth (${style.voice.technical}/10)
Formatting: Emojis ${style.formatting.emojis}/10, Em dashes ${style.formatting.emDashes}/10, Blockquotes: ${style.formatting.blockquotes}
Structure: Opening style(s): ${style.structure.opening.join(", ")} | Closing style(s): ${style.structure.closing.join(", ")} | Visual breaks: ${style.structure.visualBreaks} | Examples: ${style.structure.examples}${style.structure.exampleTypes.length > 0 ? ` (types: ${style.structure.exampleTypes.join(", ")})` : ""}
Context: Author is "${style.context.authorRole}" (expertise ${style.context.authorKnowledge}/10), writing for "${style.context.audienceRole}" (expertise ${style.context.audienceKnowledge}/10), authority dynamic ${style.context.authorRelationship}/10`.trim();
}

// Helper to format approved sources into prompt context
function formatSourcesContext(sources: ResearchSource[]): string {
  if (!sources || sources.length === 0) return "";
  const required = sources.filter(s => s.required);
  const optional = sources.filter(s => !s.required);

  let ctx = "\nAPPROVED RESEARCH SOURCES:";
  if (required.length > 0) {
    ctx += "\n\nREQUIRED (must incorporate):";
    required.forEach((s, i) => {
      ctx += `\n${i + 1}. "${s.title}" — ${s.domain}`;
      if (s.excerpt) ctx += `\n   Key content: ${s.excerpt.substring(0, 300)}`;
    });
  }
  if (optional.length > 0) {
    ctx += "\n\nOPTIONAL (use if relevant):";
    optional.forEach((s, i) => {
      ctx += `\n${i + 1}. "${s.title}" — ${s.domain}`;
      if (s.excerpt) ctx += `\n   Key content: ${s.excerpt.substring(0, 200)}`;
    });
  }
  return ctx;
}

// ─── PHASE 1: TOPIC IDEATION ────────────────────────────────────────
export function getIdeationPrompt(initialIdea: string, language: string, niche?: string): string {
  return `You are an expert article strategist and content planner. Your role is to help refine raw topic ideas into focused, compelling article angles.

The user wants to write about: "${initialIdea}"
Language: ${language}
${niche ? `Niche/Industry: ${niche}` : ""}

Your task:
1. Analyze the raw topic idea
2. Research current trends and angles for this topic (imagine you've done web searches)
3. Suggest 3-5 refined, focused angles that would make strong articles
4. For each angle, explain WHY it's compelling (unique perspective, trending, underserved, etc.)
5. Suggest the single best primary keyword for SEO targeting

Be a firm sounding board — if the idea is too broad, too niche, or overdone, say so constructively.

Return a JSON object:
{
  "refinedTopic": "The most promising refined version of their topic",
  "angles": ["Angle 1: description", "Angle 2: description", ...],
  "exploratoryResearch": {
    "searchesPerformed": ["search query 1", "search query 2", ...],
    "findings": ["Key finding 1", "Key finding 2", ...]
  },
  "suggestedKeyword": "best-primary-keyword",
  "feedback": "Your honest assessment of the topic idea and recommendations"
}`;
}

// ─── PHASE 2: RESEARCH GATHERING ────────────────────────────────────
export function getResearchGatherPrompt(
  topic: string,
  depth: "light" | "medium" | "heavy",
  keyword: string,
  language: string
): string {
  const sourceCount = depth === "light" ? "3-5" : depth === "medium" ? "6-10" : "10-15";

  return `You are a research analyst gathering authoritative sources for an article.

Topic: "${topic}"
Primary Keyword: "${keyword}"
Research Depth: ${depth} (target ${sourceCount} sources)
Language: ${language}

Your task: Identify ${sourceCount} high-quality, authoritative sources that would strengthen an article on this topic. For each source, provide:

Return a JSON object:
{
  "sources": [
    {
      "url": "https://example.com/article-url",
      "title": "Article Title",
      "author": "Author Name or null",
      "date": "2024-01-15 or null",
      "domain": "example.com",
      "relevance": "Why this source matters for the article",
      "excerpt": "Key quote or data point from this source (2-3 sentences)",
      "suggestedRequired": true
    }
  ],
  "researchSummary": "Brief overview of the research landscape for this topic"
}

Focus on:
- Authoritative domains (.gov, .edu, major publications, industry leaders)
- Recent data and statistics
- Expert opinions and studies
- Diverse perspectives on the topic
- Sources that provide unique data or insights not easily found elsewhere`;
}

// ─── PHASE 4: TITLE & THESIS ────────────────────────────────────────
export function getTitleThesisPrompt(
  topic: string,
  keyword: string,
  language: string,
  style?: StyleGuideSettings,
  sources?: ResearchSource[]
): string {
  let prompt = `You are an expert content strategist crafting compelling article titles and thesis statements.

Topic: "${topic}"
Primary Keyword: "${keyword}"
Language: ${language}`;

  if (style) {
    prompt += `\n\n${formatStyleContext(style)}`;
  }
  if (sources && sources.length > 0) {
    prompt += `\n${formatSourcesContext(sources)}`;
  }

  prompt += `

Your task:
1. Generate 5 compelling, SEO-optimized title options that incorporate the primary keyword
2. For each title, generate a matching thesis statement (1-2 sentences)
3. Titles should be varied in approach (how-to, listicle, question, statement, comparison)

${sources && sources.length > 0 ? "Use research sources to inform your thesis — ensure required sources' key findings are accommodated." : ""}

Return JSON:
{
  "options": [
    {
      "title": "Article Title Here",
      "thesis": "Clear thesis statement that sets the article direction",
      "approach": "how-to|listicle|question|statement|comparison"
    }
  ]
}`;

  return prompt;
}

// ─── PHASE 5: OUTLINE ───────────────────────────────────────────────
export function getOutlinePrompt(
  title: string,
  thesis: string,
  keyword: string,
  wordCount: number,
  language: string,
  style?: StyleGuideSettings,
  sources?: ResearchSource[]
): string {
  let prompt = `You are an expert article architect creating a comprehensive outline.

Title: "${title}"
Thesis: "${thesis}"
Primary Keyword: "${keyword}"
Target Word Count: ${wordCount}
Language: ${language}`;

  if (style) {
    prompt += `\n\n${formatStyleContext(style)}`;
    prompt += `\n\nStructure Requirements:
- Opening approach: ${style.structure.opening.join(" or ")}
- Closing approach: ${style.structure.closing.join(" or ")}
- Visual breaks: ${style.structure.visualBreaks}
- Examples density: ${style.structure.examples}`;
  }

  if (sources && sources.length > 0) {
    prompt += `\n${formatSourcesContext(sources)}`;
    prompt += `\n\nEnsure every REQUIRED source has at least one section where it will be referenced.`;
  }

  prompt += `

Create a detailed outline with 5-8 sections. Each section should have:
- A compelling H2 heading
- 3-5 key points to cover
- Type designation (opening, closing, or null for body sections)
- Approximate word count allocation

Return JSON:
{
  "outline": [
    {
      "heading": "Section Heading",
      "type": "opening|closing|null",
      "status": "pending",
      "points": ["Point 1", "Point 2", "Point 3"],
      "wordCount": 300,
      "sourceNotes": "Which sources to reference here (if any)"
    }
  ],
  "totalWordCount": ${wordCount},
  "suggestedLabels": ["label1", "label2", "label3"]
}`;

  return prompt;
}

// --- PHASE 7: WRITE ARTICLE (FULL DRAFT) -----------------------------------
export function getWriteFullPrompt(
  title: string,
  thesis: string,
  outline: Array<{ heading: string; points?: string[]; type?: string | null }>,
  keyword: string,
  wordCount: number,
  language: string,
  style?: StyleGuideSettings,
  sources?: ResearchSource[],
  includeCitations?: boolean,
  numImages?: number
): string {
  const toSlug = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  // Pre-build the TOC HTML so AI uses exact slugs that match the H2 ids we require
  const tocLines = outline.map((s) => {
    const slug = toSlug(s.heading);
    return `    <li class="toc-h2"><a href="#${slug}">${s.heading}</a></li>`;
  }).join("\n");
  const tocHtml = `<div class="toc">\n<h3>Table of Contents</h3>\n<ul>\n${tocLines}\n</ul>\n</div>`;

  // Outline with slugs so AI knows the exact id= value to use on each H2
  const outlineText = outline.map((s, i) => {
    const slug = toSlug(s.heading);
    const pts = (s.points || []).map((p) => `   - ${p}`).join("\n");
    return `${i + 1}. ${s.heading} [h2 id="${slug}"]${s.type ? ` (${s.type})` : ""}${pts ? "\n" + pts : ""}`;
  }).join("\n\n");

  const toneLabel = style?.voice?.tone
    ? style.voice.tone <= 3 ? "casual and conversational"
      : style.voice.tone <= 6 ? "balanced and professional"
      : "authoritative and expert"
    : "engaging, informative, and conversational";

  const perSectionWords = Math.round(wordCount / Math.max(outline.length, 1));

  let prompt = `You are a world-class SEO content writer in 2026. Write a COMPLETE, PROFESSIONAL blog article that ranks #1 on Google.

=== ARTICLE BRIEF ===
Main Keyword : "${keyword}"
Title        : "${title}"
Thesis       : "${thesis}"
Tone         : ${toneLabel}
Audience     : ${style?.context?.audienceRole || "General readers seeking practical information"}
Min Length   : ${wordCount} words - DO NOT stop early, write every section fully
Language     : ${language}

=== OUTLINE (H2 headings with required anchor IDs) ===
${outlineText}

=== REQUIRED OUTPUT STRUCTURE - follow in this exact order ===

STEP 1 - TABLE OF CONTENTS (output this exact HTML verbatim):
${tocHtml}

STEP 2 - FEATURED SNIPPET (right after TOC, BEFORE introduction):
<p><strong>[Direct answer to "${keyword}" query in 40-60 words]</strong></p>
This targets Google's Position 0 featured snippet. Must be clear, direct, standalone answer.

STEP 3 - FEATURED IMAGE PLACEHOLDER (right after featured snippet):
[IMAGE: professional photorealistic scene related to "${keyword}", bright natural lighting, 4k]

STEP 4 - INTRODUCTION (150-200 words)
- Open with a HOOK: bold statement, surprising stat, or relatable scenario. NOT "In this article..."
- State the reader's problem or desire clearly
- Promise what they will learn
- Include "${keyword}" naturally within the first 100 words
- Close with a sentence that flows into the first section

STEP 5 - BODY SECTIONS (minimum 5 H2 sections, approx ${perSectionWords} words each)
For EACH section in the outline:
- Use: <h2 id="[slug]">[Heading]</h2> - the slug MUST match the id shown in the outline above
- Make H2 headings KEYWORD-OPTIMIZED and clickable (e.g., instead of "What Makes a Smartphone the Best" → "What Makes the Best Smartphone in 2026?")
- Use <h3> for subsections (no id needed)
- Write expert content: real examples, statistics, comparisons, actionable advice
- MINIMUM 150-300 words per H2 - each must include at least ONE actionable takeaway
- Use <p> for paragraphs, <ul><li> for lists, <strong> for key terms on first mention
- Insert [IMAGE: detailed scene description, photorealistic, 4k] every 350-400 words (minimum 4 images total)
- BANNED: "Furthermore", "Moreover", "Additionally", "It is important to note", "In today's world", "In conclusion", "It's worth mentioning"

--- ENGAGEMENT TRIGGERS (sprinkle these THROUGHOUT all body sections) ---
- Add rhetorical hooks: "So which one should you pick?", "Is it really worth it?", "Here's what most people get wrong…"
- Add conversational asides: "And this is where things get interesting…", "Bet you didn't expect that."
- Add micro-opinions: "Honestly? This one surprised me.", "I wouldn't recommend this unless…"
- Mix sentence rhythm: short punchy + longer explanatory. "Not perfect. But honestly? It's close."
- Add provocative statements: "Most guides won't tell you this, but…"

--- ENTITY SEO (MANDATORY for semantic ranking) ---
- Mention specific technical entities deeply: model numbers, chipsets (e.g., Snapdragon 8 Gen 3, Apple A17 Pro), software versions, ecosystem names
- Don't just name-drop brands — explain WHY the entity matters for the reader
- Reference ecosystems: Android vs iOS, Windows vs macOS, etc. when relevant
- This improves Google's semantic understanding of your content

STEP 6 - MONETIZATION SECTION (MANDATORY — this is how you make money):
<h2 id="best-[keyword-slug]">Best [Keyword] to Buy in 2026</h2>
List 3-5 REAL, CURRENTLY AVAILABLE products. For EACH product:
<h3>[Product Name]</h3>
<p><strong>Short review:</strong> 2-3 sentences of honest assessment</p>
<p><strong>Key feature:</strong> The ONE thing that sets it apart</p>
<p><strong>Best for:</strong> [specific use case — gaming, photography, budget, etc.]</p>
ALL products MUST be real and currently for sale. No speculative items.

STEP 7 - INTENT MATCH SECTION (MANDATORY — Google loves this):
<h2 id="[keyword-slug]-by-use-case">[Keyword] by Use Case</h2>
<ul>
<li><strong>Best for gaming:</strong> [Product] — [why]</li>
<li><strong>Best for photography:</strong> [Product] — [why]</li>
<li><strong>Best for battery life:</strong> [Product] — [why]</li>
<li><strong>Best for budget:</strong> [Product] — [why]</li>
</ul>
This matches diverse search intents and improves rankings.

STEP 8 - COMPARISON SECTION (MANDATORY when topic involves options):
Use <table> format with specs/features. Minimum 3 columns, 4+ rows.
AFTER the table, add clear winner logic:
<h3>Which One Should You Choose?</h3>
<ul>
<li><strong>Best overall:</strong> [Product] — [reason]</li>
<li><strong>Best for [use case]:</strong> [Product] — [reason]</li>
<li><strong>Best value:</strong> [Product] — [reason]</li>
</ul>

STEP 9 - FAQ SECTION (if outline contains FAQ - use this exact schema markup):
<div class="faq-section" itemscope itemtype="https://schema.org/FAQPage">
  <h2 id="faq">Frequently Asked Questions</h2>
  <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <h3 itemprop="name">[Question]</h3>
    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <p itemprop="text">[Direct 2-4 sentence answer]</p>
    </div>
  </div>
</div>

STEP 10 - CONCLUSION (150-200 words) — MUST CONVERT:
- Summarize the 2-3 most important takeaways
- Include SPECIFIC, DECISIVE recommendations: "If you want the safest choice → go with [Product]." "If you want value → [Product] is your best bet."
- Add a clear CTA: "Start by...", "Try this today...", "Bookmark this for later"
- End with a thought-provoking final line that makes the reader want to share

=== 🚨 REALITY ENFORCEMENT (CRITICAL — NON-NEGOTIABLE) ===
- ONLY use REAL, CURRENTLY AVAILABLE devices, products, and features
- DO NOT invent products, specs, or technologies (no "quantum processors", no "holographic displays")
- DO NOT reference unreleased/speculative products (no "iPhone 18 Pro Max", no "Galaxy S30")
- DO NOT use vague futuristic claims (no "AI copilot standard", no "neural interface")
- If unsure → use conservative, realistic description
🚨 ANY REALITY VIOLATION = REWRITE ENTIRE ARTICLE 🚨

=== HUMANIZER (LEVEL 10 — MANDATORY) ===
- Contractions everywhere (don't, it's, you'll, can't, won't)
- Micro-opinions: "I'd pick this over...", "Honestly, this surprised me", "I wouldn't recommend this unless…"
- One-word impact: "Seriously." "Worth it." "Not even close." "Game over."
- Short punchy + longer: "Not perfect. But honestly? It's close."
- Parenthetical asides (like this — they feel human), sentence fragments, rhetorical questions
- Start some paragraphs with "Look," or "Thing is," or "Real talk:"
- Add natural imperfections: "Okay, this might be controversial, but…"
- NO uniform sentence length, NO predictable paragraph rhythm
- Vary paragraph length: some 1-2 sentences, some 3-4 — never uniform
- Break the predictable assertion → explanation → example → conclusion pattern

=== MASTER ENFORCEMENT — FINAL QUALITY CONTROL ===
Before output, verify ALL:
1. Article is FULL (no placeholders, no "rest of article")
2. At least 5 H2 body sections with 150-300 words each
3. Featured snippet exists after TOC
4. TOC has 5+ items, excludes FAQ and Conclusion, headings are keyword-optimized
5. Minimum 4 [IMAGE: ...] placeholders with detailed descriptions
6. Monetization section with real products (each has: review, key feature, best-for)
7. Intent-match / use-case section exists
8. Comparison section has winner logic ("Which One Should You Choose?")
9. Content is 100% realistic — no fake tech
10. Human tone verified — engagement triggers throughout, varied rhythm
11. Conclusion has SPECIFIC product recommendations + clear CTA
12. Entity SEO: specific model names, chipsets, ecosystems mentioned
IF ANY CHECK FAILS → REWRITE ENTIRE ARTICLE

=== CRITICAL OUTPUT RULES ===
1. Output ONLY raw HTML - NO markdown fences (no triple backticks), NO text before or after
2. Every H2 MUST have id="[slug]" exactly matching the outline slugs - TOC links depend on this
3. Write at least ${wordCount} words - do not stop short
4. Write real content only - no placeholder text, no [insert statistic here]
5. Article starts directly with the TOC div - no title tag at the top
`;

  if (style) {
    prompt += `\n=== STYLE GUIDE ===\n${formatStyleContext(style)}`;
  }

  if (sources && sources.length > 0) {
    prompt += `\n=== RESEARCH SOURCES (use to enrich content with real data) ===\n${formatSourcesContext(sources)}`;
    if (includeCitations) {
      prompt += `\nInsert inline citation markers [^1], [^2], etc. when directly referencing source data.`;
    } else {
      prompt += `\nUse these sources to inform your writing but do NOT insert citation markers in the text.`;
    }
  }

  return prompt;
}

// --- PHASE 7: WRITE SECTION ------------------------------------------------
export function getWriteSectionPrompt(
  title: string,
  thesis: string,
  sectionHeading: string,
  sectionPoints: string[],
  sectionType: string | null,
  sectionWordCount: number,
  keyword: string,
  language: string,
  previousSections: string,
  style?: StyleGuideSettings,
  sources?: ResearchSource[],
  includeCitations?: boolean
): string {
  const slug = sectionHeading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const toneLabel = style?.voice?.tone
    ? style.voice.tone <= 3 ? "casual and conversational" : style.voice.tone <= 6 ? "balanced and professional" : "authoritative and expert"
    : "engaging and conversational";

  let prompt = `You are a world-class SEO content writer. Write ONE section of a professional blog post that ranks on Google.

=== SECTION BRIEF ===
Article Title : "${title}"
Thesis        : "${thesis}"
Keyword       : "${keyword}"
Language      : ${language}
Tone          : ${toneLabel}

THIS SECTION:
Heading : "${sectionHeading}"
Anchor ID for h2 tag: "${slug}"
Type    : ${sectionType || "body"}
Target  : ${sectionWordCount} words minimum - write substantively, do NOT stop short

Key Points to Cover:
${sectionPoints.map((p) => `- ${p}`).join("\n")}

${previousSections ? `PREVIOUS CONTENT (context only - do NOT repeat it):\n${previousSections.substring(0, 1500)}...
` : "This is the opening section of the article."}

=== OUTPUT RULES ===
1. Open with exactly: <h2 id="${slug}">${sectionHeading}</h2>
2. Use <h3> for sub-topics (no id needed)
3. Use <p> for paragraphs, <ul><li> for bullet lists, <strong> for key terms on first mention
4. Write ${sectionWordCount} words of real, expert content - no filler, no generic advice
5. Each section must include at least ONE actionable takeaway the reader can use immediately
6. Vary sentence length: mix short punchy sentences with longer explanatory ones
7. If section is over 250 words, add ONE image placeholder: [IMAGE: detailed photorealistic scene of [topic], 4k]
8. BANNED words/phrases: "Furthermore", "Moreover", "Additionally", "It is important to note", "In today's world", "game-changer", "revolutionary", "cutting-edge"
9. Output ONLY raw HTML - no markdown fences, no preamble text before the <h2>
10. REALITY: Only reference REAL, currently available products. No speculative tech, no unreleased devices.
11. HUMAN TONE: Use contractions, micro-opinions, varied rhythm. "Not perfect. But honestly? It's close."

`;

  if (style) prompt += `\n=== STYLE GUIDE ===\n${formatStyleContext(style)}`;
  if (sources && sources.length > 0) {
    prompt += `\n=== RESEARCH SOURCES ===\n${formatSourcesContext(sources)}`;
    if (includeCitations) {
      prompt += `\nAdd citation markers [^1], [^2] when directly referencing source data.`;
    }
  }
  return prompt;
}

// ─── PHASE: HUMANIZER PASS ──────────────────────────────────────────
export function getHumanizerPrompt(
  articleContent: string
): string {
  return `You are an expert editor and content humanizer. Your task is to rewrite this article to sound 100% human-written and UNDETECTABLE as AI.

ARTICLE HTML TO REWRITE:
${articleContent}

=== HUMANIZER REQUIREMENTS (LEVEL 10 — AGGRESSIVE) ===
- Break predictable sentence patterns — AGGRESSIVELY vary sentence length
- Add personality, natural imperfections, micro-opinions ("I'd pick this over...")
- Use contractions everywhere (don't, it's, you'll, can't, won't)
- Add rhetorical questions: "Sound familiar?", "So what's the catch?"
- Use natural human phrasing: "Let's be honest…", "Here's the thing…", "Most people don't realize…", "Real talk:"
- Add one-word impact sentences: "Seriously." "Worth it." "Not even close."
- Mix short punchy with longer: "Not perfect. But honestly? It's close."
- Start some paragraphs with "Look," or "Thing is," or sentence fragments
- Add parenthetical asides (like this — they feel human)
- Remove ALL robotic transitions: "In conclusion", "Furthermore", "Moreover", "It's important to note", "Additionally", "In today's world"
- Vary paragraph length: some 1-2 sentences, some 3-4 — never uniform
- Break the predictable pattern of assertion → explanation → example → conclusion

=== REALITY CHECK ===
- Do NOT introduce any fake/speculative products or technologies
- Do NOT add "quantum processors", "holographic displays", or unreleased devices
- Keep all product references REAL and CURRENTLY AVAILABLE

=== BANNED AI-TELL PHRASES (remove ALL) ===
"game-changer", "revolutionary", "cutting-edge", "robust", "leverage", "utilize", "facilitate", "navigate the complexities", "unlock the potential", "delve into"

CRITICAL:
- Keep the SEO structure intact (H2s and H3s).
- Do NOT remove or modify keywords.
- Preserve all existing HTML elements exactly (headings, lists, [IMAGE: ...] placeholders, anchor links).
- Return ONLY the clean HTML, with no markdown code fences like \`\`\`html.`;
}

// ─── PHASE 10: EDITOR PASS ──────────────────────────────────────────
export function getEditorPassPrompt(
  articleContent: string,
  style?: StyleGuideSettings
): string {
  let prompt = `You are an expert editor performing a thorough editorial pass on an article. Your job is to polish it to publication quality.

ARTICLE TO EDIT:
${articleContent}`;

  if (style) {
    prompt += `\n\n${formatStyleContext(style)}`;
  }

  prompt += `

EDITORIAL CHECKLIST:

1. **AI Tell Removal** (ALWAYS apply):
   - Remove: "It's important to note...", "It's worth mentioning...", "Interestingly enough...", "In today's world...", "In this article, we will..."
   - Reduce overused transitions: "Additionally" → vary with "Also," "Beyond this," or restructure. "Furthermore", "Moreover" → often unnecessary, delete or restructure
   - Fix: Starting multiple paragraphs with "This...", "When it comes to [X]..."
   - Remove weak openers: "[X] is a [Y] that [Z]"

2. **Prose Tightening** (ALWAYS apply):
   - Remove redundant words ("very unique" → "unique")
   - Remove weasel words ("somewhat", "quite", "rather") 
   - Strengthen weak verbs
   - Break overly long sentences
   - Convert passive voice to active where appropriate

3. **Text Emphasis**:
   - Bold key terms on first mention
   - Bold critical takeaways or action items
   - Italicize product names, technical terms, emphasis
   - Never bold entire sentences

4. **Tone Consistency**:
   ${style ? `- Target tone: ${style.voice.tone <= 3 ? "casual (contractions OK, 'you' and 'I')" : style.voice.tone <= 6 ? "balanced (professional but approachable)" : "professional (formal, minimal contractions)"}` : "- Maintain consistent tone throughout"}
   - Flag and fix sections where tone shifts unexpectedly

5. **Visual Breaks**:
   ${style ? `- Target: ${style.structure.visualBreaks} (${style.structure.visualBreaks === "minimal" ? "allow longer paragraphs" : style.structure.visualBreaks === "generous" ? "short paragraphs, frequent breaks" : "standard paragraph lengths"})` : "- Ensure readable paragraph lengths"}

6. **Em Dashes**:
   ${style ? `- Setting: ${style.formatting.emDashes}/10 — ${style.formatting.emDashes <= 2 ? "replace em dashes with commas/parentheses" : style.formatting.emDashes <= 5 ? "use sparingly, max 1-2 per article" : "acceptable where appropriate"}` : "- Use sparingly"}

7. **Flow & Transitions**:
   - Ensure smooth transitions between sections
   - No walls of text (no paragraphs > 5-6 sentences)
   - Check logical progression

IMPORTANT: Do NOT modify any citation markers [^1], [^2] etc. or References section.

Return a JSON object:
{
  "editedContent": "the full edited article HTML",
  "changes": {
    "aiTellsRemoved": ["list of AI patterns removed"],
    "proseTightened": ["list of tightening changes"],
    "emphasisAdded": ["list of bold/italic additions"],
    "structuralChanges": ["list of paragraph/flow changes"]
  },
  "summary": "Brief summary of all editorial changes made"
}`;

  return prompt;
}

// ─── PHASE 11: METADATA GENERATION ──────────────────────────────────
export function getMetadataPrompt(
  title: string,
  content: string,
  keyword: string,
  language: string
): string {
  return `You are an SEO metadata specialist. Generate optimized metadata for this article.

Title: "${title}"
Primary Keyword: "${keyword}"
Language: ${language}
Article Preview: ${content.substring(0, 1500)}

Generate:
1. SEO Title (50-60 characters, includes primary keyword)
2. Meta Description (150-160 characters, compelling, includes keyword, has a call to action)
3. Keywords/Tags (8-12 relevant keywords/phrases)
4. Excerpt (2-3 sentences for article preview)

Return JSON:
{
  "metaTitle": "SEO optimized title",
  "metaDescription": "Compelling meta description under 160 chars",
  "metaKeywords": ["keyword1", "keyword2", ...],
  "excerpt": "Brief article excerpt for previews"
}`;
}

// ─── STYLE GUIDE SUGGESTION ─────────────────────────────────────────
export function getStyleGuideSuggestionPrompt(
  topic: string,
  niche?: string,
  existingBrandVoice?: string
): string {
  return `You are a writing style consultant. Based on the topic and context, suggest optimal style guide settings.

Topic: "${topic}"
${niche ? `Niche: ${niche}` : ""}
${existingBrandVoice ? `Existing Brand Voice: ${existingBrandVoice}` : ""}

Suggest style guide settings as JSON:
{
  "name": "Suggested style name",
  "description": "When to use this style",
  "voice": { "tone": 5, "humor": 3, "opinion": 5, "technical": 5 },
  "formatting": { "emojis": 0, "emDashes": 3, "blockquotes": "occasional" },
  "structure": {
    "opening": ["direct"],
    "closing": ["call_to_action"],
    "visualBreaks": "moderate",
    "examples": "some",
    "exampleTypes": ["lists", "quotes"]
  },
  "context": {
    "authorRole": "Role description",
    "authorKnowledge": 7,
    "audienceRole": "Audience description",
    "audienceKnowledge": 3,
    "authorRelationship": 7
  }
}

Consider:
- Niche conventions (tech blogs are different from lifestyle)
- Topic formality requirements
- SEO best practices for engagement
- The brand voice if provided`;
}

export { formatStyleContext, formatSourcesContext };
