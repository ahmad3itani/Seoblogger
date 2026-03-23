// ─────────────────────────────────────────────────────────────────────────────
// BloggerSEO V2 Unified Engine — Prompt Templates
// ─────────────────────────────────────────────────────────────────────────────

export const V2_PROMPTS = {
  // ─── 1. SEO TITLE GENERATOR ──────────────────────────────────────────────
  TITLE_GENERATOR: `You are a world-class SEO copywriter. Generate 5 click-worthy, SEO-optimized blog titles.

PRIMARY KEYWORD: {{PRIMARY_KEYWORD}}
LANGUAGE: {{LANGUAGE}}
TONE: {{TONE}}
NICHE: {{NICHE}}
ARTICLE TYPE: {{ARTICLE_TYPE}}

RULES:
1. Exact or near-exact keyword match in at least 3 titles.
2. Include a specific date (2026), number, or outcome metric.
3. Keep under 65 characters so they do not truncate in Google.
4. Use power words (Proven, Expert, Complete, Honest).
5. Output ONLY a valid JSON array of 5 strings. No markdown, no explanations.`,

  // ─── 2. TOPICAL OUTLINE GENERATOR ─────────────────────────────────────────
  OUTLINE_GENERATOR: `You are an expert SEO strategist. Build the ultimate article outline to outrank everyone on Google.

TITLE: {{TITLE}}
PRIMARY KEYWORD: {{PRIMARY_KEYWORD}}
TARGET WORD COUNT: {{WORD_COUNT}}
LANGUAGE: {{LANGUAGE}}
TONE: {{TONE}}
NICHE: {{NICHE}}
ARTICLE TYPE: {{ARTICLE_TYPE}}

{{PAA_CONTEXT}}

━━━ OUTLINE RULES ━━━
1. Create 6 to 12 H2 headings. Each H2 must represent a distinct, complete answer to a user's question.
2. EVERY H2 must have at least 2-4 H3 subsections. This creates the depth required to rank.
3. Integrate 6-10 LSI (semantically related) keywords across headings naturally. Do not stuff.
4. Include an FAQ section (target the PAA context provided if relevant).

Return ONLY valid JSON in this exact structure:
{
  "sections": [
    {
      "heading": "H2 Title (string)",
      "level": 2,
      "points": ["point 1", "point 2"],
      "subsections": [
        {
          "heading": "H3 Subtitle (string)",
          "level": 3,
          "points": ["sub-point 1", "sub-point 2"]
        }
      ]
    }
  ],
  "faqs": [
    { "question": "Question text?", "shortAnswer": "Brief answer text" }
  ],
  "suggestedLabels": ["tag1", "tag2"],
  "lsiKeywords": ["lsi1", "lsi2"],
  "totalWordCount": 2000
}`,

  // ─── 3. MASTER FULL ARTICLE WRITER ────────────────────────────────────────
  ARTICLE_WRITER: `You are a world-class SEO content writer in 2026. Your job is to write a COMPLETE, PROFESSIONAL blog article that ranks #1 on Google.

=== ARTICLE BRIEF ===
Main Keyword : "{{PRIMARY_KEYWORD}}"
Title        : "{{TITLE}}"
Tone         : {{TONE}}
Language     : {{LANGUAGE}}
Min Length   : {{WORD_COUNT}} words - DO NOT stop early, write every section fully

=== OUTLINE (H2 headings - use the exact id shown in parentheses) ===
{{OUTLINE_TEXT}}

=== REQUIRED OUTPUT STRUCTURE - follow in this exact order ===

STEP 1 - TABLE OF CONTENTS (output this exact HTML verbatim - do not modify):
{{TOC_HTML}}

STEP 2 - FEATURED IMAGE PLACEHOLDER (right after TOC):
[IMAGE: professional photorealistic scene related to "{{PRIMARY_KEYWORD}}", bright natural lighting, 4k]

STEP 3 - INTRODUCTION (150-200 words)
- Open with a HOOK: bold statement, surprising stat, or relatable scenario. NOT "In this article..."
- State the reader's problem or desire clearly
- Promise what they will learn
- Include "{{PRIMARY_KEYWORD}}" naturally within the first 100 words
- Close with a sentence that flows into the first section

STEP 4 - BODY SECTIONS
For EACH section in the outline:
- Write the H2 with ONLY ONE id attribute: <h2 id="the-slug">Heading Text</h2>
- Do NOT add multiple id attributes to any element
- Use <h3> for subsections (NO id attribute on H3s)
- Write expert content: real examples, statistics, comparisons, actionable advice
- MINIMUM 200 words per H2 section - write fully, do not skimp
- Use <p> for paragraphs, <ul><li> for lists, <strong> for key terms on first mention
- Vary sentence length: mix short punchy sentences with longer explanatory ones
- Insert [IMAGE: detailed scene description, photorealistic, 4k] every 350-400 words

STEP 5 - FAQ SECTION (use this exact structure - the H2 has id="faq"):
<div class="faq-section" itemscope itemtype="https://schema.org/FAQPage">
  <h2 id="faq">Frequently Asked Questions</h2>
{{FAQ_HTML}}
</div>

STEP 6 - CONCLUSION (150-200 words)
- Summarize the 2-3 most important takeaways
- Include a specific CTA ("Start by...", "Try this today...", "Share if this helped...")
- End with a motivating or thought-provoking final sentence

=== ⛔ FORBIDDEN - INSTANT FAILURE ===
You MUST NOT do any of the following:
1. ❌ Placeholder text: "[Rest of content...]", "[insert X here]", "[continue with...]", "...remains unchanged"
2. ❌ Skipping sections: You must write EVERY section in full - no shortcuts
3. ❌ Multiple id attributes: NEVER write id="x" id="y" on same element
4. ❌ Stopping early: Write the FULL article from start to conclusion
5. ❌ Generic filler: "Furthermore", "Moreover", "Additionally", "It is important to note", "In today's world", "In conclusion"
6. ❌ Markdown: No triple backticks, no markdown syntax
7. ❌ Meta-commentary: No "Here is the article" or explanations before/after

=== ✅ REQUIRED OUTPUT ===
- Output ONLY raw HTML starting with the TOC div
- Every H2 has exactly ONE id attribute matching the outline
- H3 elements have NO id attribute
- Write at least {{WORD_COUNT}} words total
- Complete article from TOC to conclusion
- For Blogger use ONLY: <p> <h2> <h3> <h4> <ul> <ol> <li> <table> <thead> <tbody> <tr> <th> <td> <strong> <em> <a> <blockquote> <figure> <figcaption>
{{EXTRA_INSTRUCTIONS}}`,

  // ─── 4. HUMANIZER PASS ───────────────────────────────────────────────────
  ARTICLE_HUMANIZER: `You are an expert editor and content humanizer. Your task is to rewrite this article to sound 100% human.

ARTICLE HTML TO REWRITE:
{{ARTICLE_HTML}}

=== HUMANIZER REQUIREMENTS ===
- Break predictable sentence patterns and vary sentence length (short + long)
- Add personality, natural imperfections, and a natural tone
- Use conversational shortcuts occasionally (don't, it's, etc.)
- Add occasional rhetorical questions or human phrasing ("Let's be honest…", "Here's the thing…", "Most people don't realize…")
- Remove all robotic transitions ("In conclusion", "Furthermore", "Moreover", "It's important to note", "Additionally")
- Slightly vary paragraph length to avoid walls of text. Short 1-2 sentence paragraphs stand out.

=== ⛔ FORBIDDEN ===
1. ❌ Do NOT add placeholder text like "[Rest of content...]" or "[insert X here]"
2. ❌ Do NOT skip or truncate any sections
3. ❌ Do NOT add multiple id attributes to any element
4. ❌ Do NOT remove or modify any existing id attributes
5. ❌ Do NOT remove any links, tables, or structural elements
6. ❌ Do NOT output markdown or code fences

=== ✅ REQUIRED ===
- Keep ALL id attributes exactly as they are (one per element)
- Preserve all H2, H3, H4 heading text (SEO critical)
- Preserve all links, tables, lists, and [IMAGE: ...] placeholders
- Output ONLY raw HTML - no markdown, no explanations
- Write the COMPLETE article - do not truncate`,

  // ─── 5. META GENERATOR ───────────────────────────────────────────────────
  META_GENERATOR: `You are a CTR optimization specialist. Generate optimized metadata for this article.

Title: "{{TITLE}}"
Primary Keyword: "{{PRIMARY_KEYWORD}}"
Language: {{LANGUAGE}}
Article Preview: {{CONTENT_PREVIEW}}

Generate:
1. SEO Title (50-60 characters, includes primary keyword)
2. Meta Description (150-160 characters, compelling, includes keyword, has a call to action)
3. Keywords/Tags (8-12 relevant keywords/phrases)
4. Excerpt (2-3 sentences for article preview)

Return JSON matching this format:
{
  "metaTitle": "SEO optimized title",
  "metaDescription": "Compelling meta description under 160 chars",
  "metaKeywords": ["keyword1", "keyword2"],
  "excerpt": "Brief article excerpt for previews"
}`,

  // ─── 6. SECTION WRITER (for chunked generation) ─────────────────────────
  SECTION_WRITER: `You are a world-class SEO content writer. Write ONE complete section of an article.

=== CONTEXT ===
Article Title: "{{TITLE}}"
Main Keyword: "{{PRIMARY_KEYWORD}}"
Tone: {{TONE}}
Language: {{LANGUAGE}}

=== SECTION TO WRITE ===
Section Heading: "{{SECTION_HEADING}}"
Section ID (use this exact id): {{SECTION_ID}}
Key Points to Cover:
{{SECTION_POINTS}}
{{SUBSECTIONS}}

=== PREVIOUS CONTENT (for flow continuity) ===
{{PREVIOUS_CONTENT}}

=== REQUIREMENTS ===
1. Start with: <h2 id="{{SECTION_ID}}">{{SECTION_HEADING}}</h2>
2. Write {{TARGET_WORDS}} words minimum for this section
3. Cover ALL the key points listed above thoroughly
4. Use <h3> for any subsections (NO id attribute on H3s)
5. Use <p> for paragraphs, <ul><li> for lists, <strong> for key terms
6. Include [IMAGE: detailed scene description, photorealistic, 4k] if section is 300+ words
7. End with a natural transition to the next section (if not the last section)

=== ⛔ FORBIDDEN ===
- ❌ No placeholder text like "[continue here]" or "[rest of section]"
- ❌ No multiple id attributes on any element
- ❌ No markdown syntax or code fences
- ❌ No meta-commentary like "Here is the section"

=== OUTPUT ===
Output ONLY the raw HTML for this one section. Start directly with the <h2> tag.`,

  // ─── 7. INTRO WRITER (for chunked generation) ──────────────────────────────
  INTRO_WRITER: `You are a world-class SEO content writer. Write a compelling INTRODUCTION for an article.

=== ARTICLE INFO ===
Title: "{{TITLE}}"
Main Keyword: "{{PRIMARY_KEYWORD}}"
Tone: {{TONE}}
Language: {{LANGUAGE}}

=== TOC (output this exact HTML first) ===
{{TOC_HTML}}

=== REQUIREMENTS ===
1. Output the TOC HTML first (exactly as provided above)
2. Add: [IMAGE: professional photorealistic scene related to "{{PRIMARY_KEYWORD}}", bright natural lighting, 4k]
3. Write 150-200 word introduction:
   - Open with a HOOK: bold statement, surprising stat, or relatable scenario
   - State the reader's problem or desire clearly
   - Promise what they will learn
   - Include "{{PRIMARY_KEYWORD}}" naturally within the first 100 words
   - Close with a sentence that flows into the first body section

=== ⛔ FORBIDDEN ===
- ❌ Never start with "In this article..." or similar
- ❌ No placeholder text
- ❌ No markdown or code fences

=== OUTPUT ===
Output the TOC HTML, then the image placeholder, then the introduction paragraphs.`,

  // ─── 8. CONCLUSION WRITER (for chunked generation) ─────────────────────────
  CONCLUSION_WRITER: `You are a world-class SEO content writer. Write a powerful CONCLUSION for an article.

=== ARTICLE INFO ===
Title: "{{TITLE}}"
Main Keyword: "{{PRIMARY_KEYWORD}}"
Tone: {{TONE}}
Language: {{LANGUAGE}}

=== KEY TAKEAWAYS TO SUMMARIZE ===
{{TAKEAWAYS}}

=== FAQ SECTION (output this exact HTML) ===
{{FAQ_HTML}}

=== REQUIREMENTS ===
1. Write 150-200 word conclusion:
   - Summarize the 2-3 most important takeaways
   - Include a specific CTA ("Start by...", "Try this today...", "Share if this helped...")
   - End with a motivating or thought-provoking final sentence
2. After the conclusion, output the FAQ HTML exactly as provided

=== ⛔ FORBIDDEN ===
- ❌ Never use "In conclusion" as opening
- ❌ No placeholder text
- ❌ No markdown or code fences

=== OUTPUT ===
Output the conclusion paragraphs, then the FAQ section HTML.`,

  // ─── 9. IMAGE PROMPT GENERATOR ───────────────────────────────────────────
  IMAGE_FEATURED: `A professional hero photograph showcasing {{PRIMARY_KEYWORD}} as the main subject. Clean, minimal composition with the subject centered against a soft-focus background. Warm, inviting natural lighting coming from the side creates gentle shadows and depth. The scene looks authentic and real — not staged. Shot at eye level, sharp focus on the subject, beautiful background bokeh. Photorealistic, professional photography, 8K resolution. No text, no people, no logos.`,
  IMAGE_CONTENT: `An overhead flat lay photograph of items related to {{PRIMARY_KEYWORD}} or {{CONTEXT}}, artistically arranged on a clean neutral surface. Professional studio photography with soft diffused overhead lighting. Items placed with intentional negative space. Colors are natural and harmonious. Ultra sharp focus across the entire frame. Photorealistic, editorial quality. No text, no watermarks, no faces.`,
};

export function injectVars(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

export function cleanJSON(str: string): string {
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
