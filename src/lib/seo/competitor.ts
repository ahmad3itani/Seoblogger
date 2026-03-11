// Enhanced Competitor Analysis Tool
// Deep-dive analysis of competitor content

export interface CompetitorAnalysis {
    url: string;
    title: string;
    description: string;
    wordCount: number;
    headings: Array<{ level: string; text: string }>;
    images: number;
    links: {
        internal: number;
        external: number;
        total: number;
    };
    readabilityScore: number;
    keywordDensity: Record<string, number>;
    topKeywords: Array<{ keyword: string; count: number }>;
    contentGaps: string[];
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
}

export interface ContentGap {
    topic: string;
    importance: 'high' | 'medium' | 'low';
    reason: string;
}

// Analyze competitor content structure
export function analyzeCompetitorStructure(html: string, url: string): CompetitorAnalysis {
    // Extract title
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : '';

    // Extract meta description
    const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    const description = metaMatch ? metaMatch[1] : '';

    // Extract headings
    const headings: Array<{ level: string; text: string }> = [];
    const headingRegex = /<(h[1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
    let match;
    while ((match = headingRegex.exec(html)) !== null) {
        headings.push({
            level: match[1].toUpperCase(),
            text: match[2].replace(/<[^>]*>/g, '').trim(),
        });
    }

    // Count images
    const images = (html.match(/<img[^>]*>/gi) || []).length;

    // Count links
    const allLinks = html.match(/<a[^>]*href=["']([^"']*)["'][^>]*>/gi) || [];
    const internalLinks = allLinks.filter(link => {
        const hrefMatch = link.match(/href=["']([^"']*)["']/i);
        if (!hrefMatch) return false;
        const href = hrefMatch[1];
        return href.startsWith('/') || href.includes(new URL(url).hostname);
    }).length;
    const externalLinks = allLinks.length - internalLinks;

    // Calculate word count
    const textContent = html.replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<style[^>]*>.*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;

    // Extract keywords and calculate density
    const words = textContent.toLowerCase().split(/\s+/);
    const keywordCounts: Record<string, number> = {};
    
    words.forEach(word => {
        // Filter out common words and short words
        if (word.length > 3 && !isCommonWord(word)) {
            keywordCounts[word] = (keywordCounts[word] || 0) + 1;
        }
    });

    // Get top keywords
    const topKeywords = Object.entries(keywordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([keyword, count]) => ({ keyword, count }));

    // Calculate keyword density for top keywords
    const keywordDensity: Record<string, number> = {};
    topKeywords.forEach(({ keyword, count }) => {
        keywordDensity[keyword] = (count / words.length) * 100;
    });

    // Simple readability score (Flesch-Kincaid approximation)
    const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const avgWordsPerSentence = words.length / Math.max(sentences, 1);
    const readabilityScore = Math.max(0, Math.min(100, 206.835 - (1.015 * avgWordsPerSentence)));

    // Analyze strengths and weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    if (wordCount >= 2000) {
        strengths.push(`Comprehensive content (${wordCount} words)`);
    } else if (wordCount < 1000) {
        weaknesses.push('Short content - may lack depth');
        recommendations.push(`Expand content to at least 2000 words (currently ${wordCount})`);
    }

    if (headings.length >= 5) {
        strengths.push(`Well-structured with ${headings.length} headings`);
    } else {
        weaknesses.push('Limited heading structure');
        recommendations.push('Add more headings for better structure');
    }

    if (images >= 3) {
        strengths.push(`Good visual content (${images} images)`);
    } else {
        weaknesses.push('Few images');
        recommendations.push('Add more images to enhance engagement');
    }

    if (internalLinks >= 3) {
        strengths.push(`Strong internal linking (${internalLinks} links)`);
    } else {
        recommendations.push('Increase internal linking for better SEO');
    }

    if (readabilityScore >= 60) {
        strengths.push(`Good readability (${readabilityScore.toFixed(0)}/100)`);
    } else {
        weaknesses.push('Complex readability');
        recommendations.push('Simplify sentences for better readability');
    }

    // Identify content gaps (topics in headings that could be expanded)
    const contentGaps: string[] = [];
    const commonMissingTopics = [
        'FAQs',
        'Pros and Cons',
        'Comparison',
        'Best Practices',
        'Common Mistakes',
        'Tips and Tricks',
        'Conclusion',
    ];

    commonMissingTopics.forEach(topic => {
        const hasTopicHeading = headings.some(h => 
            h.text.toLowerCase().includes(topic.toLowerCase())
        );
        if (!hasTopicHeading) {
            contentGaps.push(topic);
        }
    });

    return {
        url,
        title,
        description,
        wordCount,
        headings,
        images,
        links: {
            internal: internalLinks,
            external: externalLinks,
            total: allLinks.length,
        },
        readabilityScore,
        keywordDensity,
        topKeywords,
        contentGaps,
        strengths,
        weaknesses,
        recommendations,
    };
}

// Check if word is common (stop word)
function isCommonWord(word: string): boolean {
    const commonWords = new Set([
        'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
        'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
        'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
        'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
        'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go',
        'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
        'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them',
        'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over',
        'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work',
        'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
        'give', 'day', 'most', 'us', 'is', 'was', 'are', 'been', 'has', 'had',
        'were', 'said', 'did', 'having', 'may', 'should', 'does', 'being',
    ]);
    return commonWords.has(word.toLowerCase());
}

// Compare your content with competitor
export function compareWithCompetitor(
    yourContent: string,
    competitorAnalysis: CompetitorAnalysis
): {
    score: number;
    advantages: string[];
    disadvantages: string[];
    actionItems: string[];
} {
    const advantages: string[] = [];
    const disadvantages: string[] = [];
    const actionItems: string[] = [];

    // Analyze your content
    const yourWordCount = yourContent.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
    const yourHeadings = (yourContent.match(/<h[2-6][^>]*>.*?<\/h[2-6]>/gi) || []).length;
    const yourImages = (yourContent.match(/<img[^>]*>/gi) || []).length;

    // Word count comparison
    if (yourWordCount >= competitorAnalysis.wordCount) {
        advantages.push(`Your content is longer (${yourWordCount} vs ${competitorAnalysis.wordCount} words)`);
    } else {
        disadvantages.push(`Competitor has more content (${competitorAnalysis.wordCount} vs ${yourWordCount} words)`);
        actionItems.push(`Add ${competitorAnalysis.wordCount - yourWordCount} more words to match competitor`);
    }

    // Heading comparison
    if (yourHeadings >= competitorAnalysis.headings.length) {
        advantages.push(`Better structure (${yourHeadings} vs ${competitorAnalysis.headings.length} headings)`);
    } else {
        disadvantages.push(`Competitor has more headings (${competitorAnalysis.headings.length} vs ${yourHeadings})`);
        actionItems.push('Add more section headings for better structure');
    }

    // Image comparison
    if (yourImages >= competitorAnalysis.images) {
        advantages.push(`More visual content (${yourImages} vs ${competitorAnalysis.images} images)`);
    } else {
        disadvantages.push(`Competitor has more images (${competitorAnalysis.images} vs ${yourImages})`);
        actionItems.push(`Add ${competitorAnalysis.images - yourImages} more images`);
    }

    // Content gaps
    if (competitorAnalysis.contentGaps.length > 0) {
        advantages.push(`Opportunities to add: ${competitorAnalysis.contentGaps.join(', ')}`);
        actionItems.push(`Consider adding sections on: ${competitorAnalysis.contentGaps.slice(0, 3).join(', ')}`);
    }

    // Calculate overall score
    let score = 50; // Base score
    if (yourWordCount >= competitorAnalysis.wordCount) score += 20;
    if (yourHeadings >= competitorAnalysis.headings.length) score += 15;
    if (yourImages >= competitorAnalysis.images) score += 15;

    return {
        score: Math.min(100, score),
        advantages,
        disadvantages,
        actionItems,
    };
}
