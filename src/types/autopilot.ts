/**
 * SEO Autopilot Engine Types
 *
 * Types for content analysis, gap finding, and bulk generation planning.
 */

// ─── ENUMS ───────────────────────────────────────────────────

export type SearchIntent = 'informational' | 'commercial' | 'transactional' | 'navigational';
export type Priority = 'high' | 'medium' | 'low';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type DepthLevel = 'standard' | 'aggressive';
export type SessionStatus = 'analyzing' | 'completed' | 'failed';

// ─── INTERNAL LINKING ────────────────────────────────────────

export interface InternalLink {
  /** Existing post title */
  title: string;
  /** Existing post URL (from cachedPost) */
  url: string;
  /** Suggested anchor text */
  anchorText: string;
}

// ─── ARTICLE IDEA ────────────────────────────────────────────

export interface ArticleIdea {
  /** Generated UUID for UI selection */
  id: string;
  /** SEO-optimized title */
  title: string;
  /** Primary target keyword */
  keyword: string;
  /** LSI/related keywords */
  secondaryKeywords: string[];
  /** Search intent classification */
  intent: SearchIntent;
  /** Topic cluster category */
  category: string;
  /** Priority level */
  priority: Priority;
  /** Why this article matters (gap/opportunity) */
  reason: string;
  /** 0-3 suggested internal links */
  internalLinks: InternalLink[];
  /** Estimated difficulty to rank */
  estimatedDifficulty: Difficulty;
}

// ─── CONTENT PLAN ────────────────────────────────────────────

export interface ContentPlan {
  /** Generate first */
  highPriority: ArticleIdea[];
  /** Generate second */
  mediumPriority: ArticleIdea[];
  /** Generate last */
  lowPriority: ArticleIdea[];
}

// ─── CONTENT PLAN SUMMARY ────────────────────────────────────

export interface ContentDistribution {
  category: string;
  count: number;
}

export interface ContentPlanSummary {
  /** Number of existing posts analyzed */
  totalArticlesAnalyzed: number;
  /** Detected topic clusters */
  mainTopics: string[];
  /** Gaps identified */
  weakAreas: string[];
  /** Distribution by category */
  contentDistribution: ContentDistribution[];
}

// ─── AUTOPILOT SESSION ───────────────────────────────────────

export interface AutopilotSession {
  id: string;
  userId: string;
  blogId: string;
  blogName: string;
  postsAnalyzed: number;
  language: string;
  niche: string | null;
  depthLevel: DepthLevel;
  summary: ContentPlanSummary;
  contentPlan: ContentPlan;
  status: SessionStatus;
  errorMessage: string | null;
  durationMs: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── API REQUEST/RESPONSE TYPES ──────────────────────────────

export interface AnalyzeRequest {
  /** Required: Blog to analyze */
  blogId: string;
  /** Default: "en" */
  language?: string;
  /** Optional: Niche context for better suggestions */
  niche?: string;
  /** Default: "standard" */
  depthLevel?: DepthLevel;
}

export interface AnalyzeResponse {
  success: true;
  /** ID for retrieving this session later */
  sessionId: string;
  summary: ContentPlanSummary;
  contentPlan: ContentPlan;
  /** Analysis duration in milliseconds */
  durationMs: number;
}

export interface AnalyzeErrorResponse {
  success: false;
  error: string;
  /** True if usage limit exceeded */
  usageLimit?: boolean;
  /** Seconds until rate limit resets */
  retryAfter?: number;
}

export interface SessionsResponse {
  success: true;
  sessions: SessionListItem[];
}

export interface SessionListItem {
  id: string;
  blogId: string;
  blogName: string;
  postsAnalyzed: number;
  depthLevel: string;
  status: string;
  createdAt: string;
  articleIdeasCount: number;
}

// ─── CACHED POST (FOR ANALYSIS INPUT) ────────────────────────

export interface CachedPostForAnalysis {
  id: string;
  postId: string;
  blogId: string;
  title: string;
  url: string;
  contentHash: string | null;
  publishedAt: Date | null;
}

// ─── ANALYSIS INTERMEDIATE TYPES ─────────────────────────────

export interface AnalyzedPost {
  title: string;
  url: string;
  topics: string[];
  categories: string[];
  keywords: string[];
}

export interface GapAnalysisResult {
  missingKeywords: string[];
  weakAreas: string[];
  opportunities: string[];
}

export interface KeywordExpansion {
  keyword: string;
  intent: SearchIntent;
  difficulty: Difficulty;
  relatedToCategory: string;
}
