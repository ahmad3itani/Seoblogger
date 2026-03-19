import { readFileSync, writeFileSync } from "fs";

const filePath = "src/lib/ai/article-writer/prompts.ts";
let content = readFileSync(filePath, "utf8");

// Find the getWriteFullPrompt function body and replace it
// We use start/end markers that are unique in the file
const START_MARKER = "// \u2500\u2500\u2500 PHASE 7: WRITE ARTICLE (FULL DRAFT) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500";
const END_MARKER = "// --- PHASE 7: WRITE SECTION";

const startIdx = content.indexOf(START_MARKER);
const endIdx = content.indexOf(END_MARKER);

if (startIdx === -1 || endIdx === -1) {
  console.error("Could not find markers. startIdx:", startIdx, "endIdx:", endIdx);
  process.exit(1);
}

const newFunction = `// --- PHASE 7: WRITE ARTICLE (FULL DRAFT) -----------------------------------
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
    return \`    <li class="toc-h2"><a href="#\${slug}">\${s.heading}</a></li>\`;
  }).join("\\n");
  const tocHtml = \`<div class="toc">\\n<h3>Table of Contents</h3>\\n<ul>\\n\${tocLines}\\n</ul>\\n</div>\`;

  // Outline with slugs so AI knows the exact id= value to use on each H2
  const outlineText = outline.map((s, i) => {
    const slug = toSlug(s.heading);
    const pts = (s.points || []).map((p) => \`   - \${p}\`).join("\\n");
    return \`\${i + 1}. \${s.heading} [h2 id="\${slug}"]\${s.type ? \` (\${s.type})\` : ""}\${pts ? "\\n" + pts : ""}\`;
  }).join("\\n\\n");

  const toneLabel = style?.voice?.tone
    ? style.voice.tone <= 3 ? "casual and conversational"
      : style.voice.tone <= 6 ? "balanced and professional"
      : "authoritative and expert"
    : "engaging, informative, and conversational";

  const perSectionWords = Math.round(wordCount / Math.max(outline.length, 1));

  let prompt = \`You are a world-class SEO content writer in 2026. Write a COMPLETE, PROFESSIONAL blog article that ranks #1 on Google.

=== ARTICLE BRIEF ===
Main Keyword : "\${keyword}"
Title        : "\${title}"
Thesis       : "\${thesis}"
Tone         : \${toneLabel}
Audience     : \${style?.context?.audienceRole || "General readers seeking practical information"}
Min Length   : \${wordCount} words - DO NOT stop early, write every section fully
Language     : \${language}

=== OUTLINE (H2 headings with required anchor IDs) ===
\${outlineText}

=== REQUIRED OUTPUT STRUCTURE - follow in this exact order ===

STEP 1 - TABLE OF CONTENTS (output this exact HTML verbatim):
\${tocHtml}

STEP 2 - FEATURED IMAGE PLACEHOLDER (right after TOC):
[IMAGE: professional photorealistic scene related to "\${keyword}", bright natural lighting, 4k]

STEP 3 - INTRODUCTION (150-200 words)
- Open with a HOOK: bold statement, surprising stat, or relatable scenario. NOT "In this article..."
- State the reader's problem or desire clearly
- Promise what they will learn
- Include "\${keyword}" naturally within the first 100 words
- Close with a sentence that flows into the first section

STEP 4 - BODY SECTIONS (approx \${perSectionWords} words each)
For EACH section in the outline:
- Use: <h2 id="[slug]">[Heading]</h2> - the slug MUST match the id shown in the outline above
- Use <h3> for subsections (no id needed)
- Write expert content: real examples, statistics, comparisons, actionable advice
- Use <p> for paragraphs, <ul><li> for lists, <strong> for key terms on first mention
- Vary sentence length: mix short punchy sentences with longer explanatory ones
- Insert [IMAGE: detailed scene description, photorealistic, 4k] every 350-400 words
- BANNED: "Furthermore", "Moreover", "Additionally", "It is important to note", "In today's world", "In conclusion", "It's worth mentioning"

STEP 5 - FAQ SECTION (if outline contains FAQ - use this exact schema markup):
<div class="faq-section" itemscope itemtype="https://schema.org/FAQPage">
  <h2 id="faq">Frequently Asked Questions</h2>
  <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <h3 itemprop="name">[Question]</h3>
    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <p itemprop="text">[Direct 2-4 sentence answer]</p>
    </div>
  </div>
</div>

STEP 6 - CONCLUSION (150-200 words)
- Summarize the 2-3 most important takeaways
- Include a specific CTA ("Start by...", "Try this today...", "Share if this helped...")
- End with a motivating or thought-provoking final sentence

=== CRITICAL OUTPUT RULES ===
1. Output ONLY raw HTML - NO markdown fences (no triple backticks), NO text before or after
2. Every H2 MUST have id="[slug]" exactly matching the outline slugs - TOC links depend on this
3. Write at least \${wordCount} words - do not stop short
4. Write real content only - no placeholder text, no [insert statistic here]
5. Article starts directly with the TOC div - no title tag at the top
\`;

  if (style) {
    prompt += \`\\n=== STYLE GUIDE ===\\n\${formatStyleContext(style)}\`;
  }

  if (sources && sources.length > 0) {
    prompt += \`\\n=== RESEARCH SOURCES (use to enrich content with real data) ===\\n\${formatSourcesContext(sources)}\`;
    if (includeCitations) {
      prompt += \`\\nInsert inline citation markers [^1], [^2], etc. when directly referencing source data.\`;
    } else {
      prompt += \`\\nUse these sources to inform your writing but do NOT insert citation markers in the text.\`;
    }
  }

  return prompt;
}

`;

// Replace from start marker to end marker (exclusive of end marker)
const before = content.substring(0, startIdx);
const after = content.substring(endIdx);
const newContent = before + newFunction + after;

writeFileSync(filePath, newContent, "utf8");
console.log("Successfully rewrote getWriteFullPrompt in", filePath);
