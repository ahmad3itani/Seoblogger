// ─── Credit-Based Usage System ─────────────────────────────────────
// Credits are a unified currency for all generative features.
// Each plan allocates a monthly credit budget, replenished on the billing cycle.
// Actions consume credits at defined rates.

// Credit costs per action
export const CREDIT_COSTS = {
  article: 10,        // Generate an article
  image: 5,           // Generate an image
  bulkArticle: 8,     // Bulk-generated article (slight discount)
  siteAudit: 5,       // Run a site audit scan
  qualityPass: 15,    // Run Quality Pass on an article
  contentRefresh: 15,  // Refresh/rewrite content
  keywordResearch: 2,  // Keyword research query
  trendIdea: 3,       // Trend idea generation
  internalLinker: 3,   // Internal linker scan
  clustering: 3,       // Keyword clustering run
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

// Monthly credit allocation per plan
export const PLAN_CREDITS: Record<string, number> = {
  free: 50,
  starter: 500,
  pro: 2000,
  enterprise: 10000,
};

// Get monthly credits for a plan
export function getMonthlyCredits(planName: string): number {
  return PLAN_CREDITS[planName] || PLAN_CREDITS.free;
}

// Get credit cost for an action
export function getCreditCost(action: CreditAction): number {
  return CREDIT_COSTS[action];
}

// Calculate total credits used from usage stats
export function calculateCreditsUsed(usage: {
  articlesGenerated: number;
  imagesGenerated: number;
  apiCallsCount: number;
  wordsGenerated?: number;
}): number {
  // Map existing usage counters to credit equivalents
  const articleCredits = usage.articlesGenerated * CREDIT_COSTS.article;
  const imageCredits = usage.imagesGenerated * CREDIT_COSTS.image;
  // apiCallsCount tracks misc actions (audits, research, etc.) — 2 credits each
  const miscCredits = usage.apiCallsCount * 2;

  return articleCredits + imageCredits + miscCredits;
}

// Get credit balance info
export function getCreditBalance(
  planName: string,
  usage: {
    articlesGenerated: number;
    imagesGenerated: number;
    apiCallsCount: number;
    wordsGenerated?: number;
  }
): {
  total: number;
  used: number;
  remaining: number;
  percentUsed: number;
} {
  const total = getMonthlyCredits(planName);
  const used = calculateCreditsUsed(usage);
  const remaining = Math.max(0, total - used);
  const percentUsed = total > 0 ? Math.round((used / total) * 100) : 0;

  return { total, used, remaining, percentUsed };
}

// Check if user can perform an action
export function canSpendCredits(
  planName: string,
  usage: {
    articlesGenerated: number;
    imagesGenerated: number;
    apiCallsCount: number;
    wordsGenerated?: number;
  },
  action: CreditAction,
  quantity: number = 1
): { allowed: boolean; reason?: string; creditsNeeded: number; creditsRemaining: number } {
  const balance = getCreditBalance(planName, usage);
  const creditsNeeded = getCreditCost(action) * quantity;

  if (balance.remaining < creditsNeeded) {
    return {
      allowed: false,
      reason: `Not enough credits. You need ${creditsNeeded} credits but only have ${balance.remaining} remaining. Upgrade your plan for more credits.`,
      creditsNeeded,
      creditsRemaining: balance.remaining,
    };
  }

  return {
    allowed: true,
    creditsNeeded,
    creditsRemaining: balance.remaining - creditsNeeded,
  };
}

// Format credit display
export function formatCredits(credits: number): string {
  if (credits >= 1000) {
    return `${(credits / 1000).toFixed(1)}k`;
  }
  return credits.toString();
}
