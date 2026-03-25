import { NextResponse } from "next/server";
import { requireAuth, checkUsageLimit, trackUsage } from "@/lib/supabase/auth-helpers";
import { getUserPlanName } from "@/lib/ai/client";
import { prisma } from "@/lib/prisma";
import { generateTitles, generateFAQ, generateMeta, type GenerationOptions } from "@/lib/ai/generate";
import { generateTopicalOutline, generateArticleDraft, humanizeDraft, type V2GenerationOptions } from "@/lib/ai/v2-engine";
import {
    buildAffiliateData,
    buildAffiliateLinksArray,
    getRegion,
    type AmazonProduct,
} from "@/lib/amazon/generate";
import { formatForBlogger, generateFaqHtml, countWords } from "@/lib/formatter";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { findRelevantInternalLinks, formatLinksForPrompt } from "@/lib/linker/engine";
import { generateComparisonTable } from "@/lib/amazon/comparison-table";
import { fetchSerpIntelligence, formatSourcesForPrompt } from "@/lib/seo/serp-sources";

/**
 * Amazon Affiliate Article Generator — V2 Engine (same as regular articles)
 *
 * Uses the SAME v2-engine pipeline as the regular article generator:
 *   Step 1 "outline": generateTitles + generateTopicalOutline (with SERP/PAA data)
 *   Step 2 "article": generateArticleDraft + humanizeDraft + FAQ + meta
 *
 * This produces the SAME quality output as /api/generate.
 */

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        // Rate limit
        const rl = checkRateLimit(`amazon-generate:${userId}`, 5, 60_000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` },
                { status: 429 }
            );
        }

        const body = await req.json();
        const {
            step = "outline",
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
            // Step 2 inputs
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

        const userPlan = await getUserPlanName(userId);

        // ══════════════════════════════════════════════════════════════════
        // STEP 1: OUTLINE — Generate titles + outline with SERP data (~8-15s)
        // ══════════════════════════════════════════════════════════════════
        if (step === "outline") {
            console.log(`📋 Amazon Step 1: Generating outline for "${niche}" (${articleType})`);

            // Build products with affiliate links
            let products: AmazonProduct[] = preResearchedProducts || [];
            products = buildAffiliateData(products, storeId, storeRegion);

            const keyword = getKeyword(niche, articleType, products);
            const wordCount = getWordCount(articleType, productCount);
            const brandVoice = buildBrandVoice(niche, storeId, products, storeRegion, customInstructions, !!productUrl?.trim());

            // Generate titles using legacy function (fast, works well)
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

            const titles = await generateTitles(genOptions);
            const title = titles[0] || `Best ${niche} ${new Date().getFullYear()}: Top ${productCount} Picks Reviewed`;

            // Use V2 engine for outline (with SERP/PAA data — same as regular generator)
            const v2Options: V2GenerationOptions = {
                title,
                keyword,
                wordCount,
                language,
                tone,
                niche,
                articleType: getArticleType(articleType),
                userPlan,
                includeFaq: true,
            };

            const generatedOutline = await generateTopicalOutline(v2Options);

            console.log(`✅ Amazon Step 1 complete: "${title}" — ${generatedOutline.sections.length} sections`);

            return NextResponse.json({
                success: true,
                step: "outline",
                title,
                titles,
                outline: generatedOutline,
                products,
                keyword,
                wordCount,
            });
        }

        // ══════════════════════════════════════════════════════════════════
        // STEP 2: ARTICLE — V2 draft + humanizer + FAQ + meta (~30-50s)
        // ══════════════════════════════════════════════════════════════════
        if (step === "article") {
            if (!selectedTitle || !outline) {
                return NextResponse.json(
                    { error: "Title and outline are required for article generation" },
                    { status: 400 }
                );
            }

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

            // Smart internal linking (same as regular generator)
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
                            niche, `best ${niche}`,
                            cachedPosts.map(p => ({ title: p.title, url: p.url })),
                            5
                        );
                        if (relevantLinks.length > 0) {
                            existingPostsList = formatLinksForPrompt(relevantLinks);
                        }
                    }
                } catch (err) {
                    console.error("Smart interlinking failed:", err);
                }
            }

            // SERP intelligence for real URLs (prevents link hallucination)
            let serpSources: string | undefined;
            let paaQuestions: string[] | undefined;
            if (includeExternalLinks !== false) {
                try {
                    const serpLang = language?.substring(0, 2) || "en";
                    const serpIntel = await fetchSerpIntelligence(keyword, "us", serpLang);
                    if (serpIntel.sources.length > 0) {
                        serpSources = formatSourcesForPrompt(serpIntel.sources);
                    }
                    if (serpIntel.paaQuestions.length > 0) {
                        paaQuestions = serpIntel.paaQuestions.map(q => q.question);
                    }
                } catch {
                    console.warn("SERP fetch failed (non-blocking)");
                }
            }

            // ── V2 Engine: Generate article draft (same as regular generator) ──
            const v2Options: V2GenerationOptions = {
                title: selectedTitle,
                keyword,
                wordCount,
                language,
                tone,
                niche,
                articleType: getArticleType(articleType),
                userPlan,
                includeFaq: true,
                existingPostsList,
                blogId: activeBlogId,
            };

            // Inject brand voice into outline context so v2-engine uses affiliate data
            const enrichedOutline = {
                ...outline,
                brandVoice,
                serpSources,
            };

            const rawArticle = await generateArticleDraft(enrichedOutline, v2Options);

            // ── Humanizer pass (always run — same as regular generator) ──
            console.log("🧠 Running humanizer pass...");
            const article = await humanizeDraft(rawArticle);

            // ── FAQ + Meta in parallel ──
            const [faqs, meta] = await Promise.all([
                generateFAQ(keyword, article, language, niche, userPlan, paaQuestions),
                generateMeta(selectedTitle, article, keyword, language, userPlan),
            ]);

            // ── Assemble final content ──
            let fullContent = article;

            // Add comparison table after first section (if enabled, non-duplicate)
            if (includeComparisonTable && products.length >= 2) {
                const comparisonTableHtml = generateComparisonTable(products, {
                    showRating: true, showPrice: true, showBestFor: true,
                    showCta: true, ctaText: 'Check Price →', highlightFirst: true,
                });
                const h2Matches = [...fullContent.matchAll(/<\/h2>/gi)];
                if (h2Matches.length >= 1) {
                    const insertIndex = h2Matches[0].index! + h2Matches[0][0].length;
                    const afterFirstH2 = fullContent.slice(insertIndex);
                    const firstParaEnd = afterFirstH2.indexOf('</p>');
                    if (firstParaEnd !== -1) {
                        const insertPoint = insertIndex + firstParaEnd + 4;
                        fullContent = fullContent.slice(0, insertPoint) +
                            '\n\n<h2>Quick Comparison</h2>\n' + comparisonTableHtml + '\n' +
                            fullContent.slice(insertPoint);
                    }
                }
            }

            // Append FAQ (only if article doesn't already have one)
            const hasFaqAlready = /<h2[^>]*>.*?(?:faq|frequently\s+asked)/i.test(fullContent);
            if (faqs.length > 0 && !hasFaqAlready) {
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

            // Format for Blogger (TOC, disclosure, read time)
            // Skip TOC if article already has one
            const hasTocAlready = /<div\s+class="toc"/i.test(fullContent);
            const formattedContent = formatForBlogger(fullContent, {
                includeToc: !hasTocAlready,
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

            console.log(`✅ Amazon Step 2 complete: "${selectedTitle}" - ${finalWordCount} words, ${affiliateLinkCount} affiliate links`);

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

// ── Helper functions ──────────────────────────────────────────────────────

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
        `${i + 1}. ${p.name} (${p.priceRange}, ${p.rating}) - ${p.bestFor}\n   Features: ${p.keyFeatures?.join(', ') || 'N/A'}\n   Amazon Link: ${p.affiliateUrl}`
    ).join('\n');

    const urlReviewBlock = isUrlReview && mainProduct ? `
SPECIFIC PRODUCT REVIEW: Deep review of "${mainProduct.name}"
- Dedicate 60-70% to this product, compare against: ${competitors.map(c => c.name).join(', ')}
- Include "Should You Buy It?" verdict
` : '';

    return `AMAZON AFFILIATE PRODUCT REVIEW for ${region.name} (${region.domain}).
${urlReviewBlock}
PRODUCTS (use these EXACT names and data):
${productList}

CRITICAL — AFFILIATE LINKS:
- ONLY use the Amazon SEARCH URLs above (${region.domain}/s?k=...&tag=...)
- Format: <a href="SEARCH_URL" target="_blank" rel="nofollow noopener sponsored">Product Name</a>
- First mention = affiliate link. After each product section: ➡ Check Price on Amazon
- NEVER invent Amazon URLs. All prices in ${region.currency} (${region.currencySymbol})

CONTENT REQUIREMENTS:
- Cover EVERY product in detail (400-600 words each)
- Each product section: features, pros, cons, who it's for, CTA link
- Include "Who should buy this" AND "Who should skip this" per product
- Write in first person with E-E-A-T signals ("After testing...", "What surprised me...")
- Short paragraphs (2-3 sentences), bullet lists for specs
- Be honest about limitations (builds trust)
- End with definitive verdict recommending best overall + best budget + best premium

DISCLOSURE: Start with affiliate disclosure paragraph.
${customInstructions ? `\nADDITIONAL: ${customInstructions}` : ''}`;
}
