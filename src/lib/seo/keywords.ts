// Keyword Research & Analysis
// Provides keyword suggestions, difficulty, and search volume estimates

export interface KeywordData {
    keyword: string;
    searchVolume: number;
    difficulty: number; // 0-100
    cpc?: number;
    competition?: string; // low, medium, high
    trend: 'rising' | 'stable' | 'declining';
    intent?: 'informational' | 'commercial' | 'transactional' | 'navigational';
    intentConfidence?: number;
    relatedKeywords: string[];
    questions: string[];
    topQueries?: Array<{
        query: string;
        volume?: number;
        relevance: number;
    }>;
    serpFeatures?: string[];
    competitorDomains?: Array<{
        domain: string;
        position: number;
        authority: 'high' | 'medium' | 'low';
    }>;
    organicResults?: Array<{
        position: number;
        title: string;
        link: string;
        snippet: string;
        domain: string;
        date?: string;
        sitelinks?: Array<{
            title: string;
            link: string;
        }>;
        richSnippet?: {
            rating?: number;
            ratingCount?: number;
            price?: string;
        };
    }>;
    knowledgeGraph?: {
        title: string;
        type: string;
        description: string;
        imageUrl?: string;
        attributes?: Record<string, string>;
    };
    answerBox?: {
        snippet: string;
        title?: string;
        link?: string;
    };
    shopping?: Array<{
        title: string;
        price: string;
        link: string;
        source: string;
        imageUrl?: string;
        rating?: number;
    }>;
    localResults?: Array<{
        title: string;
        address: string;
        rating?: number;
        reviews?: number;
        phone?: string;
    }>;
    images?: Array<{
        title: string;
        imageUrl: string;
        link: string;
        source: string;
    }>;
    videos?: Array<{
        title: string;
        link: string;
        channel: string;
        duration?: string;
        date?: string;
        imageUrl?: string;
    }>;
    news?: Array<{
        title: string;
        link: string;
        source: string;
        date: string;
        snippet?: string;
    }>;
    tweets?: Array<{
        text: string;
        author: string;
        date: string;
        link: string;
    }>;
    topStories?: Array<{
        title: string;
        link: string;
        source: string;
        date: string;
        imageUrl?: string;
    }>;
    inlineVideos?: Array<{
        title: string;
        link: string;
        channel: string;
        duration?: string;
        imageUrl?: string;
    }>;
    faqs?: Array<{
        question: string;
        answer: string;
        source?: string;
    }>;
    searchMetadata?: {
        totalResults: string;
        timeTaken: number;
        location: string;
    };
}

export interface KeywordSuggestion {
    keyword: string;
    relevance: number;
    searchVolume?: number;
    difficulty?: number;
}

// Generate keyword variations
export function generateKeywordVariations(keyword: string): string[] {
    const variations: string[] = [];
    const words = keyword.toLowerCase().split(/\s+/);
    
    // Add the original
    variations.push(keyword);
    
    // Common modifiers
    const modifiers = {
        prefix: ['best', 'top', 'how to', 'what is', 'guide to', 'ultimate'],
        suffix: ['guide', 'tips', 'review', 'tutorial', 'examples', '2025', '2026'],
        questions: ['how', 'what', 'why', 'when', 'where', 'which'],
    };
    
    // Add prefix variations
    modifiers.prefix.forEach(prefix => {
        variations.push(`${prefix} ${keyword}`);
    });
    
    // Add suffix variations
    modifiers.suffix.forEach(suffix => {
        variations.push(`${keyword} ${suffix}`);
    });
    
    // Add question variations
    if (words.length > 0) {
        modifiers.questions.forEach(q => {
            variations.push(`${q} ${keyword}`);
        });
    }
    
    // Add long-tail variations
    variations.push(`${keyword} for beginners`);
    variations.push(`${keyword} vs`);
    variations.push(`${keyword} comparison`);
    
    return [...new Set(variations)]; // Remove duplicates
}

// Generate "People Also Ask" style questions
export function generateQuestions(keyword: string): string[] {
    const questions: string[] = [];
    
    const templates = [
        `What is ${keyword}?`,
        `How does ${keyword} work?`,
        `Why is ${keyword} important?`,
        `When should you use ${keyword}?`,
        `Where can I find ${keyword}?`,
        `Which ${keyword} is best?`,
        `How to choose ${keyword}?`,
        `What are the benefits of ${keyword}?`,
        `How much does ${keyword} cost?`,
        `Is ${keyword} worth it?`,
    ];
    
    return templates;
}

