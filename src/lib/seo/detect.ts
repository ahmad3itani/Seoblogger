/**
 * SEO Issue Detector
 * 
 * Analyzes crawled page data against the issue taxonomy
 * and produces structured DetectedIssue objects with
 * confidence scores and trust metadata.
 */

import type { CrawledPageData } from "./crawler";
import {
    type DetectedIssue,
    type ConfidenceLevel,
    ISSUE_REGISTRY,
} from "./issues";

// ─── Main Detection Function ─────────────────────────────────────────────────

export function detectIssues(
    page: CrawledPageData,
    allPages?: CrawledPageData[]
): DetectedIssue[] {
    const issues: DetectedIssue[] = [];
    const pageTitle = page.title || page.url;

    // ═══ TECHNICAL ISSUES ════════════════════════════════════════════════

    // Missing title
    if (!page.title || page.title.trim().length === 0) {
        issues.push(buildIssue("missing_title", page.url, pageTitle, {
            confidence: "high",
            confidenceScore: 99,
            confidenceReason: "Detected from crawl — no <title> tag found in HTML.",
            detectedBy: "crawl",
            currentValue: "(empty)",
        }));
    } else {
        // Title too short
        if (page.title.length < 30) {
            issues.push(buildIssue("title_too_short", page.url, pageTitle, {
                confidence: "high",
                confidenceScore: 95,
                confidenceReason: `Title is ${page.title.length} characters. Recommended: 30-60 characters.`,
                detectedBy: "crawl",
                currentValue: page.title,
                suggestedValue: undefined,
            }));
        }
        // Title too long
        if (page.title.length > 60) {
            issues.push(buildIssue("title_too_long", page.url, pageTitle, {
                confidence: "high",
                confidenceScore: 90,
                confidenceReason: `Title is ${page.title.length} characters. Google truncates at ~60.`,
                detectedBy: "crawl",
                currentValue: page.title,
            }));
        }
    }

    // Missing meta description
    if (!page.metaDescription || page.metaDescription.trim().length === 0) {
        issues.push(buildIssue("missing_meta_description", page.url, pageTitle, {
            confidence: "high",
            confidenceScore: 99,
            confidenceReason: "No meta description tag found in HTML.",
            detectedBy: "crawl",
            currentValue: "(empty)",
        }));
    } else {
        if (page.metaDescription.length < 120) {
            issues.push(buildIssue("meta_description_too_short", page.url, pageTitle, {
                confidence: "high",
                confidenceScore: 90,
                confidenceReason: `Meta description is ${page.metaDescription.length} characters. Recommended: 120-160.`,
                detectedBy: "crawl",
                currentValue: page.metaDescription,
            }));
        }
        if (page.metaDescription.length > 160) {
            issues.push(buildIssue("meta_description_too_long", page.url, pageTitle, {
                confidence: "high",
                confidenceScore: 85,
                confidenceReason: `Meta description is ${page.metaDescription.length} characters. Google truncates at ~160.`,
                detectedBy: "crawl",
                currentValue: page.metaDescription,
            }));
        }
    }

    // Missing H1
    if (page.h1Count === 0) {
        issues.push(buildIssue("missing_h1", page.url, pageTitle, {
            confidence: "high",
            confidenceScore: 95,
            confidenceReason: "No H1 tag found. Most Blogger themes use the post title as H1.",
            detectedBy: "crawl",
        }));
    }

    // Multiple H1
    if (page.h1Count > 1) {
        issues.push(buildIssue("multiple_h1", page.url, pageTitle, {
            confidence: "high",
            confidenceScore: 90,
            confidenceReason: `Found ${page.h1Count} H1 tags. Usually only one is recommended.`,
            detectedBy: "crawl",
            currentValue: `${page.h1Count} H1 tags`,
        }));
    }

    // Missing canonical
    if (!page.canonical) {
        issues.push(buildIssue("missing_canonical", page.url, pageTitle, {
            confidence: "medium",
            confidenceScore: 70,
            confidenceReason: "No canonical tag found. Blogger usually handles this automatically — may be a theme issue.",
            detectedBy: "crawl",
        }));
    }

    // Missing viewport
    if (!page.hasViewport) {
        issues.push(buildIssue("missing_viewport", page.url, pageTitle, {
            confidence: "high",
            confidenceScore: 95,
            confidenceReason: "No viewport meta tag. This is critical for mobile-first indexing.",
            detectedBy: "crawl",
        }));
    }

    // Missing lang
    if (!page.htmlLang) {
        issues.push(buildIssue("missing_lang", page.url, pageTitle, {
            confidence: "high",
            confidenceScore: 85,
            confidenceReason: "No lang attribute on <html> tag.",
            detectedBy: "crawl",
        }));
    }

    // SSL issue
    if (page.hasSslIssue) {
        issues.push(buildIssue("ssl_issue", page.url, pageTitle, {
            confidence: "high",
            confidenceScore: 99,
            confidenceReason: "Page served over HTTP instead of HTTPS.",
            detectedBy: "crawl",
        }));
    }

    // HTTP error
    if (page.statusCode >= 400) {
        issues.push(buildIssue("http_error", page.url, pageTitle, {
            confidence: "high",
            confidenceScore: 99,
            confidenceReason: `HTTP status ${page.statusCode} returned.`,
            detectedBy: "crawl",
            currentValue: `Status: ${page.statusCode}`,
        }));
    }

    // ═══ CONTENT ISSUES ══════════════════════════════════════════════════

    // Thin content
    if (page.wordCount < 300 && page.statusCode === 200) {
        issues.push(buildIssue("thin_content", page.url, pageTitle, {
            confidence: "high",
            confidenceScore: 90,
            confidenceReason: `Page has only ${page.wordCount} words. Under 300 words is considered thin content.`,
            detectedBy: "crawl",
            currentValue: `${page.wordCount} words`,
            suggestedValue: "At least 600-1000 words",
        }));
    }

    // No heading structure
    if (page.h2Count === 0 && page.wordCount > 300) {
        issues.push(buildIssue("no_headings_structure", page.url, pageTitle, {
            confidence: "high",
            confidenceScore: 85,
            confidenceReason: "No H2 headings found. Content lacks structure.",
            detectedBy: "crawl",
            currentValue: "0 H2 headings",
        }));
    }

    // Outdated content (check for old year references)
    const currentYear = new Date().getFullYear();
    if (page.title) {
        const yearMatch = page.title.match(/20[12]\d/);
        if (yearMatch) {
            const year = parseInt(yearMatch[0]);
            if (year < currentYear - 1) {
                issues.push(buildIssue("outdated_content", page.url, pageTitle, {
                    confidence: "medium",
                    confidenceScore: 65,
                    confidenceReason: `Title references year ${year}. Content may be outdated.`,
                    detectedBy: "crawl",
                    currentValue: `References year ${year}`,
                    suggestedValue: `Update to ${currentYear}`,
                }));
            }
        }
    }

    // ═══ INTERNAL LINKING ISSUES ═════════════════════════════════════════

    if (allPages && allPages.length > 1) {
        // Orphan page detection: count how many other pages link to this one
        // (simplified — based on internal link count from the page itself)
        if (page.internalLinks === 0 && page.wordCount > 100) {
            issues.push(buildIssue("no_outgoing_links", page.url, pageTitle, {
                confidence: "high",
                confidenceScore: 90,
                confidenceReason: "This page has zero outgoing internal links.",
                detectedBy: "crawl",
                currentValue: "0 internal links",
            }));
        }
    }

    // ═══ IMAGE ISSUES ════════════════════════════════════════════════════

    // Missing alt text
    if (page.missingAltCount > 0) {
        issues.push(buildIssue("missing_alt_text", page.url, pageTitle, {
            confidence: "high",
            confidenceScore: 95,
            confidenceReason: `Found ${page.missingAltCount} image(s) without alt text out of ${page.imagesCount} total.`,
            detectedBy: "crawl",
            currentValue: `${page.missingAltCount} images missing alt text`,
            metadata: { missingCount: page.missingAltCount, totalImages: page.imagesCount },
        }));
    }

    // No images at all (only flag for content pages with enough text)
    if (page.imagesCount === 0 && page.wordCount > 500) {
        issues.push(buildIssue("no_images", page.url, pageTitle, {
            confidence: "medium",
            confidenceScore: 70,
            confidenceReason: "No images found on a content-heavy page.",
            detectedBy: "crawl",
        }));
    }

    // ═══ PERFORMANCE ISSUES ══════════════════════════════════════════════

    // Slow page
    if (page.loadTimeMs > 3000) {
        issues.push(buildIssue("slow_page", page.url, pageTitle, {
            confidence: "high",
            confidenceScore: 85,
            confidenceReason: `Page loaded in ${(page.loadTimeMs / 1000).toFixed(1)}s. Target is under 3s.`,
            detectedBy: "crawl",
            currentValue: `${(page.loadTimeMs / 1000).toFixed(1)}s load time`,
            suggestedValue: "Under 3 seconds",
        }));
    }

    // Low text-to-HTML ratio
    if (page.textToHtmlRatio < 10 && page.wordCount > 50) {
        issues.push(buildIssue("low_text_html_ratio", page.url, pageTitle, {
            confidence: "medium",
            confidenceScore: 60,
            confidenceReason: `Text-to-HTML ratio is ${page.textToHtmlRatio}%. Low ratios suggest bloated markup.`,
            detectedBy: "crawl",
            currentValue: `${page.textToHtmlRatio}%`,
            suggestedValue: "Above 10%",
        }));
    }

    // ═══ INDEXING / SCHEMA ISSUES ════════════════════════════════════════

    // Noindex detected
    if (page.robotsMeta && page.robotsMeta.toLowerCase().includes("noindex")) {
        issues.push(buildIssue("noindex_detected", page.url, pageTitle, {
            confidence: "high",
            confidenceScore: 99,
            confidenceReason: `Robots meta tag contains "noindex": ${page.robotsMeta}`,
            detectedBy: "crawl",
            currentValue: page.robotsMeta,
        }));
    }

    // Missing Open Graph
    if (!page.hasOpenGraph) {
        issues.push(buildIssue("missing_og_tags", page.url, pageTitle, {
            confidence: "high",
            confidenceScore: 90,
            confidenceReason: "No Open Graph meta tags found.",
            detectedBy: "crawl",
        }));
    }

    // Missing schema
    if (!page.hasSchemaMarkup) {
        issues.push(buildIssue("missing_schema", page.url, pageTitle, {
            confidence: "high",
            confidenceScore: 85,
            confidenceReason: "No JSON-LD structured data found.",
            detectedBy: "crawl",
        }));
    }

    return issues;
}

