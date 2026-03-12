/**
 * Internal Linking Engine
 * 
 * Builds a full internal link graph from Blogger posts,
 * detects pages needing more internal support,
 * finds relevant source pages with candidate anchor phrases,
 * and scores/ranks all opportunities.
 */

import * as cheerio from "cheerio";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ParagraphData {
    index: number;
    html: string;
    text: string;
    existingLinkCount: number;
    existingLinkTargets: string[];
    wordCount: number;
}

export interface InternalLink {
    targetUrl: string;
    anchorText: string;
    paragraphIndex: number;
}

export interface PageNode {
    url: string;
    postId: string;
    title: string;
    htmlContent: string;
    paragraphs: ParagraphData[];
    outgoingInternalLinks: InternalLink[];
    incomingCount: number;
    outgoingCount: number;
    wordCount: number;
    keywords: string[];
}

export interface LinkGraphStats {
    totalPages: number;
    totalInternalLinks: number;
    avgIncomingLinks: number;
    avgOutgoingLinks: number;
    orphanPages: number;
    weakPages: number;
    strongPages: number;
}

export interface LinkOpportunity {
    id: string;
    sourceUrl: string;
    sourceTitle: string;
    sourcePostId: string;
    targetUrl: string;
    targetTitle: string;
    targetPostId: string;
    candidatePhrases: string[];
    sourceParagraphIndex: number;
    sourceParagraphText: string;
    sourceParagraphHtml: string;
    relevanceScore: number;
    priority: "high" | "medium" | "low";
    reason: string;
    targetIncomingCount: number;
    sourceOutgoingCount: number;
}

export interface LinkGraph {
    pages: PageNode[];
    stats: LinkGraphStats;
    opportunities: LinkOpportunity[];
}

// ─── URL Normalization ──────────────────────────────────────────────────────

function normalizeUrl(href: string, baseUrl: string): string {
    try {
        const url = new URL(href, baseUrl);
        // Remove trailing slash, lowercase, strip hash/search params
        let normalized = url.origin + url.pathname;
        normalized = normalized.replace(/\/+$/, "");
        return normalized.toLowerCase();
    } catch {
        return href.toLowerCase().replace(/\/+$/, "");
    }
}

// ─── Keyword Extraction ─────────────────────────────────────────────────────

const STOP_WORDS = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "shall", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "up", "about", "into", "through",
    "during", "before", "after", "above", "below", "between", "out", "off",
    "over", "under", "again", "further", "then", "once", "here", "there",
    "when", "where", "why", "how", "all", "both", "each", "few", "more",
    "most", "other", "some", "such", "no", "nor", "not", "only", "own",
    "same", "so", "than", "too", "very", "just", "because", "as", "until",
    "while", "although", "though", "if", "this", "that", "these", "those",
    "i", "me", "my", "you", "your", "he", "him", "his", "she", "her",
    "it", "its", "we", "our", "they", "them", "their", "what", "which",
    "who", "whom", "and", "but", "or", "also", "like", "get", "got",
    "make", "made", "know", "take", "come", "want", "look", "use", "find",
    "give", "tell", "work", "call", "try", "ask", "need", "feel", "become",
    "leave", "put", "mean", "keep", "let", "begin", "seem", "help", "show",
    "hear", "play", "run", "move", "live", "believe", "bring", "happen",
    "write", "provide", "sit", "stand", "lose", "pay", "meet", "include",
    "continue", "set", "learn", "change", "lead", "understand", "watch",
    "follow", "stop", "create", "speak", "read", "allow", "add", "spend",
    "grow", "open", "walk", "win", "offer", "think", "say", "much", "well",
    "many", "really", "even", "back", "any", "good", "new", "first", "last",
    "long", "great", "little", "just", "still", "thing", "things", "way",
    "post", "blog", "page", "click", "read", "article", "content",
]);

function extractKeywords(text: string): string[] {
    const words = text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

    const freq: Record<string, number> = {};
    words.forEach((w) => {
        freq[w] = (freq[w] || 0) + 1;
    });

    return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 25)
        .map(([word]) => word);
}

// ─── Parse a Single Post ────────────────────────────────────────────────────

