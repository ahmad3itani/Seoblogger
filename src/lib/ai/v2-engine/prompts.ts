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

STEP 2 - FEATURED SNIPPET (right after TOC, BEFORE introduction):
<p><strong>[Direct answer to "{{PRIMARY_KEYWORD}}" query in 40-60 words]</strong></p>
This targets Google's Position 0 featured snippet. Must be clear, direct, standalone answer.

STEP 3 - FEATURED IMAGE PLACEHOLDER (right after featured snippet):
[IMAGE: professional photorealistic scene related to "{{PRIMARY_KEYWORD}}", bright natural lighting, 4k]

STEP 4 - INTRODUCTION (150-200 words)
- Open with a HOOK: bold statement, surprising stat, or relatable scenario. NOT "In this article..."
- State the reader's problem or desire clearly
- Promise what they will learn
- Include "{{PRIMARY_KEYWORD}}" naturally within the first 100 words
- Close with a sentence that flows into the first section

STEP 5 - BODY SECTIONS (minimum 5 H2 sections)
For EACH section in the outline:
- Write the H2 with ONLY ONE id attribute: <h2 id="the-slug">Heading Text</h2>
- Make H2 headings KEYWORD-OPTIMIZED and clickable (e.g., instead of "What Makes a Smartphone the Best" → "What Makes the Best Smartphone in 2026?")
- Do NOT add multiple id attributes to any element
- Use <h3> for subsections (NO id attribute on H3s)
- Write expert content: real examples, statistics, comparisons, actionable advice
- MINIMUM 200 words per H2 section - write fully, do not skimp
- Each H2 must include at least ONE actionable takeaway
- Use <p> for paragraphs, <ul><li> for lists, <strong> for key terms on first mention
- Insert [IMAGE: detailed scene description, photorealistic, 4k] every 350-400 words (minimum 4 images total)

--- ENGAGEMENT TRIGGERS (sprinkle THROUGHOUT all body sections) ---
- Rhetorical hooks: "So which one should you pick?", "Is it really worth it?", "Here's what most people get wrong…"
- Conversational asides: "And this is where things get interesting…", "Bet you didn't expect that."
- Micro-opinions: "Honestly? This one surprised me.", "I wouldn't recommend this unless…"
- Mix sentence rhythm: short punchy + longer. "Not perfect. But honestly? It's close."
- Provocative: "Most guides won't tell you this, but…"

--- ENTITY SEO (MANDATORY for semantic ranking) ---
- Mention specific technical entities deeply: model numbers, chipsets (e.g., Snapdragon 8 Gen 3, Apple A17 Pro), software versions
- Don't just name-drop — explain WHY the entity matters
- Reference ecosystems: Android vs iOS, Windows vs macOS, etc. when relevant

STEP 6 - MONETIZATION SECTION (MANDATORY — this is how you make money):
<h2 id="best-[keyword-slug]">Best [Keyword] to Buy in 2026</h2>
List 3-5 REAL, CURRENTLY AVAILABLE products. For EACH product:
<h3>[Product Name]</h3>
<p><strong>Short review:</strong> 2-3 sentences of honest assessment</p>
<p><strong>Key feature:</strong> The ONE thing that sets it apart</p>
<p><strong>Best for:</strong> [specific use case — gaming, photography, budget, etc.]</p>
ALL products MUST be real and currently for sale.

STEP 7 - INTENT MATCH SECTION (MANDATORY — Google loves this):
<h2 id="[keyword-slug]-by-use-case">[Keyword] by Use Case</h2>
<ul>
<li><strong>Best for gaming:</strong> [Product] — [why]</li>
<li><strong>Best for photography:</strong> [Product] — [why]</li>
<li><strong>Best for battery life:</strong> [Product] — [why]</li>
<li><strong>Best for budget:</strong> [Product] — [why]</li>
</ul>

STEP 8 - COMPARISON SECTION (MANDATORY when topic involves options):
Use <table> format with specs/features. Minimum 3 columns, 4+ rows.
AFTER the table, add clear winner logic:
<h3>Which One Should You Choose?</h3>
<ul>
<li><strong>Best overall:</strong> [Product] — [reason]</li>
<li><strong>Best for [use case]:</strong> [Product] — [reason]</li>
<li><strong>Best value:</strong> [Product] — [reason]</li>
</ul>

