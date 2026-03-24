/**
 * SEO Autopilot Engine - Content Analyzer
 *
 * Extracts topics, categories, and content distribution from existing posts.
 * Uses AI for intelligent topic clustering and strength/weakness identification.
 */

import { getOpenAIClient, getFastModel } from '../client';
import { buildContentAnalysisPrompt } from './prompts';
import type { ContentPlanSummary, CachedPostForAnalysis } from '@/types/autopilot';

// ─── TYPES ───────────────────────────────────────────────────

interface AnalysisResult {
  mainTopics: string[];
  categories: string[];
  contentDistribution: { category: string; count: number }[];
  strengths: string[];
  weakAreas: string[];
}

interface AnalyzerOptions {
  language: string;
  niche?: string;
}

// ─── CONTENT ANALYZER ────────────────────────────────────────

export async function analyzeExistingContent(
  posts: CachedPostForAnalysis[],
  options: AnalyzerOptions
): Promise<AnalysisResult> {
  console.log(`📊 Analyzing ${posts.length} existing posts...`);

  if (posts.length === 0) {
    return {
      mainTopics: [],
      categories: [],
      contentDistribution: [],
      strengths: [],
      weakAreas: ['No existing content to analyze'],
    };
  }

  // Prepare posts for analysis (title + url only)
  const postsForAnalysis = posts.map((p) => ({
    title: p.title,
    url: p.url,
  }));

  // Build prompt
  const prompt = buildContentAnalysisPrompt(postsForAnalysis, options);

  // Call AI
  const client = getOpenAIClient();
  const model = getFastModel();

  console.log(`🤖 Using model: ${model} for content analysis`);

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an SEO content analyst. Return ONLY valid JSON, no explanations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || '';

    // Parse JSON from response
    const result = parseAnalysisResult(content);

    console.log(`✅ Analysis complete: ${result.mainTopics.length} topics, ${result.weakAreas.length} weak areas`);

    return result;
  } catch (error) {
    console.error('❌ Content analysis failed:', error);
    throw new Error('Failed to analyze content. Please try again.');
  }
}

// ─── JSON PARSER ─────────────────────────────────────────────

function parseAnalysisResult(content: string): AnalysisResult {
  // Extract JSON from response (handle markdown code blocks)
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

    // Validate and normalize
    return {
      mainTopics: Array.isArray(parsed.mainTopics) ? parsed.mainTopics : [],
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      contentDistribution: Array.isArray(parsed.contentDistribution)
        ? parsed.contentDistribution.map((d: unknown) => {
            const item = d as { category?: string; count?: number };
            return {
              category: String(item.category || 'Unknown'),
              count: Number(item.count || 0),
            };
          })
        : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weakAreas: Array.isArray(parsed.weakAreas) ? parsed.weakAreas : [],
    };
  } catch (error) {
    console.error('❌ Failed to parse analysis JSON:', error);
    console.error('Raw content:', content.slice(0, 500));

    // Return fallback
    return {
      mainTopics: ['General Content'],
      categories: ['Uncategorized'],
      contentDistribution: [{ category: 'Uncategorized', count: 1 }],
      strengths: [],
      weakAreas: ['Unable to analyze content structure'],
    };
  }
}

// ─── SUMMARY BUILDER ─────────────────────────────────────────

export function buildContentSummary(
  postsCount: number,
  analysis: AnalysisResult
): ContentPlanSummary {
  return {
    totalArticlesAnalyzed: postsCount,
    mainTopics: analysis.mainTopics,
    weakAreas: analysis.weakAreas,
    contentDistribution: analysis.contentDistribution,
  };
}
