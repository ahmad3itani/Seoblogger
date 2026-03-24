import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, checkUsageLimit, trackUsage } from "@/lib/supabase/auth-helpers";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { sanitizeString, sanitizeNumber } from "@/lib/security/validate";
import { formatForBlogger, countWords } from "@/lib/formatter";
import { getValidAccessToken } from "@/lib/google";
import { createPost } from "@/lib/blogger";

export async function POST(req: Request) {
  try {
    console.log("🚀 Generate V3 API called");
    
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { user: authUser } = authResult;
    
    console.log("✅ Auth successful:", authUser.id);

    // Rate limit: 5 generations per minute
    const rl = checkRateLimit(`generate-v3:${authUser.id}`, 5, 60_000);
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
      tone = "professional",
      niche: rawNiche,
      articleType = "informational",
      wordCount: rawWordCount = 2000,
      brandVoiceId,
      
      // Content features
      includeFaq = true,
      includeImages = true,
      numImages: rawNumImages = 3,
      includeComparisonTable = false,
      includeRecipe = false,
      includeProsCons = false,
      includeStepByStep = false,
      includeToc = true,
      includeInternalLinks = true,
      includeExternalLinks = true,
      
      // Publishing
      blogId,
      labels,
      publishAction = "draft",
    } = body;

    // Sanitize inputs
    const keyword = sanitizeString(rawKeyword, 200);
    const niche = sanitizeString(rawNiche, 200);
    const wordCount = sanitizeNumber(rawWordCount, 300, 10000, 2000);
    const numImages = sanitizeNumber(rawNumImages, 0, 10, 3);

    if (!keyword) {
      return NextResponse.json({ error: "Keyword is required" }, { status: 400 });
    }

    // Check usage limits
    const usageCheck = await checkUsageLimit(authUser.id, "articles");
    if (!usageCheck.allowed) {
      return NextResponse.json(
        { error: usageCheck.error, usageLimit: true },
        { status: 403 }
      );
    }

    // Get user's plan and brand voice
    const currentUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { plan: true },
    });
    const userPlan = currentUser?.plan?.name || "free";

    let brandVoice = "";
    if (brandVoiceId) {
      const profile = await prisma.brandProfile.findFirst({
        where: { id: brandVoiceId, userId: authUser.id },
      });
      if (profile?.instructions) {
        brandVoice = profile.instructions;
      }
    }

    // Import AI generation functions
    const {
      generateTitles,
      generateOutline,
      generateArticle,
      generateFAQ,
      generateMeta,
      generateFeaturedImage,
    } = await import("@/lib/ai/generate");
    
    type GenerationOptions = Parameters<typeof generateTitles>[0];

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
      numInlineImages: numImages,
      includeToc,
      includeInternalLinks,
      includeComparisonTable,
      includeRecipe,
      includeProsCons,
      includeStepByStep,
      includeExternalLinks,
      userPlan,
    };

    // PHASE 1: Generate titles
    console.log("📝 Generating titles for:", keyword);
    const titles = await generateTitles(options);
    const selectedTitle = titles[0]?.replace(/["']/g, "") || `Article about ${keyword}`;
    console.log("✅ Title selected:", selectedTitle);

    // PHASE 2: Generate outline
    console.log("📋 Generating outline...");
    const outline = await generateOutline(selectedTitle, options);
    console.log("✅ Outline generated with", outline.sections?.length || 0, "sections");

    // PHASE 3: Generate article content
    console.log("✍️ Generating article content...");
    const article = await generateArticle(selectedTitle, outline, options);
    console.log("✅ Article generated:", article.length, "characters");

    // PHASE 4: Generate FAQs if requested
    let faqs: any[] = [];
    if (includeFaq) {
      faqs = await generateFAQ(keyword, article);
    }

    // PHASE 5: Generate meta tags
    const meta = await generateMeta(selectedTitle, article);

    // PHASE 6: Generate images if requested
    let featuredImage: { url: string; altText: string } | null = null;
    const inlineImages: { url: string; altText: string }[] = [];

    if (includeImages && numImages > 0) {
      console.log(`🖼️ Starting image generation for ${numImages} images...`);
      console.log(`  📋 Environment check:`);
      console.log(`     - CLOUDFLARE_ACCOUNT_ID: ${process.env.CLOUDFLARE_ACCOUNT_ID ? "✅ SET" : "❌ MISSING"}`);
      console.log(`     - CLOUDFLARE_API_TOKEN: ${process.env.CLOUDFLARE_API_TOKEN ? "✅ SET" : "❌ MISSING"}`);
      console.log(`     - CLOUDFLARE_R2_BUCKET_NAME: ${process.env.CLOUDFLARE_R2_BUCKET_NAME || "bloggerseo-images (default)"}`);
      console.log(`     - CLOUDFLARE_R2_PUBLIC_URL: ${process.env.CLOUDFLARE_R2_PUBLIC_URL ? "✅ SET" : "❌ MISSING"}`);

      // Check for missing critical env vars
      if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
        console.error("❌ Cannot generate images: Missing Cloudflare credentials!");
        console.error("   Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in .env");
      } else if (!process.env.CLOUDFLARE_R2_PUBLIC_URL) {
        console.error("❌ Cannot generate images: Missing R2 public URL!");
        console.error("   Set CLOUDFLARE_R2_PUBLIC_URL in .env (e.g., https://images.yourdomain.com)");
      } else {
        try {
          // Featured image
          console.log("  🎨 Generating featured image...");
          const featuredResult = await generateFeaturedImage(selectedTitle, keyword, "featured");

          // Validate URL before accepting
          if (featuredResult && featuredResult.url && featuredResult.url.startsWith("http")) {
            featuredImage = featuredResult;
            console.log(`  ✅ Featured image ready: ${featuredImage.url}`);
          } else {
            console.warn(`  ⚠️ Featured image generation returned invalid URL:`, featuredResult);
          }

          // Inline images
          if (numImages > 1) {
            for (let i = 0; i < numImages - 1; i++) {
              console.log(`  🎨 Generating inline image ${i + 1}/${numImages - 1}...`);
              const img = await generateFeaturedImage(
                `${keyword} illustration ${i + 1}`,
                keyword,
                "content",
                undefined,
                i + 1
              );

              // Validate URL before adding
              if (img && img.url && img.url.startsWith("http")) {
                inlineImages.push(img);
                console.log(`  ✅ Inline image ${i + 1}: ${img.url}`);
              } else {
                console.warn(`  ⚠️ Inline image ${i + 1} returned invalid URL:`, img);
              }
            }
          }
          console.log(`✅ Image generation complete: ${featuredImage ? 1 : 0} featured + ${inlineImages.length} inline`);
        } catch (imgError: any) {
          console.error("❌ Image generation error:", imgError.message);
          console.error("   Stack:", imgError.stack?.split("\n").slice(0, 3).join("\n"));
        }
      }
    } else {
      console.log("⏭️ Skipping image generation (disabled or numImages=0)");
    }

    // PHASE 7: Internal linking — deterministic regex injection (no AI, prevents truncation)
    let fullContent = article;
    if (includeInternalLinks && blogId) {
      try {
        const cachedPosts = await prisma.cachedPost.findMany({
          where: { blogId },
          take: 50,
          orderBy: { publishedAt: 'desc' },
          select: { title: true, url: true }
        });

        if (cachedPosts.length > 0) {
          const { findRelevantInternalLinks } = await import("@/lib/linker/engine");
          const relevantLinks = findRelevantInternalLinks(
            keyword,
            selectedTitle,
            cachedPosts.map(p => ({ title: p.title, url: p.url })),
            5
          );

          let linksInserted = 0;
          for (const link of relevantLinks) {
            if (linksInserted >= 5) break;
            // Build anchor from first 3 meaningful words of the linked post's title
            const anchor = link.title.split(/\s+/).slice(0, 4).join(' ');
            // Only match in paragraph text, not inside existing tags or headings
            const regex = new RegExp(`(?<!<[^>]*)\\b(${anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b(?![^<]*>)`, 'i');
            if (regex.test(fullContent)) {
              fullContent = fullContent.replace(regex, `<a href="${link.url}">$1</a>`);
              linksInserted++;
              console.log(`  🔗 Linked: "${anchor}" → ${link.url}`);
            }
          }
          console.log(`🔗 Internal links: ${linksInserted} inserted via regex`);
        }
      } catch (linkError) {
        console.error("Internal linking failed:", linkError);
      }
    }

    // PHASE 8: Embed images in content
    console.log("🖼️ Embedding images in content...");
    let imagesEmbedded = 0;

    // 8a. Embed featured image at the top
    if (featuredImage && featuredImage.url && featuredImage.url.startsWith("http")) {
      const featuredHtml = `\n<div class="separator" style="clear: both; text-align: center;"><a href="${featuredImage.url}" style="margin-left: 1em; margin-right: 1em;"><img border="0" src="${featuredImage.url}" alt="${featuredImage.altText || selectedTitle}" width="640" /></a></div>\n`;
      fullContent = featuredHtml + fullContent;
      imagesEmbedded++;
      console.log(`  ✅ Featured image embedded: ${featuredImage.url}`);
    } else {
      console.log("  ⚠️ No valid featured image to embed");
    }

    // 8b. Replace [IMAGE: ...] placeholders with actual generated images
    const imagePlaceholderRegex = /\[IMAGE:\s*(.*?)\]/gi;
    const placeholderMatches = [...fullContent.matchAll(imagePlaceholderRegex)];
    console.log(`  📸 Found ${placeholderMatches.length} [IMAGE:] placeholders in article`);

    const validInlineImages = inlineImages.filter(img => img && img.url && img.url.startsWith("http"));
    let inlineIdx = 0;

    if (placeholderMatches.length > 0 && validInlineImages.length > 0) {
      for (const match of placeholderMatches) {
        if (inlineIdx >= validInlineImages.length) break;
        const img = validInlineImages[inlineIdx];
        const imageHtml = `\n<div class="separator" style="clear: both; text-align: center;"><a href="${img.url}" style="margin-left: 1em; margin-right: 1em;"><img border="0" src="${img.url}" alt="${img.altText || match[1] || `${keyword} illustration`}" width="640" /></a></div>\n`;
        fullContent = fullContent.replace(match[0], imageHtml);
        imagesEmbedded++;
        inlineIdx++;
        console.log(`  ✅ Replaced placeholder with image: ${img.url}`);
      }
    }

    // 8c. Embed remaining images at H2 section boundaries
    const remainingImages = validInlineImages.slice(inlineIdx);
    if (remainingImages.length > 0) {
      const sections = fullContent.split('</h2>');
      if (sections.length > 1) {
        const interval = Math.max(1, Math.floor(sections.length / (remainingImages.length + 1)));
        for (let i = 0; i < remainingImages.length; i++) {
          const sectionPos = Math.min((i + 1) * interval, sections.length - 1);
          const img = remainingImages[i];
          const imageHtml = `\n<div class="separator" style="clear: both; text-align: center;"><a href="${img.url}" style="margin-left: 1em; margin-right: 1em;"><img border="0" src="${img.url}" alt="${img.altText || `${keyword} illustration ${i + 1}`}" width="640" /></a></div>\n`;
          sections[sectionPos] = imageHtml + sections[sectionPos];
          imagesEmbedded++;
        }
        fullContent = sections.join('</h2>');
        console.log(`  ✅ ${remainingImages.length} extra images embedded at section boundaries`);
      }
    }

    // 8d. Strip any remaining [IMAGE: ...] placeholders that weren't replaced
    const leftoverPlaceholders = (fullContent.match(/\[IMAGE:\s*.*?\]/gi) || []).length;
    if (leftoverPlaceholders > 0) {
      fullContent = fullContent.replace(/\[IMAGE:\s*.*?\]/gi, '');
      console.log(`  🧹 Stripped ${leftoverPlaceholders} leftover [IMAGE:] placeholders`);
    }

    console.log(`📸 Total images embedded in article: ${imagesEmbedded}`);
    if (includeImages && numImages > 0 && imagesEmbedded === 0) {
      console.warn("⚠️ WARNING: User requested images but none were embedded. Check Cloudflare credentials.");
    }

    // PHASE 9: Add FAQs — only if article doesn't already contain an FAQ section
    const articleAlreadyHasFaq = /<h2[^>]*>.*?(?:faq|frequently\s+asked)/i.test(fullContent);
    if (faqs.length > 0 && !articleAlreadyHasFaq) {
      const { generateFaqHtml } = await import("@/lib/formatter");
      fullContent += generateFaqHtml(faqs);
    } else if (articleAlreadyHasFaq) {
      console.log("📋 FAQ already present in article, skipping duplicate append");
    }

    // PHASE 10: Format for Blogger — skip TOC if AI already included one
    const articleAlreadyHasToc = /<div\s+class="toc"/i.test(fullContent);
    const formattedContent = formatForBlogger(fullContent, {
      includeToc: includeToc && !articleAlreadyHasToc,
      keyword,
      showReadTime: true,
      addKeywordToIntro: true,
    });
    if (articleAlreadyHasToc) {
      console.log("📋 TOC already present in article, skipping duplicate generation");
    }

    const wordCountResult = countWords(formattedContent);

    // PHASE 11: Publish to Blogger if requested
    let bloggerPostId = null;
    let publishError: string | null = null;
    let publishedToBlogger = false;
    let articleStatus = "draft";

    if (blogId && publishAction === "publish") {
      try {
        const blogRecord = await prisma.blog.findFirst({
          where: { id: blogId, userId: authUser.id },
          select: { blogId: true, id: true, name: true },
        });

        if (!blogRecord) {
          publishError = "Blog not found. Please reconnect your blog in Settings.";
        } else {
          const accessToken = await getValidAccessToken(authUser.id);
          console.log(`📤 Publishing to Blogger: blog="${blogRecord.name}", blogId=${blogRecord.blogId}`);

          const bPost = await createPost(
            blogRecord.blogId,
            {
              title: selectedTitle,
              content: formattedContent,
              labels: labels || [],
              isDraft: false,
            },
            accessToken
          );

          bloggerPostId = bPost.id || null;
          publishedToBlogger = true;
          articleStatus = "published";
          console.log(`✅ Published: postId=${bPost.id}, url=${bPost.url}`);
        }
      } catch (e: any) {
        console.error("❌ Blogger publish failed:", e.message);
        publishError = e.message || "Failed to publish to Blogger";
        articleStatus = "draft";
      }
    }

    // PHASE 12: Save to database
    const savedArticle = await prisma.article.create({
      data: {
        title: selectedTitle,
        content: formattedContent,
        outline: JSON.stringify(outline),
        metaDescription: meta.metaDescription,
        excerpt: meta.excerpt,
        labels: labels?.join(",") || "",
        tone,
        articleType,
        wordCount: wordCountResult,
        status: articleStatus,
        bloggerPostId,
        blogId,
        userId: authUser.id,
      },
    });

    // Track usage
    await trackUsage(authUser.id, "article", 1, wordCountResult);
    if (featuredImage || inlineImages.length > 0) {
      await trackUsage(authUser.id, "image", (featuredImage ? 1 : 0) + inlineImages.length);
    }

    return NextResponse.json({
      success: true,
      article: {
        id: savedArticle.id,
        title: selectedTitle,
        content: formattedContent,
        wordCount: wordCountResult,
        status: articleStatus,
      },
      meta,
      faqs,
      image: featuredImage,
      publishedToBlogger,
      publishError,
    });
  } catch (error: any) {
    console.error("❌ Generate V3 API error:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      cause: error.cause
    });
    
    return NextResponse.json(
      { 
        error: error.message || "Generation failed",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
