import { openai, getModelForPlan } from "@/lib/ai/client";
import { scrapeAmazonProducts, AmazonProduct } from "./scraper";

export interface AmazonGenerationOptions {
    niche: string;
    storeId: string;
    productCount?: number;
    articleType?: "roundup" | "single-review" | "comparison" | "buyers-guide";
    language?: string;
    tone?: string;
    includeComparisonTable?: boolean;
    customInstructions?: string;
    userPlan?: string;
}

export interface AmazonOutline {
    sections: Array<{
        heading: string;
        level: number;
        points: string[];
        productIndex?: number; // Which product this section is about
        includeAffiliateLink?: boolean;
    }>;
    products: AmazonProduct[];
    suggestedLabels: string[];
    totalWordCount: number;
}

/**
 * Generate Amazon affiliate article titles
 */
export async function generateAmazonTitles(options: AmazonGenerationOptions): Promise<string[]> {
    const { niche, articleType = "roundup", language = "English" } = options;
    
    const systemPrompt = `You are an expert Amazon affiliate content writer who creates SEO-optimized titles that rank and convert.

CRITICAL RULES:
- Include the primary keyword "${niche}" naturally
- Use power words: Best, Top, Ultimate, Complete, Expert, Honest, Tested
- Include year (2026) for freshness
- Keep under 60 characters
- Match the article type: ${articleType}
- Write in ${language}

TITLE PATTERNS:
- Roundup: "Best ${niche} 2026: Top [X] Picks Tested & Reviewed"
- Single Review: "[Product Name] Review 2026: Is It Worth It? (Honest Take)"
- Comparison: "[Product A] vs [Product B]: Which ${niche} Wins? (2026)"
- Buyer's Guide: "How to Choose the Best ${niche}: Complete 2026 Guide"

Return ONLY a JSON array of 5 title strings.`;

    const model = getModelForPlan(options.userPlan);
    
    const response = await openai.chat.completions.create({
        model,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Generate 5 SEO-optimized titles for a ${articleType} about "${niche}". Each title must be unique and compelling.` },
        ],
        temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content || "[]";
    try {
        const parsed = JSON.parse(content.trim());
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [
            `Best ${niche} 2026: Top ${options.productCount || 5} Picks Reviewed`,
            `${niche} Buying Guide: Expert Tips & Top Picks (2026)`,
            `Top ${options.productCount || 5} ${niche} Tested & Compared (2026)`,
        ];
    }
}

/**
 * Generate comprehensive outline for Amazon affiliate article
 */
export async function generateAmazonOutline(
    title: string,
    products: AmazonProduct[],
    options: AmazonGenerationOptions
): Promise<AmazonOutline> {
    const { niche, articleType = "roundup", language = "English", productCount = 5 } = options;
    
    const systemPrompt = `You are an expert SEO content strategist specializing in Amazon affiliate articles that rank and convert.

Create a comprehensive outline for an Amazon affiliate article that:
- Provides genuine value and helps readers make informed decisions
- Naturally integrates affiliate product recommendations
- Follows SEO best practices with proper keyword placement
- Includes comparison tables, pros/cons, and buying guides
- Structures content for featured snippets and rich results

OUTLINE STRUCTURE FOR ${articleType.toUpperCase()}:

1. TLDR Summary (2-3 sentences before first H2)
2. Introduction H2 (include keyword, hook readers)
3. Quick Comparison Table (if roundup/comparison)
4. Individual Product Sections (H2 for each product)
   - Product name as H2
   - Overview paragraph
   - Key Features (H3)
   - Pros & Cons (H3)
   - Who Should Buy (H3)
   - Affiliate link placement note
5. Buying Guide (H2: "How to Choose the Best ${niche}")
   - 5-7 factors as H3 subsections
6. FAQ Section (H2: "Frequently Asked Questions")
   - 5-8 common questions
7. Conclusion (H2: "Final Verdict" or "Our Top Pick")

Return JSON with this structure:
{
  "sections": [
    {
      "heading": "Section title",
      "level": 2,
      "points": ["point 1", "point 2"],
      "productIndex": 0,
      "includeAffiliateLink": true
    }
  ],
  "suggestedLabels": ["label1", "label2"],
  "totalWordCount": 2500
}`;

    const productsInfo = products.map((p, i) => `${i + 1}. ${p.name} (${p.price || 'N/A'})`).join('\n');

    const model = getModelForPlan(options.userPlan);
    
    const response = await openai.chat.completions.create({
        model,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Create outline for:

Title: ${title}
Niche: ${niche}
Article Type: ${articleType}
Language: ${language}
Target Word Count: 2500-3000

Products to review:
${productsInfo}

Return ONLY valid JSON.` },
        ],
        temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "{}";
    try {
        const parsed = JSON.parse(content.trim().replace(/^```json\s*|\s*```$/g, ''));
        return {
            ...parsed,
            products,
        };
    } catch (error) {
        console.error('Failed to parse outline:', error);
        return {
            sections: [],
            products,
            suggestedLabels: [niche, 'product review', 'buying guide'],
            totalWordCount: 2500,
        };
    }
}

/**
 * Generate full Amazon affiliate article
 */
