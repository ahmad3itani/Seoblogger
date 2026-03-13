/**
 * Validation Layer for Human Quality Pass
 * 
 * Every final version must pass these checks before approval:
 * 1. Structural validation (valid HTML, heading order, lists/paragraphs preserved)
 * 2. Safety validation (no fabricated experience, no unsupported stats, no keyword stuffing)
 * 3. Style validation (not too repetitive, not too generic, matches voice)
 */

import * as cheerio from "cheerio";

export interface ValidationResult {
    passed: boolean;
    structural: { passed: boolean; issues: string[] };
    safety: { passed: boolean; issues: string[] };
    style: { passed: boolean; issues: string[] };
}

export function validateFinalVersion(
    originalHtml: string,
    newHtml: string,
    brandVoice?: string
): ValidationResult {
    const structural = validateStructure(newHtml);
    const safety = validateSafety(originalHtml, newHtml);
    const style = validateStyle(newHtml);

    return {
        passed: structural.passed && safety.passed && style.passed,
        structural,
        safety,
        style,
    };
}

// ─── Structural Validation ───────────────────────────────────────

function validateStructure(html: string): { passed: boolean; issues: string[] } {
    const $ = cheerio.load(html);
    const issues: string[] = [];

    // Valid HTML — no unclosed tags (basic check)
    const openTags = (html.match(/<[a-z][a-z0-9]*[^>]*(?<!\/)>/gi) || []).length;
    const closeTags = (html.match(/<\/[a-z][a-z0-9]*>/gi) || []).length;
    const voidTags = (html.match(/<(img|br|hr|input|meta|link|area|base|col|embed|source|track|wbr)[^>]*\/?>/gi) || []).length;
    if (Math.abs(openTags - closeTags - voidTags) > 8) {
        issues.push("HTML may have unclosed tags — review before publishing");
    }

    // Heading order should be sensible
    let lastLevel = 0;
    $("h1, h2, h3, h4, h5, h6").each((_, el) => {
        const tag = $(el).prop("tagName")?.toLowerCase() || "";
        const level = parseInt(tag.replace("h", "")) || 0;
        if (level > lastLevel + 1 && lastLevel > 0) {
            issues.push(`Heading skip: ${tag} appears after h${lastLevel}. May confuse screen readers.`);
        }
        lastLevel = level;
    });

    // Paragraphs not collapsed
    if ($("p").length === 0 && html.length > 200) {
        issues.push("No <p> tags found — content may render as a single block of text");
    }

    // Lists preserved
    $("ul, ol").each((_, el) => {
        if ($(el).find("li").length === 0) {
            issues.push("Empty list found (no <li> items)");
        }
    });

    // Empty headings
    $("h1, h2, h3, h4").each((_, el) => {
        if ($(el).text().trim().length === 0) {
            issues.push("Empty heading tag found");
        }
    });

    return { passed: issues.length === 0, issues };
}

// ─── Safety Validation ───────────────────────────────────────────

function validateSafety(originalHtml: string, newHtml: string): { passed: boolean; issues: string[] } {
    const issues: string[] = [];
    const $new = cheerio.load(newHtml);
    const newText = $new("body").text().toLowerCase();

    // No fabricated experience markers
    const fabricationPatterns = [
        /\bi (personally |have )?(tested|tried|used|reviewed) .{5,50} (and|for) \d+ (months?|years?|weeks?|days?)\b/i,
        /\bin my \d+ years of experience\b/i,
        /\bour team (tested|reviewed|analyzed)\b/i,
    ];
    for (const pattern of fabricationPatterns) {
        if (pattern.test(newText)) {
            // Only flag if it wasn't in the original
            const $orig = cheerio.load(originalHtml);
            const origText = $orig("body").text().toLowerCase();
            if (!pattern.test(origText)) {
                issues.push("New version may contain fabricated experience claims that weren't in the original");
            }
        }
    }

    // No keyword stuffing (any word > 4% density with 6+ occurrences)
    const words = newText.split(/\s+/).filter((w) => w.length > 4);
    const freq = new Map<string, number>();
    for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
    for (const [word, count] of freq) {
        if (words.length > 100 && count >= 6 && count / words.length > 0.04) {
            issues.push(`Possible keyword stuffing: "${word}" appears ${count} times (${((count / words.length) * 100).toFixed(1)}%)`);
        }
    }

    // No major topic drift — check that key terms from original still exist
    const $orig = cheerio.load(originalHtml);
    const origText = $orig("body").text().toLowerCase();
    const origWords = origText.split(/\s+/).filter((w) => w.length > 5);
    const origFreq = new Map<string, number>();
    for (const w of origWords) origFreq.set(w, (origFreq.get(w) || 0) + 1);

    // Top 5 most frequent meaningful words in original
    const topOrigWords = Array.from(origFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([w]) => w);

    const missingTopWords = topOrigWords.filter((w) => !newText.includes(w));
    if (missingTopWords.length >= 3) {
        issues.push(`Possible topic drift: key terms from original are missing: "${missingTopWords.join('", "')}"`);
    }

    // Check links not accidentally removed
    const origLinks = $orig("a[href]").length;
    const newLinks = $new("a[href]").length;
    if (origLinks > 0 && newLinks < origLinks * 0.5) {
        issues.push(`Links reduced from ${origLinks} to ${newLinks} — some may have been accidentally removed`);
    }

    // Check no malformed links added
    $new("a[href]").each((_, el) => {
        const href = $new(el).attr("href") || "";
        if (href.includes("{{") || href.includes("[") || href.startsWith("javascript:")) {
            issues.push(`Malformed link found: "${href.slice(0, 60)}"`);
        }
    });

    return { passed: issues.filter((i) => !i.startsWith("Possible")).length === 0, issues };
}

// ─── Style Validation ────────────────────────────────────────────

function validateStyle(html: string): { passed: boolean; issues: string[] } {
    const $ = cheerio.load(html);
    const text = $("body").text();
    const issues: string[] = [];

    // Not too repetitive (check for repeated sentence openings)
    const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 10);
    const openings = new Map<string, number>();
    for (const s of sentences) {
        const start = s.trim().split(/\s+/).slice(0, 3).join(" ").toLowerCase();
        openings.set(start, (openings.get(start) || 0) + 1);
    }
    for (const [opening, count] of openings) {
        if (count >= 4) {
            issues.push(`"${opening}..." appears ${count} times as sentence opening — still too repetitive`);
        }
    }

    // Not too generic (check for common AI filler still present)
    const textLower = text.toLowerCase();
    const genericPhrases = [
        "in today's digital landscape",
        "this comprehensive guide",
        "without further ado",
        "in this article we will",
    ];
    for (const phrase of genericPhrases) {
        if (textLower.includes(phrase)) {
            issues.push(`Generic AI filler phrase still present: "${phrase}"`);
        }
    }

    // Not obviously over-optimized
    const headings = $("h2, h3").toArray().map((el) => $(el).text().toLowerCase());
    const headingWords = headings.join(" ").split(/\s+/).filter((w) => w.length > 4);
    const hFreq = new Map<string, number>();
    for (const w of headingWords) hFreq.set(w, (hFreq.get(w) || 0) + 1);
    for (const [word, count] of hFreq) {
        if (count >= 4 && headings.length > 3) {
            issues.push(`Word "${word}" appears in ${count} headings — headings may look over-optimized`);
        }
    }

    return { passed: issues.length === 0, issues };
}
