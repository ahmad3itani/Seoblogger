// SEO Content Analyzer
// Provides comprehensive SEO scoring and recommendations

export interface SEOScore {
    overall: number; // 0-100
    breakdown: {
        keyword: number;
        readability: number;
        structure: number;
        meta: number;
        links: number;
    };
    recommendations: string[];
    warnings: string[];
    passed: string[];
}

export interface AnalysisOptions {
    keyword: string;
    title: string;
    content: string;
    metaDescription?: string;
    headings?: string[];
    targetWordCount?: number;
}

// Calculate Flesch Reading Ease score
export function calculateReadability(text: string): number {
    const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = cleanText.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((count, word) => count + countSyllables(word), 0);
    
    if (sentences.length === 0 || words.length === 0) return 0;
    
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;
    
    // Flesch Reading Ease formula
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    
    return Math.max(0, Math.min(100, score));
}

// Count syllables in a word (approximation)
function countSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    
    const vowels = 'aeiouy';
    let count = 0;
    let previousWasVowel = false;
    
    for (let i = 0; i < word.length; i++) {
        const isVowel = vowels.includes(word[i]);
        if (isVowel && !previousWasVowel) {
            count++;
        }
        previousWasVowel = isVowel;
    }
    
    // Adjust for silent 'e'
    if (word.endsWith('e')) {
        count--;
    }
    
    return Math.max(1, count);
}

// Extract headings from HTML
export function extractHeadings(html: string): { level: number; text: string }[] {
    const headings: { level: number; text: string }[] = [];
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
    let match;
    
    while ((match = headingRegex.exec(html)) !== null) {
        headings.push({
            level: parseInt(match[1]),
            text: match[2].replace(/<[^>]*>/g, '').trim(),
        });
    }
    
    return headings;
}

// Count keyword density
export function calculateKeywordDensity(content: string, keyword: string): number {
    const cleanContent = content.replace(/<[^>]*>/g, ' ').toLowerCase();
    const cleanKeyword = keyword.toLowerCase();
    const words = cleanContent.split(/\s+/).filter(w => w.length > 0);
    
    if (words.length === 0) return 0;
    
    // Count exact matches and partial matches
    const exactMatches = (cleanContent.match(new RegExp(cleanKeyword, 'g')) || []).length;
    
    return (exactMatches / words.length) * 100;
}

// Analyze keyword placement
export function analyzeKeywordPlacement(options: AnalysisOptions): {
    inTitle: boolean;
    inFirstParagraph: boolean;
    inHeadings: number;
    inMeta: boolean;
} {
    const keyword = options.keyword.toLowerCase();
    const title = options.title.toLowerCase();
    const content = options.content.replace(/<[^>]*>/g, ' ').toLowerCase();
    const meta = (options.metaDescription || '').toLowerCase();
    
    // Check first paragraph (first 200 chars)
    const firstParagraph = content.substring(0, 200);
    
    // Check headings
    const headings = extractHeadings(options.content);
    const headingsWithKeyword = headings.filter(h => 
        h.text.toLowerCase().includes(keyword)
    ).length;
    
    return {
        inTitle: title.includes(keyword),
        inFirstParagraph: firstParagraph.includes(keyword),
        inHeadings: headingsWithKeyword,
        inMeta: meta.includes(keyword),
    };
}

// Analyze content structure
export function analyzeStructure(html: string): {
    hasH1: boolean;
    headingHierarchy: boolean;
    paragraphCount: number;
    listCount: number;
    imageCount: number;
    linkCount: number;
} {
    const headings = extractHeadings(html);
    const hasH1 = headings.some(h => h.level === 1);
    
    // Check heading hierarchy (no skipped levels)
    let headingHierarchy = true;
    for (let i = 1; i < headings.length; i++) {
        if (headings[i].level - headings[i - 1].level > 1) {
            headingHierarchy = false;
            break;
        }
    }
    
    const paragraphCount = (html.match(/<p[^>]*>/gi) || []).length;
    const listCount = (html.match(/<(ul|ol)[^>]*>/gi) || []).length;
    const imageCount = (html.match(/<img[^>]*>/gi) || []).length;
    const linkCount = (html.match(/<a[^>]*>/gi) || []).length;
    
    return {
        hasH1,
        headingHierarchy,
        paragraphCount,
        listCount,
        imageCount,
        linkCount,
    };
}

