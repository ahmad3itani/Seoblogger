/**
 * SEO Autopilot Engine - Plan Generator
 *
 * Orchestrates the full autopilot analysis flow:
 * 1. Analyze existing content
 * 2. Find content gaps
 * 3. Generate content plan with AI
 * 4. Deduplicate suggestions
 * 5. Add internal links
 *
 * Per research.md: Uses DeepSeek fast model, single retry on failure.
 */

import { getOpenAIClient, getFastModel } from '../client';
import { buildContentPlanPrompt } from './prompts';
import { analyzeExistingContent, buildContentSummary } from './analyzer';
import { findContentGaps, type GapAnalysisResult } from './gap-finder';
import { deduplicateIdeas } from './deduplication';
import { findInternalLinks, validateInternalLinks } from './internal-linker';
import type {
  ContentPlan,
  ContentPlanSummary,
  ArticleIdea,
  DepthLevel,
  CachedPostForAnalysis,
} from '@/types/autopilot';

// ─── CONFIG ──────────────────────────────────────────────────

const MAX_RETRIES = 2; // Per research.md: single retry on failure

// ─── TYPES ───────────────────────────────────────────────────

export interface PlanGeneratorOptions {
  language: string;
  niche?: string;
  depthLevel: DepthLevel;
}

export interface PlanGeneratorResult {
  summary: ContentPlanSummary;
  contentPlan: ContentPlan;
  durationMs: number;
}

// ─── MAIN ORCHESTRATOR ───────────────────────────────────────

export async function generateContentPlan(
  existingPosts: CachedPostForAnalysis[],
  options: PlanGeneratorOptions
): Promise<PlanGeneratorResult> {
  const startTime = Date.now();

  console.log(`🚀 Starting autopilot content plan generation...`);
  console.log(`📊 Posts to analyze: ${existingPosts.length}`);
  console.log(`🔧 Options: language=${options.language}, niche=${options.niche || 'general'}, depth=${options.depthLevel}`);

  // Step 1: Analyze existing content
  console.log(`\n📊 Step 1/4: Analyzing existing content...`);
  const analysis = await analyzeExistingContent(existingPosts, {
    language: options.language,
    niche: options.niche,
  });

  // Build summary
  const summary = buildContentSummary(existingPosts.length, analysis);

  // Step 2: Find content gaps
  console.log(`\n🔍 Step 2/4: Finding content gaps...`);
  const existingTitles = existingPosts.map((p) => p.title);
  const gapAnalysis = await findContentGaps(
    {
      mainTopics: analysis.mainTopics,
      categories: analysis.categories,
      weakAreas: analysis.weakAreas,
    },
    existingTitles,
    {
      language: options.language,
      niche: options.niche,
    }
  );

  // Step 3: Generate content plan
  console.log(`\n📝 Step 3/4: Generating content plan...`);
  let contentPlan = await generatePlanWithRetry(existingPosts, gapAnalysis, options);

  // Step 4: Post-process - deduplicate and add internal links
  console.log(`\n🔗 Step 4/4: Post-processing plan...`);
  contentPlan = await postProcessPlan(contentPlan, existingPosts, existingTitles);

  const durationMs = Date.now() - startTime;
  console.log(`\n✅ Content plan generated in ${(durationMs / 1000).toFixed(1)}s`);
  console.log(`📈 Ideas: ${countIdeas(contentPlan)} total`);

  return {
    summary,
    contentPlan,
    durationMs,
  };
}

// ─── PLAN GENERATION WITH RETRY ──────────────────────────────

async function generatePlanWithRetry(
  existingPosts: CachedPostForAnalysis[],
  gapAnalysis: GapAnalysisResult,
  options: PlanGeneratorOptions
): Promise<ContentPlan> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🤖 Attempt ${attempt}/${MAX_RETRIES} to generate plan...`);
      return await callAIForPlan(existingPosts, gapAnalysis, options);
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ Attempt ${attempt} failed:`, lastError.message);

      if (attempt < MAX_RETRIES) {
        console.log(`⏳ Retrying in 1s...`);
        await sleep(1000);
      }
    }
  }

  throw lastError || new Error('Failed to generate content plan');
}

async function callAIForPlan(
  existingPosts: CachedPostForAnalysis[],
  gapAnalysis: GapAnalysisResult,
  options: PlanGeneratorOptions
): Promise<ContentPlan> {
  const prompt = buildContentPlanPrompt(
    existingPosts.map((p) => ({ title: p.title, url: p.url })),
    gapAnalysis,
    options
  );

  const client = getOpenAIClient();
  const model = getFastModel();

  console.log(`🤖 Using model: ${model}`);

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content:
          'You are an elite SEO content strategist. Return ONLY valid JSON matching the requested schema. No explanations or markdown.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7, // Higher for creative content ideas
    max_tokens: 8000, // Large output for full plan
  });

  const content = response.choices[0]?.message?.content || '';
  return parseContentPlan(content);
}

// ─── PLAN PARSING ────────────────────────────────────────────

