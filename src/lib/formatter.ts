// Blogger HTML Formatter
// Converts generated content into clean, Blogger-compatible HTML

export interface FormatOptions {
    includeToc?: boolean;
    includeDisclosure?: string;
    includeCta?: string;
    ctaText?: string;
    ctaUrl?: string;
    featuredImageUrl?: string;
    featuredImageAlt?: string;
    keyword?: string;
    showReadTime?: boolean;
    addKeywordToIntro?: boolean;
}

// Clean and format article HTML for Blogger
export function formatForBlogger(
    htmlContent: string,
    options: FormatOptions = {}
): string {
    return formatBloggerHtml(htmlContent, options);
}

// Alias for backward compatibility
export function formatBloggerHtml(
    htmlContent: string,
    options: FormatOptions = {}
): string {
    let output = "";

    // Skip featured image - will be added separately in Blogger
    // Images are handled outside the article content

    // Skip read time metadata - keep article content clean
    // Blogger theme will handle metadata display

    // Add table of contents
    if (options.includeToc) {
        output += generateToc(htmlContent);
    }

    // Optimize first paragraph with keyword if needed
    let contentToFormat = htmlContent;
    if (options.addKeywordToIntro !== false && options.keyword) {
        contentToFormat = ensureKeywordInIntro(htmlContent, options.keyword);
    }

    // Add the main content
    output += cleanHtml(contentToFormat);

    // Add affiliate disclosure if provided
    if (options.includeDisclosure) {
        output += `\n<blockquote>
<strong>Disclosure:</strong> ${options.includeDisclosure}
</blockquote>\n`;
    }

    // Add CTA block
    if (options.includeCta || options.ctaText) {
        const ctaContent = options.ctaText || options.includeCta || "Take action now!";
        output += `\n<blockquote>
<strong>${ctaContent}</strong>
${options.ctaUrl ? `<p><a href="${options.ctaUrl}">Learn More →</a></p>` : ""}
</blockquote>\n`;
    }

    return output;
}

// Generate table of contents from HTML headings
// ONLY includes H2 body sections. Excludes FAQ, Conclusion, and all H3s.
function generateToc(html: string): string {
    const headingRegex = /<h2[^>]*>(.*?)<\/h2>/gi;
    const headings: { text: string; id: string }[] = [];
    let match;

    // Headings to exclude from TOC
    const excludePatterns = [
        /faq/i, /frequently\s+asked/i, /conclusion/i,
        /final\s+thoughts/i, /wrapping\s+up/i, /summar(?:y|ize)/i
    ];

    while ((match = headingRegex.exec(html)) !== null) {
        const text = match[1].replace(/<[^>]*>/g, ""); // strip inner HTML
        
        // Skip excluded headings
        if (excludePatterns.some(p => p.test(text))) continue;

        const id = text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
        headings.push({ text, id });
    }

    if (headings.length === 0) return "";

    let toc = `<div class="toc">
<h3>📋 Table of Contents</h3>
<ul>\n`;

    for (const h of headings) {
        toc += `<li class="toc-h2"><a href="#${h.id}">${h.text}</a></li>\n`;
    }

    toc += `</ul>\n</div>\n\n`;
    return toc;
}

// Clean HTML for Blogger compatibility
function cleanHtml(html: string): string {
    let cleaned = html;

    // Add IDs to headings for TOC anchors — but ONLY if heading doesn't already have an id
    cleaned = cleaned.replace(
        /<h([23])([^>]*)>(.*?)<\/h([23])>/gi,
        (fullMatch, level, attrs, text, closingLevel) => {
            // Skip if already has an id attribute
            if (/\bid\s*=/i.test(attrs)) {
                return fullMatch;
            }
            const plainText = text.replace(/<[^>]*>/g, "");
            const id = plainText
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");
            return `<h${level}${attrs} id="${id}">${text}</h${closingLevel}>`;
        }
    );

    // No inline styles - output clean semantic HTML
    // Blogger theme will handle all styling via CSS
    return cleaned;
}

// Generate FAQ HTML block
export function generateFaqHtml(
    faqs: { question: string; answer: string }[]
): string {
    if (faqs.length === 0) return "";

    let html = `<div class="faq-section">
<h2 id="faq">❓ Frequently Asked Questions</h2>\n`;

    for (const faq of faqs) {
        html += `<div class="faq-item">
<h3>${faq.question}</h3>
<p>${faq.answer}</p>
</div>\n`;
    }

    html += `</div>\n`;
    return html;
}

// Generate info/callout box
export function generateCalloutBox(
    content: string,
    type: "info" | "warning" | "tip" | "note" = "info"
): string {
    const icons: Record<string, string> = {
        info: "ℹ️",
        warning: "⚠️",
        tip: "💡",
        note: "📝",
    };

    const icon = icons[type];
    return `<blockquote class="callout-${type}">
<p>${icon} ${content}</p>
</blockquote>`;
}

// Count words in HTML content
export function countWords(html: string): number {
    const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return text ? text.split(" ").length : 0;
}

// Ensure keyword appears in first paragraph for SEO
function ensureKeywordInIntro(html: string, keyword: string): string {
    // Find first paragraph
    const firstPMatch = html.match(/(<p[^>]*>)([\s\S]*?)<\/p>/i);
    if (!firstPMatch) return html;
    
    const firstParagraph = firstPMatch[2];
    const lowerParagraph = firstParagraph.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    
    // Check if keyword already exists in first paragraph (case-insensitive)
    if (lowerParagraph.includes(lowerKeyword)) {
        return html;
    }
    
    // Don't inject into paragraphs already wrapped in <strong> (e.g., featured snippet)
    if (firstParagraph.trim().startsWith('<strong>')) {
        return html;
    }
    
    // Add keyword naturally to first sentence if missing
    const firstSentenceEnd = firstParagraph.indexOf('. ');
    if (firstSentenceEnd > 0) {
        const enhanced = firstParagraph.substring(0, firstSentenceEnd) + 
            ` about <strong>${keyword}</strong>` + 
            firstParagraph.substring(firstSentenceEnd);
        return html.replace(firstPMatch[0], `${firstPMatch[1]}${enhanced}</p>`);
    }
    
    return html;
}
