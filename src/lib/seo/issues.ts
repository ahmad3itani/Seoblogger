/**
 * SEO Issue Taxonomy System
 * 
 * Master registry of all detectable SEO issues.
 * Each issue has: category, severity, detection method, fixability,
 * safety level, confidence framework, and Blogger-specific context.
 */

// ─── Issue Categories ────────────────────────────────────────────────────────

export type IssueCategory =
    | "technical"
    | "content"
    | "ctr"
    | "internal_linking"
    | "image"
    | "performance"
    | "indexing"
    | "schema";

export type IssueSeverity = "critical" | "high" | "medium" | "low" | "info";

export type DetectionSource =
    | "crawl"
    | "search_console"
    | "blogger_api"
    | "ai_analysis"
    | "pagespeed";

export type FixabilityLevel =
    | "auto"       // Can be fixed automatically with high confidence
    | "assisted"   // AI generates fix, user reviews and approves
    | "guided"     // Tool explains what to do, user does it manually
    | "manual";    // Requires manual work outside the tool (e.g., theme changes)

export type SafetyLevel =
    | "safe"              // No risk, purely additive or metadata change
    | "safe_with_review"  // Safe but user should review before applying
    | "caution"           // Could affect layout or SEO if done wrong
    | "risky";            // Significant risk, human review mandatory

export type ConfidenceLevel = "high" | "medium" | "low";

// ─── Issue Definition ────────────────────────────────────────────────────────

export interface IssueDefinition {
    id: string;
    category: IssueCategory;
    severity: IssueSeverity;
    title: string;
    description: string;
    whyItMatters: string;
    detectedBy: DetectionSource[];
    fixability: FixabilityLevel;
    safety: SafetyLevel;
    requiresBloggerConnection: boolean;
    requiresSearchConsole: boolean;
    impactScore: number;       // 1-100, used for prioritization
    effortScore: number;       // 1-100, lower = easier to fix
    bloggerSpecific: boolean;  // Is this issue specific to Blogger platform?
    bloggerNote?: string;      // Blogger-specific context for this issue
}

// ─── Detected Issue Instance ─────────────────────────────────────────────────

export interface DetectedIssue {
    definitionId: string;
    pageUrl: string;
    pageTitle: string;
    category: IssueCategory;
    severity: IssueSeverity;
    title: string;
    description: string;
    whyItMatters: string;
    fixability: FixabilityLevel;
    safety: SafetyLevel;
    confidence: ConfidenceLevel;
    confidenceScore: number;    // 0-100
    confidenceReason: string;
    detectedBy: DetectionSource;
    currentValue?: string;      // What the current state is
    suggestedValue?: string;    // What it should be
    impactScore: number;
    effortScore: number;
    priorityScore: number;      // Computed: combines impact, effort, confidence
    fixable: boolean;
    bloggerNote?: string;
    metadata?: Record<string, any>;
}

// ─── Fix Suggestion with Trust Layer ─────────────────────────────────────────

export interface FixSuggestionData {
    issueId: string;
    type: "auto" | "assisted" | "guided";
    confidence: ConfidenceLevel;
    confidenceScore: number;
    confidenceReason: string;
    safety: SafetyLevel;
    safetyNote: string;
    suggestedFix: string;
    explanation: string;
    beforeContent?: string;
    afterContent?: string;
    humanReviewRecommended: boolean;
    estimatedImpact: "high" | "medium" | "low";
    rollbackAvailable: boolean;
}

// ─── Master Issue Registry ───────────────────────────────────────────────────

