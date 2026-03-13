/**
 * SEO Scoring & Prioritization Engine
 * 
 * Computes category scores, overall site score, page-level scores,
 * and prioritizes issues by potential impact and ease of fix.
 */

import {
    type DetectedIssue,
    type IssueCategory,
    type IssueSeverity,
    CATEGORY_WEIGHTS,
    CATEGORY_LABELS,
    SEVERITY_ORDER,
} from "./issues";

// ─── Category Score ──────────────────────────────────────────────────────────

export interface CategoryScore {
    category: IssueCategory;
    label: string;
    score: number;          // 0-100
    maxScore: number;       // Always 100
    issueCount: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    weight: number;         // How much this category contributes to overall score
}

export interface SiteScore {
    overall: number;        // 0-100 weighted average
    categories: CategoryScore[];
    totalIssues: number;
    criticalIssues: number;
    fixableIssues: number;
    pagesScanned: number;
    grade: string;          // A+, A, B+, B, C+, C, D, F
    summary: string;
}

export interface PageScore {
    url: string;
    title: string;
    score: number;
    issueCount: number;
    criticalCount: number;
    topIssue: string | null;
}

// ─── Prioritized Issue ───────────────────────────────────────────────────────

export interface PrioritizedIssue extends DetectedIssue {
    priorityRank: number;
    priorityLabel: "highest_impact" | "quick_win" | "important" | "nice_to_have" | "low_priority";
    estimatedTrafficGain: "high" | "medium" | "low" | "unknown";
}

// ─── Severity Penalty Points ─────────────────────────────────────────────────

const SEVERITY_PENALTY: Record<IssueSeverity, number> = {
    critical: 25,
    high: 15,
    medium: 8,
    low: 3,
    info: 0,
};

// ─── Compute Category Scores ─────────────────────────────────────────────────

export function computeCategoryScores(issues: DetectedIssue[]): CategoryScore[] {
    const allCategories: IssueCategory[] = [
        "technical", "content", "ctr", "internal_linking",
        "image", "performance", "indexing", "schema",
    ];

    return allCategories.map((category) => {
        const catIssues = issues.filter((i) => i.category === category);
        const weight = CATEGORY_WEIGHTS[category];

        let penalty = 0;
        let criticalCount = 0;
        let highCount = 0;
        let mediumCount = 0;
        let lowCount = 0;

        for (const issue of catIssues) {
            penalty += SEVERITY_PENALTY[issue.severity];
            switch (issue.severity) {
                case "critical": criticalCount++; break;
                case "high": highCount++; break;
                case "medium": mediumCount++; break;
                case "low": lowCount++; break;
            }
        }

        // Score starts at 100, subtract penalties, floor at 0
        const score = Math.max(0, Math.min(100, 100 - penalty));

        return {
            category,
            label: CATEGORY_LABELS[category],
            score,
            maxScore: 100,
            issueCount: catIssues.length,
            criticalCount,
            highCount,
            mediumCount,
            lowCount,
            weight,
        };
    });
}

// ─── Compute Overall Site Score ──────────────────────────────────────────────

export function computeSiteScore(
    issues: DetectedIssue[],
    pagesScanned: number
): SiteScore {
    const categories = computeCategoryScores(issues);

    // Weighted average across categories
    const totalWeight = categories.reduce((sum, c) => sum + c.weight, 0);
    const weightedSum = categories.reduce((sum, c) => sum + c.score * c.weight, 0);
    const overall = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 100;

    const totalIssues = issues.length;
    const criticalIssues = issues.filter((i) => i.severity === "critical").length;
    const fixableIssues = issues.filter(
        (i) => i.fixability === "auto" || i.fixability === "assisted"
    ).length;

    const grade = scoreToGrade(overall);
    const summary = generateScoreSummary(overall, totalIssues, criticalIssues, fixableIssues);

    return {
        overall,
        categories,
        totalIssues,
        criticalIssues,
        fixableIssues,
        pagesScanned,
        grade,
        summary,
    };
}

// ─── Compute Page-Level Scores ───────────────────────────────────────────────