export async function generateAmazonArticle(
    title: string,
    outline: AmazonOutline,
    options: AmazonGenerationOptions
): Promise<string> {
    const { niche, storeId, language = "English", tone = "professional" } = options;
    
    const systemPrompt = `You are an elite Amazon affiliate content writer who creates comprehensive, SEO-optimized product reviews that rank on Google and convert readers into buyers.

CRITICAL WRITING RULES:
1. Write in ${language}, ${tone} tone
2. Target keyword: "${niche}" - use 15-20 times naturally
3. Write 2500-3000 words minimum
4. Use semantic HTML: <h2>, <h3>, <p>, <ul>, <ol>, <table>, <strong>
5. NO <h1> tags (Blogger uses title field)
6. NO image tags - images will be added separately
7. Include affiliate links using this format: <a href="https://www.amazon.com/s?k=PRODUCT+NAME&tag=${storeId}" target="_blank" rel="nofollow noopener">Product Name</a>
8. Add affiliate disclosure at the top
9. Be honest and unbiased - mention both pros and cons
10. Include comparison tables with HTML <table> tags
11. Every paragraph max 3-4 sentences for readability
12. Use bullet points for features, pros, and cons
13. Include specific product details, specs, and use cases
14. Write naturally - avoid keyword stuffing
15. End sections with clear recommendations

AFFILIATE LINK PLACEMENT:
- Product name mentions (first occurrence in each section)
- "Check Price on Amazon" buttons (styled as links)
- Comparison table product names
- Final recommendation section

SEO OPTIMIZATION:
- Keyword in first paragraph
- Keyword in 3-4 H2 headings naturally
- LSI keywords throughout
- Answer user intent completely
- Include schema-worthy content (ratings, prices, features)

STRUCTURE:
- Start with affiliate disclosure
- TLDR paragraph
- Follow the outline sections exactly
- Include all products from outline
- End with strong conclusion and CTA

Return ONLY the HTML article body. No markdown. No explanations.`;

    const productsInfo = outline.products.map((p, i) => 
        `${i + 1}. ${p.name}
   - Price: ${p.price || 'Check Amazon'}
   - Rating: ${p.rating || 'N/A'}
   - Image: ${p.imageUrl}
   - Features: ${p.features?.join(', ') || 'Premium quality, durable construction, excellent value'}`
    ).join('\n\n');

    const model = getModelForPlan(options.userPlan);
    const targetWords = 2500;
    const maxTokens = Math.ceil(targetWords * 1.5 * 1.5);

    console.log(`📝 Amazon Article Generation: Target=${targetWords} words, MaxTokens=${maxTokens}, Model=${model}`);

    const response = await openai.chat.completions.create({
        model,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Write a complete Amazon affiliate article:

Title: ${title}
Niche: ${niche}
Store ID: ${storeId}
Language: ${language}
Tone: ${tone}

PRODUCTS TO REVIEW:
${productsInfo}

OUTLINE TO FOLLOW:
${JSON.stringify(outline.sections, null, 2)}

${options.customInstructions ? `\nADDITIONAL INSTRUCTIONS:\n${options.customInstructions}` : ''}

REMEMBER:
- Write EXACTLY 2500-3000 words
- Include affiliate links for each product
- Use product images provided above
- Be comprehensive and helpful
- Follow the outline structure
- Return ONLY HTML content` },
        ],
        temperature: 0.8,
        max_tokens: maxTokens,
    });

    let article = response.choices[0]?.message?.content || "";
    
    // Clean up
    article = article
        .replace(/^```html?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();

    // Inject real product images into the article
    outline.products.forEach((product, index) => {
        const productHeadingRegex = new RegExp(`<h2[^>]*>${product.name.substring(0, 30)}[^<]*</h2>`, 'i');
        const match = article.match(productHeadingRegex);
        
        if (match) {
            const imageTag = `\n<img src="${product.imageUrl}" alt="${product.name} - ${niche}" class="product-image" style="max-width: 100%; height: auto; border-radius: 8px; margin: 20px 0;" loading="lazy" />\n`;
            article = article.replace(match[0], match[0] + imageTag);
        }
    });

    const wordCount = article.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
    console.log(`✅ Amazon Article Generated: ${wordCount} words`);

    return article;
}

/**
 * Full pipeline for Amazon affiliate article generation
 */
export async function generateFullAmazonArticle(options: AmazonGenerationOptions): Promise<{
    titles: string[];
    selectedTitle: string;
    outline: AmazonOutline;
    article: string;
    products: AmazonProduct[];
    wordCount: number;
    affiliateLinkCount: number;
}> {
    const { niche, storeId, productCount = 5 } = options;

    // Step 1: Scrape real Amazon products
    console.log(`🔍 Scraping Amazon for "${niche}"...`);
    const products = await scrapeAmazonProducts(niche, productCount);

    // Step 2: Generate titles
    console.log(`📋 Generating titles...`);
    const titles = await generateAmazonTitles(options);
    const selectedTitle = titles[0] || `Best ${niche} 2026: Top ${productCount} Picks Reviewed`;

    // Step 3: Generate outline
    console.log(`📝 Creating outline...`);
    const outline = await generateAmazonOutline(selectedTitle, products, options);

    // Step 4: Generate full article
    console.log(`✍️ Writing article...`);
    const article = await generateAmazonArticle(selectedTitle, outline, options);

    // Count stats
    const wordCount = article.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
    const affiliateLinkCount = (article.match(new RegExp(storeId, 'g')) || []).length;

    return {
        titles,
        selectedTitle,
        outline,
        article,
        products,
        wordCount,
        affiliateLinkCount,
    };
}