// Main SEO analysis function
export function analyzeSEO(options: AnalysisOptions): SEOScore {
    const recommendations: string[] = [];
    const warnings: string[] = [];
    const passed: string[] = [];
    
    let keywordScore = 0;
    let readabilityScore = 0;
    let structureScore = 0;
    let metaScore = 0;
    let linksScore = 0;
    
    // 1. Keyword Analysis (25 points)
    const keywordDensity = calculateKeywordDensity(options.content, options.keyword);
    const placement = analyzeKeywordPlacement(options);
    
    if (placement.inTitle) {
        keywordScore += 8;
        passed.push('✓ Keyword in title');
    } else {
        warnings.push('⚠ Add keyword to title');
    }
    
    if (placement.inFirstParagraph) {
        keywordScore += 7;
        passed.push('✓ Keyword in first paragraph');
    } else {
        recommendations.push('Add keyword to the first paragraph');
    }
    
    if (placement.inHeadings > 0) {
        keywordScore += 5;
        passed.push(`✓ Keyword in ${placement.inHeadings} heading(s)`);
    } else {
        recommendations.push('Include keyword in at least one heading');
    }
    
    if (keywordDensity >= 0.5 && keywordDensity <= 2.5) {
        keywordScore += 5;
        passed.push(`✓ Good keyword density (${keywordDensity.toFixed(2)}%)`);
    } else if (keywordDensity < 0.5) {
        recommendations.push('Increase keyword usage (currently too low)');
    } else {
        warnings.push('⚠ Keyword density too high - risk of keyword stuffing');
    }
    
    // 2. Readability Analysis (20 points)
    const readabilityValue = calculateReadability(options.content);
    
    if (readabilityValue >= 60) {
        readabilityScore = 20;
        passed.push(`✓ Excellent readability (${readabilityValue.toFixed(0)}/100)`);
    } else if (readabilityValue >= 50) {
        readabilityScore = 15;
        passed.push(`✓ Good readability (${readabilityValue.toFixed(0)}/100)`);
    } else if (readabilityValue >= 30) {
        readabilityScore = 10;
        recommendations.push('Improve readability - use shorter sentences');
    } else {
        readabilityScore = 5;
        warnings.push('⚠ Poor readability - content is too complex');
    }
    
    // 3. Structure Analysis (25 points)
    const structure = analyzeStructure(options.content);
    
    if (structure.hasH1) {
        structureScore += 5;
        passed.push('✓ Has H1 heading');
    } else {
        warnings.push('⚠ Missing H1 heading');
    }
    
    if (structure.headingHierarchy) {
        structureScore += 5;
        passed.push('✓ Proper heading hierarchy');
    } else {
        recommendations.push('Fix heading hierarchy (no skipped levels)');
    }
    
    if (structure.paragraphCount >= 5) {
        structureScore += 5;
        passed.push(`✓ Good paragraph structure (${structure.paragraphCount} paragraphs)`);
    } else {
        recommendations.push('Add more paragraphs for better structure');
    }
    
    if (structure.listCount > 0) {
        structureScore += 5;
        passed.push(`✓ Contains lists (${structure.listCount})`);
    } else {
        recommendations.push('Add bullet points or numbered lists');
    }
    
    if (structure.imageCount > 0) {
        structureScore += 5;
        passed.push(`✓ Contains images (${structure.imageCount})`);
    } else {
        recommendations.push('Add images to enhance content');
    }
    
    // 4. Meta Analysis (15 points)
    if (options.metaDescription) {
        const metaLength = options.metaDescription.length;
        
        if (metaLength >= 120 && metaLength <= 160) {
            metaScore += 10;
            passed.push(`✓ Optimal meta description length (${metaLength} chars)`);
        } else if (metaLength < 120) {
            metaScore += 5;
            recommendations.push('Lengthen meta description (120-160 chars ideal)');
        } else {
            metaScore += 5;
            recommendations.push('Shorten meta description (120-160 chars ideal)');
        }
        
        if (placement.inMeta) {
            metaScore += 5;
            passed.push('✓ Keyword in meta description');
        } else {
            recommendations.push('Add keyword to meta description');
        }
    } else {
        warnings.push('⚠ Missing meta description');
    }
    
    // 5. Links Analysis (15 points)
    if (structure.linkCount > 0) {
        linksScore += 10;
        passed.push(`✓ Contains links (${structure.linkCount})`);
        
        if (structure.linkCount >= 3) {
            linksScore += 5;
            passed.push('✓ Good internal/external linking');
        } else {
            recommendations.push('Add more internal/external links');
        }
    } else {
        warnings.push('⚠ No links found - add internal/external links');
    }
    
    // Word count check
    const wordCount = options.content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
    const targetWordCount = options.targetWordCount || 2000;
    
    if (wordCount >= targetWordCount * 0.9) {
        passed.push(`✓ Good word count (${wordCount} words)`);
    } else {
        recommendations.push(`Increase word count (current: ${wordCount}, target: ${targetWordCount})`);
    }
    
    // Calculate overall score
    const overall = keywordScore + readabilityScore + structureScore + metaScore + linksScore;
    
    return {
        overall,
        breakdown: {
            keyword: keywordScore,
            readability: readabilityScore,
            structure: structureScore,
            meta: metaScore,
            links: linksScore,
        },
        recommendations,
        warnings,
        passed,
    };
}

// Get score grade
export function getScoreGrade(score: number): {
    grade: string;
    color: string;
    label: string;
} {
    if (score >= 90) {
        return { grade: 'A+', color: 'emerald', label: 'Excellent' };
    } else if (score >= 80) {
        return { grade: 'A', color: 'green', label: 'Great' };
    } else if (score >= 70) {
        return { grade: 'B', color: 'blue', label: 'Good' };
    } else if (score >= 60) {
        return { grade: 'C', color: 'yellow', label: 'Fair' };
    } else if (score >= 50) {
        return { grade: 'D', color: 'orange', label: 'Needs Work' };
    } else {
        return { grade: 'F', color: 'red', label: 'Poor' };
    }
}
