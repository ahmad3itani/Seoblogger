/**
 * Stage 1: Deterministic Analysis Engine
 * 
 * No LLM required. Analyzes article HTML for:
 * - Readability metrics (sentence length, passive voice, filler)
 * - Repetition (repeated n-grams, sentence openings, keyword stuffing)
 * - Structure (headings, paragraphs, lists, FAQ density)
 * - Claim risk phrases (guarantees, unsupported stats, overclaiming)
 * - Blogger safety (valid HTML, heading hierarchy, link integrity)
 */

import * as cheerio from "cheerio";

// ─── Types ───────────────────────────────────────────────────────

export interface QualityFlag {
    flagType: string;
    severity: "critical" | "warning" | "info" | "suggestion";
    category: string;
    locationRef: string | null;
    message: string;
    suggestedFix: string | null;
    beforeSnippet: string | null;
    afterSnippet: string | null;
}

export interface DeterministicResult {
    // Raw metrics
    wordCount: number;
    sentenceCount: number;
    avgSentenceLength: number;
    paragraphCount: number;
    h2Count: number;
    h3Count: number;
    listCount: number;
    linkCount: number;
    imageCount: number;
    faqSectionPresent: boolean;

    // Scores (0-100)
    readabilityScore: number;
    naturalnessScore: number;
    trustScore: number;
    publishSafetyScore: number;

    // Flags
    flags: QualityFlag[];
}

// ─── Filler & Pattern Databases ──────────────────────────────────

const FILLER_PHRASES = [
    "in today's digital landscape",
    "in today's world",
    "in this day and age",
    "it is important to note that",
    "it is worth mentioning",
    "needless to say",
    "as we all know",
    "it goes without saying",
    "at the end of the day",
    "when it comes to",
    "in order to",
    "due to the fact that",
    "for the purpose of",
    "with regard to",
    "in the event that",
    "on the other hand",
    "as a matter of fact",
    "the fact of the matter is",
    "all things considered",
    "last but not least",
    "without further ado",
    "it should be noted that",
    "this comprehensive guide",
    "this ultimate guide",
    "this definitive guide",
    "in this article we will",
    "let's dive in",
    "let's get started",
    "buckle up",
    "stay tuned",
];

const ROBOTIC_TRANSITIONS = [
    "furthermore",
    "moreover",
    "additionally",
    "consequently",
    "nevertheless",
    "notwithstanding",
    "henceforth",
    "thereby",
    "therein",
    "wherein",
    "heretofore",
];

const EMPTY_INTENSIFIERS = [
    "very powerful",
    "highly effective",
    "extremely important",
    "absolutely essential",
    "truly remarkable",
    "incredibly useful",
    "game-changing",
    "groundbreaking",
    "revolutionary",
    "cutting-edge",
    "state-of-the-art",
    "world-class",
    "best-in-class",
    "industry-leading",
    "next-level",
    "top-notch",
    "second to none",
];

const CLAIM_RISK_PHRASES = [
    "guaranteed",
    "proven to",
    "always works",
    "never fails",
    "100% effective",
    "scientifically proven",
    "doctors recommend",
    "studies show",
    "research proves",
    "experts agree",
    "fastest way to",
    "only way to",
    "secret to",
    "trick to",
    "hack to",
    "will definitely",
    "will certainly",
    "you will see results",
    "instant results",
    "overnight success",
    "risk-free",
    "no side effects",
    "cures",
    "eliminates",
    "skyrocket your",
    "explode your",
    "crush the competition",
    "dominate",
    "guaranteed rankings",
    "first page guaranteed",
];

const PASSIVE_PATTERNS = [
    /\b(is|are|was|were|been|being)\s+(being\s+)?\w+ed\b/gi,
    /\b(is|are|was|were|been|being)\s+(being\s+)?\w+en\b/gi,
];

// ─── Core Analysis Functions ─────────────────────────────────────

