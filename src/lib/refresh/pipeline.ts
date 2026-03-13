/**
 * Content Refresh Detection Pipeline
 * 
 * Orchestrates the full candidate detection flow:
 * 1. Fetch all Blogger posts (with bodies)
 * 2. Fetch Search Console page metrics (if connected)
 * 3. Crawl public pages for content signals
 * 4. Run content diagnosis on each post
 * 5. Compute refresh scores
 * 6. Rank and tier candidates
 * 7. Save to database
 */

import { prisma } from "@/lib/prisma";
import { getBloggerClient } from "@/lib/blogger-api";
import { getValidAccessToken } from "@/lib/google";
import { fetchAllPagePerformance, fetchPageTopQueries } from "./gsc-metrics";
import { diagnoseContent } from "./diagnosis";
import { computeRefreshScore, type RefreshScoreInput } from "./scoring";
import { crawlPage } from "@/lib/seo/crawler";

export interface PipelineResult {
    candidatesFound: number;
    tier1Count: number;
    tier2Count: number;
    tier3Count: number;
    blogPostsScanned: number;
    gscConnected: boolean;
    durationMs: number;
}

interface BloggerPost {
    id: string;
    title: string;
    url: string;
    published: string;
    updated: string;
    labels?: string[];
    content: string;
}

/**
 * Run the full refresh candidate detection pipeline.
 */
