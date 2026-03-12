import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { prisma } from "@/lib/prisma";
import { fetchSitemapUrls, crawlPage } from "@/lib/seo/crawler";
import { fetchPageSpeedMetrics } from "@/lib/seo/pagespeed";
import { analyzePageSeo } from "@/lib/seo/rules";

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        const { blogId } = await req.json();
        if (!blogId) return NextResponse.json({ error: "Missing blogId" }, { status: 400 });

        const blog = await prisma.blog.findFirst({
            where: { blogId, userId }
        });

        if (!blog) return NextResponse.json({ error: "Blog not found" }, { status: 404 });

        // Check user plan limits later. For now, hardcode max 20 for free, 2000 for pro.
        // We'll use 20 for this demo context.
        const maxPages = 20;

        // 1. Create a new CrawlSession
        let session = await prisma.crawlSession.create({
            data: {
                blogId: blog.id,
                status: "running"
            }
        });

        // 2. We don't want to block the HTTP response for a 20-page crawl.
        // We will kick off async processing, and return success immediately so the UI can poll.
        processCrawlAsync(session.id, blog.id, blog.url, maxPages).catch(console.error);

        return NextResponse.json({
            success: true,
            sessionId: session.id,
            message: "Crawl started in the background."
        });

    } catch (error: any) {
        console.error("Full Audit Trigger Error:", error);
        return NextResponse.json({ error: error.message || "Could not start audit" }, { status: 500 });
    }
}

async function processCrawlAsync(sessionId: string, blogId: string, blogUrl: string, maxPages: number) {
    try {
        let urlsToCrawl = await fetchSitemapUrls(blogUrl);
        
        // Fallback: If sitemap fails or is empty, use the locally synced posts!
        if (urlsToCrawl.length === 0) {
            console.log("Sitemap empty or failed, falling back to CachedPost database for URLs.");
            const cachedPosts = await prisma.cachedPost.findMany({
                where: { blogId: blogId },
                take: maxPages
            });
            urlsToCrawl = cachedPosts.map(p => p.url);
            
            // Add the homepage url as well
            if (!urlsToCrawl.includes(blogUrl)) {
                 urlsToCrawl.unshift(blogUrl);
            }
        }
        
        urlsToCrawl = urlsToCrawl.slice(0, maxPages);

        let totalScoreSum = 0;
        let pagesScannedCount = 0;

        // Note: For a real production app with 2000 pages, use a queue
        // For this context, standard async loops work for ~20 limits.
        for (const url of urlsToCrawl) {
            // 1. Crawl HTML
            const pageData = await crawlPage(url, blogUrl);

            // 2. Optional: Fetch Core Web Vitals (Rate limit heavily here usually)
            // Let's only fetch CWV for the homepage to save API quota, or mock it for others
            let pagespeed = null;
            if (pagesScannedCount === 0) {
                pagespeed = await fetchPageSpeedMetrics(url, "mobile");
            }

            // 3. Rules Engine
            const { score, issues } = analyzePageSeo(pageData, pagespeed);

            totalScoreSum += score;
            pagesScannedCount++;

            // 4. Save to Database
            await prisma.scannedPage.create({
                data: {
                    sessionId,
                    url: pageData.url,
                    title: pageData.title,
                    metaDescription: pageData.metaDescription,
                    h1: pageData.h1,
                    h2Count: pageData.h2Count,
                    wordCount: pageData.wordCount,
                    internalLinks: pageData.internalLinks,
                    externalLinks: pageData.externalLinks,
                    imagesCount: pageData.imagesCount,
                    missingAltCount: pageData.missingAltCount,
                    statusCode: pageData.statusCode,
                    loadTimeMs: pageData.loadTimeMs,
                    score,
                    issues: {
                        create: issues.map(i => ({
                            type: i.type,
                            issueId: i.issueId,
                            severity: i.severity,
                            description: i.description,
                            fixable: i.fixable
                        }))
                    }
                }
            });
        }

        const avgScore = pagesScannedCount > 0 ? Math.round(totalScoreSum / pagesScannedCount) : 0;

        await prisma.crawlSession.update({
            where: { id: sessionId },
            data: {
                status: "completed",
                pagesScanned: pagesScannedCount,
                totalScore: avgScore,
                completedAt: new Date()
            }
        });

    } catch (err) {
        console.error("Background Crawl Error:", err);
        await prisma.crawlSession.update({
            where: { id: sessionId },
            data: { status: "failed", completedAt: new Date() }
        });
    }
}