export function parsePost(
    postId: string,
    title: string,
    url: string,
    htmlContent: string,
    siteBaseUrl: string
): PageNode {
    const $ = cheerio.load(htmlContent || "");
    const paragraphs: ParagraphData[] = [];
    const outgoingInternalLinks: InternalLink[] = [];
    let baseHost: string;

    try {
        baseHost = new URL(siteBaseUrl).hostname;
    } catch {
        baseHost = siteBaseUrl;
    }

    // Extract paragraphs (meaningful text blocks)
    const seen = new Set<string>();
    $("p, li, blockquote, td").each((_i, el) => {
        const html = $(el).html() || "";
        const text = $(el).text().trim();
        if (text.length < 30 || seen.has(text)) return;
        seen.add(text);

        const existingTargets: string[] = [];
        $(el)
            .find("a[href]")
            .each((_, a) => {
                const href = $(a).attr("href") || "";
                if (href.includes(baseHost) || href.startsWith("/")) {
                    existingTargets.push(normalizeUrl(href, siteBaseUrl));
                }
            });

        paragraphs.push({
            index: paragraphs.length,
            html,
            text,
            existingLinkCount: existingTargets.length,
            existingLinkTargets: existingTargets,
            wordCount: text.split(/\s+/).length,
        });
    });

    // Extract all outgoing internal links
    $("a[href]").each((_i, el) => {
        const href = $(el).attr("href") || "";
        const anchor = $(el).text().trim();
        if (!anchor || anchor.length < 2) return;

        const isInternal = href.includes(baseHost) || href.startsWith("/");
        if (!isInternal) return;

        const normalizedTarget = normalizeUrl(href, siteBaseUrl);
        // Find which paragraph this link is in
        const parentText = $(el).closest("p, li, blockquote, td").text().trim();
        const pIdx = paragraphs.findIndex((p) => p.text === parentText);

        outgoingInternalLinks.push({
            targetUrl: normalizedTarget,
            anchorText: anchor,
            paragraphIndex: pIdx >= 0 ? pIdx : -1,
        });
    });

    const fullText = paragraphs.map((p) => p.text).join(" ");
    const keywords = extractKeywords(title + " " + fullText);

    return {
        url: normalizeUrl(url, siteBaseUrl),
        postId,
        title,
        htmlContent,
        paragraphs,
        outgoingInternalLinks,
        incomingCount: 0,
        outgoingCount: outgoingInternalLinks.length,
        wordCount: fullText.split(/\s+/).filter((w) => w.length > 0).length,
        keywords,
    };
}

// ─── Find Candidate Phrases ─────────────────────────────────────────────────

function findCandidatePhrases(
    paragraphText: string,
    targetTitle: string,
    targetKeywords: string[]
): string[] {
    const phrases: string[] = [];
    const lowerPara = paragraphText.toLowerCase();

    // 1. Check if target title words form a phrase in the paragraph
    const titleWords = targetTitle
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

    // Look for 2-4 word combinations from the title in the paragraph
    for (let len = Math.min(4, titleWords.length); len >= 2; len--) {
        for (let start = 0; start <= titleWords.length - len; start++) {
            const phrase = titleWords.slice(start, start + len).join(" ");
            if (lowerPara.includes(phrase)) {
                // Extract the actual casing from the paragraph
                const idx = lowerPara.indexOf(phrase);
                const actualPhrase = paragraphText.substring(idx, idx + phrase.length);
                if (!phrases.includes(actualPhrase)) {
                    phrases.push(actualPhrase);
                }
            }
        }
    }

    // 2. Check individual keywords from target in paragraph
    for (const kw of targetKeywords.slice(0, 10)) {
        if (kw.length < 4) continue;
        const regex = new RegExp(`\\b${kw}\\b`, "i");
        const match = paragraphText.match(regex);
        if (match && match[0] && !phrases.includes(match[0])) {
            phrases.push(match[0]);
        }
    }

    // 3. Extract noun phrases (2-3 word sequences) that contain a target keyword
    const words = paragraphText.split(/\s+/);
    for (let i = 0; i < words.length - 1; i++) {
        const twoWord = words.slice(i, i + 2).join(" ");
        const threeWord = i < words.length - 2 ? words.slice(i, i + 3).join(" ") : "";
        const cleanTwo = twoWord.toLowerCase().replace(/[^\w\s]/g, "");
        const cleanThree = threeWord.toLowerCase().replace(/[^\w\s]/g, "");

        for (const kw of targetKeywords.slice(0, 8)) {
            if (cleanTwo.includes(kw) && !phrases.includes(twoWord) && twoWord.length > 5) {
                phrases.push(twoWord.replace(/^[^\w]+|[^\w]+$/g, ""));
            }
            if (cleanThree && cleanThree.includes(kw) && !phrases.includes(threeWord) && threeWord.length > 8) {
                phrases.push(threeWord.replace(/^[^\w]+|[^\w]+$/g, ""));
            }
        }
        if (phrases.length >= 8) break;
    }

    // Deduplicate and filter
    const uniquePhrases = [...new Set(phrases)]
        .filter((p) => {
            const clean = p.replace(/[^\w\s]/g, "").trim();
            return clean.length >= 4 && clean.split(/\s+/).length <= 6;
        })
        .slice(0, 6);

    return uniquePhrases;
}

// ─── Keyword Overlap Score ──────────────────────────────────────────────────

function computeKeywordOverlap(
    sourceKeywords: string[],
    targetKeywords: string[]
): number {
    if (sourceKeywords.length === 0 || targetKeywords.length === 0) return 0;
    const targetSet = new Set(targetKeywords);
    const overlap = sourceKeywords.filter((kw) => targetSet.has(kw)).length;
    return overlap / Math.max(targetKeywords.length, 1);
}

// ─── Build the Full Link Graph ──────────────────────────────────────────────

