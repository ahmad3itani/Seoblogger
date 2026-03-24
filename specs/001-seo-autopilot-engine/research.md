# Research: SEO Autopilot Engine

**Feature**: 001-seo-autopilot-engine
**Date**: 2026-03-23

## 1. AI Model Selection for Content Analysis

**Decision**: Use `deepseek/deepseek-chat` (fast model) for analysis tasks, following existing pattern.

**Rationale**:
- Existing pattern in `src/lib/ai/client.ts`: DeepSeek for structured JSON tasks (~$0.002/article)
- Content analysis is a structured JSON output task (similar to outline generation)
- 60-second timeout requirement fits DeepSeek's fast response time
- Token output (JSON plan) is well under DeepSeek's limits

**Alternatives Considered**:
- Claude Sonnet: More expensive ($0.09/article), overkill for structured analysis
- Claude Haiku: Good alternative, but DeepSeek is cheaper and established in codebase

## 2. Content Analysis Strategy

**Decision**: Two-phase analysis: (1) Extract topics/categories, (2) Identify gaps via AI.

**Rationale**:
- Phase 1 (deterministic): Extract titles, URLs, categories from `cachedPost` table — no AI needed
- Phase 2 (AI): Send extracted data to AI for gap analysis, keyword expansion, and plan generation
- This minimizes AI token usage by preprocessing data
- Aligns with FR-001 (fetch from cachedPost) and FR-002 (send to AI)

**Approach**:
```typescript
// Phase 1: Data extraction (no AI)
const existingPosts = await prisma.cachedPost.findMany({
  where: { blogId },
  select: { title: true, url: true, publishedAt: true }
});

// Phase 2: AI analysis
const analysisResult = await analyzeContentGaps(existingPosts, options);
```

## 3. Deduplication Strategy

**Decision**: Post-process AI output to deduplicate against existing titles using fuzzy matching.

**Rationale**:
- AI may suggest topics similar to existing posts (FR-005 requires deduplication)
- Levenshtein distance or simple word overlap can detect near-duplicates
- Keep threshold at 70% similarity to catch variations like "Best Coffee Makers 2024" vs "Best Coffee Makers 2025"

**Implementation**:
```typescript
function isDuplicate(suggestion: string, existing: string[]): boolean {
  const normalizedSuggestion = suggestion.toLowerCase().replace(/\d{4}/g, '');
  return existing.some(title => {
    const normalizedTitle = title.toLowerCase().replace(/\d{4}/g, '');
    return calculateSimilarity(normalizedSuggestion, normalizedTitle) > 0.7;
  });
}
```

## 4. Internal Linking Strategy

**Decision**: Match new article keywords against existing post titles using TF-IDF scoring.

**Rationale**:
- FR-009 requires only real existing URLs (no hallucination)
- TF-IDF matching finds topically related posts without AI
- Limit to 2-3 links per article idea (manageable, high-quality)

**Implementation**:
```typescript
function findInternalLinks(keyword: string, existingPosts: Post[]): InternalLink[] {
  const scores = existingPosts.map(post => ({
    post,
    score: calculateRelevance(keyword, post.title)
  }));
  return scores
    .filter(s => s.score > 0.3) // Minimum relevance threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, 3) // Max 3 links per article
    .map(s => ({
      title: s.post.title,
      url: s.post.url,
      anchorText: generateAnchor(keyword, s.post.title)
    }));
}
```

## 5. Output Format for Bulk Generation

**Decision**: Output JSON compatible with existing bulk generation `startBulkJob()` function.

**Rationale**:
- Existing bulk page uses `keywordsInput` (newline-separated keywords)
- Each article idea becomes a keyword line for bulk generation
- User selects ideas → keywords are injected into bulk pipeline
- No changes needed to existing bulk generation API

**Integration Point**:
```typescript
// In AutopilotPanel component
const handleGenerateSelected = () => {
  const keywords = selectedIdeas.map(idea => idea.keyword).join('\n');
  sessionStorage.setItem('bulkKeywords', keywords);
  // Bulk page auto-loads from sessionStorage
};
```

## 6. Session Persistence

**Decision**: Store autopilot results in new `AutopilotSession` table for history/reload.

**Rationale**:
- Users may want to revisit previous analysis results
- Prevents re-running expensive AI analysis
- Aligns with spec's `AutopilotSession` entity requirement

**Schema**:
```prisma
model AutopilotSession {
  id          String   @id @default(cuid())
  userId      String   @db.Uuid
  blogId      String
  language    String   @default("en")
  depthLevel  String   @default("standard") // standard, aggressive
  summary     Json     // { totalArticlesAnalyzed, mainTopics[], weakAreas[] }
  contentPlan Json     // { highPriority[], mediumPriority[], lowPriority[] }
  status      String   @default("completed") // analyzing, completed, failed
  createdAt   DateTime @default(now())
}
```

## 7. Rate Limiting & Usage Quotas

**Decision**: Count autopilot analysis as 1 "article" equivalent for usage tracking.

**Rationale**:
- Autopilot uses significant AI compute (similar to generating an article)
- Prevents abuse of the analysis feature
- Aligns with FR-010 (respect usage quotas)

**Implementation**:
```typescript
// Before running analysis
const usageCheck = await checkUsageLimit(userId, "articles");
if (!usageCheck.allowed) {
  return NextResponse.json({ error: usageCheck.error }, { status: 403 });
}

// After successful analysis
await trackUsage(userId, "article", 1);
```

## 8. Error Handling

**Decision**: Retry AI call once on failure, then return error with "Try Again" button.

**Rationale**:
- Edge case from spec: "What happens when the AI returns invalid JSON?"
- Single retry handles transient failures
- Clear user feedback on persistent failure

**Implementation**:
```typescript
let retries = 0;
while (retries < 2) {
  try {
    const result = await generateContentPlan(posts, options);
    return result;
  } catch (error) {
    retries++;
    if (retries === 2) throw error;
  }
}
```

## 9. AI Prompt Design

**Decision**: Use strict JSON schema in prompt with reality enforcement rules.

**Rationale**:
- Prevents hallucinated URLs, products, data (SC-005, FR-009)
- Forces structured output matching `ArticleIdea` interface
- Includes deduplication instruction to reduce post-processing

**Key Prompt Elements**:
1. Explicit instruction: "DO NOT hallucinate URLs — only reference URLs from the provided list"
2. JSON schema enforcement: "Return ONLY valid JSON matching this exact structure"
3. Reality check: "All keyword suggestions must be realistic and SEO-relevant"
4. Deduplication hint: "Do NOT suggest keywords that overlap with existing titles"

## Summary of Decisions

| Area | Decision | Risk Level |
|------|----------|------------|
| AI Model | DeepSeek for analysis | Low (proven pattern) |
| Analysis Strategy | Two-phase (extract + AI) | Low |
| Deduplication | Fuzzy title matching | Low |
| Internal Linking | TF-IDF keyword matching | Low |
| Bulk Integration | Keywords to sessionStorage | Low (existing pattern) |
| Session Storage | New AutopilotSession model | Low |
| Usage Tracking | 1 analysis = 1 article | Low |
| Error Handling | Single retry + user feedback | Low |