export function computePageScores(issues: DetectedIssue[]): PageScore[] {
    const pageMap = new Map<string, { title: string; issues: DetectedIssue[] }>();

    for (const issue of issues) {
        const key = issue.pageUrl;
        if (!pageMap.has(key)) {
            pageMap.set(key, { title: issue.pageTitle, issues: [] });
        }
        pageMap.get(key)!.issues.push(issue);
    }

    const pages: PageScore[] = [];
    for (const [url, data] of pageMap) {
        let penalty = 0;
        let criticalCount = 0;
        let topSeverity = 4;

        for (const issue of data.issues) {
            penalty += SEVERITY_PENALTY[issue.severity];
            if (issue.severity === "critical") criticalCount++;
            const order = SEVERITY_ORDER[issue.severity];
            if (order < topSeverity) topSeverity = order;
        }

        const score = Math.max(0, Math.min(100, 100 - penalty));

        // Find the most severe issue for this page
        const sortedIssues = [...data.issues].sort(
            (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
        );

        pages.push({
            url,
            title: data.title,
            score,
            issueCount: data.issues.length,
            criticalCount,
            topIssue: sortedIssues[0]?.title || null,
        });
    }

    // Sort: worst pages first
    return pages.sort((a, b) => a.score - b.score);
}

// ─── Prioritization Engine ───────────────────────────────────────────────────

export function prioritizeIssues(issues: DetectedIssue[]): PrioritizedIssue[] {
    const prioritized: PrioritizedIssue[] = issues.map((issue) => {
        // Priority score: higher = should fix first
        // Formula: impact * 0.4 + (100 - effort) * 0.3 + confidence * 0.3
        const priorityScore =
            issue.impactScore * 0.4 +
            (100 - issue.effortScore) * 0.3 +
            issue.confidenceScore * 0.3;

        const isQuickWin = issue.effortScore <= 25 && issue.impactScore >= 40;
        const isHighestImpact = issue.impactScore >= 75 && issue.confidenceScore >= 70;
        const isImportant = issue.severity === "critical" || issue.severity === "high";

        let priorityLabel: PrioritizedIssue["priorityLabel"];
        if (isHighestImpact) {
            priorityLabel = "highest_impact";
        } else if (isQuickWin) {
            priorityLabel = "quick_win";
        } else if (isImportant) {
            priorityLabel = "important";
        } else if (issue.impactScore >= 30) {
            priorityLabel = "nice_to_have";
        } else {
            priorityLabel = "low_priority";
        }

        // Estimate traffic gain potential
        let estimatedTrafficGain: PrioritizedIssue["estimatedTrafficGain"];
        if (issue.category === "ctr" && issue.impactScore >= 70) {
            estimatedTrafficGain = "high";
        } else if (issue.impactScore >= 60) {
            estimatedTrafficGain = "medium";
        } else if (issue.impactScore >= 30) {
            estimatedTrafficGain = "low";
        } else {
            estimatedTrafficGain = "unknown";
        }

        return {
            ...issue,
            priorityRank: 0, // Will be set after sorting
            priorityScore,
            priorityLabel,
            estimatedTrafficGain,
        };
    });

    // Sort by priority score descending
    prioritized.sort((a, b) => b.priorityScore - a.priorityScore);

    // Assign ranks
    prioritized.forEach((issue, index) => {
        issue.priorityRank = index + 1;
    });

    return prioritized;
}

// ─── Get Quick Wins ──────────────────────────────────────────────────────────

export function getQuickWins(issues: PrioritizedIssue[]): PrioritizedIssue[] {
    return issues.filter((i) => i.priorityLabel === "quick_win").slice(0, 10);
}

export function getHighestImpact(issues: PrioritizedIssue[]): PrioritizedIssue[] {
    return issues.filter((i) => i.priorityLabel === "highest_impact").slice(0, 10);
}

export function getRiskyIssues(issues: PrioritizedIssue[]): PrioritizedIssue[] {
    return issues.filter((i) => i.safety === "risky" || i.safety === "caution");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreToGrade(score: number): string {
    if (score >= 95) return "A+";
    if (score >= 90) return "A";
    if (score >= 85) return "B+";
    if (score >= 80) return "B";
    if (score >= 70) return "C+";
    if (score >= 60) return "C";
    if (score >= 50) return "D";
    return "F";
}

function generateScoreSummary(
    overall: number,
    totalIssues: number,
    criticalIssues: number,
    fixableIssues: number
): string {
    if (overall >= 90) {
        return `Your site is in excellent shape with ${totalIssues} minor issues. Keep up the great work!`;
    }
    if (overall >= 75) {
        return `Your site is in good condition. We found ${totalIssues} issues, ${fixableIssues} of which can be fixed automatically.`;
    }
    if (overall >= 60) {
        return `Your site has room for improvement. We found ${totalIssues} issues including ${criticalIssues} critical ones. Focus on the highest-impact fixes first.`;
    }
    if (overall >= 40) {
        return `Your site needs significant attention. ${criticalIssues} critical issues were found among ${totalIssues} total. Start with the critical fixes.`;
    }
    return `Your site has serious SEO problems that need immediate attention. ${criticalIssues} critical issues were found. Fixing these will have a major impact on your search visibility.`;
}
