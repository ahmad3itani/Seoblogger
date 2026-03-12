import { NextResponse } from "next/server";
import { crawlPage, fetchSitemapUrls } from "@/lib/seo/crawler";
import { analyzePageSeo } from "@/lib/seo/rules";
import { fetchPageSpeedMetrics } from "@/lib/seo/pagespeed";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow Vercel to run up to 60s for this route

export async function POST(req: Request) {
    try {
        const { blogUrl } = await req.json();

        if (!blogUrl) {
            return NextResponse.json({ success: false, error: "Missing blogUrl" }, { status: 400 });
        }

        // Validate basic URL shape
        let parsedUrl;
        try {
            parsedUrl = new URL(blogUrl);
        } catch (e) {
            return NextResponse.json({ success: false, error: "Invalid URL format" }, { status: 400 });
        }

        const maxPages = 5; // Free scan limit
        let urlsToCrawl = await fetchSitemapUrls(parsedUrl.origin);
        
        if (urlsToCrawl.length === 0) {
            urlsToCrawl = [parsedUrl.origin];
        }

        urlsToCrawl = urlsToCrawl.slice(0, maxPages);

        let totalScoreSum = 0;
        let pagesScannedCount = 0;
        const scannedPages = [];

        for (const url of urlsToCrawl) {
            // 1. Crawl HTML
            const pageData = await crawlPage(url, parsedUrl.origin);

            // 2. Fetch Core Web Vitals for homepage
            let pagespeed = null;
            if (pagesScannedCount === 0) {
                pagespeed = await fetchPageSpeedMetrics(url, "mobile");
            }

            // 3. Rules Engine
            const { score, issues } = analyzePageSeo(pageData, pagespeed);

            totalScoreSum += score;
            pagesScannedCount++;

            scannedPages.push({
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
                issues: issues.map(i => ({
                    id: Math.random().toString(36).substring(7),
                    ...i,
                    suggestion: null
                }))
            });
        }

        const avgScore = pagesScannedCount > 0 ? Math.round(totalScoreSum / pagesScannedCount) : 0;

        const session = {
            id: `free-scan-${Date.now()}`,
            blogId: "public",
            status: "completed",
            pagesScanned: pagesScannedCount,
            totalScore: avgScore,
            scannedPages,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString()
        };

        return NextResponse.json({
            success: true,
            session
        });

    } catch (error: any) {
        console.error("Public Audit Error:", error);
        return NextResponse.json({ success: false, error: error.message || "Failed to run public audit" }, { status: 500 });
    }
}
