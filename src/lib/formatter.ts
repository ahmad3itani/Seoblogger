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

    // Add featured image at top
    if (options.featuredImageUrl) {
        output += `<div class="featured-image" style="margin-bottom:24px;text-align:center;">
<img src="${options.featuredImageUrl}" alt="${options.featuredImageAlt || ""}" style="max-width:100%;height:auto;border-radius:8px;" />
</div>\n\n`;
    }

    // Add read time estimate
    if (options.showReadTime !== false) {
        const wordCount = countWords(htmlContent);
        const readTime = Math.ceil(wordCount / 200); // Average reading speed: 200 words/min
        output += `<div style="color:#6b7280;font-size:0.9em;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
<span>📖 ${readTime} min read</span>
<span>•</span>
<span>${wordCount.toLocaleString()} words</span>
<span>•</span>
<span>Updated: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
</div>\n\n`;
    }

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
        output += `\n<div style="background:#f8f9fa;border-left:4px solid #6c757d;padding:16px;margin:24px 0;font-size:0.9em;color:#6c757d;border-radius:0 4px 4px 0;">
<strong>Disclosure:</strong> ${options.includeDisclosure}
</div>\n`;
    }

    // Add CTA block
    if (options.includeCta || options.ctaText) {
        const ctaContent = options.ctaText || options.includeCta || "Take action now!";
        output += `\n<div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:32px;border-radius:12px;text-align:center;margin:32px 0;">
<h3 style="color:white;margin:0 0 12px 0;font-size:1.4em;">${ctaContent}</h3>
${options.ctaUrl ? `<a href="${options.ctaUrl}" style="display:inline-block;background:white;color:#667eea;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px;">Learn More →</a>` : ""}
</div>\n`;
    }

    return output;
}

// Generate table of contents from HTML headings
function generateToc(html: string): string {
    const headingRegex = /<h([23])[^>]*>(.*?)<\/h[23]>/gi;
    const headings: { level: number; text: string; id: string }[] = [];
    let match;

    while ((match = headingRegex.exec(html)) !== null) {
        const level = parseInt(match[1]);
        const text = match[2].replace(/<[^>]*>/g, ""); // strip inner HTML
        const id = text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
        headings.push({ level, text, id });
    }

    if (headings.length === 0) return "";

    const maxVisible = 5;
    const hasMore = headings.length > maxVisible;
    const uniqueId = `toc-${Date.now()}`;

    let toc = `<div style="background:#f8f9fa;border:1px solid #e9ecef;border-radius:8px;padding:16px 20px;margin-bottom:32px;max-width:600px;">
<h3 style="margin:0 0 12px 0;font-size:1em;font-weight:600;color:#1f2937;">📋 Table of Contents</h3>
<ul id="${uniqueId}-list" style="list-style:none;padding:0;margin:0;">\n`;

    // Add all headings
    for (let i = 0; i < headings.length; i++) {
        const h = headings[i];
        const indent = h.level === 3 ? "padding-left:16px;" : "";
        const isHidden = hasMore && i >= maxVisible;
        const displayStyle = isHidden ? "display:none;" : "";
        const hiddenClass = isHidden ? ` class="toc-hidden-${uniqueId}"` : "";
        
        toc += `<li${hiddenClass} style="${indent}${displayStyle}margin:6px 0;"><a href="#${h.id}" style="color:#3b82f6;text-decoration:none;font-size:0.9em;transition:color 0.2s;" onmouseover="this.style.color='#2563eb'" onmouseout="this.style.color='#3b82f6'">${h.text}</a></li>\n`;
    }

    toc += `</ul>\n`;

    // Add show more/less button if needed
    if (hasMore) {
        toc += `<button id="${uniqueId}-toggle" onclick="
            var hidden = document.querySelectorAll('.toc-hidden-${uniqueId}');
            var btn = document.getElementById('${uniqueId}-toggle');
            var isExpanded = btn.getAttribute('data-expanded') === 'true';
            
            hidden.forEach(function(el) {
                el.style.display = isExpanded ? 'none' : 'list-item';
            });
            
            btn.setAttribute('data-expanded', isExpanded ? 'false' : 'true');
            btn.innerHTML = isExpanded ? 'Show more ▼' : 'Show less ▲';
        " data-expanded="false" style="background:none;border:none;color:#3b82f6;cursor:pointer;font-size:0.85em;margin-top:8px;padding:4px 0;font-weight:500;transition:color 0.2s;" onmouseover="this.style.color='#2563eb'" onmouseout="this.style.color='#3b82f6'">Show more ▼</button>\n`;
    }

    toc += `</div>\n\n`;
    return toc;
}

