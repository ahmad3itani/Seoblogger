import { CrawledPageData } from "./crawler";
import { PageSpeedData } from "./pagespeed";

export interface GeneratedIssue {
    type: "technical" | "on_page" | "content" | "internal_link" | "image" | "performance";
    issueId: string;
    severity: "high" | "medium" | "low";
    description: string;
    fixable: boolean;
}

export interface RuleEngineResult {
    score: number;
    issues: GeneratedIssue[];
}

export function analyzePageSeo(
    page: CrawledPageData,
    performance?: PageSpeedData | null
): RuleEngineResult {
    let score = 100;
    const issues: GeneratedIssue[] = [];

    // --- TECHNICAL SEO (Base 40 points out of 100) ---
    if (page.statusCode !== 200) {
        issues.push({
            type: "technical",
            issueId: "broken_page",
            severity: "high",
            description: `Page returned HTTP status code ${page.statusCode}`,
            fixable: false,
        });
        score -= 40; // Critical failure
    }

    // --- ON-PAGE SEO (Base 25 points) ---
    if (!page.title) {
        issues.push({
            type: "on_page",
            issueId: "missing_title",
            severity: "high",
            description: "Page is missing a title tag.",
            fixable: true,
        });
        score -= 10;
    } else if (page.title.length < 30) {
        issues.push({
            type: "on_page",
            issueId: "title_too_short",
            severity: "medium",
            description: "Title tag is too short (under 30 characters).",
            fixable: true,
        });
        score -= 3;
    } else if (page.title.length > 65) {
        issues.push({
            type: "on_page",
            issueId: "title_too_long",
            severity: "low",
            description: "Title tag is too long (over 65 characters) and may be truncated.",
            fixable: true,
        });
        score -= 2;
    }

    if (!page.metaDescription) {
        issues.push({
            type: "on_page",
            issueId: "missing_meta_description",
            severity: "high",
            description: "Page is missing a meta description.",
            fixable: true,
        });
        score -= 10;
    } else if (page.metaDescription.length < 50) {
        issues.push({
            type: "on_page",
            issueId: "meta_description_too_short",
            severity: "medium",
            description: "Meta description is too short (under 50 characters).",
            fixable: true,
        });
        score -= 3;
    } else if (page.metaDescription.length > 160) {
        issues.push({
            type: "on_page",
            issueId: "meta_description_too_long",
            severity: "low",
            description: "Meta description is over 160 characters.",
            fixable: true,
        });
        score -= 2;
    }

    if (!page.h1) {
        issues.push({
            type: "on_page",
            issueId: "missing_h1",
            severity: "high",
            description: "Page is missing an H1 heading.",
            fixable: true,
        });
        score -= 5;
    }

    if (page.h2Count === 0) {
        issues.push({
            type: "on_page",
            issueId: "no_h2_tags",
            severity: "medium",
            description: "Page has no H2 tags, indicating poor heading structure.",
            fixable: true,
        });
        score -= 3;
    }

    // Multiple H1 tags
    if (page.h1Count > 1) {
        issues.push({
            type: "on_page",
            issueId: "multiple_h1",
            severity: "medium",
            description: `Page has ${page.h1Count} H1 tags. Best practice is to use exactly one H1.`,
            fixable: false,
        });
        score -= 3;
    }

    // Missing canonical URL
    if (!page.canonical) {
        issues.push({
            type: "technical",
            issueId: "missing_canonical",
            severity: "medium",
            description: "Page is missing a canonical URL tag, which can cause duplicate content issues.",
            fixable: false,
        });
        score -= 4;
    }

    // Missing Open Graph tags
    if (!page.hasOpenGraph) {
        issues.push({
            type: "on_page",
            issueId: "missing_open_graph",
            severity: "low",
            description: "Page is missing Open Graph meta tags for social sharing.",
            fixable: false,
        });
        score -= 2;
    }

    // Missing Schema / structured data
    if (!page.hasSchemaMarkup) {
        issues.push({
            type: "technical",
            issueId: "missing_schema",
            severity: "medium",
            description: "Page has no structured data (JSON-LD). Adding schema markup improves rich snippet eligibility.",
            fixable: false,
        });
        score -= 3;
    }

    // Noindex check
    if (page.robotsMeta && page.robotsMeta.toLowerCase().includes("noindex")) {
        issues.push({
            type: "technical",
            issueId: "noindex_detected",
            severity: "high",
            description: "Page has a noindex robots meta tag — it will NOT appear in search results.",
            fixable: false,
        });
        score -= 20;
    }

    // Missing viewport meta (mobile-friendliness)
    if (!page.hasViewport) {
        issues.push({
            type: "technical",
            issueId: "missing_viewport",
            severity: "medium",
            description: "Page is missing a viewport meta tag, hurting mobile usability.",
            fixable: false,
        });
        score -= 4;
    }

    // Missing HTML lang attribute
    if (!page.htmlLang) {
        issues.push({
            type: "technical",
            issueId: "missing_lang",
            severity: "low",
            description: "HTML element is missing a lang attribute, which helps search engines understand the page language.",
            fixable: false,
        });
        score -= 2;
    }

    // Low text-to-HTML ratio
    if (page.textToHtmlRatio > 0 && page.textToHtmlRatio < 10) {
        issues.push({
            type: "content",
            issueId: "low_text_html_ratio",
            severity: "low",
            description: `Text-to-HTML ratio is very low (${page.textToHtmlRatio}%). This can signal thin or bloated content.`,
            fixable: false,
        });
        score -= 2;
    }

    // SSL issue
    if (page.hasSslIssue) {
        issues.push({
            type: "technical",
            issueId: "no_https",
            severity: "high",
            description: "Page is not served over HTTPS, which is a negative ranking signal.",
            fixable: false,
        });
        score -= 10;
    }

    // --- CONTENT SEO (Base 25 points) ---
    if (page.wordCount < 300) {
        issues.push({
            type: "content",
            issueId: "thin_content",
            severity: "high",
            description: `Thin content detected (${page.wordCount} words). Recommended minimum is 300 words.`,
            fixable: true,
        });
        score -= 15;
    } else if (page.wordCount < 600) {
        issues.push({
            type: "content",
            issueId: "low_word_count",
            severity: "medium",
            description: `Low word count (${page.wordCount} words). Top ranking pages typically have more depth.`,
            fixable: true,
        });
        score -= 5;
    }

    // No images at all
    if (page.imagesCount === 0 && page.wordCount > 200) {
        issues.push({
            type: "content",
            issueId: "no_images",
            severity: "low",
            description: "Page has no images. Visual content improves engagement and dwell time.",
            fixable: false,
        });
        score -= 2;
    }

    // --- INTERNAL LINKING (Base 15 points) ---
    if (page.internalLinks === 0) {
        issues.push({
            type: "internal_link",
            issueId: "orphan_page",
            severity: "high",
            description: "This page does not link to any other internal pages.",
            fixable: true,
        });
        score -= 10;
    } else if (page.internalLinks < 3) {
        issues.push({
            type: "internal_link",
            issueId: "low_internal_links",
            severity: "low",
            description: "Page has very few internal links.",
            fixable: true,
        });
        score -= 3;
    }

    // Excessive external links
    if (page.externalLinks > 50) {
        issues.push({
            type: "internal_link",
            issueId: "excessive_external_links",
            severity: "medium",
            description: `Page has ${page.externalLinks} external links, which may dilute link equity.`,
            fixable: false,
        });
        score -= 3;
    }

    // --- IMAGE SEO ---
    if (page.missingAltCount > 0) {
        issues.push({
            type: "image",
            issueId: "missing_alt_text",
            severity: "medium",
            description: `${page.missingAltCount} images are missing alt text.`,
            fixable: true,
        });
        score -= Math.min(page.missingAltCount * 2, 8); // Max 8 points penalty for images
    }

    // --- PERFORMANCE SEO (Optional Base 20 points) ---
    if (performance) {
        if (performance.performanceScore < 50) {
            issues.push({
                type: "performance",
                issueId: "poor_mobile_speed",
                severity: "high",
                description: `Core Web Vitals failed. Mobile Speed Score: ${performance.performanceScore}/100.`,
                fixable: false,
            });
            score -= 15;
        } else if (performance.performanceScore < 85) {
            issues.push({
                type: "performance",
                issueId: "average_mobile_speed",
                severity: "medium",
                description: `Mobile Speed Score is average (${performance.performanceScore}/100). Needs optimization.`,
                fixable: false,
            });
            score -= 5;
        }

        if (performance.lcp > 2500) {
            issues.push({
                type: "performance",
                issueId: "slow_lcp",
                severity: "medium",
                description: `Largest Contentful Paint is slow (${(performance.lcp / 1000).toFixed(1)}s).`,
                fixable: false,
            });
        }
    } else if (page.loadTimeMs > 3000) {
        // Fallback performance check based on raw request time
        issues.push({
            type: "performance",
            issueId: "slow_server_response",
            severity: "medium",
            description: `Server response time was slow (${page.loadTimeMs}ms).`,
            fixable: false,
        });
        score -= 5;
    }

    return {
        score: Math.max(score, 0),
        issues,
    };
}
