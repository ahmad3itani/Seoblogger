import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    generateTitles,
    generateFAQ,
    generateMeta,
    generateFeaturedImage,
    type GenerationOptions,
} from "@/lib/ai/generate";
import { generateTopicalOutline, generateArticleDraft, humanizeDraft, V2GenerationOptions } from "@/lib/ai/v2-engine";
import { formatForBlogger, generateFaqHtml, countWords } from "@/lib/formatter";
import { requireAuth, checkUsageLimit, trackUsage } from "@/lib/supabase/auth-helpers";
import { findRelevantInternalLinks, formatLinksForPrompt } from "@/lib/linker/engine";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { sanitizeString, sanitizeNumber } from "@/lib/security/validate";
import { fetchSerpIntelligence, formatSourcesForPrompt, formatPAAForFAQ } from "@/lib/seo/serp-sources";
import type { BlogRecord } from "@/types/api";

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
            includeInternalLinks = true,
            includeExternalLinks = true,
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
            includeExternalLinks,
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
                const v2Options: V2GenerationOptions = {
                    title: selectedTitle,
                    keyword: keyword,
                    wordCount: options.wordCount || 2000,
                    language: options.language || "en",
                    tone: options.tone || "informational",
                    niche: options.niche || "general",
                    articleType: options.articleType || "blog-post",
                    userPlan: options.userPlan,
                    includeFaq: options.includeFaq,
                };
                const generatedOutline = await generateTopicalOutline(v2Options);
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
                    const blogs = currentUser.blogs as BlogRecord[];
                    activeBlogId = blogs.find((b) => b.isDefault)?.id || blogs[0]?.id;
                }

                // Smart internal linking: find relevant existing posts by keyword similarity (if enabled)
                if (includeInternalLinks && activeBlogId) {
                    try {
                        let cachedPosts = await prisma.cachedPost.findMany({
                            where: { blogId: activeBlogId },
                            orderBy: { publishedAt: 'desc' },
                            take: 100
                        });

                        // If no cached posts, try to fetch from Blogger API and cache them
                        if (cachedPosts.length === 0 && currentUser?.googleAccessToken) {
                            console.log("🔗 No cached posts found, fetching from Blogger API for internal linking...");
                            try {
                                const { getValidAccessToken } = await import("@/lib/google");
                                const { listPosts } = await import("@/lib/blogger");
                                const userBlogs = currentUser.blogs as BlogRecord[];
                                const blog = userBlogs?.find((b) => b.id === activeBlogId);
                                if (blog) {
                                    const accessToken = await getValidAccessToken(currentUser.id);
                                    const postsData = await listPosts(blog.blogId, accessToken, 50);
                                    const posts = postsData.items || [];
                                    console.log(`📝 Fetched ${posts.length} posts from Blogger API for caching`);
                                    
                                    // Cache them for future use
                                    for (const post of posts) {
                                        try {
                                            await prisma.cachedPost.upsert({
                                                where: { 
                                                    blogId_postId: {
                                                        blogId: activeBlogId,
                                                        postId: post.id || '',
                                                    }
                                                },
                                                update: {
                                                    title: post.title,
                                                    url: post.url || '',
                                                },
                                                create: {
                                                    postId: post.id || '',
                                                    title: post.title,
                                                    url: post.url || '',
                                                    blogId: activeBlogId,
                                                    publishedAt: post.published ? new Date(post.published) : new Date(),
                                                },
                                            });
                                        } catch (upsertErr) {
                                            // Skip individual upsert errors
                                        }
                                    }
                                    
                                    // Re-fetch cached posts
                                    cachedPosts = await prisma.cachedPost.findMany({
                                        where: { blogId: activeBlogId },
                                        orderBy: { publishedAt: 'desc' },
                                        take: 100
                                    });
                                }
                            } catch (bloggerErr) {
                                console.error("Failed to fetch posts from Blogger API for interlinking:", bloggerErr);
                            }
                        }

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
                        } else {
                            console.log("🔗 No posts available for internal linking (new blog or no posts yet)");
                        }
                    } catch (err) {
                        console.error("Failed to fetch cached posts for smart interlinking", err);
                    }
                }

                // ─── SERP INTELLIGENCE ──────────────────────────────────────
                // Fetch real SERP data to use real URLs (prevents link hallucination)
                // and real PAA questions (improves FAQ targeting)
                if (includeExternalLinks !== false) {
                    try {
                        const serpLang = language?.substring(0, 2) || "en";
                        const serpIntel = await fetchSerpIntelligence(keyword, "us", serpLang);

                        if (serpIntel.sources.length > 0) {
                            options.serpSources = formatSourcesForPrompt(serpIntel.sources);
                        }

                        if (serpIntel.paaQuestions.length > 0) {
                            options.paaQuestions = serpIntel.paaQuestions.map(q => q.question);
                            console.log(`❓ PAA questions fetched: ${options.paaQuestions.join(" | ")}`);
                        }
                    } catch (serpErr) {
                        console.warn("SERP intelligence fetch failed (non-blocking):", serpErr);
                    }
                }
                const v2Options: V2GenerationOptions = {
                    title: selectedTitle,
                    keyword: keyword,
                    wordCount: options.wordCount || 2000,
                    language: options.language || "en",
                    tone: options.tone || "informational",
                    niche: options.niche || "general",
                    articleType: options.articleType || "blog-post",
                    userPlan: options.userPlan,
                    includeFaq: options.includeFaq,
                };

                const rawArticle = await generateArticleDraft(outline, v2Options);

                // ─── HUMANIZER PASS ─────────────────────────────────────────
                // Always run the humanizer to make content undetectable as AI
                console.log("🧠 Running humanizer pass...");
                const article = await humanizeDraft(rawArticle);

                // Generate FAQs if requested
                // Prioritize real PAA questions from SERP for better featured snippet targeting
                let faqs: Array<{ question: string; answer: string }> = [];
                if (includeFaq) {
                    faqs = await generateFAQ(keyword, article, language, niche, options.userPlan, options.paaQuestions);
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
                let imagesEmbedded = 0;

                // Embed featured image at top
                if (image && image.url && image.url.startsWith("http")) {
                    const featuredHtml = `\n<div class="separator" style="clear: both; text-align: center;"><a href="${image.url}" style="margin-left: 1em; margin-right: 1em;"><img border="0" src="${image.url}" alt="${image.altText || selectedTitle}" width="640" /></a></div>\n`;
                    fullContent = featuredHtml + fullContent;
                    imagesEmbedded++;
                    console.log(`  ✅ Featured image embedded: ${image.url}`);
                }

                // Replace [IMAGE: ...] placeholders with actual generated images first
                const imgPlaceholderRegex = /\[IMAGE:\s*(.*?)\]/gi;
                const imgPlaceholderMatches = [...fullContent.matchAll(imgPlaceholderRegex)];
                console.log(`  📸 Found ${imgPlaceholderMatches.length} [IMAGE:] placeholders in article`);

                const validInline = inlineImages.filter(img => img && img.url && img.url.startsWith("http"));
                let inlineIdx = 0;

                if (imgPlaceholderMatches.length > 0 && validInline.length > 0) {
                    for (const match of imgPlaceholderMatches) {
                        if (inlineIdx >= validInline.length) break;
                        const img = validInline[inlineIdx];
                        const imageHtml = `\n<div class="separator" style="clear: both; text-align: center;"><a href="${img.url}" style="margin-left: 1em; margin-right: 1em;"><img border="0" src="${img.url}" alt="${img.altText || match[1] || `${keyword} illustration`}" width="640" /></a></div>\n`;
                        fullContent = fullContent.replace(match[0], imageHtml);
                        imagesEmbedded++;
                        inlineIdx++;
                        console.log(`  ✅ Replaced placeholder with image: ${img.url}`);
                    }
                }

                // Embed remaining images at H2 section boundaries
                const remainingImgs = validInline.slice(inlineIdx);
                if (remainingImgs.length > 0) {
                    const sections = fullContent.split('</h2>');
                    if (sections.length > 1) {
                        const interval = Math.max(1, Math.floor(sections.length / (remainingImgs.length + 1)));
                        for (let i = 0; i < remainingImgs.length; i++) {
                            const sectionPos = Math.min((i + 1) * interval, sections.length - 1);
                            const img = remainingImgs[i];
                            const imageHtml = `\n<div class="separator" style="clear: both; text-align: center;"><a href="${img.url}" style="margin-left: 1em; margin-right: 1em;"><img border="0" src="${img.url}" alt="${img.altText || `${keyword} illustration ${i + 1}`}" width="640" /></a></div>\n`;
                            sections[sectionPos] = imageHtml + sections[sectionPos];
                            imagesEmbedded++;
                        }
                        fullContent = sections.join('</h2>');
                        console.log(`  ✅ ${remainingImgs.length} extra images embedded at section boundaries`);
                    }
                }

                // Strip any remaining [IMAGE: ...] placeholders that weren't replaced
                const leftoverImgPlaceholders = (fullContent.match(/\[IMAGE:\s*.*?\]/gi) || []).length;
                if (leftoverImgPlaceholders > 0) {
                    fullContent = fullContent.replace(/\[IMAGE:\s*.*?\]/gi, '');
                    console.log(`  🧹 Stripped ${leftoverImgPlaceholders} leftover [IMAGE:] placeholders`);
                }
                console.log(`📸 Total images embedded: ${imagesEmbedded}`);

                // Only append FAQ if article doesn't already contain one
                const oldRouteHasFaq = /<h2[^>]*>.*?(?:faq|frequently\s+asked)/i.test(fullContent);
                if (faqs.length > 0 && !oldRouteHasFaq) {
                    fullContent += generateFaqHtml(faqs);
                } else if (oldRouteHasFaq) {
                    console.log("📋 FAQ already present in article, skipping duplicate append");
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

                // Skip TOC if AI already included one in the article
                const oldRouteHasToc = /<div\s+class="toc"/i.test(fullContent);
                if (oldRouteHasToc) {
                    console.log("📋 TOC already present in article, skipping duplicate generation");
                }
                const formattedContent = formatForBlogger(fullContent, {
                    includeToc: includeToc && !oldRouteHasToc,
                    includeDisclosure,
                    includeCta,
                    featuredImageUrl: image?.url,
                    featuredImageAlt: image?.altText,
                    keyword,
                    showReadTime: true,
                    addKeywordToIntro: true,
                }) + '\n\n' + schemaMarkup;

                const wordCountResult = countWords(formattedContent);

                // ─── QUALITY VALIDATION ─────────────────────────────────────
                const targetWordCount = wordCount || 2000;
                const qualityWarnings: string[] = [];

                if (wordCountResult < targetWordCount * 0.7) {
                    qualityWarnings.push(`Article is ${wordCountResult} words — significantly shorter than the ${targetWordCount}-word target (${Math.round(wordCountResult / targetWordCount * 100)}%). Consider regenerating.`);
                    console.warn(`⚠️ Quality: Article too short: ${wordCountResult}/${targetWordCount} words`);
                }

                const h2Count = (formattedContent.match(/<h2/gi) || []).length;
                if (h2Count < 3) {
                    qualityWarnings.push(`Article has only ${h2Count} H2 headings — structure may be insufficient for SEO.`);
                    console.warn(`⚠️ Quality: Only ${h2Count} H2 headings found`);
                }

                const hasTldr = formattedContent.toLowerCase().includes("tldr") ||
                    formattedContent.indexOf("<p") < formattedContent.indexOf("<h2");
                if (!hasTldr) {
                    qualityWarnings.push("Article may be missing TLDR/intro paragraph before first H2.");
                }

                if (qualityWarnings.length > 0) {
                    console.log(`📋 Quality warnings: ${qualityWarnings.join(" | ")}`);
                }

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
                        qualityWarnings: qualityWarnings.length > 0 ? qualityWarnings : undefined,
                    });
                }

                return NextResponse.json({
                    article: formattedContent,
                    rawArticle: article,
                    faqs,
                    meta,
                    image,
                    wordCount: wordCountResult,
                    qualityWarnings: qualityWarnings.length > 0 ? qualityWarnings : undefined,
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