export const ISSUE_REGISTRY: Record<string, IssueDefinition> = {

    // ═══ TECHNICAL ISSUES ═══════════════════════════════════════════════════

    missing_title: {
        id: "missing_title",
        category: "technical",
        severity: "critical",
        title: "Missing Page Title",
        description: "This page has no <title> tag.",
        whyItMatters: "The title tag is the single most important on-page SEO element. Search engines use it as the primary ranking signal and display it in search results.",
        detectedBy: ["crawl"],
        fixability: "assisted",
        safety: "safe_with_review",
        requiresBloggerConnection: true,
        requiresSearchConsole: false,
        impactScore: 95,
        effortScore: 15,
        bloggerSpecific: false,
    },

    title_too_short: {
        id: "title_too_short",
        category: "technical",
        severity: "medium",
        title: "Title Too Short",
        description: "The title tag is under 30 characters. Short titles waste valuable SERP real estate.",
        whyItMatters: "Longer, descriptive titles tend to get higher CTR and help search engines understand the page better.",
        detectedBy: ["crawl"],
        fixability: "assisted",
        safety: "safe_with_review",
        requiresBloggerConnection: true,
        requiresSearchConsole: false,
        impactScore: 55,
        effortScore: 15,
        bloggerSpecific: false,
    },

    title_too_long: {
        id: "title_too_long",
        category: "technical",
        severity: "low",
        title: "Title Too Long",
        description: "The title tag exceeds 60 characters and will be truncated in search results.",
        whyItMatters: "Truncated titles may lose important keywords or look incomplete, reducing CTR.",
        detectedBy: ["crawl"],
        fixability: "assisted",
        safety: "safe_with_review",
        requiresBloggerConnection: true,
        requiresSearchConsole: false,
        impactScore: 35,
        effortScore: 10,
        bloggerSpecific: false,
    },

    missing_meta_description: {
        id: "missing_meta_description",
        category: "technical",
        severity: "high",
        title: "Missing Meta Description",
        description: "This page has no meta description tag.",
        whyItMatters: "Without a meta description, search engines generate their own snippet. A custom description gives you control over what users see in search results.",
        detectedBy: ["crawl"],
        fixability: "assisted",
        safety: "safe_with_review",
        requiresBloggerConnection: true,
        requiresSearchConsole: false,
        impactScore: 70,
        effortScore: 15,
        bloggerSpecific: true,
        bloggerNote: "Blogger uses the 'search description' field in post editor. This can be updated via the Blogger API.",
    },

    meta_description_too_short: {
        id: "meta_description_too_short",
        category: "technical",
        severity: "low",
        title: "Meta Description Too Short",
        description: "The meta description is under 120 characters.",
        whyItMatters: "Short descriptions waste SERP space and may not adequately describe the page content.",
        detectedBy: ["crawl"],
        fixability: "assisted",
        safety: "safe_with_review",
        requiresBloggerConnection: true,
        requiresSearchConsole: false,
        impactScore: 30,
        effortScore: 10,
        bloggerSpecific: false,
    },

    meta_description_too_long: {
        id: "meta_description_too_long",
        category: "technical",
        severity: "low",
        title: "Meta Description Too Long",
        description: "The meta description exceeds 160 characters and will be truncated.",
        whyItMatters: "Google typically shows 150-160 characters. The rest is cut off.",
        detectedBy: ["crawl"],
        fixability: "assisted",
        safety: "safe_with_review",
        requiresBloggerConnection: true,
        requiresSearchConsole: false,
        impactScore: 20,
        effortScore: 10,
        bloggerSpecific: false,
    },

    missing_h1: {
        id: "missing_h1",
        category: "technical",
        severity: "high",
        title: "Missing H1 Heading",
        description: "This page has no H1 heading tag.",
        whyItMatters: "The H1 is a strong ranking signal that tells search engines the main topic of the page.",
        detectedBy: ["crawl"],
        fixability: "guided",
        safety: "caution",
        requiresBloggerConnection: false,
        requiresSearchConsole: false,
        impactScore: 65,
        effortScore: 20,
        bloggerSpecific: true,
        bloggerNote: "In most Blogger themes, the post title is automatically wrapped in an H1 tag. If H1 is missing, this is usually a theme issue, not a content issue.",
    },

    multiple_h1: {
        id: "multiple_h1",
        category: "technical",
        severity: "medium",
        title: "Multiple H1 Tags",
        description: "This page has more than one H1 tag.",
        whyItMatters: "While not strictly an error, multiple H1s can dilute the topical signal and confuse search engines about the main topic.",
        detectedBy: ["crawl"],
        fixability: "guided",
        safety: "caution",
        requiresBloggerConnection: false,
        requiresSearchConsole: false,
        impactScore: 40,
        effortScore: 25,
        bloggerSpecific: true,
        bloggerNote: "Some Blogger themes add an extra H1 for the blog title. This is a theme-level issue that cannot be fixed through content editing.",
    },

    missing_canonical: {
        id: "missing_canonical",
        category: "indexing",
        severity: "medium",
        title: "Missing Canonical Tag",
        description: "This page does not specify a canonical URL.",
        whyItMatters: "Without a canonical tag, search engines may index duplicate versions of the same page.",
        detectedBy: ["crawl"],
        fixability: "manual",
        safety: "risky",
        requiresBloggerConnection: false,
        requiresSearchConsole: false,
        impactScore: 55,
        effortScore: 60,
        bloggerSpecific: true,
        bloggerNote: "Blogger usually handles canonical tags automatically. If missing, this is likely a theme issue requiring template editing.",
    },

    missing_viewport: {
        id: "missing_viewport",
        category: "technical",
        severity: "high",
        title: "Missing Viewport Meta Tag",
        description: "The page lacks a viewport meta tag for mobile responsiveness.",
        whyItMatters: "Google uses mobile-first indexing. Without a viewport tag, the page won't render correctly on mobile devices.",
        detectedBy: ["crawl"],
        fixability: "manual",
        safety: "risky",
        requiresBloggerConnection: false,
        requiresSearchConsole: false,
        impactScore: 75,
        effortScore: 70,
        bloggerSpecific: true,
        bloggerNote: "This is a Blogger theme issue. The viewport tag must be added to the theme's HTML template.",
    },

    missing_lang: {
        id: "missing_lang",
        category: "technical",
        severity: "low",
        title: "Missing HTML Language Attribute",
        description: "The <html> tag does not specify a language attribute.",
        whyItMatters: "The lang attribute helps search engines understand the language of the content and serve it to the right audience.",
        detectedBy: ["crawl"],
        fixability: "manual",
        safety: "safe",
        requiresBloggerConnection: false,
        requiresSearchConsole: false,
        impactScore: 20,
        effortScore: 50,
        bloggerSpecific: true,
        bloggerNote: "Blogger themes may not include the lang attribute. It needs to be added in the theme HTML template.",
    },

    ssl_issue: {
        id: "ssl_issue",
        category: "technical",
        severity: "critical",
        title: "SSL/HTTPS Not Enabled",
        description: "This page is served over HTTP instead of HTTPS.",
        whyItMatters: "HTTPS is a ranking factor. Browsers also show 'Not Secure' warnings for HTTP pages.",
        detectedBy: ["crawl"],
        fixability: "guided",
        safety: "safe",
        requiresBloggerConnection: false,
        requiresSearchConsole: false,
        impactScore: 90,
        effortScore: 10,
        bloggerSpecific: true,
        bloggerNote: "Enable HTTPS in Blogger Settings > Basic > HTTPS. This is a one-click fix.",
    },

    // ═══ CONTENT ISSUES ═════════════════════════════════════════════════════

    thin_content: {
        id: "thin_content",
        category: "content",
        severity: "high",
        title: "Thin Content",
        description: "This page has fewer than 300 words of content.",
        whyItMatters: "Thin pages rarely rank well. Search engines prefer comprehensive content that fully answers user intent.",
        detectedBy: ["crawl"],
        fixability: "assisted",
        safety: "safe_with_review",
        requiresBloggerConnection: true,
        requiresSearchConsole: false,
        impactScore: 75,
        effortScore: 70,
        bloggerSpecific: false,
    },

    weak_intro: {
        id: "weak_intro",
        category: "content",
        severity: "medium",
        title: "Weak Introduction",
        description: "The first paragraph does not contain the target keyword or is too short to establish topic relevance.",
        whyItMatters: "The intro paragraph sets expectations for both readers and search engines. Including the keyword early signals relevance.",
        detectedBy: ["ai_analysis"],
        fixability: "assisted",
        safety: "safe_with_review",
        requiresBloggerConnection: true,
        requiresSearchConsole: false,
        impactScore: 45,
        effortScore: 25,
        bloggerSpecific: false,
    },

    no_headings_structure: {
        id: "no_headings_structure",
        category: "content",
        severity: "medium",
        title: "Poor Heading Structure",
        description: "This page has no H2 headings to break up content into logical sections.",
        whyItMatters: "Headings help readers scan content and help search engines understand content structure. They're also used for featured snippets.",
        detectedBy: ["crawl"],
        fixability: "assisted",
        safety: "safe_with_review",
        requiresBloggerConnection: true,
        requiresSearchConsole: false,
        impactScore: 50,
        effortScore: 40,
        bloggerSpecific: false,
    },

    missing_faq: {
        id: "missing_faq",
        category: "content",
        severity: "low",
        title: "No FAQ Section",
        description: "This page could benefit from an FAQ section to capture long-tail search queries.",
        whyItMatters: "FAQ sections can win rich snippet results in Google and capture People Also Ask queries.",
        detectedBy: ["ai_analysis"],
        fixability: "assisted",
        safety: "safe_with_review",
        requiresBloggerConnection: true,
        requiresSearchConsole: false,
        impactScore: 40,
        effortScore: 30,
        bloggerSpecific: false,
    },

    outdated_content: {
        id: "outdated_content",
        category: "content",
        severity: "medium",
        title: "Potentially Outdated Content",
        description: "This content references outdated years or has not been updated recently.",
        whyItMatters: "Fresh content tends to rank better. Pages with outdated year references may lose clicks and rankings.",
        detectedBy: ["crawl", "ai_analysis"],
        fixability: "assisted",
        safety: "safe_with_review",
        requiresBloggerConnection: true,
        requiresSearchConsole: false,
        impactScore: 55,
        effortScore: 35,
        bloggerSpecific: false,
    },

    low_readability: {
        id: "low_readability",
        category: "content",
        severity: "low",
        title: "Low Readability Score",
        description: "The content has long paragraphs and complex sentences that may be hard to read.",
        whyItMatters: "Content readability affects user engagement. Easier-to-read content keeps readers on the page longer.",
        detectedBy: ["ai_analysis"],
        fixability: "assisted",
        safety: "safe_with_review",
        requiresBloggerConnection: true,
        requiresSearchConsole: false,
        impactScore: 30,
        effortScore: 45,
        bloggerSpecific: false,
    },

    missing_conclusion: {
        id: "missing_conclusion",
        category: "content",
        severity: "low",
        title: "No Conclusion or Summary",
        description: "This page lacks a concluding section that summarizes the key points.",
        whyItMatters: "A strong conclusion improves user satisfaction and can include a call-to-action that drives engagement.",
        detectedBy: ["ai_analysis"],
        fixability: "assisted",
        safety: "safe_with_review",
        requiresBloggerConnection: true,
        requiresSearchConsole: false,
        impactScore: 25,
        effortScore: 25,
        bloggerSpecific: false,
    },

    // ═══ CTR ISSUES ═════════════════════════════════════════════════════════

    high_impressions_low_ctr: {
        id: "high_impressions_low_ctr",
        category: "ctr",
        severity: "high",
        title: "High Impressions but Low CTR",
        description: "This page gets many search impressions but few clicks.",
        whyItMatters: "A low CTR means your title and description aren't compelling enough. Improving them can significantly increase traffic without needing better rankings.",
        detectedBy: ["search_console"],
        fixability: "assisted",
        safety: "safe_with_review",
        requiresBloggerConnection: true,
        requiresSearchConsole: true,
        impactScore: 90,
        effortScore: 20,
        bloggerSpecific: false,
    },

    declining_clicks: {
        id: "declining_clicks",
        category: "ctr",
        severity: "high",
        title: "Declining Click Trend",
        description: "This page is losing clicks compared to the previous period.",
        whyItMatters: "Declining clicks may indicate dropping rankings, increased competition, or stale content that needs refreshing.",
        detectedBy: ["search_console"],
        fixability: "assisted",
        safety: "safe_with_review",
        requiresBloggerConnection: true,
        requiresSearchConsole: true,
        impactScore: 80,
        effortScore: 40,
        bloggerSpecific: false,
    },

    striking_distance: {
        id: "striking_distance",
        category: "ctr",
        severity: "medium",
        title: "Striking Distance Keyword",
        description: "This page ranks at positions 8-20 for valuable keywords. A small improvement could push it to page 1.",
        whyItMatters: "Pages just outside the top results have the highest potential for quick traffic gains with targeted improvements.",
        detectedBy: ["search_console"],
        fixability: "assisted",
        safety: "safe_with_review",
        requiresBloggerConnection: true,
        requiresSearchConsole: true,
        impactScore: 85,
        effortScore: 35,
        bloggerSpecific: false,
    },

    query_page_mismatch: {
        id: "query_page_mismatch",
        category: "ctr",
        severity: "medium",
        title: "Query-Page Mismatch",
        description: "The queries this page ranks for don't match its content well.",
        whyItMatters: "When content doesn't match search intent, both CTR and rankings suffer. Realigning content to match queries can improve both.",
        detectedBy: ["search_console", "ai_analysis"],
        fixability: "assisted",
        safety: "safe_with_review",
        requiresBloggerConnection: true,
        requiresSearchConsole: true,
        impactScore: 70,
        effortScore: 50,
        bloggerSpecific: false,
    },

    // ═══ INTERNAL LINKING ISSUES ════════════════════════════════════════════

    orphan_page: {
        id: "orphan_page",
        category: "internal_linking",
        severity: "high",
        title: "Orphan Page",
        description: "This page has zero internal links pointing to it.",
        whyItMatters: "Orphan pages are hard for search engines to discover and crawl. They also miss out on link equity from other pages.",
        detectedBy: ["crawl"],
        fixability: "assisted",
        safety: "safe_with_review",
        requiresBloggerConnection: true,
        requiresSearchConsole: false,
        impactScore: 75,
        effortScore: 25,
        bloggerSpecific: false,
    },

    weak_internal_support: {
        id: "weak_internal_support",
        category: "internal_linking",
        severity: "medium",
        title: "Weak Internal Link Support",
        description: "This page has very few internal links pointing to it (1-2 links).",
        whyItMatters: "Pages with more internal links receive more link equity and are crawled more frequently by search engines.",
        detectedBy: ["crawl"],
        fixability: "assisted",
        safety: "safe_with_review",
        requiresBloggerConnection: true,
        requiresSearchConsole: false,
        impactScore: 55,
        effortScore: 25,
        bloggerSpecific: false,
    },

    no_outgoing_links: {
        id: "no_outgoing_links",
        category: "internal_linking",
        severity: "low",
        title: "No Outgoing Internal Links",
        description: "This page contains no internal links to other pages on the site.",
        whyItMatters: "Pages that don't link to other content create dead ends. Internal links distribute link equity and help users discover related content.",
        detectedBy: ["crawl"],
        fixability: "assisted",
        safety: "safe_with_review",
        requiresBloggerConnection: true,
        requiresSearchConsole: false,
        impactScore: 40,
        effortScore: 20,
        bloggerSpecific: false,
    },

    low_anchor_diversity: {
        id: "low_anchor_diversity",
        category: "internal_linking",
        severity: "low",
        title: "Low Anchor Text Diversity",
        description: "Internal links to this page all use the same or very similar anchor text.",
        whyItMatters: "Varied anchor text helps search engines understand the page from multiple angles and looks more natural.",
        detectedBy: ["crawl"],
        fixability: "guided",
        safety: "safe",
        requiresBloggerConnection: false,
        requiresSearchConsole: false,
        impactScore: 25,
        effortScore: 30,
        bloggerSpecific: false,
    },

    important_page_low_links: {
        id: "important_page_low_links",
        category: "internal_linking",
        severity: "high",
        title: "High-Traffic Page with Poor Internal Support",
        description: "This page gets significant Search Console impressions but has few internal links supporting it.",
        whyItMatters: "Your most important pages should have the strongest internal link support. This mismatch suggests link equity is not being distributed optimally.",
        detectedBy: ["crawl", "search_console"],
        fixability: "assisted",
        safety: "safe_with_review",
        requiresBloggerConnection: true,
        requiresSearchConsole: true,
        impactScore: 85,
        effortScore: 25,
        bloggerSpecific: false,
    },

    // ═══ IMAGE ISSUES ═══════════════════════════════════════════════════════

    missing_alt_text: {
        id: "missing_alt_text",
        category: "image",
        severity: "medium",
        title: "Images Missing Alt Text",
        description: "One or more images on this page lack alt text attributes.",
        whyItMatters: "Alt text helps search engines understand images and improves accessibility. Images with alt text can appear in Google Image search.",
        detectedBy: ["crawl"],
        fixability: "assisted",
        safety: "safe_with_review",
        requiresBloggerConnection: true,
        requiresSearchConsole: false,
        impactScore: 45,
        effortScore: 15,
        bloggerSpecific: false,
    },

    no_images: {
        id: "no_images",
        category: "image",
        severity: "low",
        title: "No Images in Content",
        description: "This page contains no images.",
        whyItMatters: "Visual content improves user engagement, reduces bounce rate, and can appear in image search results.",
        detectedBy: ["crawl"],
        fixability: "guided",
        safety: "safe",
        requiresBloggerConnection: false,
        requiresSearchConsole: false,
        impactScore: 25,
        effortScore: 40,
        bloggerSpecific: false,
    },

    // ═══ PERFORMANCE ISSUES ═════════════════════════════════════════════════

    slow_page: {
        id: "slow_page",
        category: "performance",
        severity: "high",
        title: "Slow Page Load Time",
        description: "This page takes over 3 seconds to load.",
        whyItMatters: "Page speed is a confirmed Google ranking factor. Slow pages also have higher bounce rates.",
        detectedBy: ["crawl", "pagespeed"],
        fixability: "guided",
        safety: "safe",
        requiresBloggerConnection: false,
        requiresSearchConsole: false,
        impactScore: 70,
        effortScore: 60,
        bloggerSpecific: true,
        bloggerNote: "Blogger page speed is largely determined by the theme. Heavy themes with many widgets slow down loading.",
    },

    low_text_html_ratio: {
        id: "low_text_html_ratio",
        category: "performance",
        severity: "low",
        title: "Low Text-to-HTML Ratio",
        description: "The page has a very low text-to-HTML ratio, suggesting bloated markup.",
        whyItMatters: "A low ratio may indicate excessive code, large templates, or thin content, all of which can affect performance.",
        detectedBy: ["crawl"],
        fixability: "guided",
        safety: "safe",
        requiresBloggerConnection: false,
        requiresSearchConsole: false,
        impactScore: 20,
        effortScore: 50,
        bloggerSpecific: true,
        bloggerNote: "Blogger themes often have a lot of template code. This is mostly a theme issue.",
    },

    // ═══ INDEXING ISSUES ════════════════════════════════════════════════════

    noindex_detected: {
        id: "noindex_detected",
        category: "indexing",
        severity: "critical",
        title: "Page Blocked from Indexing",
        description: "This page has a noindex robots directive, preventing it from appearing in search results.",
        whyItMatters: "If this page should be indexed, the noindex directive is blocking all search traffic to it.",
        detectedBy: ["crawl"],
        fixability: "manual",
        safety: "risky",
        requiresBloggerConnection: false,
        requiresSearchConsole: false,
        impactScore: 95,
        effortScore: 40,
        bloggerSpecific: true,
        bloggerNote: "Check Blogger Settings > Search preferences > Custom Robots Header Tags. The noindex may be set site-wide or for specific page types.",
    },

    missing_og_tags: {
        id: "missing_og_tags",
        category: "schema",
        severity: "low",
        title: "Missing Open Graph Tags",
        description: "This page lacks Open Graph meta tags for social media sharing.",
        whyItMatters: "Without OG tags, social media platforms may show incorrect titles, descriptions, or images when the page is shared.",
        detectedBy: ["crawl"],
        fixability: "manual",
        safety: "safe",
        requiresBloggerConnection: false,
        requiresSearchConsole: false,
        impactScore: 20,
        effortScore: 40,
        bloggerSpecific: true,
        bloggerNote: "Open Graph tags are typically added in the Blogger theme template.",
    },

    missing_schema: {
        id: "missing_schema",
        category: "schema",
        severity: "medium",
        title: "No Schema Markup",
        description: "This page has no structured data (JSON-LD schema markup).",
        whyItMatters: "Schema markup helps search engines understand content better and can enable rich results (stars, FAQs, breadcrumbs).",
        detectedBy: ["crawl"],
        fixability: "assisted",
        safety: "safe_with_review",
        requiresBloggerConnection: true,
        requiresSearchConsole: false,
        impactScore: 45,
        effortScore: 35,
        bloggerSpecific: false,
    },

    http_error: {
        id: "http_error",
        category: "technical",
        severity: "critical",
        title: "HTTP Error",
        description: "This page returned an HTTP error status code.",
        whyItMatters: "Error pages waste crawl budget and create a poor user experience. 404 errors can also cause ranking drops.",
        detectedBy: ["crawl"],
        fixability: "manual",
        safety: "risky",
        requiresBloggerConnection: false,
        requiresSearchConsole: false,
        impactScore: 90,
        effortScore: 30,
        bloggerSpecific: false,
    },

    // ═══ REFRESH OPPORTUNITIES ══════════════════════════════════════════════

    declining_impressions: {
        id: "declining_impressions",
        category: "content",
        severity: "medium",
        title: "Declining Search Impressions",
        description: "This page is losing impressions compared to the previous period.",
        whyItMatters: "Declining impressions often signal that the content is becoming less relevant or that competitors have published better content.",
        detectedBy: ["search_console"],
        fixability: "assisted",
        safety: "safe_with_review",
        requiresBloggerConnection: true,
        requiresSearchConsole: true,
        impactScore: 70,
        effortScore: 45,
        bloggerSpecific: false,
    },

    refresh_candidate: {
        id: "refresh_candidate",
        category: "content",
        severity: "medium",
        title: "Content Refresh Candidate",
        description: "This page hasn't been updated in over 6 months and still receives search traffic.",
        whyItMatters: "Refreshing content that already ranks can boost its performance. Google favors fresh, updated content.",
        detectedBy: ["crawl", "search_console"],
        fixability: "assisted",
        safety: "safe_with_review",
        requiresBloggerConnection: true,
        requiresSearchConsole: false,
        impactScore: 65,
        effortScore: 45,
        bloggerSpecific: false,
    },
};