function parseContentPlan(content: string): ContentPlan {
  // Extract JSON from response
  let jsonStr = content.trim();

  // Remove markdown code blocks if present
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  try {
    const parsed = JSON.parse(jsonStr);

    // Normalize the plan structure
    return {
      highPriority: normalizeIdeas(parsed.highPriority, 'high'),
      mediumPriority: normalizeIdeas(parsed.mediumPriority, 'medium'),
      lowPriority: normalizeIdeas(parsed.lowPriority, 'low'),
    };
  } catch (error) {
    console.error('❌ Failed to parse content plan JSON:', error);
    console.error('Raw content (first 1000 chars):', content.slice(0, 1000));
    throw new Error('AI returned invalid JSON. Please try again.');
  }
}

function normalizeIdeas(ideas: unknown, priority: 'high' | 'medium' | 'low'): ArticleIdea[] {
  if (!Array.isArray(ideas)) return [];

  return ideas.map((idea: unknown, idx) => {
    const i = idea as Record<string, unknown>;
    return {
      id: String(i.id || `idea-${priority}-${idx + 1}`),
      title: String(i.title || 'Untitled'),
      keyword: String(i.keyword || ''),
      secondaryKeywords: Array.isArray(i.secondaryKeywords)
        ? (i.secondaryKeywords as unknown[]).map(String)
        : [],
      intent: validateIntent(i.intent),
      category: String(i.category || 'General'),
      priority,
      reason: String(i.reason || 'SEO opportunity'),
      internalLinks: normalizeInternalLinks(i.internalLinks),
      estimatedDifficulty: validateDifficulty(i.estimatedDifficulty),
    };
  });
}

function normalizeInternalLinks(links: unknown): ArticleIdea['internalLinks'] {
  if (!Array.isArray(links)) return [];

  return links.map((link: unknown) => {
    const l = link as Record<string, unknown>;
    return {
      title: String(l.title || ''),
      url: String(l.url || ''),
      anchorText: String(l.anchorText || ''),
    };
  }).filter(l => l.url && l.title);
}

function validateIntent(intent: unknown): ArticleIdea['intent'] {
  const str = String(intent || '').toLowerCase();
  if (['informational', 'commercial', 'transactional', 'navigational'].includes(str)) {
    return str as ArticleIdea['intent'];
  }
  return 'informational';
}

function validateDifficulty(difficulty: unknown): ArticleIdea['estimatedDifficulty'] {
  const str = String(difficulty || '').toLowerCase();
  if (['easy', 'medium', 'hard'].includes(str)) {
    return str as ArticleIdea['estimatedDifficulty'];
  }
  return 'medium';
}

// ─── POST-PROCESSING ─────────────────────────────────────────

async function postProcessPlan(
  plan: ContentPlan,
  existingPosts: CachedPostForAnalysis[],
  existingTitles: string[]
): Promise<ContentPlan> {
  // Deduplicate all ideas
  console.log(`🗑️ Deduplicating ideas...`);
  const deduplicatedHigh = deduplicateIdeas(plan.highPriority, existingTitles);
  const deduplicatedMedium = deduplicateIdeas(plan.mediumPriority, existingTitles);
  const deduplicatedLow = deduplicateIdeas(plan.lowPriority, existingTitles);

  const removedCount =
    (plan.highPriority.length - deduplicatedHigh.length) +
    (plan.mediumPriority.length - deduplicatedMedium.length) +
    (plan.lowPriority.length - deduplicatedLow.length);

  if (removedCount > 0) {
    console.log(`🗑️ Removed ${removedCount} duplicate ideas`);
  }

  // Validate and enhance internal links
  console.log(`🔗 Validating internal links...`);
  const processedHigh = processInternalLinks(deduplicatedHigh, existingPosts);
  const processedMedium = processInternalLinks(deduplicatedMedium, existingPosts);
  const processedLow = processInternalLinks(deduplicatedLow, existingPosts);

  return {
    highPriority: processedHigh,
    mediumPriority: processedMedium,
    lowPriority: processedLow,
  };
}

function processInternalLinks(
  ideas: ArticleIdea[],
  existingPosts: CachedPostForAnalysis[]
): ArticleIdea[] {
  return ideas.map((idea) => {
    // Validate existing links
    let validLinks = validateInternalLinks(idea.internalLinks, existingPosts);

    // If no valid links, try to find some
    if (validLinks.length === 0 && existingPosts.length > 0) {
      validLinks = findInternalLinks(idea.keyword, existingPosts);
    }

    return {
      ...idea,
      internalLinks: validLinks,
    };
  });
}

// ─── HELPERS ─────────────────────────────────────────────────

function countIdeas(plan: ContentPlan): number {
  return (
    plan.highPriority.length +
    plan.mediumPriority.length +
    plan.lowPriority.length
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── EXPORTS ─────────────────────────────────────────────────

export { analyzeExistingContent, buildContentSummary } from './analyzer';
export { findContentGaps } from './gap-finder';
export { deduplicateIdeas, isDuplicate, calculateSimilarity } from './deduplication';
export { findInternalLinks, validateInternalLinks } from './internal-linker';
