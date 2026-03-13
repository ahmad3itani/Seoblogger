/**
 * Content Diagnosis Layer for the Refresh Engine
 * 
 * Deterministic analysis of WHY a post underperforms.
 * Runs before any AI touches the content.
 * 
 * Diagnoses:
 * A. Search intent match
 * B. Topical coverage gaps
 * C. Structural weakness
 * D. Freshness weakness
 * E. Snippet readiness
 */

import * as cheerio from "cheerio";

export interface DiagnosisInput {
    title: string;
    bodyHtml: string;
    url: string;
    publishedAt?: Date | null;
    topQueries?: { query: string; clicks: number; impressions: number; position: number }[];
    wordCount?: number;
}

export interface DiagnosisResult {
    // Scores (0-100)
    performanceOpportunity: number;
    declineSignal: number;
    contentWeakness: number;
    freshnessAge: number;
    indexConfidence: number;

    // Content diagnosis
    introQuality: "strong" | "adequate" | "weak" | "missing";
    headingStructure: "strong" | "adequate" | "weak" | "missing";
    faqPresent: boolean;
    conclusionPresent: boolean;
    snippetReadiness: "ready" | "partial" | "weak";

    // Gap analysis
    missingSubtopics: string[];
    outdatedSignals: string[];
    thinSections: string[];
    internalLinkOpportunity: number;

    // Extracted structure
    headings: { tag: string; text: string }[];
    wordCount: number;
    paragraphCount: number;
    internalLinkCount: number;
    externalLinkCount: number;
    imageCount: number;
    hasFaq: boolean;
    hasSchema: boolean;
}

// ─── HTML Analysis Helpers ───────────────────────────────────────

function extractHeadings(html: string): { tag: string; text: string }[] {
    const $ = cheerio.load(html);
    const headings: { tag: string; text: string }[] = [];
    $("h1, h2, h3, h4").each((_, el) => {
        headings.push({
            tag: $(el).prop("tagName")?.toLowerCase() || "h2",
            text: $(el).text().trim(),
        });
    });
    return headings;
}

function analyzeIntro(html: string): "strong" | "adequate" | "weak" | "missing" {
    const $ = cheerio.load(html);
    const firstParagraphs: string[] = [];

    $("p").each((i, el) => {
        if (i < 3) {
            const text = $(el).text().trim();
            if (text.length > 10) firstParagraphs.push(text);
        }
    });

    if (firstParagraphs.length === 0) return "missing";

    const introText = firstParagraphs.join(" ");
    const introWords = introText.split(/\s+/).length;

    // A strong intro is 40+ words, establishes the topic, doesn't start with fluff
    if (introWords >= 50) return "strong";
    if (introWords >= 25) return "adequate";
    return "weak";
}

function analyzeConclusion(html: string): boolean {
    const $ = cheerio.load(html);
    const allText = $("body").text().toLowerCase();
    const headings = extractHeadings(html);

    // Check for conclusion/summary heading
    const conclusionKeywords = ["conclusion", "summary", "final thoughts", "wrapping up", "in summary", "takeaway", "key takeaways"];
    const hasConclHead = headings.some((h) =>
        conclusionKeywords.some((kw) => h.text.toLowerCase().includes(kw))
    );
    if (hasConclHead) return true;

    // Check for concluding phrases in last 200 characters
    const lastChunk = allText.slice(-500);
    return conclusionKeywords.some((kw) => lastChunk.includes(kw));
}

function detectFaq(html: string): boolean {
    const $ = cheerio.load(html);
    const text = $("body").text().toLowerCase();
    const headings = extractHeadings(html);

    // Check headings for FAQ
    const faqKeywords = ["faq", "frequently asked", "common questions", "questions and answers"];
    if (headings.some((h) => faqKeywords.some((kw) => h.text.toLowerCase().includes(kw)))) return true;

    // Check for question patterns (3+ questions likely means FAQ-like content)
    const questionMarks = (text.match(/\?/g) || []).length;
    if (questionMarks >= 5) return true;

    // Check for FAQ schema
    if (html.includes("FAQPage") || html.includes("faqpage")) return true;

    return false;
}

function detectOutdatedSignals(html: string, publishedAt?: Date | null): string[] {
    const $ = cheerio.load(html);
    const text = $("body").text();
    const signals: string[] = [];

    const currentYear = new Date().getFullYear();

    // Check for old year references
    const yearPattern = /\b(20[0-2]\d)\b/g;
    const years = new Set<string>();
    let match;
    while ((match = yearPattern.exec(text)) !== null) {
        const year = parseInt(match[1]);
        if (year < currentYear - 1) {
            years.add(match[1]);
        }
    }
    if (years.size > 0) {
        signals.push(`References outdated years: ${Array.from(years).join(", ")}`);
    }

    // Check for "last year", "this year" with old publish date
    if (publishedAt) {
        const pubYear = new Date(publishedAt).getFullYear();
        if (pubYear < currentYear - 1) {
            if (/this year|last year|recently/i.test(text)) {
                signals.push(`Uses relative time references ("this year", "recently") but published in ${pubYear}`);
            }
        }
    }

    // Check for version numbers that might be outdated
    const versionPattern = /version\s+\d+\.\d+|v\d+\.\d+/gi;
    if (versionPattern.test(text)) {
        signals.push("Contains software version references that may be outdated");
    }

    return signals;
}