// Estimate keyword difficulty (0-100)
// This is a simplified algorithm - in production, you'd use an API
export function estimateKeywordDifficulty(keyword: string): number {
    const words = keyword.split(/\s+/);
    let difficulty = 30; // Base difficulty
    
    // Shorter keywords are generally more competitive
    if (words.length === 1) {
        difficulty += 30;
    } else if (words.length === 2) {
        difficulty += 15;
    } else if (words.length >= 4) {
        difficulty -= 10;
    }
    
    // Common competitive terms
    const competitiveTerms = ['best', 'top', 'review', 'buy', 'cheap', 'free'];
    competitiveTerms.forEach(term => {
        if (keyword.toLowerCase().includes(term)) {
            difficulty += 10;
        }
    });
    
    // Long-tail modifiers reduce difficulty
    const longTailModifiers = ['how to', 'guide', 'tutorial', 'for beginners'];
    longTailModifiers.forEach(modifier => {
        if (keyword.toLowerCase().includes(modifier)) {
            difficulty -= 15;
        }
    });
    
    return Math.max(0, Math.min(100, difficulty));
}

// Estimate search volume (simplified - use API in production)
export function estimateSearchVolume(keyword: string): number {
    const words = keyword.split(/\s+/);
    let volume = 1000; // Base volume
    
    // Shorter keywords typically have higher volume
    if (words.length === 1) {
        volume *= 10;
    } else if (words.length === 2) {
        volume *= 5;
    } else if (words.length === 3) {
        volume *= 2;
    } else {
        volume *= 0.5;
    }
    
    // Popular terms increase volume
    const popularTerms = ['best', 'how to', 'what is', 'top', 'guide'];
    popularTerms.forEach(term => {
        if (keyword.toLowerCase().includes(term)) {
            volume *= 1.5;
        }
    });
    
    return Math.round(volume);
}

// Analyze keyword opportunity (volume vs difficulty)
export function calculateKeywordOpportunity(
    searchVolume: number,
    difficulty: number
): {
    score: number;
    label: string;
    color: string;
} {
    // Opportunity score: high volume + low difficulty = high opportunity
    const volumeScore = Math.min(searchVolume / 10000, 1) * 50;
    const difficultyScore = (100 - difficulty) / 2;
    const score = volumeScore + difficultyScore;
    
    if (score >= 75) {
        return { score, label: 'Excellent', color: 'emerald' };
    } else if (score >= 60) {
        return { score, label: 'Good', color: 'green' };
    } else if (score >= 45) {
        return { score, label: 'Fair', color: 'yellow' };
    } else if (score >= 30) {
        return { score, label: 'Difficult', color: 'orange' };
    } else {
        return { score, label: 'Very Hard', color: 'red' };
    }
}

// Get related keywords using simple NLP
export function getRelatedKeywords(keyword: string): string[] {
    const words = keyword.toLowerCase().split(/\s+/);
    const related: string[] = [];
    
    // Synonym-like variations
    const synonymMap: Record<string, string[]> = {
        'best': ['top', 'greatest', 'finest', 'leading'],
        'guide': ['tutorial', 'handbook', 'manual', 'walkthrough'],
        'tips': ['tricks', 'hacks', 'advice', 'strategies'],
        'review': ['analysis', 'evaluation', 'assessment', 'comparison'],
    };
    
    words.forEach(word => {
        if (synonymMap[word]) {
            synonymMap[word].forEach(syn => {
                const newKeyword = keyword.replace(word, syn);
                related.push(newKeyword);
            });
        }
    });
    
    // Add common combinations
    related.push(`${keyword} comparison`);
    related.push(`${keyword} alternatives`);
    related.push(`${keyword} vs`);
    
    return [...new Set(related)].slice(0, 10);
}

// Comprehensive keyword analysis
export function analyzeKeyword(keyword: string): KeywordData {
    const searchVolume = estimateSearchVolume(keyword);
    const difficulty = estimateKeywordDifficulty(keyword);
    const relatedKeywords = getRelatedKeywords(keyword);
    const questions = generateQuestions(keyword);
    
    // Determine trend (simplified)
    let trend: 'rising' | 'stable' | 'declining' = 'stable';
    if (keyword.includes('2026') || keyword.includes('new')) {
        trend = 'rising';
    }
    
    return {
        keyword,
        searchVolume,
        difficulty,
        trend,
        relatedKeywords,
        questions,
    };
}

// Batch analyze multiple keywords
export function analyzeKeywords(keywords: string[]): KeywordData[] {
    return keywords.map(keyword => analyzeKeyword(keyword));
}

// Get keyword difficulty label
export function getDifficultyLabel(difficulty: number): {
    label: string;
    color: string;
} {
    if (difficulty >= 80) {
        return { label: 'Very Hard', color: 'red' };
    } else if (difficulty >= 60) {
        return { label: 'Hard', color: 'orange' };
    } else if (difficulty >= 40) {
        return { label: 'Medium', color: 'yellow' };
    } else if (difficulty >= 20) {
        return { label: 'Easy', color: 'green' };
    } else {
        return { label: 'Very Easy', color: 'emerald' };
    }
}
