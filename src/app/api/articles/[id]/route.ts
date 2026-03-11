import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/supabase/auth-helpers";

export async function GET(
    req: Request,
    context: any
) {
    try {
        const { id } = await context.params;
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        const article = await prisma.article.findFirst({
            where: {
                id,
                userId,
            },
            include: {
                blog: {
                    select: {
                        id: true,
                        name: true,
                        url: true,
                        blogId: true,
                    },
                },
                images: true,
            },
        });

        if (!article) {
            return NextResponse.json(
                { error: "Article not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(article);
    } catch (error) {
        console.error("Article fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch article" },
            { status: 500 }
        );
    }
}

export async function PUT(
    req: Request,
    context: any
) {
    try {
        const { id } = await context.params;
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        const existing = await prisma.article.findFirst({
            where: { id, userId },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Article not found or unauthorized" },
                { status: 404 }
            );
        }

        const data = await req.json();

        const updated = await prisma.article.update({
            where: { id },
            data: {
                title: data.title ?? existing.title,
                content: data.content ?? existing.content,
                metaDescription: data.metaDescription ?? existing.metaDescription,
                labels: data.labels ?? existing.labels,
                status: data.status ?? existing.status,
                blogId: data.blogId ?? existing.blogId,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Article update error:", error);
        return NextResponse.json(
            { error: "Failed to update article" },
            { status: 500 }
        );
    }
}
