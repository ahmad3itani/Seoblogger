import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPost, updatePost, publishPost } from "@/lib/blogger";
import { getValidAccessToken } from "@/lib/google";
import { requireAuth } from "@/lib/supabase/auth-helpers";

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const { articleId, blogId, action = "draft" } = await req.json();

        const user = await prisma.user.findUnique({
            where: { id: authUser.id },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const article = await prisma.article.findFirst({
            where: { id: articleId, userId: authUser.id },
        });

        if (!article) {
            return NextResponse.json(
                { error: "Article not found" },
                { status: 404 }
            );
        }

        const effectiveBlogId = blogId || article.blogId;

        if (!effectiveBlogId) {
            return NextResponse.json(
                { error: "No blog selected for this article. Please select a blog in settings or the article editor." },
                { status: 400 }
            );
        }

        const blog = await prisma.blog.findFirst({
            where: { id: effectiveBlogId, userId: authUser.id },
        });

        if (!blog) {
            return NextResponse.json({ error: "Blog not found or unauthorized" }, { status: 404 });
        }

        // Get valid access token
        let accessToken;
        try {
            accessToken = await getValidAccessToken(user.id);
        } catch (error: any) {
            if (error.message === "NEEDS_RECONNECT") {
                return NextResponse.json({ error: "Session expired. Please reconnect Google Account in settings." }, { status: 401 });
            }
            return NextResponse.json(
                { error: "Google account not connected" },
                { status: 400 }
            );
        }

        let bloggerPost;

        switch (action) {
            case "draft": {
                bloggerPost = await createPost(
                    blog.blogId,
                    {
                        title: article.title,
                        content: article.content,
                        labels: article.labels?.split(",").map((l: any) => l.trim()) || [],
                        isDraft: true,
                    },
                    accessToken
                );

                await prisma.article.update({
                    where: { id: articleId },
                    data: {
                        status: "draft",
                        bloggerPostId: bloggerPost.id,
                        blogId: blog.id,
                    },
                });
                break;
            }

            case "publish": {
                if (article.bloggerPostId) {
                    // Already exists as draft — publish it
                    bloggerPost = await publishPost(
                        blog.blogId,
                        article.bloggerPostId,
                        accessToken
                    );
                } else {
                    // Create and publish in one step
                    bloggerPost = await createPost(
                        blog.blogId,
                        {
                            title: article.title,
                            content: article.content,
                            labels: article.labels?.split(",").map((l: any) => l.trim()) || [],
                            isDraft: false,
                        },
                        accessToken
                    );
                }

                await prisma.article.update({
                    where: { id: articleId },
                    data: {
                        status: "published",
                        bloggerPostId: bloggerPost.id,
                        blogId: blog.id,
                    },
                });
                break;
            }

            case "update": {
                if (!article.bloggerPostId) {
                    return NextResponse.json(
                        { error: "Article not published to Blogger yet" },
                        { status: 400 }
                    );
                }

                bloggerPost = await updatePost(
                    blog.blogId,
                    article.bloggerPostId,
                    {
                        title: article.title,
                        content: article.content,
                        labels: article.labels?.split(",").map((l: any) => l.trim()) || [],
                    },
                    accessToken
                );

                await prisma.article.update({
                    where: { id: articleId },
                    data: { status: "published" },
                });
                break;
            }

            default:
                return NextResponse.json(
                    { error: "Invalid action" },
                    { status: 400 }
                );
        }

        // Log publish action
        await prisma.publishLog.create({
            data: {
                action,
                bloggerPostId: bloggerPost?.id,
                blogId: blog.id,
                articleId: article.id,
                response: JSON.stringify(bloggerPost),
            },
        });

        return NextResponse.json({
            success: true,
            action,
            post: bloggerPost,
        });
    } catch (error) {
        console.error("Publish API error:", error);
        return NextResponse.json(
            { error: "Publishing failed. Please try again." },
            { status: 500 }
        );
    }
}
