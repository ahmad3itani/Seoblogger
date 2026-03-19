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
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { user: authUser } = authResult;

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
      includeComparisonTable,
      includeRecipe,
      includeProsCons,
      includeStepByStep,
      includeExternalLinks,
      userPlan,
    };

    // PHASE 1: Generate titles
    const titles = await generateTitles(options);
    const selectedTitle = titles[0]?.replace(/["']/g, "") || `Article about ${keyword}`;

    // PHASE 2: Generate outline
    const outline = await generateOutline(selectedTitle, options);

    // PHASE 3: Generate article content
    const article = await generateArticle(selectedTitle, outline, options);

    // PHASE 4: Generate FAQs if requested
    let faqs: any[] = [];
    if (includeFaq) {
      faqs = await generateFAQ(keyword, article);
    }

    // PHASE 5: Generate meta tags
    const meta = await generateMeta(selectedTitle, article);

    // PHASE 6: Generate images if requested
    let featuredImage: any = null;
    const inlineImages: any[] = [];

    if (includeImages) {
      try {
        // Featured image
        featuredImage = await generateFeaturedImage(selectedTitle, keyword, "featured");
        
        // Inline images
        for (let i = 0; i < numImages - 1; i++) {
          const img = await generateFeaturedImage(
            `${keyword} illustration ${i + 1}`,
            keyword,
            "content",
            undefined,
            i + 1
          );
          if (img) inlineImages.push(img);
        }
      } catch (imgError) {
        console.error("Image generation failed:", imgError);
      }
    }

    // PHASE 7: Internal linking if requested
    let fullContent = article;
    if (includeInternalLinks && blogId) {
      try {
        const cachedPosts = await prisma.cachedPost.findMany({
          where: { blogId },
          take: 20,
          orderBy: { publishedAt: 'desc' },
          select: { title: true, url: true }
        });

        if (cachedPosts.length > 0) {
          const { getModelForPlan, openai } = await import("@/lib/ai/client");
          const model = getModelForPlan(userPlan);
          
          const prompt = `You are an internal linking engine. Add 3-5 natural internal links to the article using these URLs:
${cachedPosts.map(p => `- "${p.title}": ${p.url}`).join("\n")}

Return ONLY the HTML with <a href="..."> tags added. No markdown code fences.`;

          const res = await openai.chat.completions.create({
            model,
            messages: [
              { role: "system", content: prompt },
              { role: "user", content: fullContent }
            ],
            temperature: 0.2,
          });

          if (res.choices[0]?.message?.content) {
            fullContent = res.choices[0].message.content.replace(/^```html?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
          }
        }
      } catch (linkError) {
        console.error("Internal linking failed:", linkError);
      }
    }

    // PHASE 8: Embed images in content
    if (featuredImage) {
      const featuredHtml = `\n<div class="separator" style="clear: both; text-align: center;"><img src="${featuredImage.url}" alt="${featuredImage.altText}" style="max-width: 100%; border-radius: 8px; margin-bottom: 20px;" /></div>\n`;
      fullContent = featuredHtml + fullContent;
    }

    if (inlineImages.length > 0) {
      const sections = fullContent.split('</h2>');
      if (sections.length > 1) {
        const interval = Math.floor(sections.length / (inlineImages.length + 1));
        for (let i = 0; i < inlineImages.length; i++) {
          const sectionPos = Math.min((i + 1) * interval, sections.length - 1);
          const img = inlineImages[i];
          const imageHtml = `\n<div class="separator" style="clear: both; text-align: center;"><img src="${img.url}" alt="${img.altText}" style="max-width: 100%; border-radius: 8px; margin: 20px 0;" /></div>\n`;
          sections[sectionPos] = imageHtml + sections[sectionPos];
        }
        fullContent = sections.join('</h2>');
      }
    }

    // PHASE 9: Add FAQs
    if (faqs.length > 0) {
      const { generateFaqHtml } = await import("@/lib/formatter");
      fullContent += generateFaqHtml(faqs);
    }

    // PHASE 10: Format for Blogger
    const formattedContent = formatForBlogger(fullContent, {
      includeToc,
      keyword,
      showReadTime: true,
      addKeywordToIntro: true,
    });

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
    console.error("Generate V3 API error:", error);
    return NextResponse.json(
      { error: "Generation failed: " + error.message },
      { status: 500 }
    );
  }
}
