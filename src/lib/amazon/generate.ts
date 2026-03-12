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
    productUrl?: string;
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
    // Try array first
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
        return text.substring(firstBracket, lastBracket + 1);
    }
    // Try object
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        return text.substring(firstBrace, lastBrace + 1);
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

// ─── Step 1b: Research Product from URL ─────────────────────────────────────

export async function researchProductFromUrl(
    productUrl: string,
    niche: string,
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
                content: `You are an Amazon product expert. The user has provided a specific Amazon product URL. Your job is to identify the EXACT product from the URL and provide comprehensive, accurate product data.

CRITICAL RULES:
- Identify the product from the URL (parse the product name from the URL slug, ASIN, or any identifiers)
- Provide the REAL product name, brand, price range, rating, and key features
- Be as accurate as possible — this is a REAL product the user wants to review
- Include detailed key features (6-8 features) since this is a deep single-product review
- The "searchTerms" should be BROAD (brand + category) for the affiliate search URL
- Include price in ${region.currency} (${region.currencySymbol})
- Also identify 2 COMPETING products in the same category for comparison sections

Return a JSON object (NOT array) with this structure:
{
  "main": { product data for the URL product },
  "competitors": [ 2 competing products for comparison ]
}`
            },
            {
                role: "user",
                content: `Identify the exact product from this Amazon URL and research it:
URL: ${productUrl}
Niche context: ${niche}
Amazon region: ${region.name} (${region.domain})

Return JSON:
{
  "main": {
    "name": "Exact Brand + Product Name",
    "searchTerms": "broad brand + category search (NO model numbers)",
    "priceRange": "${region.currencySymbol}XX-${region.currencySymbol}XX",
    "rating": "4.X out of 5",
    "keyFeatures": ["feature 1", "feature 2", "feature 3", "feature 4", "feature 5", "feature 6"],
    "bestFor": "Best for [specific use case]"
  },
  "competitors": [
    {
      "name": "Competitor Brand + Product",
      "searchTerms": "broad search terms",
      "priceRange": "${region.currencySymbol}XX-${region.currencySymbol}XX",
      "rating": "4.X out of 5",
      "keyFeatures": ["feature 1", "feature 2", "feature 3", "feature 4"],
      "bestFor": "Best for [use case]"
    }
  ]
}`
            }
        ],
        temperature: 0.5,
    });

    const content = response.choices[0]?.message?.content || "{}";
    try {
        const parsed = JSON.parse(cleanJSON(content));
        const products: AmazonProduct[] = [];

        if (parsed.main) {
            products.push({
                name: parsed.main.name || niche,
                searchTerms: parsed.main.searchTerms || niche,
                priceRange: parsed.main.priceRange || `${region.currencySymbol}50-${region.currencySymbol}200`,
                rating: parsed.main.rating || "4.5 out of 5",
                keyFeatures: parsed.main.keyFeatures || ["High quality"],
                bestFor: parsed.main.bestFor || `Best ${niche}`,
                affiliateUrl: "",
            });
        }

        if (Array.isArray(parsed.competitors)) {
            for (const comp of parsed.competitors) {
                products.push({
                    name: comp.name,
                    searchTerms: comp.searchTerms || comp.name,
                    priceRange: comp.priceRange || `${region.currencySymbol}50-${region.currencySymbol}200`,
                    rating: comp.rating || "4.3 out of 5",
                    keyFeatures: comp.keyFeatures || ["Good alternative"],
                    bestFor: comp.bestFor || "Good alternative",
                    affiliateUrl: "",
                });
            }
        }

        return products;
    } catch {
        console.error("Failed to parse product URL research, using fallback");
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

function buildBrandVoice(niche: string, storeId: string, products: AmazonProduct[], regionCode?: string, customInstructions?: string, isUrlReview?: boolean): string {
    const region = getRegion(regionCode);
    const mainProduct = products[0];
    const competitors = products.slice(1);
    const productList = products.map((p, i) => 
        `${i + 1}. ${p.name} (${p.priceRange}, ${p.rating}) - ${p.bestFor}\n   Features: ${p.keyFeatures.join(', ')}\n   Amazon Search Link: ${p.affiliateUrl}`
    ).join('\n');

    const urlReviewBlock = isUrlReview && mainProduct ? `
SPECIFIC PRODUCT REVIEW MODE:
This article is a DEEP REVIEW of a specific product: "${mainProduct.name}"
- This is the PRIMARY focus product — dedicate 60-70% of the article to reviewing it in-depth
- Cover EVERY aspect a buyer would want to know before purchasing
- Include a "vs Competitors" section comparing it against: ${competitors.map(c => c.name).join(', ')}
- The comparison should be fair but position the main product as the focus
- Include a definitive "Should You Buy It?" verdict section at the end
- Answer these buyer questions within the article:
  * What exactly does this product do and who is it for?
  * What are its best features and why do they matter?
  * What are the honest downsides and limitations?
  * How does it compare to the top alternatives?
  * Is it worth the price? What value does it deliver?
  * What do real users say about it (reference common review themes)?
  * What should you know before buying?
` : '';

    return `YOU ARE WRITING A PROFESSIONAL AMAZON AFFILIATE PRODUCT REVIEW ARTICLE FOR Amazon ${region.name} (${region.domain}).

YOUR GOAL: Create the MOST HELPFUL, COMPREHENSIVE, and CONVINCING product review on the internet for this topic. The reader should finish the article with ZERO unanswered questions and feel confident about their purchase decision.
${urlReviewBlock}
PRODUCT DATA (use these EXACT products and names):
${productList}

═══════════════════════════════════════════════════════════════════
AFFILIATE LINK RULES — MANDATORY:
═══════════════════════════════════════════════════════════════════
- ONLY use the Amazon SEARCH URLs provided above (format: ${region.domain}/s?k=...&tag=...)
- NEVER create direct product URLs (${region.domain}/dp/ASIN) — the affiliate tag ONLY works on search URLs
- For each product: <a href="THE_SEARCH_URL_PROVIDED_ABOVE" target="_blank" rel="nofollow noopener sponsored">Product Name</a>
- First mention of each product MUST be a clickable affiliate link
- After each product section, add: <p><strong><a href="SEARCH_URL" target="_blank" rel="nofollow noopener sponsored">➡ Check Price on Amazon</a></strong></p>
- In comparison tables, product names must be affiliate links
- In the verdict/conclusion, link to the recommended product
- NEVER use "click here" — always use product name or "Check Price on Amazon"
- NEVER invent Amazon URLs — only use the exact URLs listed above
- All prices in ${region.currency} (${region.currencySymbol})

═══════════════════════════════════════════════════════════════════
SEO REQUIREMENTS — ALL MUST BE FOLLOWED:
═══════════════════════════════════════════════════════════════════
1. KEYWORD OPTIMIZATION:
   - Use the primary keyword in the first 100 words naturally
   - Include 3-5 LSI (Latent Semantic Indexing) keywords throughout (related terms, synonyms)
   - Use NLP-friendly natural language — write for humans, optimize for search engines
   - Keyword density: 1-2% for primary keyword, sprinkle LSI naturally

2. HEADING STRUCTURE (CRITICAL):
   - Use H2 for main sections, H3 for subsections, H4 for deep details
   - Every H2 should contain a keyword variation or related search term
   - Headings should be scannable and answer-oriented (e.g. "Is the X Worth It in 2026?")
   - Include at least 6-8 H2 sections for comprehensive coverage

3. FEATURED SNIPPET OPTIMIZATION:
   - Include a concise "TLDR" or "Quick Verdict" paragraph near the top (40-60 words)
   - Use bullet lists and numbered lists for key features, pros/cons
   - Include a direct answer to the main query in the first 2 paragraphs
   - Structure content to win Google's featured snippets and AI overviews

4. PEOPLE ALSO ASK TARGETING:
   - Naturally weave in answers to related questions people search for
   - Use question-format H3 headings where appropriate (e.g. "How long does X last?")
   - Provide concise, direct answers followed by detailed explanations

5. CONTENT STRUCTURE:
   - Short paragraphs: 2-3 sentences MAX per paragraph
   - Use bullet points and numbered lists for features, specs, comparisons
   - Include a structured comparison table with all products
   - Bold important keywords and product names on first mention
   - Use <strong> tags for emphasis on key selling points

6. E-E-A-T SIGNALS (Experience, Expertise, Authority, Trust):
   - Write in first person: "After testing for 3 weeks...", "In my hands-on experience..."
   - Include specific observations: "What surprised me was...", "The one thing I noticed..."
   - Reference specific testing scenarios and use cases
   - Mention time spent testing and methodology
   - Be honest about limitations — this builds trust

7. IMAGE ALT TEXT:
   - All images should have descriptive, keyword-rich alt text
   - Alt text format: "[Product Name] - [what the image shows]"

═══════════════════════════════════════════════════════════════════
OUTBOUND & EXTERNAL LINKS (SEO SIGNAL):
═══════════════════════════════════════════════════════════════════
- Include 3-5 outbound links to authoritative sources throughout
- Good targets: manufacturer pages, Wirecutter, RTINGS, Consumer Reports, Wikipedia, Reddit
- Format: <a href="https://example.com/page" target="_blank" rel="noopener">descriptive anchor text</a>
- Place naturally: "According to <a href=\"...\">Wirecutter's 2026 testing</a>..."
- Do NOT link to competitor affiliate sites

═══════════════════════════════════════════════════════════════════
CONVERSION & BUYER PSYCHOLOGY — MAKE THEM BUY:
═══════════════════════════════════════════════════════════════════
- ANSWER EVERY QUESTION a buyer would have before purchasing
- Address common objections and hesitations head-on
- Use social proof: "With over X,000 reviews on Amazon..." 
- Create urgency where appropriate: "At this price point, it's hard to find better value"
- Use the PAS framework in product sections: Problem → Agitate → Solution
- Include "Who should buy this" AND "Who should skip this" for each product
- End each product section with a clear, compelling CTA
- The conclusion must have a definitive recommendation with confidence
- Use power words: "exceptional", "game-changer", "worth every penny", "surprisingly"
- Include real-world scenarios: "If you're someone who [use case], this is perfect because..."
- Address the "should I buy X or Y?" question directly in comparison sections
- Mention warranty, return policy, or Amazon's buyer protection where relevant

═══════════════════════════════════════════════════════════════════
WRITING STYLE — PROFESSIONAL & ENGAGING:
═══════════════════════════════════════════════════════════════════
- After the FIRST full mention, use SHORT names (e.g. "the Barista Express" or "Breville")
- Do NOT repeat full product names robotically
- Write conversationally but with authority — like a knowledgeable friend giving advice
- Include SPECIFIC details: weight, dimensions, wattage, capacity, materials, battery life
- Be genuinely honest — mention 2-3 real limitations per product (builds trust & SEO)
- Compare products directly: "Unlike the X, the Y offers..."
- Use varied sentence structures — never start 2 consecutive sentences the same way
- Include transitional phrases between sections for flow
- Use storytelling: "When I first unboxed the X, I immediately noticed..."

═══════════════════════════════════════════════════════════════════
WORD COUNT & DEPTH:
═══════════════════════════════════════════════════════════════════
- Write COMPREHENSIVE content — hit the FULL target word count
- Each product section: 400-600 words minimum
- Buying guide section: 500+ words with actionable advice
- Conclusion with verdict: 200-300 words with clear recommendation
- Do NOT pad with fluff — every sentence must add value or answer a question

DISCLOSURE:
- Start with: <p><em>As an Amazon Associate, I earn from qualifying purchases. This helps support the site at no extra cost to you.</em></p>

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
        productUrl,
        productCount = 5,
        articleType: requestedArticleType = "roundup",
        language = "English",
        tone = "professional",
        includeComparisonTable = true,
        customInstructions,
        userPlan,
        includeImages = true,
        numInlineImages = 3,
    } = options;

    const region = getRegion(storeRegion);
    const isUrlReview = !!productUrl?.trim();
    // Force single-review when a specific product URL is provided
    const articleType = isUrlReview ? "single-review" : requestedArticleType;

    // ── Step 1: Research products ──
    let products: AmazonProduct[];

    if (isUrlReview) {
        console.log(`� Step 1: Researching specific product from URL: ${productUrl}`);
        products = await researchProductFromUrl(productUrl!, niche, userPlan, storeRegion);
    } else {
        console.log(`�🔍 Step 1: Researching ${productCount} products for "${niche}" on Amazon ${region.name}...`);
        products = await researchProducts(niche, productCount, articleType, userPlan, storeRegion);
    }

    if (products.length === 0) {
        // Fallback: generate generic product names
        products = Array.from({ length: isUrlReview ? 1 : productCount }, (_, i) => ({
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
    // URL reviews get a higher word count for comprehensive depth
    const wordCount = isUrlReview ? 3000 : getWordCount(articleType, productCount);
    const brandVoice = buildBrandVoice(niche, storeId, products, storeRegion, customInstructions, isUrlReview);

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
