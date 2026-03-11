import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/supabase/auth-helpers";

export async function GET(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status"); // draft, published, all
        const search = searchParams.get("search");
        const blogId = searchParams.get("blogId");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {
            userId: userId,
        };

        if (status && status !== "all") {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { title: { contains: search, mode: "insensitive" } },
                { excerpt: { contains: search, mode: "insensitive" } },
                { labels: { contains: search, mode: "insensitive" } },
            ];
        }

        if (blogId) {
            where.blogId = blogId;
        }

        // Fetch articles with pagination
        const [articles, totalCount] = await Promise.all([
            prisma.article.findMany({
                where,
                orderBy: {
                    createdAt: "desc",
                },
                skip,
                take: limit,
                select: {
                    id: true,
                    title: true,
                    excerpt: true,
                    status: true,
                    wordCount: true,
                    labels: true,
                    tone: true,
                    articleType: true,
                    createdAt: true,
                    updatedAt: true,
                    scheduledFor: true,
                    bloggerPostId: true,
                    blog: {
                        select: {
                            id: true,
                            name: true,
                            url: true,
                        },
                    },
                },
            }),
            prisma.article.count({ where }),
        ]);

        return NextResponse.json({
            articles,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
            },
        });
    } catch (error) {
        console.error("Articles fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch articles" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        const { searchParams } = new URL(req.url);
        const articleId = searchParams.get("id");

        if (!articleId) {
            return NextResponse.json(
                { error: "Article ID is required" },
                { status: 400 }
            );
        }

        // Verify ownership
        const article = await prisma.article.findFirst({
            where: {
                id: articleId,
                userId: userId,
            },
        });

        if (!article) {
            return NextResponse.json(
                { error: "Article not found or unauthorized" },
                { status: 404 }
            );
        }

        // Delete article and related data
        await prisma.$transaction([
            prisma.generatedImage.deleteMany({
                where: { articleId: articleId },
            }),
            prisma.article.delete({
                where: { id: articleId },
            }),
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Article deletion error:", error);
        return NextResponse.json(
            { error: "Failed to delete article" },
            { status: 500 }
        );
    }
}
