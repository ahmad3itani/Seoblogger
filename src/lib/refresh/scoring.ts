/**
 * Content Refresh Scoring Model
 * 
 * Computes a composite refresh score (0-100) from 5 signal categories:
 * A. Performance opportunity (impressions + position in striking distance + low CTR)
 * B. Decline signal (clicks/impressions dropping vs previous period)
 * C. Content weakness (thin, weak structure, no FAQ, low topical depth)
 * D. Freshness age (how old the post is, outdated references)
 * E. Index confidence (is the page indexed and healthy)
 * 
 * Also assigns a tier: 1=best opportunity, 2=declining asset, 3=weak legacy
 */

export interface RefreshScoreInput {
    // Performance (from Search Console, nullable if not connected)
    clicksLast28?: number | null;
    clicksPrev28?: number | null;
    impressionsLast28?: number | null;
    impressionsPrev28?: number | null;
    ctrLast28?: number | null;
    avgPositionLast28?: number | null;

    // Content (from crawler)
    wordCount: number;
    h2Count: number;
    internalLinks: number;
    hasFaq: boolean;
    hasSchema: boolean;
    imagesCount: number;

    // Freshness
    publishedAt?: Date | null;
    outdatedSignals?: string[]; // e.g., ["references 2022", "stale tool names"]

    // Index status (from URL Inspection or crawl)
    indexedStatus?: "indexed" | "not_indexed" | "unknown";
    statusCode?: number;
}

export interface RefreshScoreResult {
    totalScore: number; // 0-100
    tier: 1 | 2 | 3;
    tierLabel: "best_opportunity" | "declining_asset" | "weak_legacy";
    breakdown: {
        performanceOpportunity: number; // 0-100
        declineSignal: number;          // 0-100
        contentWeakness: number;        // 0-100
        freshnessAge: number;           // 0-100
        indexConfidence: number;         // 0-100
    };
    reasons: string[];
}

// ─── Score Components ────────────────────────────────────────────

function scorePerformanceOpportunity(input: RefreshScoreInput): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    const impressions = input.impressionsLast28;
    const position = input.avgPositionLast28;
    const ctr = input.ctrLast28;

    if (impressions == null) {
        // No Search Console data — can't score performance opportunity
        return { score: 20, reasons: ["No Search Console data available"] };
    }

    // Has impressions = has opportunity
    if (impressions > 100) { score += 25; reasons.push(`Gets ${impressions} impressions/month`); }
    else if (impressions > 20) { score += 15; reasons.push(`Gets ${impressions} impressions/month`); }
    else if (impressions > 0) { score += 5; reasons.push(`Low impressions (${impressions}/month)`); }

    // Striking distance (positions 8-20) = highest opportunity
    if (position != null) {
        if (position >= 8 && position <= 20) {
            score += 40;
            reasons.push(`Striking distance: position ${position.toFixed(1)} — close to page 1`);
        } else if (position >= 4 && position < 8) {
            score += 25;
            reasons.push(`Strong position ${position.toFixed(1)} — optimize for top 3`);
        } else if (position > 20 && position <= 40) {
            score += 15;
            reasons.push(`Position ${position.toFixed(1)} — needs significant improvement`);
        } else if (position > 40) {
            score += 5;
            reasons.push(`Very low position (${position.toFixed(1)})`);
        }
    }

    // Low CTR with decent impressions = title/description issue
    if (ctr != null && impressions > 50) {
        if (ctr < 0.02) {
            score += 35;
            reasons.push(`Very low CTR (${(ctr * 100).toFixed(1)}%) — title/description needs work`);
        } else if (ctr < 0.04) {
            score += 20;
            reasons.push(`Below-average CTR (${(ctr * 100).toFixed(1)}%)`);
        } else if (ctr < 0.06) {
            score += 10;
            reasons.push(`Moderate CTR (${(ctr * 100).toFixed(1)}%)`);
        }
    }

    return { score: Math.min(100, score), reasons };
}

function scoreDeclineSignal(input: RefreshScoreInput): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    const clicksCurrent = input.clicksLast28;
    const clicksPrev = input.clicksPrev28;
    const impCurrent = input.impressionsLast28;
    const impPrev = input.impressionsPrev28;

    if (clicksCurrent == null || clicksPrev == null) {
        return { score: 0, reasons: [] };
    }

    // Clicks decline
    if (clicksPrev > 0) {
        const clicksDelta = (clicksCurrent - clicksPrev) / clicksPrev;
        if (clicksDelta < -0.3) {
            score += 50;
            reasons.push(`Clicks dropped ${Math.abs(Math.round(clicksDelta * 100))}% vs previous period`);
        } else if (clicksDelta < -0.1) {
            score += 30;
            reasons.push(`Clicks declining (${Math.abs(Math.round(clicksDelta * 100))}% drop)`);
        }
    }

    // Impressions decline
    if (impCurrent != null && impPrev != null && impPrev > 0) {
        const impDelta = (impCurrent - impPrev) / impPrev;
        if (impDelta < -0.3) {
            score += 50;
            reasons.push(`Impressions dropped ${Math.abs(Math.round(impDelta * 100))}% vs previous period`);
        } else if (impDelta < -0.1) {
            score += 30;
            reasons.push(`Impressions declining (${Math.abs(Math.round(impDelta * 100))}% drop)`);
        }
    }

    return { score: Math.min(100, score), reasons };
}