export async function runRefreshPipeline(
    userId: string,
    blogId: string, // Database blog ID
    bloggerBlogId: string, // Blogger platform blog ID
    siteUrl: string,
    options?: { maxPosts?: number; skipGsc?: boolean }
): Promise<PipelineResult> {
    const start = Date.now();
    const maxPosts = options?.maxPosts || 100;

    console.log(`🔄 Refresh pipeline starting for ${siteUrl}`);

    // ── Step 1: Fetch all Blogger posts with bodies ──
    const posts = await fetchBloggerPosts(userId, bloggerBlogId, maxPosts);
    console.log(`📝 Fetched ${posts.length} posts from Blogger`);

    if (posts.length === 0) {
        return { candidatesFound: 0, tier1Count: 0, tier2Count: 0, tier3Count: 0, blogPostsScanned: 0, gscConnected: false, durationMs: Date.now() - start };
    }

    // ── Step 2: Fetch Search Console metrics (if available) ──
    let gscConnected = false;
    let performanceMap = new Map<string, Awaited<ReturnType<typeof fetchAllPagePerformance>>[number]>();

    if (!options?.skipGsc) {
        try {
            const accessToken = await getValidAccessToken(userId);
            const pagePerformance = await fetchAllPagePerformance(accessToken, siteUrl);
            gscConnected = true;
            for (const p of pagePerformance) {
                performanceMap.set(normalizeUrl(p.url), p);
            }
            console.log(`📊 GSC data loaded for ${pagePerformance.length} pages`);
        } catch (err: any) {
            console.log(`⚠️ GSC not available: ${err.message}`);
        }
    }

    // ── Step 3+4+5: Crawl, diagnose, score each post ──
    const candidates: Array<{
        post: BloggerPost;
        diagnosis: Awaited<ReturnType<typeof diagnoseContent>>;
        score: Awaited<ReturnType<typeof computeRefreshScore>>;
        perf: typeof performanceMap extends Map<string, infer V> ? V | null : null;
        topQueries: { query: string; clicks: number; impressions: number; position: number }[];
    }> = [];

    for (const post of posts) {
        try {
            // Crawl the public page for content signals
            const baseUrl = siteUrl.replace(/\/$/, "");
            const crawled = await crawlPage(post.url, baseUrl);

            // Fetch top queries for this specific page if GSC is connected
            let topQueries: { query: string; clicks: number; impressions: number; position: number }[] = [];
            if (gscConnected) {
                try {
                    const accessToken = await getValidAccessToken(userId);
                    topQueries = await fetchPageTopQueries(accessToken, siteUrl, post.url);
                } catch { /* ignore per-page query failures */ }
            }

            // Run content diagnosis
            const diagnosis = diagnoseContent({
                title: post.title,
                bodyHtml: post.content,
                url: post.url,
                publishedAt: post.published ? new Date(post.published) : null,
                topQueries,
            });

            // Build scoring input
            const perf = performanceMap.get(normalizeUrl(post.url)) || null;
            const outdatedSignals = diagnosis.outdatedSignals;

            const scoreInput: RefreshScoreInput = {
                clicksLast28: perf?.clicksLast28 ?? null,
                clicksPrev28: perf?.clicksPrev28 ?? null,
                impressionsLast28: perf?.impressionsLast28 ?? null,
                impressionsPrev28: perf?.impressionsPrev28 ?? null,
                ctrLast28: perf?.ctrLast28 ?? null,
                avgPositionLast28: perf?.avgPositionLast28 ?? null,
                wordCount: diagnosis.wordCount,
                h2Count: diagnosis.headings.filter((h) => h.tag === "h2").length,
                internalLinks: diagnosis.internalLinkCount,
                hasFaq: diagnosis.hasFaq,
                hasSchema: diagnosis.hasSchema,
                imagesCount: diagnosis.imageCount,
                publishedAt: post.published ? new Date(post.published) : null,
                outdatedSignals,
                indexedStatus: crawled.statusCode === 200 ? "indexed" : "unknown",
                statusCode: crawled.statusCode,
            };

            const score = computeRefreshScore(scoreInput);

            // Only save candidates with a meaningful score
            if (score.totalScore >= 15) {
                candidates.push({ post, diagnosis, score, perf, topQueries });
            }
        } catch (err) {
            console.error(`Failed to process post ${post.url}:`, err);
        }
    }

    console.log(`🎯 Found ${candidates.length} refresh candidates`);

    // ── Step 6: Save to database ──
    for (const c of candidates) {
        const perf = c.perf;

        await prisma.refreshCandidate.upsert({
            where: { blogId_postId: { blogId, postId: c.post.id } },
            update: {
                title: c.post.title,
                url: c.post.url,
                publishedAt: c.post.published ? new Date(c.post.published) : null,
                labels: c.post.labels?.join(", ") || null,
                refreshScore: c.score.totalScore,
                tier: c.score.tier,
                tierLabel: c.score.tierLabel,
                clicksLast28: perf?.clicksLast28 ?? null,
                clicksPrev28: perf?.clicksPrev28 ?? null,
                impressionsLast28: perf?.impressionsLast28 ?? null,
                impressionsPrev28: perf?.impressionsPrev28 ?? null,
                ctrLast28: perf?.ctrLast28 ?? null,
                avgPositionLast28: perf?.avgPositionLast28 ?? null,
                wordCount: c.diagnosis.wordCount,
                h2Count: c.diagnosis.headings.filter((h) => h.tag === "h2").length,
                internalLinks: c.diagnosis.internalLinkCount,
                externalLinks: c.diagnosis.externalLinkCount,
                imagesCount: c.diagnosis.imageCount,
                missingAltCount: 0,
                hasFaq: c.diagnosis.hasFaq,
                hasSchema: c.diagnosis.hasSchema,
                reasonSummary: c.score.reasons.slice(0, 5).join(" • "),
                status: "detected",
            },
            create: {
                userId,
                blogId,
                postId: c.post.id,
                title: c.post.title,
                url: c.post.url,
                publishedAt: c.post.published ? new Date(c.post.published) : null,
                labels: c.post.labels?.join(", ") || null,
                refreshScore: c.score.totalScore,
                tier: c.score.tier,
                tierLabel: c.score.tierLabel,
                clicksLast28: perf?.clicksLast28 ?? null,
                clicksPrev28: perf?.clicksPrev28 ?? null,
                impressionsLast28: perf?.impressionsLast28 ?? null,
                impressionsPrev28: perf?.impressionsPrev28 ?? null,
                ctrLast28: perf?.ctrLast28 ?? null,
                avgPositionLast28: perf?.avgPositionLast28 ?? null,
                wordCount: c.diagnosis.wordCount,
                h2Count: c.diagnosis.headings.filter((h) => h.tag === "h2").length,
                internalLinks: c.diagnosis.internalLinkCount,
                externalLinks: c.diagnosis.externalLinkCount,
                imagesCount: c.diagnosis.imageCount,
                missingAltCount: 0,
                hasFaq: c.diagnosis.hasFaq,
                hasSchema: c.diagnosis.hasSchema,
                reasonSummary: c.score.reasons.slice(0, 5).join(" • "),
                status: "detected",
            },
        });

        // Save diagnosis
        const candidateRecord = await prisma.refreshCandidate.findUnique({
            where: { blogId_postId: { blogId, postId: c.post.id } },
        });

        if (candidateRecord) {
            await prisma.refreshDiagnostic.upsert({
                where: { candidateId: candidateRecord.id },
                update: {
                    performanceOpportunity: c.score.breakdown.performanceOpportunity,
                    declineSignal: c.score.breakdown.declineSignal,
                    contentWeakness: c.score.breakdown.contentWeakness,
                    freshnessAge: c.score.breakdown.freshnessAge,
                    indexConfidence: c.score.breakdown.indexConfidence,
                    introQuality: c.diagnosis.introQuality,
                    headingStructure: c.diagnosis.headingStructure,
                    faqPresent: c.diagnosis.faqPresent,
                    conclusionPresent: c.diagnosis.conclusionPresent,
                    snippetReadiness: c.diagnosis.snippetReadiness,
                    missingSubtopics: c.diagnosis.missingSubtopics,
                    outdatedSignals: c.diagnosis.outdatedSignals,
                    thinSections: c.diagnosis.thinSections,
                    internalLinkOpportunity: c.diagnosis.internalLinkOpportunity,
                    topQueries: c.topQueries,
                },
                create: {
                    candidateId: candidateRecord.id,
                    performanceOpportunity: c.score.breakdown.performanceOpportunity,
                    declineSignal: c.score.breakdown.declineSignal,
                    contentWeakness: c.score.breakdown.contentWeakness,
                    freshnessAge: c.score.breakdown.freshnessAge,
                    indexConfidence: c.score.breakdown.indexConfidence,
                    introQuality: c.diagnosis.introQuality,
                    headingStructure: c.diagnosis.headingStructure,
                    faqPresent: c.diagnosis.faqPresent,
                    conclusionPresent: c.diagnosis.conclusionPresent,
                    snippetReadiness: c.diagnosis.snippetReadiness,
                    missingSubtopics: c.diagnosis.missingSubtopics,
                    outdatedSignals: c.diagnosis.outdatedSignals,
                    thinSections: c.diagnosis.thinSections,
                    internalLinkOpportunity: c.diagnosis.internalLinkOpportunity,
                    topQueries: c.topQueries,
                },
            });
        }
    }

    const tier1 = candidates.filter((c) => c.score.tier === 1).length;
    const tier2 = candidates.filter((c) => c.score.tier === 2).length;
    const tier3 = candidates.filter((c) => c.score.tier === 3).length;

    console.log(`✅ Pipeline complete: ${tier1} tier-1, ${tier2} tier-2, ${tier3} tier-3`);

    return {
        candidatesFound: candidates.length,
        tier1Count: tier1,
        tier2Count: tier2,
        tier3Count: tier3,
        blogPostsScanned: posts.length,
        gscConnected,
        durationMs: Date.now() - start,
    };
}