function extractText(html: string): string {
    const $ = cheerio.load(html);
    return $("body").text().replace(/\s+/g, " ").trim();
}

function splitSentences(text: string): string[] {
    return text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 5);
}

function splitParagraphs(html: string): string[] {
    const $ = cheerio.load(html);
    const paras: string[] = [];
    $("p").each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 10) paras.push(text);
    });
    return paras;
}

function getSentenceOpenings(sentences: string[]): Map<string, number> {
    const openings = new Map<string, number>();
    for (const s of sentences) {
        const words = s.trim().split(/\s+/).slice(0, 3).join(" ").toLowerCase();
        openings.set(words, (openings.get(words) || 0) + 1);
    }
    return openings;
}

function getNgrams(text: string, n: number): Map<string, number> {
    const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const ngrams = new Map<string, number>();
    for (let i = 0; i <= words.length - n; i++) {
        const gram = words.slice(i, i + n).join(" ");
        ngrams.set(gram, (ngrams.get(gram) || 0) + 1);
    }
    return ngrams;
}

// ─── Module 1: Readability Analysis ──────────────────────────────

function analyzeReadability(html: string, text: string, sentences: string[]): { score: number; flags: QualityFlag[] } {
    const flags: QualityFlag[] = [];
    let penalties = 0;

    // Sentence length analysis
    const longSentences = sentences.filter((s) => s.split(/\s+/).length > 30);
    const veryLongSentences = sentences.filter((s) => s.split(/\s+/).length > 45);
    const shortSentences = sentences.filter((s) => s.split(/\s+/).length < 6);

    if (veryLongSentences.length > 0) {
        penalties += 15;
        flags.push({
            flagType: "readability",
            severity: "warning",
            category: "readability",
            locationRef: null,
            message: `${veryLongSentences.length} sentences exceed 45 words. Very hard to read.`,
            suggestedFix: "Break into shorter sentences. Aim for 15-25 words per sentence on average.",
            beforeSnippet: veryLongSentences[0].slice(0, 150) + "...",
            afterSnippet: null,
        });
    } else if (longSentences.length > sentences.length * 0.3) {
        penalties += 8;
        flags.push({
            flagType: "readability",
            severity: "info",
            category: "readability",
            locationRef: null,
            message: `${longSentences.length} of ${sentences.length} sentences are over 30 words.`,
            suggestedFix: "Mix in shorter sentences for better rhythm.",
            beforeSnippet: null,
            afterSnippet: null,
        });
    }

    // Choppy clusters (many short sentences in a row)
    let choppyCount = 0;
    for (let i = 0; i < sentences.length - 2; i++) {
        const lens = [sentences[i], sentences[i + 1], sentences[i + 2]].map((s) => s.split(/\s+/).length);
        if (lens.every((l) => l < 8)) choppyCount++;
    }
    if (choppyCount > 3) {
        penalties += 5;
        flags.push({
            flagType: "readability",
            severity: "info",
            category: "readability",
            locationRef: null,
            message: `Found ${choppyCount} clusters of very short sentences. Reads choppy.`,
            suggestedFix: "Combine some short sentences for smoother flow.",
            beforeSnippet: null,
            afterSnippet: null,
        });
    }

    // Filler phrases
    const textLower = text.toLowerCase();
    const foundFillers: string[] = [];
    for (const filler of FILLER_PHRASES) {
        if (textLower.includes(filler)) foundFillers.push(filler);
    }
    if (foundFillers.length > 0) {
        penalties += Math.min(20, foundFillers.length * 4);
        flags.push({
            flagType: "readability",
            severity: foundFillers.length >= 3 ? "warning" : "suggestion",
            category: "readability",
            locationRef: null,
            message: `Found ${foundFillers.length} filler phrases: "${foundFillers.slice(0, 3).join('", "')}"${foundFillers.length > 3 ? ` and ${foundFillers.length - 3} more` : ""}.`,
            suggestedFix: "Remove or replace filler phrases with direct, useful wording.",
            beforeSnippet: null,
            afterSnippet: null,
        });
    }

    // Robotic transitions
    const foundRobotic: string[] = [];
    for (const trans of ROBOTIC_TRANSITIONS) {
        const regex = new RegExp(`\\b${trans}\\b`, "gi");
        const matches = text.match(regex);
        if (matches && matches.length >= 2) foundRobotic.push(`${trans} (${matches.length}x)`);
    }
    if (foundRobotic.length > 0) {
        penalties += Math.min(10, foundRobotic.length * 3);
        flags.push({
            flagType: "readability",
            severity: "suggestion",
            category: "readability",
            locationRef: null,
            message: `Overused formal transitions: ${foundRobotic.join(", ")}. Sounds robotic.`,
            suggestedFix: "Vary transitions. Use simpler connectors or restructure flow.",
            beforeSnippet: null,
            afterSnippet: null,
        });
    }

    // Passive voice
    let passiveCount = 0;
    for (const pattern of PASSIVE_PATTERNS) {
        const matches = text.match(pattern);
        if (matches) passiveCount += matches.length;
    }
    const passiveRatio = passiveCount / Math.max(1, sentences.length);
    if (passiveRatio > 0.3) {
        penalties += 10;
        flags.push({
            flagType: "readability",
            severity: "warning",
            category: "readability",
            locationRef: null,
            message: `High passive voice usage (${Math.round(passiveRatio * 100)}% of sentences). Makes writing feel impersonal.`,
            suggestedFix: "Rewrite passive constructions in active voice where possible.",
            beforeSnippet: null,
            afterSnippet: null,
        });
    } else if (passiveRatio > 0.2) {
        penalties += 5;
        flags.push({
            flagType: "readability",
            severity: "info",
            category: "readability",
            locationRef: null,
            message: `Moderate passive voice (${Math.round(passiveRatio * 100)}% of sentences).`,
            suggestedFix: "Consider converting some passive sentences to active voice.",
            beforeSnippet: null,
            afterSnippet: null,
        });
    }

    // Repeated sentence openings
    const openings = getSentenceOpenings(sentences);
    const repeatedOpenings: string[] = [];
    for (const [opening, count] of openings) {
        if (count >= 3 && opening.length > 3) repeatedOpenings.push(`"${opening}" (${count}x)`);
    }
    if (repeatedOpenings.length > 0) {
        penalties += Math.min(10, repeatedOpenings.length * 3);
        flags.push({
            flagType: "readability",
            severity: "warning",
            category: "readability",
            locationRef: null,
            message: `Repeated sentence openings: ${repeatedOpenings.slice(0, 3).join(", ")}. Creates monotonous rhythm.`,
            suggestedFix: "Vary how you start sentences to create better flow.",
            beforeSnippet: null,
            afterSnippet: null,
        });
    }

    return { score: Math.max(0, 100 - penalties), flags };
}

