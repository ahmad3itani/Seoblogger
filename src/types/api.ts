/**
 * Shared API types for BloggerSEO
 * Fixes TypeScript strict mode `any` violations
 */

// ─── Error Types ────────────────────────────────────────────────────────────────

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as ApiError).message === "string"
  );
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unknown error occurred";
}

// ─── OpenRouter / AI Response Types ─────────────────────────────────────────────

export interface OpenRouterError {
  message: string;
  type?: string;
  code?: string;
  status?: number;
}

// ─── Prisma JSON Field Types ────────────────────────────────────────────────────

export interface OutlineSection {
  heading: string;
  level: number;
  points: string[];
  wordCount?: number;
  subsections?: OutlineSection[];
  featuredSnippetTarget?: "definition" | "list" | "table" | "none";
}

export interface OutlineData {
  sections: OutlineSection[];
  faqs: Array<{ question: string; shortAnswer: string }>;
  suggestedLabels: string[];
  lsiKeywords?: string[];
  totalWordCount: number;
}

export interface ApprovedSource {
  url: string;
  title: string;
  author?: string;
  date?: string;
  domain: string;
  required?: boolean;
  relevance?: number;
  excerpt?: string;
  accessed?: string;
}

export interface CitationUsed {
  sourceUrl: string;
  citationCount: number;
  citedInSections: string[];
}

export interface EditorSuggestion {
  examplesAdded: string[];
  blockquotesAdded: string[];
}

// ─── Agent Types ────────────────────────────────────────────────────────────────

export interface AgentScores {
  overall: number;
  grade: string;
  dimensions: Array<{
    name: string;
    score: number;
    weight?: number;
  }>;
}

export interface AgentMetadata {
  businessType?: string;
  pagesAnalyzed?: number;
  model?: string;
  url?: string;
  [key: string]: string | number | boolean | undefined;
}

// ─── Blogger API Types ──────────────────────────────────────────────────────────

export interface BloggerPost {
  id: string;
  title: string;
  url?: string;
  content?: string;
  published?: string;
  updated?: string;
  labels?: string[];
  status?: string;
}

export interface BloggerPostsResponse {
  items?: BloggerPost[];
  nextPageToken?: string;
}

// ─── Competitor Data Types ──────────────────────────────────────────────────────

export interface CompetitorHeading {
  level: string;
  text: string;
}

export interface CompetitorData {
  title: string;
  description: string;
  headings?: CompetitorHeading[];
  url?: string;
}

// ─── Blog Record Type (for cached posts) ────────────────────────────────────────

export interface BlogRecord {
  id: string;
  blogId: string;
  name: string;
  url: string;
  isDefault: boolean;
}

// ─── Helper for safe JSON parsing ───────────────────────────────────────────────

export function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