// ─── Helpers ─────────────────────────────────────────────────────

async function fetchBloggerPosts(userId: string, bloggerBlogId: string, maxPosts: number): Promise<BloggerPost[]> {
    const blogger = await getBloggerClient(userId);
    const allPosts: BloggerPost[] = [];
    let pageToken: string | undefined;

    try {
        do {
            const response: any = await blogger.posts.list({
                blogId: bloggerBlogId,
                maxResults: Math.min(maxPosts - allPosts.length, 50),
                status: ["LIVE"],
                fetchBodies: true,
                pageToken,
            });

            const items = response.data.items || [];
            for (const post of items) {
                if (!post.id || !post.title || !post.url) continue;
                allPosts.push({
                    id: post.id,
                    title: post.title,
                    url: post.url,
                    published: post.published || "",
                    updated: post.updated || "",
                    labels: post.labels || [],
                    content: post.content || "",
                });
            }

            pageToken = response.data.nextPageToken;
        } while (pageToken && allPosts.length < maxPosts);
    } catch (error) {
        console.error("Error fetching Blogger posts:", error);
    }

    return allPosts;
}

function normalizeUrl(url: string): string {
    try {
        const u = new URL(url);
        return u.origin + u.pathname.replace(/\/$/, "");
    } catch {
        return url.replace(/\/$/, "").toLowerCase();
    }
}