// ─── Helper Functions ────────────────────────────────────────────────────────

export function getIssueDefinition(id: string): IssueDefinition | undefined {
    return ISSUE_REGISTRY[id];
}

export function getIssuesByCategory(category: IssueCategory): IssueDefinition[] {
    return Object.values(ISSUE_REGISTRY).filter((i) => i.category === category);
}

export function getIssuesBySeverity(severity: IssueSeverity): IssueDefinition[] {
    return Object.values(ISSUE_REGISTRY).filter((i) => i.severity === severity);
}

export function getAutoFixableIssues(): IssueDefinition[] {
    return Object.values(ISSUE_REGISTRY).filter(
        (i) => i.fixability === "auto" || i.fixability === "assisted"
    );
}

export function getManualOnlyIssues(): IssueDefinition[] {
    return Object.values(ISSUE_REGISTRY).filter(
        (i) => i.fixability === "manual" || i.fixability === "guided"
    );
}

export function getBloggerSpecificIssues(): IssueDefinition[] {
    return Object.values(ISSUE_REGISTRY).filter((i) => i.bloggerSpecific);
}

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
    technical: "Technical SEO",
    content: "Content Quality",
    ctr: "CTR & Rankings",
    internal_linking: "Internal Linking",
    image: "Images",
    performance: "Performance",
    indexing: "Indexing",
    schema: "Schema & Structured Data",
};

export const SEVERITY_ORDER: Record<IssueSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
};

export const CATEGORY_WEIGHTS: Record<IssueCategory, number> = {
    technical: 20,
    content: 25,
    ctr: 15,
    internal_linking: 15,
    image: 5,
    performance: 10,
    indexing: 5,
    schema: 5,
};
