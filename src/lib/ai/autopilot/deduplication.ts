/**
 * SEO Autopilot Engine - Deduplication Utility
 *
 * Fuzzy title matching to prevent suggesting topics too similar to existing posts.
 * Uses Levenshtein distance and word overlap per research.md Decision #3.
 */

import type { ArticleIdea } from '@/types/autopilot';

// ─── SIMILARITY THRESHOLD ────────────────────────────────────
// Per research.md: Keep threshold at 70% to catch variations

const SIMILARITY_THRESHOLD = 0.7;

// ─── PUBLIC API ──────────────────────────────────────────────

/**
 * Check if a suggested keyword/title is too similar to existing posts
 */
export function isDuplicate(suggestion: string, existingTitles: string[]): boolean {
  const normalizedSuggestion = normalizeTitle(suggestion);

  return existingTitles.some((title) => {
    const normalizedTitle = normalizeTitle(title);
    const similarity = calculateSimilarity(normalizedSuggestion, normalizedTitle);
    return similarity > SIMILARITY_THRESHOLD;
  });
}

/**
 * Filter out duplicate ideas from a list
 */
export function deduplicateIdeas(
  ideas: ArticleIdea[],
  existingTitles: string[]
): ArticleIdea[] {
  const seenKeywords = new Set<string>();
  const normalizedExisting = existingTitles.map(normalizeTitle);

  return ideas.filter((idea) => {
    // Check against existing titles
    const normalizedKeyword = normalizeTitle(idea.keyword);
    const normalizedTitle = normalizeTitle(idea.title);

    // Check for duplicates against existing content
    const isDuplicateOfExisting = normalizedExisting.some(
      (existing) =>
        calculateSimilarity(normalizedKeyword, existing) > SIMILARITY_THRESHOLD ||
        calculateSimilarity(normalizedTitle, existing) > SIMILARITY_THRESHOLD
    );

    if (isDuplicateOfExisting) {
      console.log(`🗑️ Removing duplicate: "${idea.keyword}" (similar to existing)`);
      return false;
    }

    // Check for duplicates within the new ideas
    if (seenKeywords.has(normalizedKeyword)) {
      console.log(`🗑️ Removing duplicate: "${idea.keyword}" (duplicate in suggestions)`);
      return false;
    }

    seenKeywords.add(normalizedKeyword);
    return true;
  });
}

/**
 * Find similar ideas between two lists (for merging sessions)
 */
export function findSimilarIdeas(
  newIdeas: ArticleIdea[],
  existingIdeas: ArticleIdea[]
): { idea: ArticleIdea; similarTo: ArticleIdea }[] {
  const similar: { idea: ArticleIdea; similarTo: ArticleIdea }[] = [];

  for (const newIdea of newIdeas) {
    for (const existingIdea of existingIdeas) {
      const similarity = calculateSimilarity(
        normalizeTitle(newIdea.keyword),
        normalizeTitle(existingIdea.keyword)
      );
      if (similarity > SIMILARITY_THRESHOLD) {
        similar.push({ idea: newIdea, similarTo: existingIdea });
        break;
      }
    }
  }

  return similar;
}

// ─── NORMALIZATION ───────────────────────────────────────────

/**
 * Normalize title for comparison:
 * - Lowercase
 * - Remove years (2024, 2025, etc.)
 * - Remove common words
 * - Trim whitespace
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\d{4}/g, '') // Remove years
    .replace(/\b(best|top|guide|how|to|the|a|an|for|of|in|on|with|your|our)\b/g, '') // Remove common words
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
}

// ─── SIMILARITY CALCULATION ──────────────────────────────────

/**
 * Calculate similarity between two strings (0-1)
 * Uses a combination of:
 * 1. Word overlap (Jaccard similarity)
 * 2. Levenshtein distance ratio
 */
export function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;

  // Word overlap (Jaccard similarity)
  const wordsA = new Set(a.split(' ').filter(Boolean));
  const wordsB = new Set(b.split(' ').filter(Boolean));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);

  const jaccardSimilarity = intersection.size / union.size;

  // Levenshtein distance ratio
  const maxLen = Math.max(a.length, b.length);
  const distance = levenshteinDistance(a, b);
  const levenshteinRatio = 1 - distance / maxLen;

  // Weighted average (favor word overlap for SEO keywords)
  return jaccardSimilarity * 0.6 + levenshteinRatio * 0.4;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // Deletion
        matrix[i][j - 1] + 1, // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      );
    }
  }

  return matrix[a.length][b.length];
}
