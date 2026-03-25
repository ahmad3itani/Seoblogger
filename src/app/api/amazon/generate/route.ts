import { NextResponse } from "next/server";
import { requireAuth, checkUsageLimit, trackUsage } from "@/lib/supabase/auth-helpers";
import { getUserPlanName } from "@/lib/ai/client";
import { prisma } from "@/lib/prisma";
import {
    generateTitles,
    generateOutline,
    generateArticle,
    generateFAQ,
    generateMeta,
    type GenerationOptions,
} from "@/lib/ai/generate";
import {
    buildAffiliateData,
    buildAffiliateLinksArray,
    getRegion,
    type AmazonProduct,
} from "@/lib/amazon/generate";
import { formatForBlogger, generateFaqHtml, countWords } from "@/lib/formatter";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { findRelevantInternalLinks, formatLinksForPrompt } from "@/lib/linker/engine";
import { generateFeaturedSnippet, generateTrustSection, generateQuickVerdict } from "@/lib/amazon/featured-snippet";
import { generateComparisonTable } from "@/lib/amazon/comparison-table";

/**
 * Amazon Affiliate Article Generator — Step-based architecture
 *
 * Step 1: "outline" — Generate titles + outline (~5-10s)
 * Step 2: "article" — Generate article + FAQ + meta + format (~30-50s)
 *
 * Images are NOT generated (same as regular article generator default).
 * This keeps each request well under the Vercel timeout.
 */

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        // Rate limit: 5 generations per minute
        const rl = checkRateLimit(`amazon-generate:${userId}`, 5, 60_000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` },
                { status: 429 }
            );
        }

        const body = await req.json();
        const {
            step = "outline", // "outline" or "article"
            niche,
            storeId,
            storeRegion = "us",
            productUrl,
            productCount = 5,
            articleType = "roundup",
            language = "English",
            tone = "professional",
            includeComparisonTable = true,
            includeInternalLinks = true,
            includeExternalLinks = true,
            customInstructions,
            blogId,
            preResearchedProducts,
            // Step 2 inputs (from step 1 output)
            selectedTitle,
            outline,
            products: passedProducts,
        } = body;

        if (!niche || !storeId) {
            return NextResponse.json(
                { error: "Niche and Amazon Store ID are required" },
                { status: 400 }
            );
        }

        // Get user's plan for model selection
        const userPlan = await getUserPlanName(userId);

        // ── STEP 1: OUTLINE ──────────────────────────────────────────────
        // Generate titles + outline (~5-10s)
        if (step === "outline") {
            console.log(`📋 Amazon Step 1: Generating outline for "${niche}" (${articleType})`);

            // Build products with affiliate links
            let products: AmazonProduct[] = preResearchedProducts || [];
            products = buildAffiliateData(products, storeId, storeRegion);

            const keyword = getKeyword(niche, articleType, products);
            const wordCount = getWordCount(articleType, productCount);
            const brandVoice = buildBrandVoice(niche, storeId, products, storeRegion, customInstructions, !!productUrl?.trim());

            const genOptions: GenerationOptions = {
                keyword,
                language,
                tone,
                niche,
                articleType: getArticleType(articleType),
                wordCount,
                brandVoice,
                affiliateLinks: buildAffiliateLinksArray(products),
                includeFaq: true,
                includeImages: false,
                numInlineImages: 0,
                includeComparisonTable,
                includeProsCons: true,
                userPlan,
                includeExternalLinks,
            };

            // Generate titles
            const titles = await generateTitles(genOptions);
            const title = titles[0] || `Best ${niche} ${new Date().getFullYear()}: Top ${productCount} Picks Reviewed`;

            // Generate outline
            const generatedOutline = await generateOutline(title, genOptions);

            console.log(`✅ Amazon Step 1 complete: "${title}"`);

            return NextResponse.json({
                success: true,
                step: "outline",
                title,
                titles,
                outline: generatedOutline,
                products, // return with affiliate URLs built
                keyword,
                wordCount,
            });
        }

        // ── STEP 2: ARTICLE ──────────────────────────────────────────────
        // Generate article + FAQ + meta + format (~30-50s)
        if (step === "article") {
            if (!selectedTitle || !outline) {
                return NextResponse.json(
                    { error: "Title and outline are required for article generation" },
                    { status: 400 }
                );
            }

            // Check usage limits
            const usageCheck = await checkUsageLimit(userId, "articles");
            if (!usageCheck.allowed) {
                return NextResponse.json(
                    { error: usageCheck.error, usageLimit: true },
                    { status: 403 }
                );
            }

            console.log(`✍️ Amazon Step 2: Generating article for "${selectedTitle}"`);

            const products: AmazonProduct[] = passedProducts || preResearchedProducts || [];
            const keyword = getKeyword(niche, articleType, products);
            const wordCount = getWordCount(articleType, productCount);
            const brandVoice = buildBrandVoice(niche, storeId, products, storeRegion, customInstructions, !!productUrl?.trim());

            // Smart internal linking
            let existingPostsList: string | undefined;
            const currentUser = await prisma.user.findUnique({
                where: { id: userId },
                include: { blogs: true },
            });
            const activeBlogId = blogId || currentUser?.blogs?.find((b: any) => b.isDefault)?.id || currentUser?.blogs?.[0]?.id;

            if (includeInternalLinks && activeBlogId) {
                try {
                    const cachedPosts = await prisma.cachedPost.findMany({
                        where: { blogId: activeBlogId },
                        orderBy: { publishedAt: 'desc' },
                        take: 100,
                    });
                    if (cachedPosts.length > 0) {
                        const relevantLinks = findRelevantInternalLinks(
                            niche,
                            `best ${niche}`,
                            cachedPosts.map(p => ({ title: p.title, url: p.url })),
                            5
                        );
                        if (relevantLinks.length > 0) {
                            existingPostsList = formatLinksForPrompt(relevantLinks);
                        }
                    }
                } catch (err) {
                    console.error("Failed to fetch cached posts for Amazon smart interlinking", err);
                }
            }

            const genOptions: GenerationOptions = {
                keyword,
                language,
                tone,
                niche,
                articleType: getArticleType(articleType),
                wordCount,
                brandVoice,
                affiliateLinks: buildAffiliateLinksArray(products),
                includeFaq: true,
                includeImages: false,
                numInlineImages: 0,
                includeComparisonTable,
                includeProsCons: true,
                userPlan,
                existingPostsList,
                includeExternalLinks,
            };

            // Generate article
            const article = await generateArticle(selectedTitle, outline, genOptions);

            // Generate FAQ + meta in parallel
            const [faqs, meta] = await Promise.all([
                generateFAQ(keyword, article, language, niche, userPlan),
                generateMeta(selectedTitle, article, keyword, language, userPlan),
            ]);

            // ── Programmatic SEO components (instant, no API calls) ──
            const featuredSnippetHtml = generateFeaturedSnippet({ keyword, products, niche, year: new Date().getFullYear() });
            const comparisonTableHtml = generateComparisonTable(products, {
                showRating: true, showPrice: true, showBestFor: true,
                showCta: true, ctaText: 'Check Price →', highlightFirst: true,
            });
            const trustSectionHtml = generateTrustSection(products.length * 5, niche);
            const quickVerdictHtml = generateQuickVerdict(products, keyword);

            // ── Assemble content ──
            let fullContent = article;

            // 1. Featured snippet before first H2
            if (featuredSnippetHtml) {
                const firstH2Match = fullContent.match(/<h2[^>]*>/i);
                if (firstH2Match && firstH2Match.index !== undefined) {
                    fullContent = fullContent.slice(0, firstH2Match.index) +
                        featuredSnippetHtml + '\n\n' +
                        fullContent.slice(firstH2Match.index);
                } else {
                    fullContent = featuredSnippetHtml + '\n\n' + fullContent;
                }
            }

            // 2. Comparison table after first H2 section
            if (comparisonTableHtml) {
                const h2Matches = [...fullContent.matchAll(/<\/h2>/gi)];
                if (h2Matches.length >= 1) {
                    const insertIndex = h2Matches[0].index! + h2Matches[0][0].length;
                    const afterFirstH2 = fullContent.slice(insertIndex);
                    const firstParaEnd = afterFirstH2.indexOf('</p>');
                    if (firstParaEnd !== -1) {
                        const actualInsertPoint = insertIndex + firstParaEnd + 4;
                        fullContent = fullContent.slice(0, actualInsertPoint) +
                            '\n\n<h2>Quick Comparison</h2>\n' + comparisonTableHtml + '\n' +
                            fullContent.slice(actualInsertPoint);
                    }
                }
            }

            // 3. Trust section + quick verdict + FAQ
            const seoClosingSection = `${trustSectionHtml}\n\n${quickVerdictHtml}`.trim();
            if (seoClosingSection) {
                fullContent += '\n\n' + seoClosingSection;
            }
            if (faqs.length > 0) {
                fullContent += '\n\n' + generateFaqHtml(faqs);
            }

            // Schema markup
            const { generateAllSchemas } = await import("@/lib/seo/schema");
            const schemas = generateAllSchemas({
                title: selectedTitle,
                description: meta.metaDescription,
                content: fullContent,
                faqs: faqs.length > 0 ? faqs : undefined,
                keyword,
            });

            // Format for Blogger
            const formattedContent = formatForBlogger(fullContent, {
                includeToc: true,
                includeDisclosure: "As an Amazon Associate, I earn from qualifying purchases. This article may contain affiliate links at no extra cost to you.",
                keyword,
                showReadTime: true,
                addKeywordToIntro: true,
            }) + '\n\n' + schemas.join('\n');

            const finalWordCount = countWords(formattedContent);
            const affiliateLinkCount = (article.match(new RegExp(storeId, 'g')) || []).length;

            // Save to database
            let savedArticle = null;
            if (currentUser) {
                savedArticle = await prisma.article.create({
                    data: {
                        title: selectedTitle,
                        content: formattedContent,
                        outline: JSON.stringify(outline),
                        metaDescription: meta.metaDescription,
                        excerpt: meta.excerpt,
                        labels: `amazon,affiliate,${niche}`,
                        tone,
                        articleType: "affiliate-review",
                        wordCount: finalWordCount,
                        status: "draft",
                        blogId: activeBlogId || undefined,
                        userId,
                    },
                });
                await trackUsage(userId, "article", 1, finalWordCount);
            }

            console.log(`✅ Amazon Step 2 complete: "${selectedTitle}" - ${finalWordCount} words, ${affiliateLinkCount} links`);

            return NextResponse.json({
                success: true,
                step: "article",
                article: {
                    title: selectedTitle,
                    content: formattedContent,
                    rawArticle: article,
                    wordCount: finalWordCount,
                    affiliateLinkCount,
                    storeId,
                    niche,
                    articleType,
                    products: products.map(p => ({
                        name: p.name,
                        priceRange: p.priceRange,
                        rating: p.rating,
                        bestFor: p.bestFor,
                        affiliateUrl: p.affiliateUrl,
                    })),
                    meta,
                    faqs,
                    savedArticle: savedArticle ? { id: savedArticle.id } : null,
                },
            });
        }

        return NextResponse.json({ error: "Invalid step. Use 'outline' or 'article'." }, { status: 400 });

    } catch (error: any) {
        console.error("Amazon Generate Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate article" },
            { status: 500 }
        );
    }
}

// ── Helper functions (moved from generate.ts to keep route self-contained) ──

function getKeyword(niche: string, articleType: string, products: AmazonProduct[]): string {
    switch (articleType) {
        case "roundup": return `best ${niche}`;
        case "single-review": return products[0]?.name ? `${products[0].name} review` : `best ${niche} review`;
        case "comparison": return products.length >= 2
            ? `${products[0].name} vs ${products[1].name}` : `best ${niche} comparison`;
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
        `${i + 1}. ${p.name} (${p.priceRange}, ${p.rating}) - ${p.bestFor}\n   Features: ${p.keyFeatures?.join(', ') || 'N/A'}\n   Amazon Search Link: ${p.affiliateUrl}`
    ).join('\n');

    const urlReviewBlock = isUrlReview && mainProduct ? `
SPECIFIC PRODUCT REVIEW MODE:
This article is a DEEP REVIEW of a specific product: "${mainProduct.name}"
- Dedicate 60-70% of the article to reviewing it in-depth
- Cover EVERY aspect a buyer would want to know
- Include a "vs Competitors" section comparing against: ${competitors.map(c => c.name).join(', ')}
- Include a definitive "Should You Buy It?" verdict section
` : '';

    return `YOU ARE WRITING A PROFESSIONAL AMAZON AFFILIATE PRODUCT REVIEW ARTICLE FOR Amazon ${region.name} (${region.domain}).

YOUR GOAL: Create the MOST HELPFUL, COMPREHENSIVE product review. The reader should finish with ZERO unanswered questions.
${urlReviewBlock}
PRODUCT DATA (use these EXACT products and names):
${productList}

AFFILIATE LINK RULES — MANDATORY:
- ONLY use the Amazon SEARCH URLs provided above (format: ${region.domain}/s?k=...&tag=...)
- NEVER create direct product URLs — the affiliate tag ONLY works on search URLs
- For each product: <a href="THE_SEARCH_URL" target="_blank" rel="nofollow noopener sponsored">Product Name</a>
- First mention of each product MUST be a clickable affiliate link
- After each product section: <p><strong><a href="SEARCH_URL" target="_blank" rel="nofollow noopener sponsored">➡ Check Price on Amazon</a></strong></p>
- All prices in ${region.currency} (${region.currencySymbol})

SEO REQUIREMENTS:
- Use primary keyword in the first 100 words naturally
- Include 3-5 LSI keywords throughout
- Use H2 for main sections, H3 for subsections (6-8 H2 sections minimum)
- Include quick verdict/TLDR near the top (40-60 words)
- Short paragraphs: 2-3 sentences MAX
- Use bullet points for features, specs, comparisons
- Bold important keywords and product names on first mention
- Write in first person with E-E-A-T signals
- Be honest about limitations (builds trust & SEO)

OUTBOUND LINKS: Include 3-5 links to authoritative sources (Wirecutter, RTINGS, Consumer Reports, etc.)

CONVERSION: Address objections, use social proof, include "Who should buy" AND "Who should skip", end with definitive recommendation.

DISCLOSURE: Start with: <p><em>As an Amazon Associate, I earn from qualifying purchases.</em></p>

${customInstructions ? `ADDITIONAL INSTRUCTIONS: ${customInstructions}` : ''}`;
}
