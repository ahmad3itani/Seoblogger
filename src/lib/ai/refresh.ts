// AI Content Refresh System
// Analyzes and updates existing articles with fresh content

import { openai, getModelForPlan } from "./client";

export interface RefreshAnalysis {
    needsUpdate: boolean;
    confidence: number; // 0-100
    reasons: string[];
    suggestions: string[];
    outdatedSections: string[];
    missingTopics: string[];
    factualIssues: string[];
}

export interface RefreshOptions {
    title: string;
    content: string;
    keyword: string;
    publishedDate?: Date;
    currentYear?: number;
}

export interface RefreshedContent {
    updatedContent: string;
    changes: string[];
    addedSections: string[];
    updatedSections: string[];
    wordCountChange: number;
}

// Analyze if content needs updating
export async function analyzeContentFreshness(options: RefreshOptions): Promise<RefreshAnalysis> {
    const currentYear = options.currentYear || new Date().getFullYear();
    const publishedYear = options.publishedDate?.getFullYear() || currentYear;
    const yearsOld = currentYear - publishedYear;

    const prompt = `Analyze this article for freshness and accuracy:

Title: ${options.title}
Keyword: ${options.keyword}
Published: ${publishedYear}
Current Year: ${currentYear}

Content (first 1000 chars):
${options.content.substring(0, 1000)}

Analyze and return JSON with:
{
  "needsUpdate": boolean,
  "confidence": number (0-100),
  "reasons": ["reason1", "reason2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "outdatedSections": ["section1", "section2"],
  "missingTopics": ["topic1", "topic2"],
  "factualIssues": ["issue1", "issue2"]
}

Consider:
- Date references (${publishedYear} vs ${currentYear})
- Statistics that may be outdated
- Technology/product changes
- Industry trends
- Missing recent developments
- Broken or outdated information`;

    try {
        const response = await openai.chat.completions.create({
            model: getModelForPlan(),
            messages: [
                {
                    role: "system",
                    content: "You are a content freshness analyzer. Analyze articles for outdated information and suggest updates. Always return valid JSON."
                },
                { role: "user", content: prompt }
            ],
            temperature: 0.3,
        });

        const content = response.choices[0]?.message?.content || "{}";
        const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        try {
            const analysis = JSON.parse(cleanedContent);
            
            // Add age-based confidence boost
            if (yearsOld >= 2) {
                analysis.confidence = Math.min(100, analysis.confidence + (yearsOld * 10));
                if (!analysis.reasons.includes('Article is over 2 years old')) {
                    analysis.reasons.push(`Article is ${yearsOld} years old`);
                }
            }
            
            return analysis;
        } catch (parseError) {
            // Fallback analysis based on age
            return {
                needsUpdate: yearsOld >= 1,
                confidence: yearsOld >= 2 ? 80 : 50,
                reasons: yearsOld >= 1 ? [`Article is ${yearsOld} years old`] : [],
                suggestions: ['Update statistics and examples', 'Add recent developments'],
                outdatedSections: [],
                missingTopics: [],
                factualIssues: [],
            };
        }
    } catch (error) {
        console.error('Content freshness analysis error:', error);
        throw error;
    }
}

// Refresh article content with AI
export async function refreshArticleContent(options: RefreshOptions): Promise<RefreshedContent> {
    const currentYear = new Date().getFullYear();
    
    const prompt = `Update this article to be current and accurate for ${currentYear}:

Title: ${options.title}
Keyword: ${options.keyword}

Original Content:
${options.content}

Instructions:
1. Update all date references to ${currentYear}
2. Replace outdated statistics with current estimates
3. Add new relevant information and trends
4. Update product/technology references
5. Maintain the original structure and tone
6. Keep all HTML formatting intact
7. Add new sections if important topics are missing
8. Update examples to be current

Return ONLY the updated HTML content, no explanations.`;

    try {
        const response = await openai.chat.completions.create({
            model: getModelForPlan(),
            messages: [
                {
                    role: "system",
                    content: "You are a content refresh specialist. Update articles with current information while maintaining quality and structure. Return only HTML content."
                },
                { role: "user", content: prompt }
            ],
            temperature: 0.5,
        });

        const updatedContent = response.choices[0]?.message?.content || options.content;
        
        // Analyze changes
        const changes = detectChanges(options.content, updatedContent);
        const addedSections = detectNewSections(options.content, updatedContent);
        const updatedSections = detectUpdatedSections(options.content, updatedContent);
        
        const originalWordCount = countWords(options.content);
        const newWordCount = countWords(updatedContent);
        const wordCountChange = newWordCount - originalWordCount;

        return {
            updatedContent,
            changes,
            addedSections,
            updatedSections,
            wordCountChange,
        };
    } catch (error) {
        console.error('Content refresh error:', error);
        throw error;
    }
}

