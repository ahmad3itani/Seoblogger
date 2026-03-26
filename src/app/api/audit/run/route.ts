import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { syncBloggerPosts, getPost, getBloggerClient } from "@/lib/blogger-api";
import { analyzeAdSenseReadiness } from "@/lib/ai/adsense/engine";

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        // Get user's default blog
        const blog = await prisma.blog.findFirst({
            where: { userId: userId, isDefault: true }
        });

        if (!blog) {
            return NextResponse.json({ error: "No default blog found. Please connect your Blogger account in Settings and set a default blog." }, { status: 400 });
        }

        const blogger = await getBloggerClient(userId);

        // 1. Fetch total published posts from Blogger directly to get an accurate count
        let totalPosts = 0;
        try {
            const postsResponse = await blogger.posts.list({
                blogId: blog.blogId,
                status: ["LIVE"],
                maxResults: 50, // Get top 50
                fetchBodies: false,
            });
            totalPosts = postsResponse.data.items?.length || 0;
            // The API sometimes returns totalItems, but max 50 is fine to trigger the "volume" check (>= 15 required)
        } catch (e) {
            console.error("Failed to fetch blog post count:", e);
        }

        // 2. Fetch pages to check for Required Pages (Privacy, Contact, About)
        let hasAbout = false;
        let hasContact = false;
        let hasPrivacy = false;

        try {
            const pagesResponse = await blogger.pages.list({ blogId: blog.blogId });
            const pages = pagesResponse.data.items || [];
            
            for (const p of pages) {
                const titleLower = (p.title || "").toLowerCase();
                const urlLower = (p.url || "").toLowerCase();
                
                if (titleLower.includes("about") || urlLower.includes("about")) hasAbout = true;
                if (titleLower.includes("contact") || urlLower.includes("contact")) hasContact = true;
                if (titleLower.includes("privacy") || urlLower.includes("privacy")) hasPrivacy = true;
            }
        } catch (e) {
            console.error("Failed to fetch blog pages:", e);
        }

        // 3. Sync recent posts to CachedPost
        try {
            await syncBloggerPosts(userId, blog.blogId, 20);
        } catch (e) {
            console.error("Failed to sync posts before audit:", e);
        }

        // Fetch the recent cached posts
        const posts = await prisma.cachedPost.findMany({
            where: { blogId: blog.blogId },
            orderBy: { publishedAt: 'desc' },
            take: 10,
        });

        if (posts.length === 0) {
            return NextResponse.json({ error: "No posts found to analyze on this blog." }, { status: 400 });
        }

        const issues: any[] = [];
        let score = 100;
        const analyzePostsInput: any[] = [];

        for (const post of posts) {
            try {
                const fullPost = await getPost(userId, blog.blogId, post.postId);
                const html = fullPost.content || "";

                // Remove HTML tags for word count
                const textOnly = html.replace(/<[^>]*>?/gm, ' ');
                const wordCount = textOnly.split(/\s+/).filter(w => w.trim().length > 0).length;

                // Add to AdSense analysis payload
                analyzePostsInput.push({
                    title: post.title,
                    url: post.url,
                    wordCount: wordCount,
                });

                // Thin content check
                if (wordCount < 400) {
                    issues.push({
                        type: "Thin Content",
                        severity: "high",
                        message: `Post has very thin content (${wordCount} words). Recommended >= 800 words.`,
                        postId: post.postId,
                        postTitle: post.title,
                        postUrl: post.url
                    });
                    score -= 5;
                } else if (wordCount < 800) {
                    issues.push({
                        type: "Short Content",
                        severity: "medium",
                        message: `Post is slightly short (${wordCount} words). Expand for better SEO depth.`,
                        postId: post.postId,
                        postTitle: post.title,
                        postUrl: post.url
                    });
                    score -= 2;
                }

                // Headings check
                const hasH2 = /<h2/i.test(html);
                if (!hasH2) {
                    issues.push({
                        type: "Missing Headings (H2)",
                        severity: "high",
                        message: `Post is missing H2 headings. Use headings to properly structure your content for Google.`,
                        postId: post.postId,
                        postTitle: post.title,
                        postUrl: post.url
                    });
                    score -= 4;
                }

                // Images check
                const hasImages = /<img/i.test(html);
                if (!hasImages) {
                    issues.push({
                        type: "Missing Images",
                        severity: "medium",
                        message: `Post has no images. Visuals significantly improve engagement and reduce bounce rate.`,
                        postId: post.postId,
                        postTitle: post.title,
                        postUrl: post.url
                    });
                    score -= 2;
                }

                // Title length check
                if (post.title.length < 20) {
                    issues.push({
                        type: "Short Title",
                        severity: "low",
                        message: `Title is very short (${post.title.length} chars). Aim for 50-60 characters with strong keywords.`,
                        postId: post.postId,
                        postTitle: post.title,
                        postUrl: post.url
                    });
                    score -= 1;
                }

            } catch (e) {
                console.error(`Failed to analyze post ${post.postId}`, e);
            }
        }

        // Ensure score is between 0 and 100
        score = Math.max(0, Math.min(100, score));

        // 4. Run AdSense Analysis
        const adsenseResult = await analyzeAdSenseReadiness(analyzePostsInput, {
            hasAbout,
            hasContact,
            hasPrivacy,
            topCategories: [], // Extracted from posts generally if labels exist, leaving empty tells AI to warn if no clear categories.
            totalPosts,
            hasNavigation: true // We assume true for Blogger default templates unless we crawl the homepage explicitly.
        });

        // 5. Save unified audit results
        const audit = await prisma.siteAudit.create({
            data: {
                blogId: blog.id,
                score: score,
                issues: issues,
                adsenseScore: adsenseResult.adsense_score,
                adsenseStatus: adsenseResult.status,
                adsenseData: {
                    issues: adsenseResult.issues,
                    recommendations: adsenseResult.recommendations
                } as any
            }
        });

        return NextResponse.json({ success: true, audit });
    } catch (error) {
        console.error("Audit run error:", error);
        return NextResponse.json({ error: "Failed to run audit" }, { status: 500 });
    }
}
