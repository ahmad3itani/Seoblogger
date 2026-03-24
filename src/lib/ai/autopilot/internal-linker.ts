/**
 * SEO Autopilot Engine - Internal Link Matcher
 *
 * Matches new article keywords against existing post titles using TF-IDF scoring.
 * Per research.md Decision #4: Limit to 2-3 links per article, minimum 0.3 relevance.
 */

import type { InternalLink, CachedPostForAnalysis } from '@/types/autopilot';

// ─── CONFIG ──────────────────────────────────────────────────

const MAX_LINKS_PER_ARTICLE = 3;
const MIN_RELEVANCE_THRESHOLD = 0.3;

// ─── PUBLIC API ──────────────────────────────────────────────

/**
 * Find internal linking opportunities for a keyword
 */
export function findInternalLinks(
  keyword: string,
  existingPosts: CachedPostForAnalysis[]
): InternalLink[] {
  if (!keyword || existingPosts.length === 0) {
    return [];
  }

  // Calculate relevance scores for all posts
  const scoredPosts = existingPosts.map((post) => ({
    post,
    score: calculateRelevance(keyword, post.title),
  }));

  // Filter by threshold and sort by score
  const relevantPosts = scoredPosts
    .filter((s) => s.score >= MIN_RELEVANCE_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_LINKS_PER_ARTICLE);

  // Convert to InternalLink format
  return relevantPosts.map((s) => ({
    title: s.post.title,
    url: s.post.url,
    anchorText: generateAnchorText(keyword, s.post.title),
  }));
}

/**
 * Batch find internal links for multiple keywords
 */
export function findInternalLinksForKeywords(
  keywords: string[],
  existingPosts: CachedPostForAnalysis[]
): Map<string, InternalLink[]> {
  const results = new Map<string, InternalLink[]>();

  // Pre-compute TF-IDF vectors for all posts
  const postVectors = buildTfIdfVectors(existingPosts.map((p) => p.title));

  for (const keyword of keywords) {
    const links = findInternalLinksWithVectors(keyword, existingPosts, postVectors);
    results.set(keyword, links);
  }

  return results;
}

/**
 * Validate that all internal links reference real existing URLs
 */
export function validateInternalLinks(
  links: InternalLink[],
  existingPosts: CachedPostForAnalysis[]
): InternalLink[] {
  const validUrls = new Set(existingPosts.map((p) => p.url));

  return links.filter((link) => {
    if (!validUrls.has(link.url)) {
      console.warn(`⚠️ Invalid internal link URL: ${link.url}`);
      return false;
    }
    return true;
  });
}

// ─── TF-IDF IMPLEMENTATION ───────────────────────────────────

interface TfIdfVector {
  terms: Map<string, number>;
  magnitude: number;
}

/**
 * Build TF-IDF vectors for a collection of documents (titles)
 */
function buildTfIdfVectors(documents: string[]): TfIdfVector[] {
  // Calculate document frequency for each term
  const documentFrequency = new Map<string, number>();
  const tokenizedDocs = documents.map((doc) => tokenize(doc));

  for (const tokens of tokenizedDocs) {
    const uniqueTokens = new Set(tokens);
    for (const token of uniqueTokens) {
      documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
    }
  }

  const n = documents.length;

  // Build TF-IDF vector for each document
  return tokenizedDocs.map((tokens) => {
    const termFrequency = new Map<string, number>();
    for (const token of tokens) {
      termFrequency.set(token, (termFrequency.get(token) || 0) + 1);
    }

    const terms = new Map<string, number>();
    let magnitude = 0;

    for (const [term, tf] of termFrequency) {
      const df = documentFrequency.get(term) || 1;
      const idf = Math.log(n / df);
      const tfidf = tf * idf;
      terms.set(term, tfidf);
      magnitude += tfidf * tfidf;
    }

    return {
      terms,
      magnitude: Math.sqrt(magnitude),
    };
  });
}

/**
 * Find internal links using pre-computed TF-IDF vectors
 */
function findInternalLinksWithVectors(
  keyword: string,
  existingPosts: CachedPostForAnalysis[],
  postVectors: TfIdfVector[]
): InternalLink[] {
  const keywordTokens = tokenize(keyword);
  const keywordSet = new Set(keywordTokens);

  const scores = existingPosts.map((post, idx) => {
    const vector = postVectors[idx];
    let score = 0;

    // Calculate cosine similarity with keyword
    for (const token of keywordSet) {
      score += vector.terms.get(token) || 0;
    }

    // Normalize by vector magnitude
    if (vector.magnitude > 0) {
      score = score / vector.magnitude;
    }

    return { post, score };
  });

  return scores
    .filter((s) => s.score >= MIN_RELEVANCE_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_LINKS_PER_ARTICLE)
    .map((s) => ({
      title: s.post.title,
      url: s.post.url,
      anchorText: generateAnchorText(keyword, s.post.title),
    }));
}

// ─── RELEVANCE CALCULATION ───────────────────────────────────

/**
 * Calculate relevance between keyword and post title (0-1)
 */
function calculateRelevance(keyword: string, title: string): number {
  const keywordTokens = tokenize(keyword);
  const titleTokens = tokenize(title);

  if (keywordTokens.length === 0 || titleTokens.length === 0) {
    return 0;
  }

  const titleSet = new Set(titleTokens);

  // Count matching tokens
  let matches = 0;
  for (const token of keywordTokens) {
    if (titleSet.has(token)) {
      matches++;
    }
  }

  // Calculate Jaccard-like similarity
  const similarity = matches / keywordTokens.length;

  // Boost for exact phrase matches
  const keywordLower = keyword.toLowerCase();
  const titleLower = title.toLowerCase();
  if (titleLower.includes(keywordLower)) {
    return Math.min(1, similarity + 0.3);
  }

  return similarity;
}

// ─── ANCHOR TEXT GENERATION ──────────────────────────────────

/**
 * Generate suggested anchor text for internal link
 */
function generateAnchorText(keyword: string, postTitle: string): string {
  const keywordTokens = tokenize(keyword);
  const titleTokens = tokenize(postTitle);

  // Find overlapping terms to use as anchor
  const overlap = keywordTokens.filter((t) => titleTokens.includes(t));

  if (overlap.length >= 2) {
    // Use overlapping terms as anchor
    return overlap.join(' ');
  }

  // Fall back to first 3-5 words of title
  const words = postTitle.split(' ').slice(0, 4);
  return words.join(' ').toLowerCase();
}

// ─── TOKENIZATION ────────────────────────────────────────────

/**
 * Tokenize text into normalized words
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter((token) => token.length > 2) // Filter short words
    .filter((token) => !STOP_WORDS.has(token));
}

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'up',
  'about',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'between',
  'under',
  'again',
  'further',
  'then',
  'once',
  'here',
  'there',
  'when',
  'where',
  'why',
  'how',
  'all',
  'each',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'only',
  'own',
  'same',
  'so',
  'than',
  'too',
  'very',
  'can',
  'will',
  'just',
  'should',
  'now',
  'your',
  'our',
  'their',
  'this',
  'that',
  'these',
  'those',
  'what',
  'which',
  'who',
  'whom',
  'are',
  'is',
  'was',
  'were',
  'been',
  'being',
  'have',
  'has',
  'had',
  'having',
  'does',
  'did',
  'doing',
]);
