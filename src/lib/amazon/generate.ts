/**
 * Amazon Affiliate Article Generator
 * 
 * Uses the SAME pipeline as regular article generation:
 *   generateTitles → generateOutline → generateArticle → generateFAQ → generateMeta → generateFeaturedImage
 * 
 * Adds affiliate-specific context:
 *   - AI product research (realistic products for the niche)
 *   - Affiliate link building (amazon.com/s?k=PRODUCT&tag=STORE_ID)
 *   - Product images via Cloudflare AI (same as regular articles)
 *   - Blogger formatting, TOC, schema markup
 */

import { openai, getModelForPlan } from "@/lib/ai/client";
import {
    generateTitles,
    generateOutline,
    generateArticle,
    generateFAQ,
    generateMeta,
    generateFeaturedImage,
    type GenerationOptions,
    type Outline,
    type FAQ,
    type MetaOutput,
} from "@/lib/ai/generate";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AmazonProduct {
    name: string;
    searchTerms: string;
    priceRange: string;
    rating: string;
    keyFeatures: string[];
    bestFor: string;
    affiliateUrl: string;
}

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
    includeImages?: boolean;
    numInlineImages?: number;
    blogId?: string;
}

export interface AmazonArticleResult {
    title: string;
    article: string;
    faqs: FAQ[];
    meta: MetaOutput;
    outline: Outline;
    products: AmazonProduct[];
    featuredImage?: { url: string; altText: string };
    inlineImages: Array<{ url: string; altText: string }>;
    wordCount: number;
    affiliateLinkCount: number;
}

// ─── Step 1: AI Product Research ────────────────────────────────────────────

function cleanJSON(str: string): string {
    const text = str.trim();
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
        return text.substring(firstBracket, lastBracket + 1);
    }
    return text;
}