function scoreContentWeakness(input: RefreshScoreInput): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    // Thin content
    if (input.wordCount < 300) {
        score += 35;
        reasons.push(`Very thin content (${input.wordCount} words)`);
    } else if (input.wordCount < 600) {
        score += 25;
        reasons.push(`Short content (${input.wordCount} words)`);
    } else if (input.wordCount < 1000) {
        score += 10;
        reasons.push(`Below-average length (${input.wordCount} words)`);
    }

    // Poor heading structure
    if (input.h2Count === 0) {
        score += 20;
        reasons.push("No H2 headings — poor content structure");
    } else if (input.h2Count < 3 && input.wordCount > 500) {
        score += 10;
        reasons.push(`Only ${input.h2Count} H2 headings for ${input.wordCount} words`);
    }

    // No FAQ
    if (!input.hasFaq) {
        score += 15;
        reasons.push("No FAQ section — missing search snippet opportunity");
    }

    // No internal links
    if (input.internalLinks === 0) {
        score += 15;
        reasons.push("No internal links — content is a dead end");
    } else if (input.internalLinks < 3) {
        score += 5;
        reasons.push(`Only ${input.internalLinks} internal links`);
    }

    // No images
    if (input.imagesCount === 0) {
        score += 10;
        reasons.push("No images in content");
    }

    // No schema
    if (!input.hasSchema) {
        score += 5;
        reasons.push("No structured data markup");
    }

    return { score: Math.min(100, score), reasons };
}

function scoreFreshnessAge(input: RefreshScoreInput): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    if (input.publishedAt) {
        const ageMonths = (Date.now() - new Date(input.publishedAt).getTime()) / (30 * 86400000);

        if (ageMonths > 24) {
            score += 40;
            reasons.push(`Published ${Math.round(ageMonths)} months ago — very outdated`);
        } else if (ageMonths > 12) {
            score += 25;
            reasons.push(`Published ${Math.round(ageMonths)} months ago — getting stale`);
        } else if (ageMonths > 6) {
            score += 10;
            reasons.push(`Published ${Math.round(ageMonths)} months ago`);
        }
    }

    // Outdated signals (year references, stale tools, etc.)
    if (input.outdatedSignals && input.outdatedSignals.length > 0) {
        score += Math.min(60, input.outdatedSignals.length * 20);
        for (const sig of input.outdatedSignals.slice(0, 3)) {
            reasons.push(`Outdated: ${sig}`);
        }
    }

    return { score: Math.min(100, score), reasons };
}

function scoreIndexConfidence(input: RefreshScoreInput): { score: number; reasons: string[] } {
    const reasons: string[] = [];

    if (input.statusCode && input.statusCode >= 400) {
        return { score: 0, reasons: ["Page returns HTTP error — fix error before refreshing"] };
    }

    if (input.indexedStatus === "not_indexed") {
        return { score: 20, reasons: ["Page is not indexed — refresh may not help until indexing is fixed"] };
    }

    if (input.indexedStatus === "indexed") {
        reasons.push("Page is indexed and healthy");
        return { score: 100, reasons };
    }

    // Unknown / no data
    return { score: 70, reasons: ["Index status unknown — assuming indexed"] };
}

// ─── Main Scoring Function ───────────────────────────────────────

export function computeRefreshScore(input: RefreshScoreInput): RefreshScoreResult {
    const perf = scorePerformanceOpportunity(input);
    const decline = scoreDeclineSignal(input);
    const content = scoreContentWeakness(input);
    const freshness = scoreFreshnessAge(input);
    const index = scoreIndexConfidence(input);

    // Weighted composite: performance opportunity is most important
    const totalScore = Math.round(
        perf.score * 0.30 +
        decline.score * 0.20 +
        content.score * 0.25 +
        freshness.score * 0.15 +
        index.score * 0.10
    );

    // Determine tier
    let tier: 1 | 2 | 3 = 3;
    let tierLabel: "best_opportunity" | "declining_asset" | "weak_legacy" = "weak_legacy";

    const hasImpressions = (input.impressionsLast28 ?? 0) > 20;
    const inStrikingDistance = (input.avgPositionLast28 ?? 100) >= 8 && (input.avgPositionLast28 ?? 100) <= 20;
    const isDecling = decline.score >= 30;

    if (hasImpressions && (inStrikingDistance || content.score >= 30)) {
        tier = 1;
        tierLabel = "best_opportunity";
    } else if (isDecling) {
        tier = 2;
        tierLabel = "declining_asset";
    }

    const reasons = [
        ...perf.reasons,
        ...decline.reasons,
        ...content.reasons,
        ...freshness.reasons,
        ...index.reasons,
    ];

    return {
        totalScore,
        tier,
        tierLabel,
        breakdown: {
            performanceOpportunity: perf.score,
            declineSignal: decline.score,
            contentWeakness: content.score,
            freshnessAge: freshness.score,
            indexConfidence: index.score,
        },
        reasons,
    };
}
