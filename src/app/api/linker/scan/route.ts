import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getBloggerClient } from "@/lib/blogger-api";
import { parsePost, buildLinkGraph } from "@/lib/linker/engine";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const maxDuration = 120; // allow up to 2 min for large blogs

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        // Rate limit: 3 scans per 5 minutes
        const rl = checkRateLimit(`linker-scan:${userId}`, 3, 300_000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` },
                { status: 429 }
            );
        }

        // Get user's default blog
        const blog = await prisma.blog.findFirst({
            where: { userId, isDefault: true },
        });

        if (!blog) {
            return NextResponse.json(
                { error: "No default blog found. Please connect a blog first." },
                { status: 400 }
            );
        }

        console.log(`🔗 Starting internal link scan for blog: ${blog.name} (${blog.url})`);

        // Fetch ALL posts with full body content from Blogger API
        const blogger = await getBloggerClient(userId);
        const allPosts: any[] = [];
        let pageToken: string | undefined;

        do {
            const response: any = await blogger.posts.list({
                blogId: blog.blogId,
                maxResults: 100,
                status: ["LIVE"],
                fetchBodies: true,
                pageToken,
            });

            const items = response.data.items || [];
            allPosts.push(...items);
            pageToken = response.data.nextPageToken;
        } while (pageToken);

        console.log(`📄 Fetched ${allPosts.length} posts with full content`);

        if (allPosts.length < 2) {
            return NextResponse.json(
                { error: "Need at least 2 published posts to find internal link opportunities." },
                { status: 400 }
            );
        }

        // Parse each post into a PageNode
        const baseUrl = blog.url.replace(/\/+$/, "");
        const pages = allPosts
            .filter((p) => p.id && p.title && p.url && p.content)
            .map((p) => parsePost(p.id, p.title, p.url, p.content, baseUrl));

        console.log(`🧩 Parsed ${pages.length} pages into graph nodes`);

        // Build the full link graph and detect opportunities
        const graph = buildLinkGraph(pages);

        console.log(
            `✅ Link graph built: ${graph.stats.totalPages} pages, ${graph.stats.totalInternalLinks} links, ${graph.opportunities.length} opportunities`
        );

        // Also sync cached posts for future use
        for (const post of allPosts) {
            if (!post.id || !post.title || !post.url) continue;
            await prisma.cachedPost.upsert({
                where: { blogId_postId: { blogId: blog.blogId, postId: post.id } },
                update: { title: post.title, url: post.url },
                create: {
                    postId: post.id,
                    blogId: blog.blogId,
                    title: post.title,
                    url: post.url,
                    publishedAt: post.published ? new Date(post.published) : new Date(),
                },
            });
        }

        return NextResponse.json({
            success: true,
            blogId: blog.blogId,
            blogUrl: blog.url,
            stats: graph.stats,
            // Return page summaries (without full HTML to keep response small)
            pages: graph.pages.map((p) => ({
                url: p.url,
                postId: p.postId,
                title: p.title,
                wordCount: p.wordCount,
                incomingCount: p.incomingCount,
                outgoingCount: p.outgoingCount,
            })),
            opportunities: graph.opportunities,
        });
    } catch (error: any) {
        console.error("Linker scan error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to scan for internal link opportunities" },
            { status: 500 }
        );
    }
}
