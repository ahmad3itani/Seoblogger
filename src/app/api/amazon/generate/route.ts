import { NextResponse } from "next/server";
import { requireAuth, checkUsageLimit, trackUsage } from "@/lib/supabase/auth-helpers";
import { getUserPlanName } from "@/lib/ai/client";
import { prisma } from "@/lib/prisma";
import { generateAmazonArticle } from "@/lib/amazon/generate";
import { formatForBlogger, generateFaqHtml, countWords } from "@/lib/formatter";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { findRelevantInternalLinks, formatLinksForPrompt } from "@/lib/linker/engine";
import { generateFeaturedSnippet, generateTrustSection, generateQuickVerdict } from "@/lib/amazon/featured-snippet";
import { generateComparisonTable } from "@/lib/amazon/comparison-table";
import { detectIntent } from "@/lib/amazon/intent";

// Extend timeout for article generation (default is 10s on hobby, 60s on pro)
export const maxDuration = 120; // 2 minutes

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

        const {
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
            includeImages = true,
            blogId,
            preResearchedProducts, // Optional: skip research if products provided from preview
        } = await req.json();

        if (!niche || !storeId) {
            return NextResponse.json(
                { error: "Niche and Amazon Store ID are required" },
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

        // Get user's plan for model selection
        const userPlan = await getUserPlanName(userId);

        console.log(`🚀 Starting Amazon article generation for "${niche}" (${articleType})`);

        // Smart internal linking: find relevant existing posts (if enabled)
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
                        console.log(`🔗 Smart interlink (Amazon): Found ${relevantLinks.length} relevant posts for "${niche}"`);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch cached posts for Amazon smart interlinking", err);
            }
        }

        // ── Run the full pipeline (same as regular articles) ──
        const result = await generateAmazonArticle({
            niche,
            storeId,
            storeRegion,
            productUrl: productUrl?.trim() || undefined,
            productCount,
            articleType: articleType as "roundup" | "single-review" | "comparison" | "buyers-guide",
            language,
            tone,
            includeComparisonTable,
            customInstructions,
            userPlan,
            includeImages,
            numInlineImages: includeImages ? Math.min(productCount, 2) : 0, // Max 2 inline images to stay under timeout
            blogId,
            existingPostsList,
            includeExternalLinks,
            preResearchedProducts, // Skip research phase if products provided from preview
        });

        const {
            title: selectedTitle,
            article,
            faqs,
            meta,
            outline,
            products,
            featuredImage,
            inlineImages,
            wordCount,
            affiliateLinkCount,
        } = result;

        // ── Detect search intent for analytics ──
        const intentResult = detectIntent(niche);
        console.log(`🎯 Intent detected: ${intentResult.intent} (${intentResult.confidence} confidence, affiliate-ready: ${intentResult.isAffiliateReady})`);

        // ── Generate programmatic SEO components ──
        const keyword = `best ${niche}`;

        // 1. Featured snippet (targets Google position 0)
        const featuredSnippetHtml = generateFeaturedSnippet({
            keyword,
            products,
            niche,
            year: new Date().getFullYear(),
        });

        // 2. Comparison table (consistent formatting, not AI-generated)
        const comparisonTableHtml = generateComparisonTable(products, {
            showRating: true,
            showPrice: true,
            showBestFor: true,
            showCta: true,
            ctaText: 'Check Price →',
            highlightFirst: true,
        });

        // 3. Trust section (E-E-A-T signals)
        const trustSectionHtml = generateTrustSection(products.length * 5, niche);

        // 4. Quick verdict for conclusion
        const quickVerdictHtml = generateQuickVerdict(products, keyword);

        console.log(`📊 Generated: featured snippet, comparison table, trust section, quick verdict`);

        // ── Format for Blogger (same as /api/generate) ──
        let fullContent = article;

        // ══════════════════════════════════════════════════════════════════
        // INJECT PROGRAMMATIC SEO COMPONENTS
        // ══════════════════════════════════════════════════════════════════

        // 1. Insert FEATURED SNIPPET at the very top (targets Google Position 0)
        if (featuredSnippetHtml) {
            // Find the first <h2> or <p> to insert the featured snippet before
            const firstH2Match = fullContent.match(/<h2[^>]*>/i);
            if (firstH2Match && firstH2Match.index !== undefined) {
                fullContent = fullContent.slice(0, firstH2Match.index) +
                    featuredSnippetHtml + '\n\n' +
                    fullContent.slice(firstH2Match.index);
            } else {
                // No H2 found, prepend to content
                fullContent = featuredSnippetHtml + '\n\n' + fullContent;
            }
        }

        // 2. Insert COMPARISON TABLE after the intro section (first H2)
        if (comparisonTableHtml) {
            const h2Matches = [...fullContent.matchAll(/<\/h2>/gi)];
            if (h2Matches.length >= 1) {
                // Insert after the first H2 section's content (after second </h2> or after first section)
                const insertIndex = h2Matches[0].index! + h2Matches[0][0].length;

                // Find the end of the first paragraph after the first H2
                const afterFirstH2 = fullContent.slice(insertIndex);
                const firstParaEnd = afterFirstH2.indexOf('</p>');

                if (firstParaEnd !== -1) {
                    const actualInsertPoint = insertIndex + firstParaEnd + 4; // +4 for '</p>'
                    fullContent = fullContent.slice(0, actualInsertPoint) +
                        '\n\n<h2>Quick Comparison</h2>\n' + comparisonTableHtml + '\n' +
                        fullContent.slice(actualInsertPoint);
                }
            }
        }

        // 3. Insert TRUST SECTION and QUICK VERDICT before FAQ (end of article)
        // These go BEFORE the FAQ section
        const seoClosingSection = `
${trustSectionHtml}

${quickVerdictHtml}
`.trim();

        // Embed inline product images evenly across article
        if (inlineImages.length > 0) {
            console.log(`📸 Embedding ${inlineImages.length} product images...`);
            const sections = fullContent.split('</h2>');
            const numSections = sections.length - 1;

            if (numSections > 1) {
                const interval = Math.max(1, Math.floor(numSections / (inlineImages.length + 1)));
                let imageIndex = 0;

                for (let i = 0; i < numSections && imageIndex < inlineImages.length; i++) {
                    const sectionPos = i + 1;
                    if ((i + 1) % interval === 0 && i > 0) {
                        const img = inlineImages[imageIndex];
                        const imageHtml = `\n<div class="article-image" style="text-align: center; margin: 2rem 0;">\n  <img src="${img.url}" alt="${img.altText}" style="max-width: 100%; height: auto; border-radius: 8px;" loading="lazy" />\n</div>\n`;
                        sections[sectionPos] = imageHtml + sections[sectionPos];
                        imageIndex++;
                    }
                }

                // Place any remaining images at the end sections
                while (imageIndex < inlineImages.length) {
                    const remaining = inlineImages.length - imageIndex;
                    const startSection = Math.max(1, numSections - remaining);
                    for (let i = startSection; i <= numSections && imageIndex < inlineImages.length; i++) {
                        const img = inlineImages[imageIndex];
                        const imageHtml = `\n<div class="article-image" style="text-align: center; margin: 2rem 0;">\n  <img src="${img.url}" alt="${img.altText}" style="max-width: 100%; height: auto; border-radius: 8px;" loading="lazy" />\n</div>\n`;
                        sections[i] = imageHtml + sections[i];
                        imageIndex++;
                    }
                }

                fullContent = sections.join('</h2>');
            }
        }

        // Append Trust Section + Quick Verdict + FAQ HTML
        if (seoClosingSection) {
            fullContent += '\n\n' + seoClosingSection;
        }
        if (faqs.length > 0) {
            fullContent += '\n\n' + generateFaqHtml(faqs);
        }

        // Generate schema markup
        const { generateAllSchemas } = await import("@/lib/seo/schema");
        const schemas = generateAllSchemas({
            title: selectedTitle,
            description: meta.metaDescription,
            content: fullContent,
            imageUrl: featuredImage?.url,
            faqs: faqs.length > 0 ? faqs : undefined,
            keyword: `best ${niche}`,
        });
        const schemaMarkup = schemas.join('\n');

        // Format for Blogger (TOC, read time, styled tables, etc.)
        const formattedContent = formatForBlogger(fullContent, {
            includeToc: true,
            includeDisclosure: "As an Amazon Associate, I earn from qualifying purchases. This article may contain affiliate links at no extra cost to you.",
            featuredImageUrl: featuredImage?.url,
            featuredImageAlt: featuredImage?.altText,
            keyword: `best ${niche}`,
            showReadTime: true,
            addKeywordToIntro: true,
        }) + '\n\n' + schemaMarkup;

        const finalWordCount = countWords(formattedContent);

        // ── Save to database ──
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

            // Track usage
            await trackUsage(userId, "article", 1, finalWordCount);
            if (inlineImages.length > 0 || featuredImage) {
                await trackUsage(userId, "image", (featuredImage ? 1 : 0) + inlineImages.length);
            }

            // Save images to DB
            if (featuredImage?.url) {
                await prisma.generatedImage.create({
                    data: {
                        url: featuredImage.url,
                        altText: featuredImage.altText,
                        type: "featured",
                        articleId: savedArticle.id,
                    },
                });
            }
        }

        console.log(`✅ Amazon article complete: "${selectedTitle}" - ${finalWordCount} words, ${affiliateLinkCount} links`);

        return NextResponse.json({
            success: true,
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

    } catch (error: any) {
        console.error("Amazon Generate Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate article" },
            { status: 500 }
        );
    }
}
