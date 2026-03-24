/**
 * Amazon Affiliate Intent Detection
 *
 * Classifies keyword intent to help users understand
 * whether their keyword is suitable for affiliate content.
 */

export type SearchIntent = 'informational' | 'commercial' | 'transactional';

export interface IntentResult {
  intent: SearchIntent;
  confidence: 'high' | 'medium' | 'low';
  isAffiliateReady: boolean;
  suggestion?: string;
}

/**
 * Detect search intent from keyword
 *
 * - Informational: "what is...", "how to..." (low affiliate potential)
 * - Commercial: "best...", "top...", "vs" (good affiliate potential)
 * - Transactional: "buy...", "deal...", "price" (excellent affiliate potential)
 */
export function detectIntent(keyword: string): IntentResult {
  const kw = keyword.toLowerCase().trim();

  // Transactional patterns (buy intent - excellent for affiliate)
  const transactionalPatterns = [
    /\b(buy|purchase|order|shop|get|deal|deals|discount|coupon|sale|cheap|affordable|price|pricing|cost)\b/,
    /\b(where to buy|how much|on sale|black friday|prime day)\b/,
  ];

  // Commercial patterns (comparison/best intent - good for affiliate)
  const commercialPatterns = [
    /\b(best|top|vs|versus|compare|comparison|review|reviews|rating|ratings|recommend|recommended)\b/,
    /\b(which|should i|worth it|alternative|alternatives|similar to)\b/,
    /\b(for \w+|under \$?\d+|\d+ best)\b/,
  ];

  // Informational patterns (low affiliate potential)
  const informationalPatterns = [
    /\b(what is|what are|how to|how do|how does|why|when|where|who)\b/,
    /\b(guide|tutorial|learn|explain|definition|meaning|difference between)\b/,
    /\b(can i|can you|is it possible|does it)\b/,
  ];

  // Check transactional first (highest affiliate potential)
  for (const pattern of transactionalPatterns) {
    if (pattern.test(kw)) {
      return {
        intent: 'transactional',
        confidence: 'high',
        isAffiliateReady: true,
      };
    }
  }

  // Check commercial (good affiliate potential)
  for (const pattern of commercialPatterns) {
    if (pattern.test(kw)) {
      return {
        intent: 'commercial',
        confidence: 'high',
        isAffiliateReady: true,
      };
    }
  }

  // Check informational (low affiliate potential)
  for (const pattern of informationalPatterns) {
    if (pattern.test(kw)) {
      return {
        intent: 'informational',
        confidence: 'high',
        isAffiliateReady: false,
        suggestion: 'Consider rephrasing to "best [keyword]" or "[keyword] review" for better affiliate results.',
      };
    }
  }

  // Default: assume commercial for product-focused keywords
  // Most Amazon affiliate keywords are product names/categories
  return {
    intent: 'commercial',
    confidence: 'medium',
    isAffiliateReady: true,
  };
}

/**
 * Get intent badge color for UI
 */
export function getIntentColor(intent: SearchIntent): {
  bg: string;
  text: string;
  border: string;
} {
  switch (intent) {
    case 'transactional':
      return {
        bg: 'rgba(34, 197, 94, 0.12)',
        text: '#22C55E',
        border: 'rgba(34, 197, 94, 0.25)',
      };
    case 'commercial':
      return {
        bg: 'rgba(59, 130, 246, 0.12)',
        text: '#3B82F6',
        border: 'rgba(59, 130, 246, 0.25)',
      };
    case 'informational':
      return {
        bg: 'rgba(234, 179, 8, 0.12)',
        text: '#EAB308',
        border: 'rgba(234, 179, 8, 0.25)',
      };
  }
}

/**
 * Get intent description for tooltip
 */
export function getIntentDescription(intent: SearchIntent): string {
  switch (intent) {
    case 'transactional':
      return 'Excellent for affiliates! User is ready to buy.';
    case 'commercial':
      return 'Good for affiliates. User is comparing options.';
    case 'informational':
      return 'Low affiliate potential. User seeking information, not products.';
  }
}
