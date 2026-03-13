import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    generateTitles,
    generateOutline,
    generateArticle,
    generateFAQ,
    generateMeta,
    generateFeaturedImage,
    type GenerationOptions,
} from "@/lib/ai/generate";
import { formatForBlogger, generateFaqHtml, countWords } from "@/lib/formatter";
import { requireAuth, checkUsageLimit, trackUsage } from "@/lib/supabase/auth-helpers";
import { findRelevantInternalLinks, formatLinksForPrompt } from "@/lib/linker/engine";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { sanitizeString, sanitizeNumber } from "@/lib/security/validate";

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        // Rate limit: 5 generations per minute per user
        const rl = checkRateLimit(`generate:${authUser.id}`, 5, 60_000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` },
                { status: 429 }
            );
        }

        const body = await req.json();
        const {
            keyword: rawKeyword,
            language = "en",
            tone = "informational",
            niche: rawNiche,
            articleType = "blog-post",
            wordCount: rawWordCount = 2000,
            brandVoice: rawBrandVoice,
            includeFaq = true,
            includeImages = false,
            numInlineImages: rawNumImages = 3,
            includeComparisonTable = false,
            includeRecipe = false,
            includeProsCons = false,
            includeStepByStep = false,
            selectedTitle: rawSelectedTitle,
            step = "titles",
            outline,
            blogId,
            labels,
            includeToc = true,
            includeDisclosure,
            includeCta,
            autoInterlink = false,
            affiliateLinks = [],
            competitorData,
            publishAction = "draft",
            scheduleDate,
        } = body;

        // Sanitize and validate inputs
        const keyword = sanitizeString(rawKeyword, 200);
        const niche = sanitizeString(rawNiche, 200);
        const brandVoice = rawBrandVoice ? sanitizeString(rawBrandVoice, 2000) : undefined;
        const selectedTitle = rawSelectedTitle ? sanitizeString(rawSelectedTitle, 300) : undefined;
        const wordCount = sanitizeNumber(rawWordCount, 300, 10000, 2000);
        const numInlineImages = sanitizeNumber(rawNumImages, 0, 10, 3);

        if (!keyword) {
            return NextResponse.json({ error: "Keyword is required" }, { status: 400 });
        }

        // Get user's plan for model selection
        const currentUser = await prisma.user.findUnique({
            where: { id: authUser.id },
            include: { plan: true },
        });

        const options: GenerationOptions = {
            keyword,
            language,
            tone,
            niche,
            articleType,
            wordCount,
            brandVoice,
            includeFaq,
            includeImages,
            numInlineImages,
            includeComparisonTable,
            includeRecipe,
            includeProsCons,
            includeStepByStep,
            affiliateLinks,
            competitorData,
            userPlan: currentUser?.plan?.name || "free", // Pass user plan for premium model selection
        };

        // Step-by-step generation
        switch (step) {
            case "titles": {
                const titles = await generateTitles(options);
                return NextResponse.json({ titles });
            }

            case "outline": {
                if (!selectedTitle) {
                    return NextResponse.json(
                        { error: "Title is required for outline generation" },
                        { status: 400 }
                    );
                }
                const generatedOutline = await generateOutline(selectedTitle, options);
                return NextResponse.json({ outline: generatedOutline });
            }

            case "article": {
                if (!selectedTitle || !outline) {
                    return NextResponse.json(
                        { error: "Title and outline are required for article generation" },
                        { status: 400 }
                    );
                }

                // Check usage limits before generating
                const usageCheck = await checkUsageLimit(authUser.id, "articles");
                if (!usageCheck.allowed) {
                    return NextResponse.json(
                        { error: usageCheck.error, usageLimit: true },
                        { status: 403 }
                    );
                }

                const currentUser = await prisma.user.findUnique({
                    where: { id: authUser.id },
                    include: { blogs: true }
                });

                let activeBlogId = blogId;
                if (!activeBlogId && currentUser?.blogs) {
                    activeBlogId = currentUser.blogs.find((b: any) => b.isDefault)?.id || currentUser.blogs[0]?.id;
                }

                // Smart internal linking: find relevant existing posts by keyword similarity
                if (activeBlogId) {
                    try {
                        const cachedPosts = await prisma.cachedPost.findMany({
                            where: { blogId: activeBlogId },
                            orderBy: { publishedAt: 'desc' },
                            take: 100
                        });

                        if (cachedPosts.length > 0) {
                            const relevantLinks = findRelevantInternalLinks(
                                keyword,
                                selectedTitle,
                                cachedPosts.map(p => ({ title: p.title, url: p.url })),
                                5
                            );

                            if (relevantLinks.length > 0) {
                                options.existingPostsList = formatLinksForPrompt(relevantLinks);
                                console.log(`🔗 Smart interlink: Found ${relevantLinks.length} relevant posts for "${keyword}"`);
                            } else {
                                console.log(`🔗 Smart interlink: No relevant posts found for "${keyword}"`);
                            }
                        }
                    } catch (err) {
                        console.error("Failed to fetch cached posts for smart interlinking", err);
                    }
                }

                const article = await generateArticle(selectedTitle, outline, options);

                // Generate FAQs if requested
                let faqs: Array<{ question: string; answer: string }> = [];
                if (includeFaq) {
                    faqs = await generateFAQ(keyword, article, language, niche, options.userPlan);
                }

                // Generate meta
                const meta = await generateMeta(selectedTitle, article, keyword, language, options.userPlan);

                // Generate images if requested
                let image;
                let inlineImages: Array<{ url: string; altText: string }> = [];
                let skipImages = false;
                if (includeImages) {
                    // Check image usage limits first
                    const imageUsageCheck = await checkUsageLimit(authUser.id, "images", numInlineImages || 1);
                    if (!imageUsageCheck.allowed) {
                        console.log(`⚠️ Image limit reached for user ${authUser.id}: ${imageUsageCheck.error}`);
                        skipImages = true;
                    }
                }
                if (includeImages && !skipImages) {
                    // Extract H2 section titles from the article for context-aware image generation
                    const h2Matches = article.match(/<h2[^>]*>(.*?)<\/h2>/gi) || [];
                    const sectionTitles = h2Matches.map((h2: string) => h2.replace(/<[^>]+>/g, '').trim());
                    console.log(`📋 Found ${sectionTitles.length} H2 sections: ${sectionTitles.join(', ')}`);

                    // Always generate featured image (index 0 = hero style)
                    image = await generateFeaturedImage(selectedTitle, keyword, "featured", undefined, 0);

                    // Generate inline images with section context for variety
                    const numInline = (numInlineImages || 3) - 1;
                    if (numInline > 0) {
                        console.log(`🖼️ Generating ${numInline} unique inline images with section context...`);

                        // Calculate which sections to pair with images (evenly distributed)
                        const totalSections = sectionTitles.length;
                        const sectionInterval = totalSections > 0 ? Math.floor(totalSections / (numInline + 1)) : 1;

                        for (let i = 0; i < numInline; i++) {
                            // Pick a section title for context (distributed evenly)
                            const sectionIdx = Math.min((i + 1) * sectionInterval, totalSections - 1);
                            const sectionContext = sectionTitles[sectionIdx] || `${keyword} aspect ${i + 1}`;

                            console.log(`  Image ${i + 1}: context="${sectionContext}", style index=${i + 1}`);

                            const inlineImage = await generateFeaturedImage(
                                selectedTitle,
                                keyword,
                                "content",
                                sectionContext,
                                i + 1  // imageIndex 1+ for varied styles
                            );
                            if (inlineImage.url) {
                                inlineImages.push(inlineImage);
                            }
                        }
                    }
                }

                // Format for Blogger
                let fullContent = article;

                // Embed inline images EVENLY distributed across article content
                if (inlineImages.length > 0) {
                    console.log(`📸 Embedding ${inlineImages.length} inline images (evenly distributed)...`);
                    const sections = fullContent.split('</h2>');
                    const numSections = sections.length - 1; // first element is before first h2
                    console.log(`Found ${numSections} H2 sections in article`);

                    if (numSections > 1) {
                        // Calculate even distribution: skip first section, spread across remaining
                        const interval = Math.max(1, Math.floor(numSections / (inlineImages.length + 1)));
                        let imageIndex = 0;

                        for (let i = 0; i < numSections && imageIndex < inlineImages.length; i++) {
                            const sectionPos = i + 1; // +1 because sections[0] is before first h2
                            // Place image at evenly spaced intervals (skip first few sections)
                            if ((i + 1) % interval === 0 && i > 0) {
                                const img = inlineImages[imageIndex];
                                console.log(`  Placing image ${imageIndex + 1} after section ${i + 1}: ${img.altText}`);
                                const imageHtml = `\n<div class="article-image" style="text-align: center; margin: 2rem 0;">\n  <img src="${img.url}" alt="${img.altText}" style="max-width: 100%; height: auto; border-radius: 8px;" loading="lazy" />\n</div>\n`;
                                sections[sectionPos] = imageHtml + sections[sectionPos];
                                imageIndex++;
                            }
                        }

                        // If some images weren't placed (few sections), append remaining
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
                        console.log(`✅ Successfully embedded ${inlineImages.length} inline images (evenly distributed)`);
                    } else {
                        console.log('⚠️ No H2 sections found, distributing across paragraphs...');
                        const paragraphs = fullContent.split('</p>');
                        const interval = Math.max(1, Math.floor(paragraphs.length / (inlineImages.length + 1)));

                        for (let i = 0; i < inlineImages.length; i++) {
                            const insertIndex = Math.min((i + 1) * interval, paragraphs.length - 1);
                            const img = inlineImages[i];
                            const imageHtml = `\n<div class="article-image" style="text-align: center; margin: 2rem 0;">\n  <img src="${img.url}" alt="${img.altText}" style="max-width: 100%; height: auto; border-radius: 8px;" loading="lazy" />\n</div>\n`;
                            paragraphs[insertIndex] = paragraphs[insertIndex] + '</p>' + imageHtml;
                        }
                        fullContent = paragraphs.join('</p>');
                    }
                }

                if (faqs.length > 0) {
                    fullContent += generateFaqHtml(faqs);
                }

                // Generate schema markup for SEO
                const { generateAllSchemas } = await import("@/lib/seo/schema");
                const schemas = generateAllSchemas({
                    title: selectedTitle,
                    description: meta.metaDescription,
                    content: fullContent,
                    imageUrl: image?.url,
                    faqs: faqs.length > 0 ? faqs : undefined,
                    hasRecipe: includeRecipe,
                    hasStepByStep: includeStepByStep,
                    keyword,
                });

                // Add schema markup to content
                const schemaMarkup = schemas.join('\n');

                const formattedContent = formatForBlogger(fullContent, {
                    includeToc,
                    includeDisclosure,
                    includeCta,
                    featuredImageUrl: image?.url,
                    featuredImageAlt: image?.altText,
                    keyword,
                    showReadTime: true,
                    addKeywordToIntro: true,
                }) + '\n\n' + schemaMarkup;

                const wordCountResult = countWords(formattedContent);

                // Determine article status based on publishAction
                let articleStatus = "draft";
                let scheduledFor = null;

                if (publishAction === "schedule" && scheduleDate) {
                    articleStatus = "scheduled";
                    scheduledFor = new Date(scheduleDate);
                } else if (publishAction === "publish") {
                    articleStatus = "published";
                }

                // Save to database
                if (currentUser) {
                    const savedArticle = await prisma.article.create({
                        data: {
                            title: selectedTitle,
                            content: formattedContent,
                            outline: JSON.stringify(outline),
                            metaDescription: meta.metaDescription,
                            excerpt: meta.excerpt,
                            labels: labels?.join(",") || (outline.suggestedLabels as string[])?.join(","),
                            tone,
                            articleType,
                            wordCount: wordCountResult,
                            status: articleStatus,
                            scheduledFor: scheduledFor,
                            blogId: activeBlogId || undefined,
                            userId: authUser.id,
                        },
                    });

                    // Track usage
                    await trackUsage(authUser.id, "article", 1, wordCountResult);
                    if (inlineImages.length > 0 || image) {
                        await trackUsage(authUser.id, "image", (image ? 1 : 0) + inlineImages.length);
                    }

                    // Save image if generated
                    if (image) {
                        await prisma.generatedImage.create({
                            data: {
                                url: image.url,
                                altText: image.altText,
                                type: "featured",
                                articleId: savedArticle.id,
                            },
                        });
                    }

                    return NextResponse.json({
                        article: formattedContent,
                        rawArticle: article,
                        faqs,
                        meta,
                        image,
                        wordCount: wordCountResult,
                        savedArticle,
                    });
                }

                return NextResponse.json({
                    article: formattedContent,
                    rawArticle: article,
                    faqs,
                    meta,
                    image,
                    wordCount: wordCountResult,
                });
            }

            default:
                return NextResponse.json(
                    { error: "Invalid step" },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error("Generate API error:", error);
        return NextResponse.json(
            { error: "Generation failed: " + (error as Error).message },
            { status: 500 }
        );
    }
}