// Clean HTML for Blogger compatibility
function cleanHtml(html: string): string {
    let cleaned = html;

    // Add IDs to headings for TOC anchors
    cleaned = cleaned.replace(
        /<h([23])([^>]*)>(.*?)<\/h([23])>/gi,
        (_, level, attrs, text, closingLevel) => {
            const plainText = text.replace(/<[^>]*>/g, "");
            const id = plainText
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");
            return `<h${level}${attrs} id="${id}">${text}</h${closingLevel}>`;
        }
    );

    // Style blockquotes
    cleaned = cleaned.replace(
        /<blockquote>([\s\S]*?)<\/blockquote>/gi,
        `<blockquote style="border-left:4px solid #3b82f6;margin:20px 0;padding:16px 20px;background:#eff6ff;border-radius:0 8px 8px 0;font-style:italic;">$1</blockquote>`
    );

    // Style code blocks
    cleaned = cleaned.replace(
        /<pre><code>([\s\S]*?)<\/code><\/pre>/gi,
        `<pre style="background:#1e293b;color:#e2e8f0;padding:20px;border-radius:8px;overflow-x:auto;font-size:0.9em;line-height:1.6;"><code>$1</code></pre>`
    );

    // Style tables
    cleaned = cleaned.replace(
        /<table>/gi,
        `<div style="overflow-x:auto;margin:20px 0;"><table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;">`
    );
    cleaned = cleaned.replace(/<\/table>/gi, `</table></div>`);
    cleaned = cleaned.replace(
        /<th>/gi,
        `<th style="background:#3b82f6;color:white;padding:12px 16px;text-align:left;font-weight:600;">`
    );
    cleaned = cleaned.replace(
        /<td>/gi,
        `<td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">`
    );

    // Add spacing to paragraphs
    cleaned = cleaned.replace(
        /<p>/gi,
        `<p style="line-height:1.8;margin-bottom:16px;">`
    );

    // Style unordered lists
    cleaned = cleaned.replace(
        /<ul>/gi,
        `<ul style="padding-left:24px;margin:16px 0;line-height:1.8;">`
    );

    // Style ordered lists
    cleaned = cleaned.replace(
        /<ol>/gi,
        `<ol style="padding-left:24px;margin:16px 0;line-height:1.8;">`
    );

    return cleaned;
}

// Generate FAQ HTML block
export function generateFaqHtml(
    faqs: { question: string; answer: string }[]
): string {
    if (faqs.length === 0) return "";

    let html = `<div style="margin:32px 0;">
<h2 style="font-size:1.5em;margin-bottom:20px;" id="faq">❓ Frequently Asked Questions</h2>\n`;

    for (const faq of faqs) {
        html += `<div style="background:#f8f9fa;border:1px solid #e9ecef;border-radius:8px;padding:20px;margin-bottom:12px;">
<h3 style="margin:0 0 8px 0;font-size:1.1em;color:#1e293b;">${faq.question}</h3>
<p style="margin:0;line-height:1.6;color:#475569;">${faq.answer}</p>
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
    const styles: Record<string, { bg: string; border: string; icon: string }> = {
        info: { bg: "#eff6ff", border: "#3b82f6", icon: "ℹ️" },
        warning: { bg: "#fef3c7", border: "#f59e0b", icon: "⚠️" },
        tip: { bg: "#ecfdf5", border: "#10b981", icon: "💡" },
        note: { bg: "#f5f3ff", border: "#8b5cf6", icon: "📝" },
    };

    const style = styles[type];
    return `<div style="background:${style.bg};border-left:4px solid ${style.border};padding:16px 20px;margin:20px 0;border-radius:0 8px 8px 0;">
<p style="margin:0;line-height:1.6;">${style.icon} ${content}</p>
</div>`;
}

// Count words in HTML content
export function countWords(html: string): number {
    const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return text ? text.split(" ").length : 0;
}

// Ensure keyword appears in first paragraph for SEO
function ensureKeywordInIntro(html: string, keyword: string): string {
    // Find first paragraph
    const firstPMatch = html.match(/(<p[^>]*>)(.*?)<\/p>/i);
    if (!firstPMatch) return html;
    
    const firstParagraph = firstPMatch[2];
    const lowerParagraph = firstParagraph.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    
    // Check if keyword already exists in first paragraph
    if (lowerParagraph.includes(lowerKeyword)) {
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