// ─── Module 2: Repetition Analysis ───────────────────────────────

function analyzeRepetition(text: string, sentences: string[]): { score: number; flags: QualityFlag[] } {
    const flags: QualityFlag[] = [];
    let penalties = 0;

    // Repeated 3-grams
    const trigrams = getNgrams(text, 3);
    const repeatedTrigrams: string[] = [];
    for (const [gram, count] of trigrams) {
        if (count >= 3) repeatedTrigrams.push(`"${gram}" (${count}x)`);
    }
    if (repeatedTrigrams.length > 0) {
        penalties += Math.min(20, repeatedTrigrams.length * 4);
        flags.push({
            flagType: "repetition",
            severity: repeatedTrigrams.length >= 3 ? "warning" : "info",
            category: "repetition",
            locationRef: null,
            message: `Repeated phrases found: ${repeatedTrigrams.slice(0, 5).join(", ")}.`,
            suggestedFix: "Rephrase repeated phrases to add variety.",
            beforeSnippet: null,
            afterSnippet: null,
        });
    }

    // Keyword density check (any single word > 3% of total)
    const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    const wordFreq = new Map<string, number>();
    for (const w of words) wordFreq.set(w, (wordFreq.get(w) || 0) + 1);

    const stuffedWords: string[] = [];
    for (const [word, count] of wordFreq) {
        const density = count / words.length;
        if (density > 0.03 && count >= 5) {
            stuffedWords.push(`"${word}" (${(density * 100).toFixed(1)}%)`);
        }
    }
    if (stuffedWords.length > 0) {
        penalties += Math.min(20, stuffedWords.length * 5);
        flags.push({
            flagType: "naturalness",
            severity: "warning",
            category: "naturalness",
            locationRef: null,
            message: `Possible keyword stuffing: ${stuffedWords.slice(0, 3).join(", ")}. Density over 3%.`,
            suggestedFix: "Use synonyms, related terms, and natural variation instead of repeating the same word.",
            beforeSnippet: null,
            afterSnippet: null,
        });
    }

    // Empty intensifiers
    const textLower = text.toLowerCase();
    const foundIntensifiers: string[] = [];
    for (const phrase of EMPTY_INTENSIFIERS) {
        if (textLower.includes(phrase)) foundIntensifiers.push(phrase);
    }
    if (foundIntensifiers.length > 0) {
        penalties += Math.min(15, foundIntensifiers.length * 3);
        flags.push({
            flagType: "specificity",
            severity: "suggestion",
            category: "originality",
            locationRef: null,
            message: `Empty intensifiers: "${foundIntensifiers.slice(0, 4).join('", "')}"${foundIntensifiers.length > 4 ? ` and ${foundIntensifiers.length - 4} more` : ""}. Makes writing vague.`,
            suggestedFix: "Replace vague superlatives with specific, concrete claims backed by evidence.",
            beforeSnippet: null,
            afterSnippet: null,
        });
    }

    return { score: Math.max(0, 100 - penalties), flags };
}

