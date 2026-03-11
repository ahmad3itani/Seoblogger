import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { syncBloggerPosts, getPost } from "@/lib/blogger-api";

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

        // Sync recent posts to CachedPost
        try {
            await syncBloggerPosts(userId, blog.blogId, 20);
        } catch (e) {
            console.error("Failed to sync posts before audit:", e);
            // We can continue if we already have cached posts
        }

        // Fetch the recent cached posts
        const posts = await prisma.cachedPost.findMany({
            where: { blogId: blog.blogId },
            orderBy: { publishedAt: 'desc' },
            take: 10, // Analyze up to 10 recent posts to avoid timeouts
        });

        if (posts.length === 0) {
            return NextResponse.json({ error: "No posts found to analyze on this blog." }, { status: 400 });
        }

        const issues: any[] = [];
        let score = 100;

        for (const post of posts) {
            try {
                const fullPost = await getPost(userId, blog.blogId, post.postId);
                const html = fullPost.content || "";

                // Remove HTML tags for word count
                const textOnly = html.replace(/<[^>]*>?/gm, ' ');
                const wordCount = textOnly.split(/\s+/).filter(w => w.trim().length > 0).length;

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

        // Save audit results
        const audit = await prisma.siteAudit.create({
            data: {
                blogId: blog.id,
                score: score,
                issues: issues,
            }
        });

        return NextResponse.json({ success: true, audit });
    } catch (error) {
        console.error("Audit run error:", error);
        return NextResponse.json({ error: "Failed to run audit" }, { status: 500 });
    }
}
