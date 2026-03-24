/**
 * SEO Autopilot Engine - AI Prompts
 *
 * Prompts for content analysis, gap finding, and plan generation.
 * Uses DeepSeek (fast model) per research.md Decision #1.
 */

import type { DepthLevel, SearchIntent, Priority, Difficulty } from '@/types/autopilot';

// ─── CONTENT ANALYSIS PROMPT ─────────────────────────────────

export function buildContentAnalysisPrompt(
  posts: { title: string; url: string }[],
  options: {
    language: string;
    niche?: string;
  }
): string {
  const postList = posts.map((p, i) => `${i + 1}. "${p.title}"`).join('\n');
  const nicheContext = options.niche ? `The blog is in the "${options.niche}" niche.` : '';

  return `You are an expert SEO content analyst. Analyze the following existing blog posts and extract key insights.

${nicheContext}
Language: ${options.language}

EXISTING POSTS (${posts.length} total):
${postList}

TASK: Analyze these posts and return a JSON object with:
1. mainTopics: Array of 3-7 main topic clusters covered
2. categories: Array of content categories detected
3. contentDistribution: How content is distributed across categories
4. strengths: What topics are well-covered
5. weakAreas: What topics are missing or underserved

Return ONLY valid JSON:
{
  "mainTopics": ["topic1", "topic2"],
  "categories": ["category1", "category2"],
  "contentDistribution": [
    {"category": "category1", "count": 5},
    {"category": "category2", "count": 3}
  ],
  "strengths": ["strength1", "strength2"],
  "weakAreas": ["weakness1", "weakness2"]
}`;
}

// ─── GAP ANALYSIS PROMPT ─────────────────────────────────────

export function buildGapAnalysisPrompt(
  analysis: {
    mainTopics: string[];
    categories: string[];
    weakAreas: string[];
  },
  existingTitles: string[],
  options: {
    language: string;
    niche?: string;
  }
): string {
  const nicheContext = options.niche ? `Niche: ${options.niche}` : '';
  const titleList = existingTitles.slice(0, 50).join('\n- ');

  return `You are an expert SEO strategist identifying content gaps and opportunities.

${nicheContext}
Language: ${options.language}

CURRENT CONTENT PROFILE:
- Main Topics: ${analysis.mainTopics.join(', ')}
- Categories: ${analysis.categories.join(', ')}
- Identified Weak Areas: ${analysis.weakAreas.join(', ')}

EXISTING TITLES (for deduplication):
- ${titleList}

TASK: Identify content gaps and keyword opportunities. Consider:
1. Missing subtopics within existing categories
2. Related topics not yet covered
3. Buyer-intent keywords (commercial/transactional)
4. Long-tail variations of existing topics
5. Trending topics in this niche

IMPORTANT RULES:
- DO NOT suggest keywords that overlap with existing titles (>70% similar)
- Focus on realistic, searchable keywords
- Consider search volume potential

Return ONLY valid JSON:
{
  "missingKeywords": ["keyword1", "keyword2"],
  "weakAreas": ["area1", "area2"],
  "opportunities": [
    {"keyword": "...", "reason": "...", "potentialTraffic": "high|medium|low"}
  ]
}`;
}

// ─── CONTENT PLAN GENERATION PROMPT ──────────────────────────

