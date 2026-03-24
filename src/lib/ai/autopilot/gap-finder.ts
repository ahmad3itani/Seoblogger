/**
 * SEO Autopilot Engine - Gap Finder
 *
 * Identifies missing keywords, weak areas, and content opportunities.
 * Uses AI to find gaps in existing content coverage.
 */

import { getOpenAIClient, getFastModel } from '../client';
import { buildGapAnalysisPrompt } from './prompts';

// ─── TYPES ───────────────────────────────────────────────────

export interface GapAnalysisResult {
  missingKeywords: string[];
  weakAreas: string[];
  opportunities: {
    keyword: string;
    reason: string;
    potentialTraffic: 'high' | 'medium' | 'low';
  }[];
}

interface GapFinderOptions {
  language: string;
  niche?: string;
}

interface ContentAnalysis {
  mainTopics: string[];
  categories: string[];
  weakAreas: string[];
}

// ─── GAP FINDER ──────────────────────────────────────────────

export async function findContentGaps(
  analysis: ContentAnalysis,
  existingTitles: string[],
  options: GapFinderOptions
): Promise<GapAnalysisResult> {
  console.log(`🔍 Finding content gaps...`);

  if (existingTitles.length === 0) {
    return {
      missingKeywords: [],
      weakAreas: ['No existing content to analyze gaps against'],
      opportunities: [],
    };
  }

  // Build prompt
  const prompt = buildGapAnalysisPrompt(analysis, existingTitles, options);

  // Call AI
  const client = getOpenAIClient();
  const model = getFastModel();

  console.log(`🤖 Using model: ${model} for gap analysis`);

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are an SEO strategist specializing in content gap analysis. Return ONLY valid JSON, no explanations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5, // Slightly higher for creative keyword suggestions
      max_tokens: 3000,
    });

    const content = response.choices[0]?.message?.content || '';

    // Parse JSON from response
    const result = parseGapAnalysisResult(content);

    console.log(
      `✅ Gap analysis complete: ${result.missingKeywords.length} keywords, ${result.opportunities.length} opportunities`
    );

    return result;
  } catch (error) {
    console.error('❌ Gap analysis failed:', error);
    throw new Error('Failed to analyze content gaps. Please try again.');
  }
}

// ─── JSON PARSER ─────────────────────────────────────────────

function parseGapAnalysisResult(content: string): GapAnalysisResult {
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
      missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords : [],
      weakAreas: Array.isArray(parsed.weakAreas) ? parsed.weakAreas : [],
      opportunities: Array.isArray(parsed.opportunities)
        ? parsed.opportunities.map((o: unknown) => {
            const opp = o as { keyword?: string; reason?: string; potentialTraffic?: string };
            return {
              keyword: String(opp.keyword || ''),
              reason: String(opp.reason || ''),
              potentialTraffic: validateTrafficLevel(opp.potentialTraffic),
            };
          })
        : [],
    };
  } catch (error) {
    console.error('❌ Failed to parse gap analysis JSON:', error);
    console.error('Raw content:', content.slice(0, 500));

    // Return fallback
    return {
      missingKeywords: [],
      weakAreas: ['Unable to analyze content gaps'],
      opportunities: [],
    };
  }
}

// ─── HELPERS ─────────────────────────────────────────────────

function validateTrafficLevel(level: unknown): 'high' | 'medium' | 'low' {
  const str = String(level || '').toLowerCase();
  if (str === 'high' || str === 'medium' || str === 'low') {
    return str;
  }
  return 'medium';
}