export async function researchProducts(
    niche: string,
    productCount: number,
    articleType: string,
    userPlan?: string
): Promise<AmazonProduct[]> {
    const model = getModelForPlan(userPlan);

    const response = await openai.chat.completions.create({
        model,
        messages: [
            {
                role: "system",
                content: `You are an Amazon product research expert. Given a product niche, identify the top real, currently-available products on Amazon that people actually buy and review.

RULES:
- Use REAL product names from actual brands
- Include accurate price ranges
- Include realistic ratings (4.0-4.8 range)
- Include specific key features that differentiate each product
- Include who the product is best for
- Cover different price points (budget, mid-range, premium)
- For single-review: pick the #1 best-seller in the category
- For comparison: pick 2-3 direct competitors
- For buyer's guide: pick products across different sub-categories

Return ONLY a valid JSON array.`
            },
            {
                role: "user",
                content: `Research the top ${productCount} products for "${niche}" (article type: ${articleType}).

Return JSON array:
[
  {
    "name": "Full Product Name with Brand",
    "searchTerms": "search terms for Amazon",
    "priceRange": "$XX-$XX",
    "rating": "4.X out of 5",
    "keyFeatures": ["feature 1", "feature 2", "feature 3", "feature 4"],
    "bestFor": "Best for [use case]"
  }
]`
            }
        ],
        temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "[]";
    try {
        const parsed = JSON.parse(cleanJSON(content));
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        console.error("Failed to parse product research, using fallback");
        return [];
    }
}

// ─── Step 2: Build Affiliate Links ─────────────────────────────────────────

export function buildAffiliateData(
    products: AmazonProduct[],
    storeId: string
): AmazonProduct[] {
    return products.map(product => ({
        ...product,
        affiliateUrl: `https://www.amazon.com/s?k=${encodeURIComponent(product.searchTerms || product.name).replace(/%20/g, '+')}&tag=${storeId}`,
    }));
}

export function buildAffiliateLinksArray(products: AmazonProduct[]): string[] {
    return products.map(p =>
        `${p.name} (${p.priceRange}): ${p.affiliateUrl}`
    );
}

// ─── Step 3: Map Article Types ──────────────────────────────────────────────

function getKeyword(niche: string, articleType: string, products: AmazonProduct[]): string {
    switch (articleType) {
        case "roundup": return `best ${niche}`;
        case "single-review": return products[0]?.name ? `${products[0].name} review` : `best ${niche} review`;
        case "comparison": return products.length >= 2
            ? `${products[0].name} vs ${products[1].name}`
            : `best ${niche} comparison`;
        case "buyers-guide": return `${niche} buying guide`;
        default: return `best ${niche}`;
    }
}

function getArticleType(amazonType: string): string {
    switch (amazonType) {
        case "roundup": return "listicle";
        case "single-review": return "product-review";
        case "comparison": return "comparison";
        case "buyers-guide": return "guide";
        default: return "blog post";
    }
}

function getWordCount(amazonType: string, productCount: number): number {
    switch (amazonType) {
        case "roundup": return Math.max(2500, productCount * 400 + 1000);
        case "single-review": return 2000;
        case "comparison": return 2500;
        case "buyers-guide": return 3000;
        default: return 2500;
    }
}

function buildBrandVoice(niche: string, storeId: string, products: AmazonProduct[], customInstructions?: string): string {
    const productList = products.map((p, i) => 
        `${i + 1}. ${p.name} (${p.priceRange}, ${p.rating}) - ${p.bestFor}\n   Features: ${p.keyFeatures.join(', ')}\n   Link: ${p.affiliateUrl}`
    ).join('\n');

    return `YOU ARE WRITING AN AMAZON AFFILIATE PRODUCT REVIEW ARTICLE.

PRODUCT DATA (use these EXACT products):
${productList}

AFFILIATE LINK RULES:
- For each product, use this exact link format: <a href="AFFILIATE_URL" target="_blank" rel="nofollow noopener sponsored">Product Name</a>
- First mention of each product in its section MUST be an affiliate link
- Add "Check Price on Amazon" links after each product review section
- In comparison tables, product names should be affiliate links
- In the conclusion/verdict, link to the top pick
- NEVER use generic "click here" text — always use the product name as anchor text

CONTENT STYLE:
- Write as someone who has personally tested these products
- Include specific, realistic details (weight, dimensions, performance metrics)
- Be honest — mention real limitations alongside strengths
- Compare products against each other naturally
- Include "who should buy this" recommendations per product
- Mention price-to-value ratio for each product
- Use E-E-A-T signals: "After testing for 2 weeks...", "In my experience..."

DISCLOSURE:
- Start the article with: <p><em>As an Amazon Associate, I earn from qualifying purchases. This helps support the site at no extra cost to you.</em></p>

${customInstructions ? `ADDITIONAL INSTRUCTIONS: ${customInstructions}` : ''}`;
}

// ─── Step 4: Full Pipeline ──────────────────────────────────────────────────

export async function generateAmazonArticle(
    options: AmazonGenerationOptions
): Promise<AmazonArticleResult> {
    const {
        niche,
        storeId,
        productCount = 5,
        articleType = "roundup",
        language = "English",
        tone = "professional",
        includeComparisonTable = true,
        customInstructions,
        userPlan,
        includeImages = true,
        numInlineImages = 3,
    } = options;

    // ── Step 1: Research products ──
    console.log(`🔍 Step 1: Researching ${productCount} products for "${niche}"...`);
    let products = await researchProducts(niche, productCount, articleType, userPlan);
    if (products.length === 0) {
        // Fallback: generate generic product names
        products = Array.from({ length: productCount }, (_, i) => ({
            name: `Top ${niche} Pick #${i + 1}`,
            searchTerms: niche,
            priceRange: "$30-$100",
            rating: "4.5 out of 5",
            keyFeatures: ["High quality", "Great value", "Popular choice"],
            bestFor: `Best overall ${niche}`,
            affiliateUrl: "",
        }));
    }

    // ── Step 2: Build affiliate data ──
    console.log(`🔗 Step 2: Building affiliate links for ${products.length} products...`);
    products = buildAffiliateData(products, storeId);
    const affiliateLinks = buildAffiliateLinksArray(products);

    // ── Step 3: Determine keyword and article config ──
    const keyword = getKeyword(niche, articleType, products);
    const mappedArticleType = getArticleType(articleType);
    const wordCount = getWordCount(articleType, productCount);
    const brandVoice = buildBrandVoice(niche, storeId, products, customInstructions);

    console.log(`🎯 Step 3: Keyword="${keyword}", Type="${mappedArticleType}", Words=${wordCount}`);

    // ── Build GenerationOptions (same as regular articles) ──
    const genOptions: GenerationOptions = {
        keyword,
        language,
        tone,
        niche,
        articleType: mappedArticleType,
        wordCount,
        brandVoice,
        affiliateLinks,
        includeFaq: true,
        includeImages,
        numInlineImages,
        includeComparisonTable,
        includeProsCons: true,
        userPlan,
    };

    // ── Step 4: Generate titles (same function as regular articles) ──
    console.log(`📋 Step 4: Generating SEO titles...`);
    const titles = await generateTitles(genOptions);
    const selectedTitle = titles[0] || `Best ${niche} 2026: Top ${productCount} Picks Reviewed`;

    // ── Step 5: Generate outline (same function as regular articles) ──
    console.log(`📝 Step 5: Creating comprehensive outline...`);
    const outline = await generateOutline(selectedTitle, genOptions);

    // ── Step 6: Generate article (same function as regular articles) ──
    console.log(`✍️ Step 6: Writing ${wordCount}-word article...`);
    const article = await generateArticle(selectedTitle, outline, genOptions);

    // ── Step 7: Generate FAQs (same function as regular articles) ──
    console.log(`❓ Step 7: Generating FAQs...`);
    const faqs = await generateFAQ(keyword, article, language, niche, userPlan);

    // ── Step 8: Generate meta (same function as regular articles) ──
    console.log(`🔖 Step 8: Generating meta description...`);
    const meta = await generateMeta(selectedTitle, article, keyword, language, userPlan);

    // ── Step 9: Generate product images (same Cloudflare AI system) ──
    let featuredImage: { url: string; altText: string } | undefined;
    const inlineImages: Array<{ url: string; altText: string }> = [];

    if (includeImages) {
        console.log(`🖼️ Step 9: Generating AI product images...`);

        // Featured image for the article
        featuredImage = await generateFeaturedImage(selectedTitle, keyword, "featured", undefined, 0);

        // One image per product (or up to numInlineImages)
        const imagesToGenerate = Math.min(products.length, numInlineImages);
        for (let i = 0; i < imagesToGenerate; i++) {
            console.log(`  🖼️ Product image ${i + 1}/${imagesToGenerate}: ${products[i].name}`);
            const img = await generateFeaturedImage(
                selectedTitle,
                products[i].name,
                "content",
                products[i].name, // section context = product name for relevant images
                i + 1 // varied styles
            );
            if (img.url) {
                inlineImages.push(img);
            }
        }
    }

    // Count affiliate links
    const affiliateLinkCount = (article.match(new RegExp(storeId, 'g')) || []).length;
    const actualWordCount = article.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;

    console.log(`✅ Amazon article complete: ${actualWordCount} words, ${affiliateLinkCount} affiliate links, ${inlineImages.length} product images`);

    return {
        title: selectedTitle,
        article,
        faqs,
        meta,
        outline,
        products,
        featuredImage,
        inlineImages,
        wordCount: actualWordCount,
        affiliateLinkCount,
    };
}