function detectThinSections(html: string): string[] {
    const $ = cheerio.load(html);
    const thin: string[] = [];
    const headings = $("h2, h3");

    headings.each((i, el) => {
        const headingText = $(el).text().trim();
        let contentLength = 0;
        let nextEl = $(el).next();

        // Walk through siblings until next heading
        while (nextEl.length > 0) {
            const tagName = nextEl.prop("tagName")?.toLowerCase() || "";
            if (["h1", "h2", "h3"].includes(tagName)) break;
            contentLength += nextEl.text().trim().length;
            nextEl = nextEl.next();
        }

        const wordCount = contentLength / 5; // rough word estimate
        if (wordCount < 50 && headingText.length > 0) {
            thin.push(headingText);
        }
    });

    return thin;
}

function analyzeSnippetReadiness(html: string): "ready" | "partial" | "weak" {
    const $ = cheerio.load(html);

    // Check for direct answer paragraph (short, concise paragraph near the top)
    let hasDirectAnswer = false;
    $("p").each((i, el) => {
        if (i < 3) {
            const text = $(el).text().trim();
            const words = text.split(/\s+/).length;
            // A direct answer is 20-60 words, gives a clear answer
            if (words >= 15 && words <= 70) {
                hasDirectAnswer = true;
            }
        }
    });

    const hasFaq = detectFaq(html);
    const headings = extractHeadings(html);
    const hasStructuredH2s = headings.filter((h) => h.tag === "h2").length >= 3;

    if (hasDirectAnswer && hasFaq && hasStructuredH2s) return "ready";
    if (hasDirectAnswer || hasStructuredH2s) return "partial";
    return "weak";
}

function countLinks(html: string, baseUrl?: string): { internal: number; external: number } {
    const $ = cheerio.load(html);
    let internal = 0;
    let external = 0;

    $("a[href]").each((_, el) => {
        const href = $(el).attr("href") || "";
        if (href.startsWith("#") || href.startsWith("javascript:")) return;
        if (baseUrl && (href.includes(baseUrl) || href.startsWith("/"))) {
            internal++;
        } else if (href.startsWith("http")) {
            external++;
        }
    });

    return { internal, external };
}

// ─── Main Diagnosis Function ─────────────────────────────────────

export function diagnoseContent(input: DiagnosisInput): DiagnosisResult {
    const $ = cheerio.load(input.bodyHtml);
    const bodyText = $("body").text().replace(/\s+/g, " ").trim();
    const wordCount = input.wordCount || bodyText.split(/\s+/).length;

    const headings = extractHeadings(input.bodyHtml);
    const introQuality = analyzeIntro(input.bodyHtml);
    const conclusionPresent = analyzeConclusion(input.bodyHtml);
    const faqPresent = detectFaq(input.bodyHtml);
    const outdatedSignals = detectOutdatedSignals(input.bodyHtml, input.publishedAt);
    const thinSections = detectThinSections(input.bodyHtml);
    const snippetReadiness = analyzeSnippetReadiness(input.bodyHtml);
    const links = countLinks(input.bodyHtml);
    const imageCount = $("img").length;
    const hasSchema = input.bodyHtml.includes("application/ld+json");
    const paragraphCount = $("p").length;

    // Heading structure quality
    const h2Count = headings.filter((h) => h.tag === "h2").length;
    let headingStructure: "strong" | "adequate" | "weak" | "missing" = "missing";
    if (h2Count >= 5) headingStructure = "strong";
    else if (h2Count >= 3) headingStructure = "adequate";
    else if (h2Count >= 1) headingStructure = "weak";

    // Content weakness score
    let contentWeakness = 0;
    if (wordCount < 300) contentWeakness += 35;
    else if (wordCount < 600) contentWeakness += 20;
    if (h2Count === 0) contentWeakness += 20;
    if (!faqPresent) contentWeakness += 15;
    if (links.internal === 0) contentWeakness += 15;
    if (introQuality === "weak" || introQuality === "missing") contentWeakness += 10;
    if (!conclusionPresent) contentWeakness += 5;
    contentWeakness = Math.min(100, contentWeakness);

    // Freshness age score
    let freshnessAge = 0;
    if (input.publishedAt) {
        const ageMonths = (Date.now() - new Date(input.publishedAt).getTime()) / (30 * 86400000);
        if (ageMonths > 24) freshnessAge = 40;
        else if (ageMonths > 12) freshnessAge = 25;
        else if (ageMonths > 6) freshnessAge = 10;
    }
    freshnessAge += Math.min(60, outdatedSignals.length * 20);
    freshnessAge = Math.min(100, freshnessAge);

    // Internal link opportunity
    const idealLinks = Math.max(3, Math.floor(wordCount / 300));
    const internalLinkOpportunity = Math.max(0, idealLinks - links.internal);

    // Missing subtopics — derived from queries user ranks for but doesn't cover well
    const missingSubtopics: string[] = [];
    if (input.topQueries) {
        for (const q of input.topQueries) {
            const queryWords = q.query.toLowerCase().split(/\s+/);
            const titleLower = input.title.toLowerCase();
            const bodyLower = bodyText.toLowerCase();
            // If query has words not well-represented in the content, it's a gap
            const missingWords = queryWords.filter((w) => w.length > 3 && !bodyLower.includes(w) && !titleLower.includes(w));
            if (missingWords.length > 0 && q.impressions > 10) {
                missingSubtopics.push(q.query);
            }
        }
    }

    return {
        performanceOpportunity: 0, // Filled by scoring.ts
        declineSignal: 0,
        contentWeakness,
        freshnessAge,
        indexConfidence: 70,

        introQuality,
        headingStructure,
        faqPresent,
        conclusionPresent,
        snippetReadiness,

        missingSubtopics: missingSubtopics.slice(0, 10),
        outdatedSignals,
        thinSections,
        internalLinkOpportunity,

        headings,
        wordCount,
        paragraphCount,
        internalLinkCount: links.internal,
        externalLinkCount: links.external,
        imageCount,
        hasFaq: faqPresent,
        hasSchema,
    };
}
