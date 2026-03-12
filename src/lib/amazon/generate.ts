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

// ─── Amazon Store Regions ────────────────────────────────────────────────────

export interface AmazonRegion {
    code: string;
    name: string;
    domain: string;
    currency: string;
    currencySymbol: string;
    flag: string;
}

export const AMAZON_REGIONS: Record<string, AmazonRegion> = {
    us: { code: 'us', name: 'United States', domain: 'amazon.com', currency: 'USD', currencySymbol: '$', flag: '🇺🇸' },
    ca: { code: 'ca', name: 'Canada', domain: 'amazon.ca', currency: 'CAD', currencySymbol: 'CA$', flag: '🇨🇦' },
    uk: { code: 'uk', name: 'United Kingdom', domain: 'amazon.co.uk', currency: 'GBP', currencySymbol: '£', flag: '🇬🇧' },
    de: { code: 'de', name: 'Germany', domain: 'amazon.de', currency: 'EUR', currencySymbol: '€', flag: '🇩🇪' },
    fr: { code: 'fr', name: 'France', domain: 'amazon.fr', currency: 'EUR', currencySymbol: '€', flag: '🇫🇷' },
    es: { code: 'es', name: 'Spain', domain: 'amazon.es', currency: 'EUR', currencySymbol: '€', flag: '🇪🇸' },
    it: { code: 'it', name: 'Italy', domain: 'amazon.it', currency: 'EUR', currencySymbol: '€', flag: '🇮🇹' },
    jp: { code: 'jp', name: 'Japan', domain: 'amazon.co.jp', currency: 'JPY', currencySymbol: '¥', flag: '🇯🇵' },
    au: { code: 'au', name: 'Australia', domain: 'amazon.com.au', currency: 'AUD', currencySymbol: 'A$', flag: '🇦🇺' },
    in: { code: 'in', name: 'India', domain: 'amazon.in', currency: 'INR', currencySymbol: '₹', flag: '🇮🇳' },
    mx: { code: 'mx', name: 'Mexico', domain: 'amazon.com.mx', currency: 'MXN', currencySymbol: 'MX$', flag: '🇲🇽' },
    br: { code: 'br', name: 'Brazil', domain: 'amazon.com.br', currency: 'BRL', currencySymbol: 'R$', flag: '🇧🇷' },
    ae: { code: 'ae', name: 'UAE', domain: 'amazon.ae', currency: 'AED', currencySymbol: 'AED', flag: '🇦🇪' },
    sa: { code: 'sa', name: 'Saudi Arabia', domain: 'amazon.sa', currency: 'SAR', currencySymbol: 'SAR', flag: '🇸🇦' },
    nl: { code: 'nl', name: 'Netherlands', domain: 'amazon.nl', currency: 'EUR', currencySymbol: '€', flag: '🇳🇱' },
    se: { code: 'se', name: 'Sweden', domain: 'amazon.se', currency: 'SEK', currencySymbol: 'kr', flag: '🇸🇪' },
    pl: { code: 'pl', name: 'Poland', domain: 'amazon.pl', currency: 'PLN', currencySymbol: 'zł', flag: '🇵🇱' },
    sg: { code: 'sg', name: 'Singapore', domain: 'amazon.sg', currency: 'SGD', currencySymbol: 'S$', flag: '🇸🇬' },
};

