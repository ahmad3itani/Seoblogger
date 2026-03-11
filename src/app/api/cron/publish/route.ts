import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateTitles, generateOutline, generateArticle, generateMeta, generateFAQ, type GenerationOptions } from "@/lib/ai/generate";
import { formatForBlogger, generateFaqHtml } from "@/lib/formatter";
import { createPost } from "@/lib/blogger";
import { getValidAccessToken } from "@/lib/google";

// This endpoint should be triggered by Vercel Cron
export async function GET(req: Request) {
    try {
        // Authenticate the cron job - ALWAYS require secret
        const authHeader = req.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return new Response("Unauthorized", { status: 401 });
        }

        const now = new Date();

        // 1. Find all active campaigns that are due
        const dueCampaigns = await prisma.campaign.findMany({
            where: {
                status: "active",
                nextPublishAt: { lte: now },
            },
            include: {
                user: true
            }
        });

        if (dueCampaigns.length === 0) {
            return NextResponse.json({ message: "No campaigns due for publishing." });
        }

        const results = [];

        // 2. Process each campaign
        for (const campaign of dueCampaigns) {
            try {
                const keywordList = campaign.keywords.split("\n").map(k => k.trim()).filter(Boolean);

                if (keywordList.length === 0) {
                    await prisma.campaign.update({
                        where: { id: campaign.id },
                        data: { status: "completed" },
                    });
                    results.push({ campaignId: campaign.id, status: "completed" });
                    continue;
                }

                const currentKeyword = keywordList[0];
                const newKeywords = keywordList.slice(1).join("\n");

                console.log(`[CRON] Processing campaign ${campaign.name} - Keyword: ${currentKeyword}`);

                // Fetch Google token safely with refresh logic
                let accessToken;
                try {
                    accessToken = await getValidAccessToken(campaign.user.id);
                } catch (error: any) {
                    throw new Error("Google account not linked or session expired (needs reconnect)");
                }

                const options: GenerationOptions = {
                    keyword: currentKeyword,
                    language: campaign.language,
                    tone: campaign.tone,
                    articleType: campaign.articleType,
                    wordCount: campaign.wordCount,
                    brandVoice: campaign.brandVoice || undefined,
                };

                // Generate pipeline
                const titles = await generateTitles(options);
                let title = titles[0]?.replace(/["']/g, "") || `Article about ${currentKeyword}`;

                const outline = await generateOutline(title, options);
                const rawBody = await generateArticle(title, outline, options);
                const meta = await generateMeta(title, rawBody);
                const faqs = await generateFAQ(currentKeyword, rawBody);

                // Format HTML
                let fullContent = rawBody;
                if (faqs.length > 0) {
                    fullContent += generateFaqHtml(faqs);
                }
                
                const htmlContent = formatForBlogger(
                    fullContent,
                    {
                        includeToc: true,
                    }
                );

                // Publish to Blogger (as draft or live)
                // Assuming campaigns publish immediately, or maybe read a setting. We'll publish as Draft for safety in this version.
                const blogData = await prisma.blog.findUnique({ where: { id: campaign.blogId } });
                if (!blogData) {
                    throw new Error("Blog not found");
                }
                
                const postResponse = await createPost(blogData.blogId, {
                    title,
                    content: htmlContent,
                    labels: [...(outline.suggestedLabels || []), "AI-Generated", "Campaign"],
                    isDraft: true, // Safe default
                }, accessToken);

                // Save article to DB
                const article = await prisma.article.create({
                    data: {
                        title: title,
                        content: htmlContent,
                        outline: JSON.stringify(outline),
                        metaDescription: meta.metaDescription,
                        excerpt: meta.excerpt,
                        labels: [...(outline.suggestedLabels || []), "AI-Generated", "Campaign"].join(","),
                        tone: campaign.tone,
                        articleType: campaign.articleType,
                        wordCount: campaign.wordCount,
                        status: "published",
                        bloggerPostId: postResponse.id || null,
                        blogId: campaign.blogId,
                    }
                });

                // Log it
                await prisma.publishLog.create({
                    data: {
                        action: "publish",
                        blogId: blogData.blogId,
                        articleId: article.id,
                        bloggerPostId: postResponse.id || null,
                        response: JSON.stringify(postResponse),
                    }
                });

                // Update campaign schedule queue
                const nextRun = new Date(now.getTime() + (campaign.frequencyDays * 24 * 60 * 60 * 1000));

                await prisma.campaign.update({
                    where: { id: campaign.id },
                    data: {
                        keywords: newKeywords,
                        nextPublishAt: nextRun,
                        status: newKeywords.length === 0 ? "completed" : "active",
                    }
                });

                results.push({ campaignId: campaign.id, keyword: currentKeyword, status: "success" });
            } catch (campErr: any) {
                console.error(`Error processing campaign ${campaign.id}:`, campErr);
                results.push({ campaignId: campaign.id, status: "error", error: campErr.message });
            }
        }

        return NextResponse.json({ processed: results });
    } catch (error: any) {
        console.error("Cron Execution Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
