import { openai, getModelForPlan } from "./client";

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

// ─── AI-ASSISTED SECTION GENERATION ──────────────────────────────────────────

export interface SectionSuggestion {
    heading: string;
    level: number;
    points: string[];
    wordCount: number;
    subsections?: SectionSuggestion[];
}

export async function generateSectionSuggestions(
    keyword: string,
    existingSections: string[],
    articleType: string,
    niche: string,
    userPlan?: string
): Promise<SectionSuggestion[]> {
    const model = getModelForPlan(userPlan);

    const prompt = `You are an SEO content strategist. Suggest 3-5 additional sections that would improve this article.

Primary Keyword: ${keyword}
Article Type: ${articleType}
Niche: ${niche}
Existing Sections:
${existingSections.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Suggest sections that:
- Fill content gaps
- Target related search queries
- Improve SEO coverage
- Add value for readers
- Include H3 subsections for depth

Return ONLY valid JSON array:
[
  {
    "heading": "Section Title",
    "level": 2,
    "points": ["key point 1", "key point 2"],
    "wordCount": 300,
    "subsections": [
      { "heading": "Subsection H3", "level": 3, "points": ["detail 1"] }
    ]
  }
]`;

    const response = await openai.chat.completions.create({
        model: model,
        messages: [
            { role: "system", content: "You are an expert SEO content strategist. Output only valid JSON." },
            { role: "user", content: prompt },
        ],
        temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "[]";
    try {
        return JSON.parse(cleanJSON(content));
    } catch {
        return [];
    }
}

// ─── AI-ASSISTED FAQ GENERATION ──────────────────────────────────────────────

export interface FAQSuggestion {
    question: string;
    answer: string;
}

export async function generateFAQSuggestions(
    keyword: string,
    articleSummary: string,
    niche: string,
    userPlan?: string
): Promise<FAQSuggestion[]> {
    const model = getModelForPlan(userPlan);

    const prompt = `Generate 5-8 frequently asked questions related to this topic.

Primary Keyword: ${keyword}
Niche: ${niche}
Article Summary: ${articleSummary}

Generate questions that:
- People actually search for
- Are directly related to the keyword
- Have clear, concise answers
- Target featured snippet opportunities
- Use natural language

Return ONLY valid JSON array:
[
  { "question": "What is...?", "answer": "Brief answer in 2-3 sentences." }
]`;

    const response = await openai.chat.completions.create({
        model: model,
        messages: [
            { role: "system", content: "You are an SEO expert. Output only valid JSON." },
            { role: "user", content: prompt },
        ],
        temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "[]";
    try {
        return JSON.parse(cleanJSON(content));
    } catch {
        return [];
    }
}

// ─── AI-ASSISTED OUTLINE EXPANSION ──────────────────────────────────────────

export async function expandOutlineSection(
    sectionHeading: string,
    keyword: string,
    niche: string,
    userPlan?: string
): Promise<SectionSuggestion> {
    const model = getModelForPlan(userPlan);

    const prompt = `Expand this outline section with detailed subsections.

Section Heading: ${sectionHeading}
Primary Keyword: ${keyword}
Niche: ${niche}

Create:
- 3-4 H3 subsections
- 1-2 H4 subsections under some H3s
- Key points for each subsection
- Word count estimates

Return ONLY valid JSON:
{
  "heading": "${sectionHeading}",
  "level": 2,
  "points": ["main point 1", "main point 2"],
  "wordCount": 400,
  "subsections": [
    {
      "heading": "H3 Subsection",
      "level": 3,
      "points": ["detail 1", "detail 2"],
      "subsections": [
        { "heading": "H4 Detail", "level": 4, "points": ["specific point"] }
      ]
    }
  ]
}`;

    const response = await openai.chat.completions.create({
        model: model,
        messages: [
            { role: "system", content: "You are an SEO content strategist. Output only valid JSON." },
            { role: "user", content: prompt },
        ],
        temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "{}";
    try {
        return JSON.parse(cleanJSON(content));
    } catch {
        return {
            heading: sectionHeading,
            level: 2,
            points: [],
            wordCount: 200,
        };
    }
}

// ─── AI-ASSISTED CONTENT IMPROVEMENT ────────────────────────────────────────

export async function improveSection(
    sectionContent: string,
    keyword: string,
    improvementType: "expand" | "simplify" | "add-examples" | "add-data",
    userPlan?: string
): Promise<string> {
    const model = getModelForPlan(userPlan);

    const instructions = {
        expand: "Expand this section with more details, examples, and explanations. Add 50-100% more content.",
        simplify: "Simplify this section for better readability. Use shorter sentences and clearer language.",
        "add-examples": "Add 2-3 real-world examples to illustrate the points in this section.",
        "add-data": "Add relevant statistics, data points, or research findings to support the claims.",
    };

    const prompt = `${instructions[improvementType]}

Keyword: ${keyword}
Current Content:
${sectionContent}

Return ONLY the improved HTML content. Use <p>, <h3>, <h4>, <ul>, <ol>, <li>, <strong>, <em> tags.`;

    const response = await openai.chat.completions.create({
        model: model,
        messages: [
            { role: "system", content: "You are an expert content writer. Output only HTML." },
            { role: "user", content: prompt },
        ],
        temperature: 0.7,
    });

    return response.choices[0]?.message?.content || sectionContent;
}
