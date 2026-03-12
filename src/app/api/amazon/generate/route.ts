import { NextResponse } from "next/server";
import { requireAuth, checkUsageLimit, trackUsage } from "@/lib/supabase/auth-helpers";
import { getUserPlanName } from "@/lib/ai/client";
import { prisma } from "@/lib/prisma";
import { generateAmazonArticle } from "@/lib/amazon/generate";
import { formatForBlogger, generateFaqHtml, countWords } from "@/lib/formatter";
import { checkRateLimit } from "@/lib/security/rate-limit";

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
            productCount = 5,
            articleType = "roundup",
            language = "English",
            tone = "professional",
            includeComparisonTable = true,
            customInstructions,
            includeImages = true,
            blogId,
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

        // ── Run the full pipeline (same as regular articles) ──
        const result = await generateAmazonArticle({
            niche,
            storeId,
            productCount,
            articleType: articleType as "roundup" | "single-review" | "comparison" | "buyers-guide",
            language,
            tone,
            includeComparisonTable,
            customInstructions,
            userPlan,
            includeImages,
            numInlineImages: Math.min(productCount, 5),
            blogId,
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

        // ── Format for Blogger (same as /api/generate) ──
        let fullContent = article;

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

        // Append FAQ HTML
        if (faqs.length > 0) {
            fullContent += generateFaqHtml(faqs);
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
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { blogs: true },
        });

        let savedArticle = null;
        if (currentUser) {
            const activeBlogId = blogId || currentUser.blogs?.find((b: any) => b.isDefault)?.id || currentUser.blogs?.[0]?.id;

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
