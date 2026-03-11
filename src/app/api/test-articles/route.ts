import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/supabase/auth-helpers";

// Test endpoint - DISABLED IN PRODUCTION
export async function GET(req: Request) {
    // Block in production
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        const articles = await prisma.article.findMany({
            where: { userId: userId },
            select: {
                id: true,
                title: true,
                status: true,
                wordCount: true,
                createdAt: true,
                blogId: true,
            },
        });

        return NextResponse.json({
            articlesFound: articles.length,
            articles,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: "Failed to fetch test articles" },
            { status: 500 }
        );
    }
}