export function buildContentPlanPrompt(
  existingPosts: { title: string; url: string }[],
  gapAnalysis: {
    missingKeywords: string[];
    weakAreas: string[];
    opportunities: { keyword: string; reason: string }[];
  },
  options: {
    language: string;
    niche?: string;
    depthLevel: DepthLevel;
  }
): string {
  const nicheContext = options.niche ? `Niche: ${options.niche}` : '';
  const existingUrls = existingPosts.map(p => `- ${p.title}: ${p.url}`).join('\n');

  // Depth level determines how many articles to suggest
  const articleCount = options.depthLevel === 'aggressive' ? '40-50' : '20-30';
  const priorityDistribution = options.depthLevel === 'aggressive'
    ? 'high: 15-20, medium: 15-20, low: 10-15'
    : 'high: 8-10, medium: 8-12, low: 5-8';

  return `You are an elite SEO content strategist creating a comprehensive content plan.

${nicheContext}
Language: ${options.language}
Depth Level: ${options.depthLevel} (generate ${articleCount} article ideas)

GAP ANALYSIS FINDINGS:
Missing Keywords: ${gapAnalysis.missingKeywords.join(', ')}
Weak Areas: ${gapAnalysis.weakAreas.join(', ')}
Top Opportunities: ${gapAnalysis.opportunities.slice(0, 10).map(o => o.keyword).join(', ')}

EXISTING POSTS (for internal linking - use ONLY these URLs):
${existingUrls}

TASK: Create a prioritized content plan with ${articleCount} unique article ideas.

Priority Distribution: ${priorityDistribution}

For EACH article idea, provide:
1. id: Unique identifier (format: "idea-001", "idea-002", etc.)
2. title: SEO-optimized title (30-70 characters)
3. keyword: Primary target keyword
4. secondaryKeywords: 2-3 LSI/related keywords
5. intent: "informational" | "commercial" | "transactional" | "navigational"
6. category: Topic cluster category
7. priority: "high" | "medium" | "low"
8. reason: Why this article matters (10-100 chars)
9. internalLinks: 0-3 related existing posts (ONLY from the list above!)
10. estimatedDifficulty: "easy" | "medium" | "hard"

CRITICAL RULES:
- DO NOT hallucinate URLs — only reference URLs from the EXISTING POSTS list above
- All keywords must be unique and realistic
- Titles should be SEO-optimized but natural
- InternalLinks must reference REAL existing posts with their EXACT URLs
- If no relevant internal link exists, use empty array []

Return ONLY valid JSON matching this structure:
{
  "highPriority": [
    {
      "id": "idea-001",
      "title": "SEO-optimized title here",
      "keyword": "primary keyword",
      "secondaryKeywords": ["lsi1", "lsi2"],
      "intent": "informational",
      "category": "Category Name",
      "priority": "high",
      "reason": "Brief reason for priority",
      "internalLinks": [
        {"title": "Existing Post Title", "url": "https://exact-url-from-list.com/post", "anchorText": "suggested anchor"}
      ],
      "estimatedDifficulty": "medium"
    }
  ],
  "mediumPriority": [],
  "lowPriority": []
}`;
}

// ─── INTERNAL LINK SUGGESTION PROMPT ─────────────────────────

export function buildInternalLinkPrompt(
  articleKeyword: string,
  existingPosts: { title: string; url: string }[]
): string {
  const postList = existingPosts.map(p => `- "${p.title}": ${p.url}`).join('\n');

  return `Find the most relevant existing posts to link to for an article about "${articleKeyword}".

EXISTING POSTS:
${postList}

Select 0-3 posts that are topically related and would make good internal links.
For each selected post, suggest an anchor text phrase.

Return ONLY valid JSON:
{
  "links": [
    {"title": "Post Title", "url": "exact-url", "anchorText": "suggested anchor text"}
  ]
}

If no relevant posts exist, return: {"links": []}`;
}

// ─── JSON SCHEMA DEFINITIONS ─────────────────────────────────

export const ARTICLE_IDEA_SCHEMA = {
  type: 'object',
  required: ['id', 'title', 'keyword', 'intent', 'category', 'priority', 'reason', 'estimatedDifficulty'],
  properties: {
    id: { type: 'string' },
    title: { type: 'string', minLength: 30, maxLength: 70 },
    keyword: { type: 'string' },
    secondaryKeywords: { type: 'array', items: { type: 'string' } },
    intent: { type: 'string', enum: ['informational', 'commercial', 'transactional', 'navigational'] },
    category: { type: 'string' },
    priority: { type: 'string', enum: ['high', 'medium', 'low'] },
    reason: { type: 'string', minLength: 10, maxLength: 100 },
    internalLinks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          url: { type: 'string' },
          anchorText: { type: 'string' }
        }
      }
    },
    estimatedDifficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] }
  }
} as const;

export const CONTENT_PLAN_SCHEMA = {
  type: 'object',
  required: ['highPriority', 'mediumPriority', 'lowPriority'],
  properties: {
    highPriority: { type: 'array', items: ARTICLE_IDEA_SCHEMA },
    mediumPriority: { type: 'array', items: ARTICLE_IDEA_SCHEMA },
    lowPriority: { type: 'array', items: ARTICLE_IDEA_SCHEMA }
  }
} as const;