// ─── Build Issue Helper ──────────────────────────────────────────────────────

function buildIssue(
    definitionId: string,
    pageUrl: string,
    pageTitle: string,
    params: {
        confidence: ConfidenceLevel;
        confidenceScore: number;
        confidenceReason: string;
        detectedBy: "crawl" | "search_console" | "blogger_api" | "ai_analysis" | "pagespeed";
        currentValue?: string;
        suggestedValue?: string;
        metadata?: Record<string, any>;
    }
): DetectedIssue {
    const def = ISSUE_REGISTRY[definitionId];
    if (!def) {
        throw new Error(`Unknown issue definition: ${definitionId}`);
    }

    // Compute priority score: impact * 0.4 + (100 - effort) * 0.3 + confidence * 0.3
    const priorityScore = Math.round(
        def.impactScore * 0.4 +
        (100 - def.effortScore) * 0.3 +
        params.confidenceScore * 0.3
    );

    return {
        definitionId,
        pageUrl,
        pageTitle,
        category: def.category,
        severity: def.severity,
        title: def.title,
        description: def.description,
        whyItMatters: def.whyItMatters,
        fixability: def.fixability,
        safety: def.safety,
        confidence: params.confidence,
        confidenceScore: params.confidenceScore,
        confidenceReason: params.confidenceReason,
        detectedBy: params.detectedBy,
        currentValue: params.currentValue,
        suggestedValue: params.suggestedValue,
        impactScore: def.impactScore,
        effortScore: def.effortScore,
        priorityScore,
        fixable: def.fixability === "auto" || def.fixability === "assisted",
        bloggerNote: def.bloggerNote,
        metadata: params.metadata,
    };
}