// ─── Module 3: Structure Analysis ────────────────────────────────

function analyzeStructure(html: string, wordCount: number): { score: number; flags: QualityFlag[] } {
    const $ = cheerio.load(html);
    const flags: QualityFlag[] = [];
    let penalties = 0;

    const h2s = $("h2");
    const h3s = $("h3");
    const lists = $("ul, ol");
    const paragraphs = $("p");

    // Heading count relative to word count
    const expectedH2s = Math.max(3, Math.floor(wordCount / 300));
    if (h2s.length === 0) {
        penalties += 20;
        flags.push({
            flagType: "structure",
            severity: "critical",
            category: "structure",
            locationRef: null,
            message: "No H2 headings found. Article lacks structure.",
            suggestedFix: "Add H2 headings to break the article into clear sections.",
            beforeSnippet: null,
            afterSnippet: null,
        });
    } else if (h2s.length < 3 && wordCount > 600) {
        penalties += 10;
        flags.push({
            flagType: "structure",
            severity: "warning",
            category: "structure",
            locationRef: null,
            message: `Only ${h2s.length} H2 headings for ${wordCount} words. Article needs more structure.`,
            suggestedFix: `Aim for at least ${expectedH2s} H2 sections for an article this length.`,
            beforeSnippet: null,
            afterSnippet: null,
        });
    }

    // No lists in long articles
    if (lists.length === 0 && wordCount > 500) {
        penalties += 5;
        flags.push({
            flagType: "structure",
            severity: "suggestion",
            category: "structure",
            locationRef: null,
            message: "No lists found. Lists improve scannability.",
            suggestedFix: "Add bullet points or numbered lists to break up text and aid scanning.",
            beforeSnippet: null,
            afterSnippet: null,
        });
    }

    // Check for FAQ section
    let hasFaq = false;
    $("h2, h3").each((_, el) => {
        const text = $(el).text().toLowerCase();
        if (text.includes("faq") || text.includes("frequently asked") || text.includes("common questions")) {
            hasFaq = true;
        }
    });

    // Intro quality — first paragraph should be substantial
    const firstPara = paragraphs.first().text().trim();
    if (firstPara.length < 50) {
        penalties += 5;
        flags.push({
            flagType: "structure",
            severity: "info",
            category: "structure",
            locationRef: "Introduction",
            message: "Introduction is very short. May not hook the reader.",
            suggestedFix: "Write a clear, engaging introduction that addresses the reader's need immediately.",
            beforeSnippet: firstPara.slice(0, 100),
            afterSnippet: null,
        });
    }

    // Check heading hierarchy (h3 before any h2)
    let foundH2 = false;
    $("h2, h3").each((_, el) => {
        const tag = $(el).prop("tagName")?.toLowerCase();
        if (tag === "h3" && !foundH2) {
            penalties += 5;
            flags.push({
                flagType: "structure",
                severity: "warning",
                category: "blogger_safety",
                locationRef: null,
                message: "H3 appears before any H2. Heading hierarchy should start with H2.",
                suggestedFix: "Restructure headings so H2 comes first, with H3 as subsections.",
                beforeSnippet: null,
                afterSnippet: null,
            });
            return false; // break
        }
        if (tag === "h2") foundH2 = true;
    });

    return { score: Math.max(0, 100 - penalties), flags };
}