export function getRegion(code?: string): AmazonRegion {
    return AMAZON_REGIONS[code || 'us'] || AMAZON_REGIONS.us;
}

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
    storeRegion?: string;
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
    userPlan?: string,
    regionCode?: string
): Promise<AmazonProduct[]> {
    const model = getModelForPlan(userPlan);
    const region = getRegion(regionCode);

    const response = await openai.chat.completions.create({
        model,
        messages: [
            {
                role: "system",
                content: `You are an Amazon product research expert. Your job is to identify the most popular, TOP-SELLING products currently available on Amazon ${region.name} (${region.domain}) for a given niche.

CRITICAL RULES:
- ONLY suggest products that are VERIFIED best-sellers on Amazon ${region.name} right now (2026)
- Products MUST be available on ${region.domain} — do not suggest products only available in other regions
- Use the EXACT brand and product name as it appears on Amazon listings
- Do NOT invent or guess model numbers — if unsure, use the brand + general product line (e.g. "Sony WH-1000XM5" not "Sony WH-1000XM7")
- Pick products that have thousands of reviews on Amazon (popular, well-known items)
- Include accurate price ranges in ${region.currency} (${region.currencySymbol})
- Include realistic ratings (4.0-4.8 range)
- Cover different price tiers: budget, mid-range, and premium
- For single-review: pick THE most popular product in that exact category
- For comparison: pick 2-3 direct competitors at similar price points
- For buyer's guide: pick products across different sub-categories/use cases

SEARCH TERMS RULES (VERY IMPORTANT):
- "searchTerms" must be BROAD category searches that a real person would type into Amazon
- Use format: "brand name + product category" (e.g. "Sony wireless headphones", "Ninja air fryer", "Breville espresso machine")
- NEVER use specific model numbers in searchTerms — keep them broad so Amazon search returns relevant results
- The searchTerms are used in Amazon search URLs like: ${region.domain}/s?k=SEARCH+TERMS

Return ONLY a valid JSON array.`
            },
            {
                role: "user",
                content: `Research the top ${productCount} REAL best-selling products on Amazon ${region.name} (${region.domain}) for "${niche}" (article type: ${articleType}).

All prices MUST be in ${region.currency} (${region.currencySymbol}).

Return JSON array:
[
  {
    "name": "Brand + Product Name (as listed on Amazon)",
    "searchTerms": "broad Amazon search terms (brand + category, NO model numbers)",
    "priceRange": "${region.currencySymbol}XX-${region.currencySymbol}XX",
    "rating": "4.X out of 5",
    "keyFeatures": ["feature 1", "feature 2", "feature 3", "feature 4"],
    "bestFor": "Best for [specific use case]"
  }
]

Example searchTerms: "Breville espresso machine", "Sony wireless headphones", "Ninja air fryer large"
BAD searchTerms: "Breville BES870XL Barista Express", "Sony WH-1000XM5 Wireless"`
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
    storeId: string,
    regionCode?: string
): AmazonProduct[] {
    const region = getRegion(regionCode);
    return products.map(product => ({
        ...product,
        affiliateUrl: `https://www.${region.domain}/s?k=${encodeURIComponent(product.searchTerms || product.name).replace(/%20/g, '+')}&tag=${storeId}`,
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
        case "roundup": return Math.max(3000, productCount * 500 + 1000);
        case "single-review": return 2500;
        case "comparison": return 3000;
        case "buyers-guide": return 3500;
        default: return 3000;
    }
}

function buildBrandVoice(niche: string, storeId: string, products: AmazonProduct[], regionCode?: string, customInstructions?: string): string {
    const region = getRegion(regionCode);
    const productList = products.map((p, i) => 
        `${i + 1}. ${p.name} (${p.priceRange}, ${p.rating}) - ${p.bestFor}\n   Features: ${p.keyFeatures.join(', ')}\n   Amazon Search Link: ${p.affiliateUrl}`
    ).join('\n');

    return `YOU ARE WRITING AN AMAZON AFFILIATE PRODUCT REVIEW ARTICLE FOR Amazon ${region.name} (${region.domain}).

PRODUCT DATA (use these EXACT products and names):
${productList}

AFFILIATE LINK RULES — READ CAREFULLY:
- ONLY use the Amazon SEARCH URLs provided above (format: ${region.domain}/s?k=...&tag=...)
- NEVER create direct product URLs (${region.domain}/dp/ASIN) — the affiliate tag ONLY works on search URLs
- For each product, use this exact format: <a href="THE_SEARCH_URL_PROVIDED_ABOVE" target="_blank" rel="nofollow noopener sponsored">Product Name</a>
- First mention of each product in its section MUST be a clickable affiliate link using the search URL above
- After each product review section, add a styled CTA: <p><strong><a href="SEARCH_URL" target="_blank" rel="nofollow noopener sponsored">➡ Check ${'{product short name}'} Price on Amazon</a></strong></p>
- In comparison tables, product names should be affiliate links
- In the conclusion, link to the top pick with its search URL
- NEVER use "click here" — always use the product name or "Check Price on Amazon" as anchor text
- NEVER invent or guess Amazon URLs — only use the exact URLs listed above
- All prices must be in ${region.currency} (${region.currencySymbol})

OUTBOUND & EXTERNAL LINKS (IMPORTANT FOR SEO):
- Include 2-4 outbound links to authoritative, non-competing sources throughout the article
- Good outbound link targets: manufacturer official pages, respected review sites (Wirecutter, RTINGS, Consumer Reports), Wikipedia for technical terms, relevant subreddits, industry publications
- Format: <a href="https://example.com/relevant-page" target="_blank" rel="noopener">descriptive anchor text</a>
- Place outbound links naturally where they add value (e.g. "According to <a href="...">Wirecutter's testing</a>...")
- These outbound links signal to Google that your content is well-researched and connected to the broader web
- Do NOT link to competitor affiliate sites or other Amazon affiliate blogs
- Do NOT overdo it — 2-4 quality outbound links is ideal for a review article

WRITING STYLE RULES:
- After the FIRST full mention of a product name, use a SHORT name for the rest (e.g. "Breville Barista Express" → "the Barista Express" or "Breville")
- Do NOT repeat the full product name in every sentence — it sounds robotic
- Write as someone who has personally tested and compared these products hands-on
- Include SPECIFIC, realistic details: weight in lbs/kg, dimensions, wattage, capacity, material
- Be honest — mention 2-3 real limitations per product alongside strengths
- Compare products against each other directly ("Unlike the X, the Y offers...")
- Include "Who should buy this" and "Who should skip this" for each product
- Mention price-to-value ratio and whether it's worth the premium
- Use first-person E-E-A-T signals: "After testing for 2 weeks...", "In my hands-on testing...", "What surprised me was..."
- Every paragraph should be 2-4 sentences MAX for readability
- Use varied sentence structures — avoid starting consecutive sentences with the same word

WORD COUNT:
- Write COMPREHENSIVE content — aim for the FULL target word count
- Each product section should be 300-500 words minimum
- Include a thorough buying guide section (400+ words)
- Do NOT pad with fluff — every sentence should add value

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
        storeRegion,
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

    const region = getRegion(storeRegion);

    // ── Step 1: Research products ──
    console.log(`🔍 Step 1: Researching ${productCount} products for "${niche}" on Amazon ${region.name}...`);
    let products = await researchProducts(niche, productCount, articleType, userPlan, storeRegion);
    if (products.length === 0) {
        // Fallback: generate generic product names
        products = Array.from({ length: productCount }, (_, i) => ({
            name: `Top ${niche} Pick #${i + 1}`,
            searchTerms: niche,
            priceRange: `${region.currencySymbol}30-${region.currencySymbol}100`,
            rating: "4.5 out of 5",
            keyFeatures: ["High quality", "Great value", "Popular choice"],
            bestFor: `Best overall ${niche}`,
            affiliateUrl: "",
        }));
    }

    // ── Step 2: Build affiliate data ──
    console.log(`🔗 Step 2: Building affiliate links for ${products.length} products...`);
    products = buildAffiliateData(products, storeId, storeRegion);
    const affiliateLinks = buildAffiliateLinksArray(products);

    // ── Step 3: Determine keyword and article config ──
    const keyword = getKeyword(niche, articleType, products);
    const mappedArticleType = getArticleType(articleType);
    const wordCount = getWordCount(articleType, productCount);
    const brandVoice = buildBrandVoice(niche, storeId, products, storeRegion, customInstructions);

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
