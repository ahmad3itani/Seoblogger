import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeContentFreshness, refreshArticleContent } from "@/lib/ai/refresh";
import { requireAuth } from "@/lib/supabase/auth-helpers";

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const body = await req.json();
        const { articleId, action } = body;

        if (!articleId) {
            return NextResponse.json({ error: "Article ID required" }, { status: 400 });
        }

        // Fetch article with ownership verification
        const article = await prisma.article.findFirst({
            where: { id: articleId, userId: authUser.id },
        });

        if (!article) {
            return NextResponse.json({ error: "Article not found" }, { status: 404 });
        }

        // Analyze freshness
        if (action === 'analyze') {
            const analysis = await analyzeContentFreshness({
                title: article.title,
                content: article.content,
                keyword: article.title, // Use title as keyword fallback
                publishedDate: article.createdAt,
            });

            return NextResponse.json({ analysis });
        }

        // Refresh content
        if (action === 'refresh') {
            const refreshed = await refreshArticleContent({
                title: article.title,
                content: article.content,
                keyword: article.title,
                publishedDate: article.createdAt,
            });

            // Update article in database
            const updatedArticle = await prisma.article.update({
                where: { id: articleId },
                data: {
                    content: refreshed.updatedContent,
                    wordCount: article.wordCount + refreshed.wordCountChange,
                },
            });

            return NextResponse.json({
                success: true,
                refreshed,
                article: updatedArticle,
            });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Content refresh error:", error);
        return NextResponse.json(
            { error: "Refresh failed: " + (error as Error).message },
            { status: 500 }
        );
    }
}