// ─── Module 4: Trust & Claim Risk Analysis ───────────────────────

function analyzeTrust(text: string): { score: number; flags: QualityFlag[] } {
    const flags: QualityFlag[] = [];
    let penalties = 0;
    const textLower = text.toLowerCase();

    // Claim risk phrases
    const foundRisks: { phrase: string; severity: "critical" | "warning" }[] = [];
    for (const phrase of CLAIM_RISK_PHRASES) {
        if (textLower.includes(phrase.toLowerCase())) {
            const isHigh = ["guaranteed", "proven to", "100% effective", "cures", "risk-free", "guaranteed rankings", "first page guaranteed"].includes(phrase.toLowerCase());
            foundRisks.push({ phrase, severity: isHigh ? "critical" : "warning" });
        }
    }

    for (const risk of foundRisks) {
        penalties += risk.severity === "critical" ? 10 : 5;
        flags.push({
            flagType: "trust",
            severity: risk.severity,
            category: "trust",
            locationRef: null,
            message: `Risky claim: "${risk.phrase}". May erode reader trust or violate content policies.`,
            suggestedFix: `Soften to conditional language: "may help", "can improve", "in many cases".`,
            beforeSnippet: null,
            afterSnippet: null,
        });
    }

    // Unsupported statistics pattern
    const statPattern = /\b\d{1,3}%\s+(of\s+)?(people|users|businesses|experts|studies|companies)\b/gi;
    const statMatches = text.match(statPattern) || [];
    if (statMatches.length > 0) {
        penalties += statMatches.length * 3;
        for (const stat of statMatches.slice(0, 3)) {
            flags.push({
                flagType: "trust",
                severity: "warning",
                category: "trust",
                locationRef: null,
                message: `Unsourced statistic: "${stat.trim()}". Needs citation or should be removed.`,
                suggestedFix: "Add a source link, use approximate language, or remove the statistic.",
                beforeSnippet: null,
                afterSnippet: null,
            });
        }
    }

    return { score: Math.max(0, 100 - penalties), flags };
}

// ─── Module 5: Blogger Publish Safety ────────────────────────────