// Detect changes between original and updated content
function detectChanges(original: string, updated: string): string[] {
    const changes: string[] = [];
    
    // Check for year updates
    const currentYear = new Date().getFullYear();
    const yearPattern = /\b(20\d{2})\b/g;
    const originalYears: string[] = original.match(yearPattern) || [];
    const updatedYears: string[] = updated.match(yearPattern) || [];
    
    if (updatedYears.includes(currentYear.toString()) && !originalYears.includes(currentYear.toString())) {
        changes.push('Updated year references to current year');
    }
    
    // Check for length changes
    const originalLength = original.length;
    const updatedLength = updated.length;
    const lengthDiff = ((updatedLength - originalLength) / originalLength) * 100;
    
    if (Math.abs(lengthDiff) > 10) {
        changes.push(`Content ${lengthDiff > 0 ? 'expanded' : 'condensed'} by ${Math.abs(lengthDiff).toFixed(1)}%`);
    }
    
    // Check for new headings
    const originalHeadings = (original.match(/<h[2-6][^>]*>.*?<\/h[2-6]>/gi) || []).length;
    const updatedHeadings = (updated.match(/<h[2-6][^>]*>.*?<\/h[2-6]>/gi) || []).length;
    
    if (updatedHeadings > originalHeadings) {
        changes.push(`Added ${updatedHeadings - originalHeadings} new section(s)`);
    }
    
    return changes.length > 0 ? changes : ['Content refreshed and updated'];
}

// Detect new sections
function detectNewSections(original: string, updated: string): string[] {
    const originalHeadings = original.match(/<h[2-6][^>]*>(.*?)<\/h[2-6]>/gi) || [];
    const updatedHeadings = updated.match(/<h[2-6][^>]*>(.*?)<\/h[2-6]>/gi) || [];
    
    const originalTexts: string[] = originalHeadings.map(h => h.replace(/<[^>]*>/g, '').trim());
    const updatedTexts: string[] = updatedHeadings.map(h => h.replace(/<[^>]*>/g, '').trim());
    
    return updatedTexts.filter((text: string) => !originalTexts.includes(text));
}

// Detect updated sections
function detectUpdatedSections(original: string, updated: string): string[] {
    const sections: string[] = [];
    
    // Simple heuristic: sections with significant text changes
    const originalParagraphs = original.match(/<p[^>]*>.*?<\/p>/gi) || [];
    const updatedParagraphs = updated.match(/<p[^>]*>.*?<\/p>/gi) || [];
    
    if (updatedParagraphs.length !== originalParagraphs.length) {
        sections.push('Content structure modified');
    }
    
    return sections;
}

// Count words in HTML content
function countWords(html: string): number {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text ? text.split(' ').length : 0;
}

// Generate refresh summary
export function generateRefreshSummary(analysis: RefreshAnalysis, refreshed: RefreshedContent): string {
    const parts: string[] = [];
    
    if (analysis.needsUpdate) {
        parts.push(`✅ Content successfully refreshed (${analysis.confidence}% confidence needed update)`);
    }
    
    if (refreshed.changes.length > 0) {
        parts.push(`\n📝 Changes made:\n${refreshed.changes.map(c => `  • ${c}`).join('\n')}`);
    }
    
    if (refreshed.addedSections.length > 0) {
        parts.push(`\n➕ New sections:\n${refreshed.addedSections.map(s => `  • ${s}`).join('\n')}`);
    }
    
    if (refreshed.wordCountChange !== 0) {
        const sign = refreshed.wordCountChange > 0 ? '+' : '';
        parts.push(`\n📊 Word count: ${sign}${refreshed.wordCountChange} words`);
    }
    
    return parts.join('\n');
}
