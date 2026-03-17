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

// ─── PHASE 7: WRITE ARTICLE (FULL DRAFT) ────────────────────────────
export function getWriteFullPrompt(
  title: string,
  thesis: string,
  outline: Array<{ heading: string; points?: string[]; type?: string | null }>,
  keyword: string,
  wordCount: number,
  language: string,
  style?: StyleGuideSettings,
  sources?: ResearchSource[],
  includeCitations?: boolean
): string {
  const outlineText = outline.map((s, i) =>
    `${i + 1}. ${s.heading}${s.type ? ` (${s.type})` : ""}\n${(s.points || []).map(p => `   - ${p}`).join("\n")}`
  ).join("\n\n");

  let prompt = `You are an expert article writer producing a high-quality, SEO-optimized blog article.

Title: "${title}"
Thesis: "${thesis}"
Primary Keyword: "${keyword}"
Target Word Count: ${wordCount}
Language: ${language}

OUTLINE:
${outlineText}`;

  if (style) {
    prompt += `\n\n${formatStyleContext(style)}`;

    prompt += `\n\nWRITING RULES based on style guide:`;
    // Emoji rules
    if (style.formatting.emojis === 0) {
      prompt += `\n- NO emojis anywhere`;
    } else if (style.formatting.emojis <= 3) {
      prompt += `\n- Max 1-2 emojis in entire article`;
    } else if (style.formatting.emojis <= 6) {
      prompt += `\n- Occasional emoji use in headers or key points`;
    } else {
      prompt += `\n- Liberal emoji use throughout`;
    }
    // Em dash rules
    if (style.formatting.emDashes <= 2) {
      prompt += `\n- Avoid em dashes — use commas, parentheses, or periods instead`;
    } else if (style.formatting.emDashes <= 5) {
      prompt += `\n- Use em dashes sparingly (max 1-2 per article)`;
    }
    // Visual breaks
    if (style.structure.visualBreaks === "minimal") {
      prompt += `\n- Dense prose, longer paragraphs (5-8 sentences)`;
    } else if (style.structure.visualBreaks === "generous") {
      prompt += `\n- Short paragraphs (2-4 sentences), frequent breaks, single-sentence paragraphs for impact`;
    } else {
      prompt += `\n- Standard paragraph lengths (3-5 sentences)`;
    }
    // Examples
    if (style.structure.examples === "many") {
      prompt += `\n- Include many examples throughout (${style.structure.exampleTypes.join(", ")})`;
    } else if (style.structure.examples === "some") {
      prompt += `\n- Include occasional examples where helpful`;
    }
  }

  if (sources && sources.length > 0) {
    prompt += `\n${formatSourcesContext(sources)}`;
    if (includeCitations) {
      prompt += `\n\nCITATION RULES:
- Insert inline citation markers [^1], [^2], etc. when referencing source data
- Number citations sequentially by first appearance
- Same source reused = same citation number
- All REQUIRED sources must be cited at least once`;
    } else {
      prompt += `\n\nUse these sources to inform your writing but do NOT insert citation markers.`;
    }
  }

  prompt += `

CRITICAL REQUIREMENTS:
1. Write the COMPLETE article in clean HTML format with proper <h2>, <h3>, <p>, <ul>, <ol>, <strong>, <em> tags
2. The primary keyword "${keyword}" must appear naturally in the first paragraph, in at least 2 H2 headings, and throughout the article
3. Write at least ${wordCount} words — DO NOT cut short
4. Every section from the outline must be covered thoroughly
5. Use transition sentences between sections for smooth flow
6. NO AI filler phrases like "It's important to note", "In today's world", "Additionally" (vary transitions)
7. Write in a way that is engaging, original, and impossible to detect as AI-generated
8. Include a compelling hook in the opening paragraph

Output the full article HTML content only. No markdown fences or explanation.`;

  return prompt;
}

// ─── PHASE 7: WRITE SECTION ─────────────────────────────────────────
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
  let prompt = `You are writing one section of an article.

Article Title: "${title}"
Thesis: "${thesis}"
Primary Keyword: "${keyword}"
Language: ${language}

CURRENT SECTION:
Heading: "${sectionHeading}"
Type: ${sectionType || "body"}
Key Points to Cover:
${sectionPoints.map(p => `- ${p}`).join("\n")}
Target Word Count: ~${sectionWordCount} words

${previousSections ? `PREVIOUS SECTIONS (for context and flow):\n${previousSections.substring(0, 2000)}...\n` : "This is the first section."}`;

  if (style) prompt += `\n\n${formatStyleContext(style)}`;
  if (sources && sources.length > 0) {
    prompt += `\n${formatSourcesContext(sources)}`;
    if (includeCitations) {
      prompt += `\nInsert [^N] citation markers when referencing source data.`;
    }
  }

  prompt += `

Write this section in clean HTML. Include the <h2> heading. NO AI filler phrases. Match the voice and tone of previous sections for consistency.`;

  return prompt;
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
