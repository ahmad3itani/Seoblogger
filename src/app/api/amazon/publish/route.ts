import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { prisma } from "@/lib/prisma";
import { createPost } from "@/lib/blogger";
import { getValidAccessToken } from "@/lib/google";

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        const { title, content, wordCount, labels, tone, blogId } = await req.json();

        if (!title || !content) {
            return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
        }

        // Find user's default blog or use provided blogId
        const blog = blogId
            ? await prisma.blog.findFirst({ where: { id: blogId, userId } })
            : await prisma.blog.findFirst({ where: { userId, isDefault: true } });

        if (!blog) {
            return NextResponse.json(
                { error: "No blog found. Please connect a blog in Settings first." },
                { status: 400 }
            );
        }

        // Get valid Google access token
        let accessToken;
        try {
            accessToken = await getValidAccessToken(userId);
        } catch (error: any) {
            if (error.message === "NEEDS_RECONNECT") {
                return NextResponse.json(
                    { error: "Session expired. Please reconnect Google Account in settings." },
                    { status: 401 }
                );
            }
            return NextResponse.json(
                { error: "Google account not connected. Please connect in Settings." },
                { status: 400 }
            );
        }

        // Create on Blogger as draft
        const bloggerPost = await createPost(
            blog.blogId,
            {
                title,
                content,
                labels: labels
                    ? labels.split(",").map((l: string) => l.trim())
                    : ["Amazon", "Affiliate", "Product Review"],
                isDraft: true,
            },
            accessToken
        );

        // Save article to local DB
        const article = await prisma.article.create({
            data: {
                title,
                content,
                wordCount: wordCount || 0,
                labels: labels || "amazon,affiliate",
                tone: tone || "professional",
                articleType: "affiliate-review",
                status: "draft",
                bloggerPostId: bloggerPost.id || null,
                blogId: blog.id,
                userId,
            },
        });

        // Log the publish action
        await prisma.publishLog.create({
            data: {
                action: "draft",
                blogId: blog.blogId,
                articleId: article.id,
                bloggerPostId: bloggerPost.id || null,
                response: JSON.stringify(bloggerPost),
            },
        });

        return NextResponse.json({
            success: true,
            article: {
                id: article.id,
                bloggerPostId: bloggerPost.id,
                bloggerUrl: bloggerPost.url,
                blogName: blog.name,
            },
        });
    } catch (error: any) {
        console.error("Amazon Publish Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to publish to Blogger" },
            { status: 500 }
        );
    }
}