function analyzeBloggerSafety(html: string): { score: number; flags: QualityFlag[] } {
    const $ = cheerio.load(html);
    const flags: QualityFlag[] = [];
    let penalties = 0;

    // Forbidden tags
    const forbidden = ["script", "iframe", "object", "embed", "form", "input"];
    for (const tag of forbidden) {
        if (tag === "script") {
            $("script").each((_, el) => {
                const type = $(el).attr("type");
                if (type !== "application/ld+json") {
                    penalties += 15;
                    flags.push({
                        flagType: "blogger_safety",
                        severity: "critical",
                        category: "blogger_safety",
                        locationRef: null,
                        message: `Forbidden <script> tag found.`,
                        suggestedFix: "Remove script tags. Blogger strips or blocks them.",
                        beforeSnippet: null,
                        afterSnippet: null,
                    });
                }
            });
        } else if ($(tag).length > 0) {
            penalties += 10;
            flags.push({
                flagType: "blogger_safety",
                severity: "critical",
                category: "blogger_safety",
                locationRef: null,
                message: `Forbidden <${tag}> tag found.`,
                suggestedFix: `Remove <${tag}> tags for Blogger compatibility.`,
                beforeSnippet: null,
                afterSnippet: null,
            });
        }
    }

    // Empty headings
    $("h1, h2, h3, h4").each((_, el) => {
        if ($(el).text().trim().length === 0) {
            penalties += 5;
            flags.push({
                flagType: "blogger_safety",
                severity: "warning",
                category: "blogger_safety",
                locationRef: null,
                message: "Empty heading tag found.",
                suggestedFix: "Remove empty headings or add meaningful text.",
                beforeSnippet: null,
                afterSnippet: null,
            });
        }
    });

    // Broken links (href="#" or empty)
    $("a").each((_, el) => {
        const href = $(el).attr("href") || "";
        if (href === "#" || href === "") {
            penalties += 3;
            flags.push({
                flagType: "blogger_safety",
                severity: "warning",
                category: "blogger_safety",
                locationRef: null,
                message: `Broken link found: "${$(el).text().trim().slice(0, 40)}" (href="${href}").`,
                suggestedFix: "Fix or remove the broken link.",
                beforeSnippet: null,
                afterSnippet: null,
            });
        }
    });

    // Missing alt text on images
    $("img").each((_, el) => {
        const alt = $(el).attr("alt");
        if (!alt || alt.trim().length === 0) {
            penalties += 3;
            flags.push({
                flagType: "blogger_safety",
                severity: "info",
                category: "blogger_safety",
                locationRef: null,
                message: "Image missing alt text.",
                suggestedFix: "Add descriptive alt text for accessibility and SEO.",
                beforeSnippet: null,
                afterSnippet: null,
            });
        }
    });

    return { score: Math.max(0, 100 - penalties), flags };
}

// ─── Main Entry Point ────────────────────────────────────────────

export function runDeterministicAnalysis(html: string): DeterministicResult {
    const $ = cheerio.load(html);
    const text = extractText(html);
    const sentences = splitSentences(text);
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    const readability = analyzeReadability(html, text, sentences);
    const repetition = analyzeRepetition(text, sentences);
    const structure = analyzeStructure(html, wordCount);
    const trust = analyzeTrust(text);
    const safety = analyzeBloggerSafety(html);

    const allFlags = [
        ...readability.flags,
        ...repetition.flags,
        ...structure.flags,
        ...trust.flags,
        ...safety.flags,
    ];

    // Naturalness is a blend of repetition and readability
    const naturalnessScore = Math.round((readability.score * 0.5 + repetition.score * 0.5));

    return {
        wordCount,
        sentenceCount: sentences.length,
        avgSentenceLength: sentences.length > 0 ? Math.round(wordCount / sentences.length) : 0,
        paragraphCount: $("p").length,
        h2Count: $("h2").length,
        h3Count: $("h3").length,
        listCount: $("ul, ol").length,
        linkCount: $("a").length,
        imageCount: $("img").length,
        faqSectionPresent: allFlags.every((f) => f.flagType !== "structure" || !f.message.includes("FAQ")),

        readabilityScore: readability.score,
        naturalnessScore,
        trustScore: trust.score,
        publishSafetyScore: safety.score,

        flags: allFlags,
    };
}