STEP 9 - FAQ SECTION (use this exact structure - the H2 has id="faq"):
<div class="faq-section" itemscope itemtype="https://schema.org/FAQPage">
  <h2 id="faq">Frequently Asked Questions</h2>
{{FAQ_HTML}}
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

=== ⛔ FORBIDDEN - INSTANT FAILURE ===
You MUST NOT do any of the following:
1. ❌ Placeholder text: "[Rest of content...]", "[insert X here]", "[continue with...]", "...remains unchanged", "same as before"
2. ❌ Skipping sections: You must write EVERY section in full - no shortcuts
3. ❌ Multiple id attributes: NEVER write id="x" id="y" on same element
4. ❌ Stopping early: Write the FULL article from start to conclusion
5. ❌ Generic filler: "Furthermore", "Moreover", "Additionally", "It is important to note", "In today's world", "In conclusion"
6. ❌ Markdown: No triple backticks, no markdown syntax
7. ❌ Meta-commentary: No "Here is the article" or explanations before/after
8. ❌ Fake/speculative tech: No unreleased products, no invented features, no futuristic claims
9. ❌ Thin sections: Each H2 MUST have 150-300 words of real content with actionable insights

=== HUMANIZER (LEVEL 10 — MANDATORY) ===
- Contractions everywhere (don't, it's, you'll, can't, won't)
- Micro-opinions: "I'd pick this over...", "Honestly, this surprised me", "I wouldn't recommend this unless…"
- One-word impact: "Seriously." "Worth it." "Not even close." "Game over."
- Short punchy + longer: "Not perfect. But honestly? It's close."
- Parenthetical asides (like this — they feel human), sentence fragments, rhetorical questions
- Start some paragraphs with "Look," or "Thing is," or "Real talk:"
- NO uniform sentence length, NO predictable paragraph rhythm
- Vary paragraph length: some 1-2 sentences, some 3-4 — never uniform

=== MASTER ENFORCEMENT — FINAL QUALITY CONTROL ===
Before output, verify ALL:
1. Article is FULL (no placeholders, no "rest of article" text)
2. At least 5 H2 body sections with 150-300 words each
3. Featured snippet exists after TOC
4. TOC has 5+ items, excludes FAQ and Conclusion, headings are keyword-optimized
5. Minimum 4 [IMAGE: ...] placeholders with detailed descriptions
6. Monetization section with real products (each has: review, key feature, best-for)
7. Intent-match / use-case section exists
8. Comparison section has winner logic ("Which One Should You Choose?")
9. Content is 100% realistic
10. Human tone verified — engagement triggers throughout, varied rhythm
11. Conclusion has SPECIFIC product recommendations + clear CTA
12. Entity SEO: specific model names, chipsets, ecosystems mentioned
IF ANY CHECK FAILS → REWRITE ENTIRE ARTICLE

=== ✅ REQUIRED OUTPUT ===
- Output ONLY raw HTML starting with the TOC div
- Every H2 has exactly ONE id attribute matching the outline
- H3 elements have NO id attribute
- Write at least {{WORD_COUNT}} words total
- Complete article from TOC to conclusion
- For Blogger use ONLY: <p> <h2> <h3> <h4> <ul> <ol> <li> <table> <thead> <tbody> <tr> <th> <td> <strong> <em> <a> <blockquote> <figure> <figcaption>
{{EXTRA_INSTRUCTIONS}}`,

  // ─── 4. HUMANIZER PASS ───────────────────────────────────────────────────
  ARTICLE_HUMANIZER: `You are an expert editor and content humanizer. Your task is to rewrite this article to sound 100% human-written and UNDETECTABLE as AI.

ARTICLE HTML TO REWRITE:
{{ARTICLE_HTML}}

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

=== ⛔ FORBIDDEN ===
1. ❌ Do NOT add placeholder text like "[Rest of content...]" or "[insert X here]"
2. ❌ Do NOT skip or truncate any sections
3. ❌ Do NOT add multiple id attributes to any element
4. ❌ Do NOT remove or modify any existing id attributes
5. ❌ Do NOT remove any links, tables, or structural elements
6. ❌ Do NOT output markdown or code fences
7. ❌ Do NOT use AI-tell phrases: "game-changer", "revolutionary", "cutting-edge", "robust", "leverage", "utilize"

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
