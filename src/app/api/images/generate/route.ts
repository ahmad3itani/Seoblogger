import { NextResponse } from "next/server";
import { requireAuth, checkUsageLimit, trackUsage } from "@/lib/supabase/auth-helpers";
import { generateFeaturedImage } from "@/lib/ai/generate";
import { checkRateLimit } from "@/lib/security/rate-limit";

/**
 * Standalone Image Generation API
 *
 * Generates images for an existing article and embeds them into the HTML.
 * Called AFTER article generation to keep the article flow fast and avoid 504s.
 *
 * Input:  { articleHtml, title, keyword, numImages? }
 * Output: { content (updated HTML), images[], imagesEmbedded }
 */

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        // Rate limit
        const rl = checkRateLimit(`images-generate:${userId}`, 10, 60_000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` },
                { status: 429 }
            );
        }

        const body = await req.json();
        const {
            articleHtml,
            title,
            keyword,
            numImages = 3,
            articleId,
        } = body;

        if (!articleHtml || !keyword) {
            return NextResponse.json(
                { error: "articleHtml and keyword are required" },
                { status: 400 }
            );
        }

        // Check image usage limits
        const usageCheck = await checkUsageLimit(userId, "images", numImages);
        if (!usageCheck.allowed) {
            return NextResponse.json(
                { error: usageCheck.error || "Image generation limit reached", usageLimit: true },
                { status: 403 }
            );
        }

        // Check Cloudflare credentials
        if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
            return NextResponse.json(
                { error: "Image generation is not configured. Contact support." },
                { status: 503 }
            );
        }
        if (!process.env.CLOUDFLARE_R2_PUBLIC_URL) {
            return NextResponse.json(
                { error: "Image storage is not configured. Contact support." },
                { status: 503 }
            );
        }

        console.log(`🖼️ Generating ${numImages} images for "${keyword}"...`);

        // Generate images in parallel (featured + inline)
        const imagePromises: Promise<{ url: string; altText: string }>[] = [];

        // 1. Featured image
        imagePromises.push(
            generateFeaturedImage(title || keyword, keyword, "featured")
        );

        // 2. Inline images (with section context from H2s)
        const h2Matches = [...articleHtml.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)];
        const sectionTitles = h2Matches.map((m: RegExpMatchArray) =>
            m[1].replace(/<[^>]*>/g, "").trim()
        );

        for (let i = 0; i < numImages - 1; i++) {
            const sectionContext = sectionTitles[i] || undefined;
            imagePromises.push(
                generateFeaturedImage(
                    `${keyword} illustration ${i + 1}`,
                    keyword,
                    "content",
                    sectionContext,
                    i + 1
                )
            );
        }

        const imageResults = await Promise.all(imagePromises);
        const featuredImage = imageResults[0];
        const inlineImages = imageResults.slice(1);

        // Filter valid images
        const validFeatured = featuredImage?.url?.startsWith("http") ? featuredImage : null;
        const validInline = inlineImages.filter(img => img?.url?.startsWith("http"));

        console.log(`✅ Generated: ${validFeatured ? 1 : 0} featured + ${validInline.length} inline`);

        // Embed images into article HTML
        let content = articleHtml;
        let imagesEmbedded = 0;

        // Featured image at top
        if (validFeatured) {
            const featuredHtml = `\n<div class="separator" style="clear: both; text-align: center;"><a href="${validFeatured.url}" style="margin-left: 1em; margin-right: 1em;"><img border="0" src="${validFeatured.url}" alt="${validFeatured.altText || title}" width="640" /></a></div>\n`;
            content = featuredHtml + content;
            imagesEmbedded++;
        }

        // Replace [IMAGE:] placeholders first
        const placeholderRegex = /\[IMAGE:\s*(.*?)\]/gi;
        const placeholders = [...content.matchAll(placeholderRegex)];
        let inlineIdx = 0;

        if (placeholders.length > 0 && validInline.length > 0) {
            for (const match of placeholders) {
                if (inlineIdx >= validInline.length) break;
                const img = validInline[inlineIdx];
                const imgHtml = `\n<div class="separator" style="clear: both; text-align: center;"><a href="${img.url}" style="margin-left: 1em; margin-right: 1em;"><img border="0" src="${img.url}" alt="${img.altText || match[1] || `${keyword} illustration`}" width="640" /></a></div>\n`;
                content = content.replace(match[0], imgHtml);
                imagesEmbedded++;
                inlineIdx++;
            }
        }

        // Distribute remaining images at H2 boundaries
        const remaining = validInline.slice(inlineIdx);
        if (remaining.length > 0) {
            const sections = content.split("</h2>");
            if (sections.length > 1) {
                const interval = Math.max(1, Math.floor(sections.length / (remaining.length + 1)));
                for (let i = 0; i < remaining.length; i++) {
                    const pos = Math.min((i + 1) * interval, sections.length - 1);
                    const img = remaining[i];
                    const imgHtml = `\n<div class="separator" style="clear: both; text-align: center;"><a href="${img.url}" style="margin-left: 1em; margin-right: 1em;"><img border="0" src="${img.url}" alt="${img.altText || `${keyword} illustration ${i + 1}`}" width="640" /></a></div>\n`;
                    sections[pos] = imgHtml + sections[pos];
                    imagesEmbedded++;
                }
                content = sections.join("</h2>");
            }
        }

        // Strip leftover placeholders
        content = content.replace(/\[IMAGE:\s*.*?\]/gi, "");

        // Track usage
        await trackUsage(userId, "image", imagesEmbedded);

        // Save featured image to DB if articleId provided
        if (articleId && validFeatured) {
            try {
                const { prisma } = await import("@/lib/prisma");
                await prisma.generatedImage.create({
                    data: {
                        url: validFeatured.url,
                        altText: validFeatured.altText,
                        type: "featured",
                        articleId,
                    },
                });
            } catch (dbErr) {
                console.warn("Failed to save image to DB:", dbErr);
            }
        }

        console.log(`✅ Image workflow complete: ${imagesEmbedded} images embedded`);

        return NextResponse.json({
            success: true,
            content,
            images: [
                ...(validFeatured ? [{ ...validFeatured, type: "featured" }] : []),
                ...validInline.map((img, i) => ({ ...img, type: "inline", index: i })),
            ],
            imagesEmbedded,
        });

    } catch (error: any) {
        console.error("Image Generate Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate images" },
            { status: 500 }
        );
    }
}
