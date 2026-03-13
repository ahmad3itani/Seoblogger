/**
 * HTML Safety Layer for the Content Refresh Engine
 * 
 * Parses existing Blogger HTML, identifies editable sections,
 * validates output HTML, and ensures safe insertion/replacement.
 * 
 * Never does blind string replacement on raw HTML.
 */

import * as cheerio from "cheerio";

export interface HtmlSection {
    index: number;
    heading: string;
    headingTag: string;
    content: string;      // HTML content of this section
    wordCount: number;
    type: "intro" | "section" | "faq" | "conclusion" | "unknown";
}

/**
 * Parse a Blogger post HTML into logical sections based on headings.
 */
export function parseIntoSections(html: string): HtmlSection[] {
    const $ = cheerio.load(html);
    const sections: HtmlSection[] = [];

    // Collect all top-level children of body
    const bodyChildren = $("body").children().toArray();

    let currentHeading = "Introduction";
    let currentTag = "intro";
    let currentContent: string[] = [];
    let sectionIndex = 0;

    for (const child of bodyChildren) {
        const el = $(child);
        const tagName = (el.prop("tagName") || "").toLowerCase();

        if (["h1", "h2", "h3"].includes(tagName)) {
            // Save previous section
            if (currentContent.length > 0 || sectionIndex === 0) {
                const contentHtml = currentContent.join("\n");
                const textContent = cheerio.load(contentHtml)("body").text().trim();
                sections.push({
                    index: sectionIndex,
                    heading: currentHeading,
                    headingTag: sectionIndex === 0 ? "intro" : currentTag,
                    content: contentHtml,
                    wordCount: textContent.split(/\s+/).filter(Boolean).length,
                    type: categorizeSection(currentHeading, sectionIndex === 0),
                });
                sectionIndex++;
                currentContent = [];
            }

            currentHeading = el.text().trim();
            currentTag = tagName;
        } else {
            currentContent.push($.html(child) || "");
        }
    }

    // Save last section
    if (currentContent.length > 0) {
        const contentHtml = currentContent.join("\n");
        const textContent = cheerio.load(contentHtml)("body").text().trim();
        sections.push({
            index: sectionIndex,
            heading: currentHeading,
            headingTag: currentTag,
            content: contentHtml,
            wordCount: textContent.split(/\s+/).filter(Boolean).length,
            type: categorizeSection(currentHeading, sectionIndex === 0),
        });
    }

    // If we got no sections at all, treat the whole thing as intro
    if (sections.length === 0 && html.trim().length > 0) {
        const textContent = $("body").text().trim();
        sections.push({
            index: 0,
            heading: "Introduction",
            headingTag: "intro",
            content: html,
            wordCount: textContent.split(/\s+/).filter(Boolean).length,
            type: "intro",
        });
    }

    return sections;
}

function categorizeSection(heading: string, isFirst: boolean): HtmlSection["type"] {
    if (isFirst) return "intro";
    const lower = heading.toLowerCase();
    const faqKeys = ["faq", "frequently asked", "common questions", "questions"];
    const conclusionKeys = ["conclusion", "summary", "final thoughts", "wrapping up", "takeaway", "key takeaways"];

    if (faqKeys.some((k) => lower.includes(k))) return "faq";
    if (conclusionKeys.some((k) => lower.includes(k))) return "conclusion";
    return "section";
}

/**
 * Reassemble sections back into clean HTML.
 */
export function reassembleSections(sections: HtmlSection[]): string {
    const parts: string[] = [];

    for (const section of sections) {
        if (section.type !== "intro" && section.heading) {
            const tag = section.headingTag === "intro" ? "h2" : section.headingTag;
            parts.push(`<${tag}>${escapeHtml(section.heading)}</${tag}>`);
        }
        parts.push(section.content);
    }

    return parts.join("\n\n");
}

/**
 * Replace a specific section's content while preserving everything else.
 */
export function replaceSection(sections: HtmlSection[], index: number, newContent: string): HtmlSection[] {
    return sections.map((s) => {
        if (s.index === index) {
            const $ = cheerio.load(newContent);
            const textContent = $("body").text().trim();
            return {
                ...s,
                content: newContent,
                wordCount: textContent.split(/\s+/).filter(Boolean).length,
            };
        }
        return s;
    });
}

/**
 * Insert a new section at a specific position.
 */