export function buildLinkGraph(pages: PageNode[]): LinkGraph {
    const urlToPage = new Map<string, PageNode>();
    pages.forEach((p) => urlToPage.set(p.url, p));

    // Compute incoming link counts
    for (const page of pages) {
        for (const link of page.outgoingInternalLinks) {
            const target = urlToPage.get(link.targetUrl);
            if (target) {
                target.incomingCount++;
            }
        }
    }

    // Compute graph stats
    const totalInternalLinks = pages.reduce((sum, p) => sum + p.outgoingCount, 0);
    const orphanPages = pages.filter((p) => p.incomingCount === 0).length;
    const weakPages = pages.filter((p) => p.incomingCount > 0 && p.incomingCount <= 2).length;
    const strongPages = pages.filter((p) => p.incomingCount >= 5).length;

    const stats: LinkGraphStats = {
        totalPages: pages.length,
        totalInternalLinks,
        avgIncomingLinks:
            pages.length > 0
                ? Math.round((totalInternalLinks / pages.length) * 10) / 10
                : 0,
        avgOutgoingLinks:
            pages.length > 0
                ? Math.round((totalInternalLinks / pages.length) * 10) / 10
                : 0,
        orphanPages,
        weakPages,
        strongPages,
    };

    // Find opportunities
    const opportunities = findOpportunities(pages, urlToPage);

    return { pages, stats, opportunities };
}

// ─── Opportunity Detection ──────────────────────────────────────────────────

function findOpportunities(
    pages: PageNode[],
    urlToPage: Map<string, PageNode>
): LinkOpportunity[] {
    const opportunities: LinkOpportunity[] = [];
    const seenPairs = new Set<string>(); // prevent duplicate source→target pairs

    // Target pages sorted by need (orphans first, then weak)
    const targetPages = [...pages]
        .filter((p) => p.wordCount > 50)
        .sort((a, b) => a.incomingCount - b.incomingCount);

    for (const target of targetPages) {
        if (target.incomingCount >= 5) continue; // already well-linked

        let opportunitiesForTarget = 0;

        for (const source of pages) {
            if (source.url === target.url) continue;
            if (opportunitiesForTarget >= 5) break; // max 5 per target

            // Skip if source already links to target
            if (source.outgoingInternalLinks.some((l) => l.targetUrl === target.url)) continue;

            const pairKey = `${source.postId}→${target.postId}`;
            if (seenPairs.has(pairKey)) continue;

            // Check topical relevance
            const overlap = computeKeywordOverlap(source.keywords, target.keywords);
            if (overlap < 0.05) continue;

            // Find best paragraph in source
            let bestPara: ParagraphData | null = null;
            let bestPhrases: string[] = [];
            let bestScore = 0;

            for (const para of source.paragraphs) {
                // Skip paragraphs with too many existing links
                if (para.existingLinkCount >= 2) continue;
                if (para.wordCount < 15) continue;
                // Skip paragraphs that already link to target
                if (para.existingLinkTargets.includes(target.url)) continue;

                const phrases = findCandidatePhrases(para.text, target.title, target.keywords);
                if (phrases.length === 0) continue;

                const paraScore =
                    overlap * 0.3 +
                    Math.min(phrases.length / 3, 1) * 0.3 +
                    (para.existingLinkCount === 0 ? 0.2 : 0.1) +
                    (para.wordCount > 30 ? 0.2 : 0.1);

                if (paraScore > bestScore) {
                    bestScore = paraScore;
                    bestPara = para;
                    bestPhrases = phrases;
                }
            }

            if (!bestPara || bestPhrases.length === 0) continue;

            seenPairs.add(pairKey);

            const priority: "high" | "medium" | "low" =
                target.incomingCount === 0
                    ? "high"
                    : target.incomingCount <= 2
                    ? "medium"
                    : "low";

            const reason =
                target.incomingCount === 0
                    ? `Orphan page with 0 internal links pointing to it`
                    : target.incomingCount <= 2
                    ? `Under-supported with only ${target.incomingCount} internal link${target.incomingCount > 1 ? "s" : ""}`
                    : `Could benefit from additional internal link support (${target.incomingCount} current)`;

            opportunities.push({
                id: `${source.postId}-${target.postId}-${bestPara.index}`,
                sourceUrl: source.url,
                sourceTitle: source.title,
                sourcePostId: source.postId,
                targetUrl: target.url,
                targetTitle: target.title,
                targetPostId: target.postId,
                candidatePhrases: bestPhrases,
                sourceParagraphIndex: bestPara.index,
                sourceParagraphText: bestPara.text,
                sourceParagraphHtml: bestPara.html,
                relevanceScore: Math.round(bestScore * 100) / 100,
                priority,
                reason,
                targetIncomingCount: target.incomingCount,
                sourceOutgoingCount: source.outgoingCount,
            });

            opportunitiesForTarget++;
        }
    }

    // Sort: high priority first, then by relevance score
    return opportunities
        .sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            return b.relevanceScore - a.relevanceScore;
        })
        .slice(0, 50);
}
