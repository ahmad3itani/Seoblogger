import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { fetchSitemapUrls, crawlPage } from "@/lib/seo/crawler";
import { detectIssues } from "@/lib/seo/detect";
import { computeSiteScore, prioritizeIssues, computePageScores } from "@/lib/seo/scoring";
import type { DetectedIssue } from "@/lib/seo/issues";

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const { blogId } = await req.json();

        // Get user's blog
        const blog = blogId
            ? await prisma.blog.findFirst({ where: { id: blogId, userId: authUser.id } })
            : await prisma.blog.findFirst({ where: { userId: authUser.id, isDefault: true } })
              || await prisma.blog.findFirst({ where: { userId: authUser.id } });

        if (!blog) {
            return NextResponse.json({ error: "No blog connected" }, { status: 400 });
        }

        // Check rate limit AFTER validating blog exists
        const rl = checkRateLimit(`pro-scan:${authUser.id}`, 2, 300_000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` },
                { status: 429 }
            );
        }

        const scanStart = Date.now();
        const baseUrl = blog.url.replace(/\/$/, "");

        console.log(`🔍 Pro Scan starting for ${baseUrl}`);

        // Step 1: Discover all URLs from sitemap
        let urls = await fetchSitemapUrls(baseUrl);
        if (urls.length === 0) {
            // Fallback: try with /sitemap.xml variations
            urls = await fetchSitemapUrls(baseUrl + "/");
        }

        // Limit pages to prevent abuse
        const maxPages = 50;
        if (urls.length > maxPages) {
            urls = urls.slice(0, maxPages);
        }

        if (urls.length === 0) {
            return NextResponse.json({
                error: "Could not find any pages. Make sure your blog has a sitemap.xml.",
            }, { status: 400 });
        }

        console.log(`📄 Found ${urls.length} URLs to scan`);

        // Step 2: Crawl all pages
        const crawledPages = [];
        for (const url of urls) {
            try {
                const pageData = await crawlPage(url, baseUrl);
                crawledPages.push(pageData);
            } catch (err) {
                console.error(`Failed to crawl ${url}:`, err);
            }
        }

        console.log(`✅ Crawled ${crawledPages.length} pages`);

        // Step 3: Detect issues for each page using the taxonomy
        const allIssues: DetectedIssue[] = [];
        for (const page of crawledPages) {
            const pageIssues = detectIssues(page, crawledPages);
            allIssues.push(...pageIssues);
        }

        console.log(`🐛 Detected ${allIssues.length} total issues`);

        // Step 4: Compute scores
        const siteScore = computeSiteScore(allIssues, crawledPages.length);
        const prioritized = prioritizeIssues(allIssues);
        const pageScores = computePageScores(allIssues);

        const scanDuration = Date.now() - scanStart;

        // Step 5: Get previous scan for comparison
        const previousScan = await prisma.scanReport.findFirst({
            where: { userId: authUser.id, blogId: blog.id },
            orderBy: { createdAt: "desc" },
        });

        // Count new vs fixed issues compared to previous scan
        let newIssueCount = 0;
        let fixedIssueCount = 0;
        if (previousScan) {
            const prevSummary = previousScan.issuesSummary as any[];
            const prevIssueIds = new Set(prevSummary.map((i: any) => `${i.definitionId}:${i.pageUrl}`));
            const currentIssueIds = new Set(allIssues.map((i) => `${i.definitionId}:${i.pageUrl}`));

            for (const id of currentIssueIds) {
                if (!prevIssueIds.has(id)) newIssueCount++;
            }
            for (const id of prevIssueIds) {
                if (!currentIssueIds.has(id)) fixedIssueCount++;
            }
        }

        // Step 6: Save scan report
        const categoryScoresObj: Record<string, number> = {};
        for (const cat of siteScore.categories) {
            categoryScoresObj[cat.category] = cat.score;
        }

        const issuesSummary = allIssues.map((i) => ({
            definitionId: i.definitionId,
            pageUrl: i.pageUrl,
            severity: i.severity,
            category: i.category,
        }));

        await prisma.scanReport.create({
            data: {
                userId: authUser.id,
                blogId: blog.id,
                blogUrl: baseUrl,
                overallScore: siteScore.overall,
                grade: siteScore.grade,
                pagesScanned: crawledPages.length,
                totalIssues: allIssues.length,
                criticalIssues: siteScore.criticalIssues,
                fixableIssues: siteScore.fixableIssues,
                categoryScores: categoryScoresObj,
                issuesSummary: issuesSummary,
                newIssues: newIssueCount,
                fixedIssues: fixedIssueCount,
                scanDurationMs: scanDuration,
            },
        });

        console.log(`💾 Scan report saved. Score: ${siteScore.overall}/100 (${siteScore.grade})`);

        // Step 7: Return structured results
        return NextResponse.json({
            success: true,
            score: siteScore,
            issues: prioritized.slice(0, 100), // Top 100 prioritized issues
            pageScores: pageScores.slice(0, 50),
            quickWins: prioritized.filter((i) => i.priorityLabel === "quick_win").slice(0, 10),
            highestImpact: prioritized.filter((i) => i.priorityLabel === "highest_impact").slice(0, 10),
            comparison: previousScan ? {
                previousScore: previousScan.overallScore,
                previousGrade: previousScan.grade,
                scoreDelta: siteScore.overall - previousScan.overallScore,
                newIssues: newIssueCount,
                fixedIssues: fixedIssueCount,
                previousScanDate: previousScan.completedAt,
            } : null,
            meta: {
                pagesScanned: crawledPages.length,
                scanDurationMs: scanDuration,
                blogUrl: baseUrl,
                scanDate: new Date().toISOString(),
            },
        });

    } catch (error: any) {
        console.error("Pro Scan Error:", error);
        return NextResponse.json(
            { error: error.message || "Scan failed" },
            { status: 500 }
        );
    }
}