export function insertSection(
    sections: HtmlSection[],
    afterIndex: number,
    heading: string,
    headingTag: string,
    content: string,
    type: HtmlSection["type"] = "section"
): HtmlSection[] {
    const $ = cheerio.load(content);
    const textContent = $("body").text().trim();

    const newSection: HtmlSection = {
        index: afterIndex + 1,
        heading,
        headingTag,
        content,
        wordCount: textContent.split(/\s+/).filter(Boolean).length,
        type,
    };

    const result = [...sections];
    result.splice(afterIndex + 1, 0, newSection);

    // Re-index
    return result.map((s, i) => ({ ...s, index: i }));
}

/**
 * Validate that the output HTML is safe for Blogger.
 */
export function validateBloggerHtml(html: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const $ = cheerio.load(html);

    // Check for forbidden tags
    const forbidden = ["script", "iframe", "object", "embed", "form", "input"];
    for (const tag of forbidden) {
        if (tag === "script") {
            // Allow application/ld+json scripts for schema
            $("script").each((_, el) => {
                const type = $(el).attr("type");
                if (type !== "application/ld+json") {
                    issues.push(`Contains forbidden <${tag}> tag`);
                }
            });
        } else if ($(tag).length > 0) {
            issues.push(`Contains forbidden <${tag}> tag`);
        }
    }

    // Check for broken headings (h2 inside h2, etc.)
    $("h2 h2, h3 h3, h2 h3, h3 h2").each(() => {
        issues.push("Nested heading tags detected");
    });

    // Check for empty headings
    $("h1, h2, h3").each((_, el) => {
        if ($(el).text().trim().length === 0) {
            issues.push("Empty heading tag found");
        }
    });

    // Check for unclosed tags (basic check)
    const openTags = (html.match(/<[a-z]+[^>]*>/gi) || []).length;
    const closeTags = (html.match(/<\/[a-z]+>/gi) || []).length;
    const selfClosing = (html.match(/<[a-z]+[^>]*\/>/gi) || []).length;
    if (Math.abs(openTags - closeTags - selfClosing) > 5) {
        issues.push("Possible unclosed HTML tags");
    }

    // Check for excessive keyword repetition (spam indicator)
    const text = $("body").text().toLowerCase();
    const words = text.split(/\s+/).filter((w) => w.length > 4);
    const freq = new Map<string, number>();
    for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
    const totalWords = words.length;
    for (const [word, count] of freq) {
        if (totalWords > 100 && count / totalWords > 0.05) {
            issues.push(`Word "${word}" appears ${count} times (${((count / totalWords) * 100).toFixed(1)}%) — possible keyword stuffing`);
        }
    }

    return { valid: issues.length === 0, issues };
}

/**
 * Sanitize HTML for safe Blogger update.
 * Strips dangerous elements while preserving content structure.
 */
export function sanitizeForBlogger(html: string): string {
    const $ = cheerio.load(html);

    // Remove dangerous tags (except ld+json scripts)
    $("script").each((_, el) => {
        const type = $(el).attr("type");
        if (type !== "application/ld+json") {
            $(el).remove();
        }
    });
    $("iframe, object, embed, form, input, style").remove();

    // Remove event handlers
    $("*").each((_, el) => {
        const attribs = $(el).attr() || {};
        for (const key of Object.keys(attribs)) {
            if (key.startsWith("on")) {
                $(el).removeAttr(key);
            }
        }
    });

    return $("body").html() || html;
}

/**
 * Compute a diff summary between old and new HTML.
 */
export function computeChangeSummary(oldHtml: string, newHtml: string): {
    sectionsExpanded: string[];
    sectionsAdded: string[];
    faqsAdded: number;
    wordCountBefore: number;
    wordCountAfter: number;
} {
    const oldSections = parseIntoSections(oldHtml);
    const newSections = parseIntoSections(newHtml);

    const oldHeadings = new Set(oldSections.map((s) => s.heading.toLowerCase()));
    const sectionsAdded = newSections
        .filter((s) => !oldHeadings.has(s.heading.toLowerCase()) && s.type !== "intro")
        .map((s) => s.heading);

    const sectionsExpanded: string[] = [];
    for (const newSec of newSections) {
        const oldSec = oldSections.find((o) => o.heading.toLowerCase() === newSec.heading.toLowerCase());
        if (oldSec && newSec.wordCount > oldSec.wordCount * 1.3) {
            sectionsExpanded.push(newSec.heading);
        }
    }

    const faqsAdded = newSections.filter((s) => s.type === "faq").length -
        oldSections.filter((s) => s.type === "faq").length;

    const wBefore = oldSections.reduce((sum, s) => sum + s.wordCount, 0);
    const wAfter = newSections.reduce((sum, s) => sum + s.wordCount, 0);

    return {
        sectionsExpanded,
        sectionsAdded,
        faqsAdded: Math.max(0, faqsAdded),
        wordCountBefore: wBefore,
        wordCountAfter: wAfter,
    };
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
