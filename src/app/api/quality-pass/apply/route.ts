import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/supabase/auth-helpers";

/**
 * POST - Apply a quality pass version to the article (update article content).
 * Optionally also push to Blogger.
 */
export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const { versionId, newTitle, pushToBlogger } = await req.json();

        if (!versionId) {
            return NextResponse.json({ error: "versionId is required" }, { status: 400 });
        }

        // Get the version with pass run and article
        const version = await (prisma as any).qualityVersion.findFirst({
            where: { id: versionId },
            include: {
                passRun: {
                    include: { article: { include: { blog: true } } },
                },
            },
        });

        if (!version || version.passRun.userId !== authUser.id) {
            return NextResponse.json({ error: "Version not found" }, { status: 404 });
        }

        const article = version.passRun.article;

        // Update the article content
        const updateData: any = { content: version.html };
        if (newTitle) updateData.title = newTitle;

        // Recount words
        const text = version.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        updateData.wordCount = text.split(/\s+/).filter(Boolean).length;

        await prisma.article.update({
            where: { id: article.id },
            data: updateData,
        });

        // Update pass run status
        await (prisma as any).qualityPassRun.update({
            where: { id: version.passRun.id },
            data: { status: "applied" },
        });

        // Optionally push to Blogger
        let bloggerResult = null;
        if (pushToBlogger && article.blog && article.bloggerPostId) {
            try {
                const { updatePost } = await import("@/lib/blogger-api");
                const result = await updatePost(
                    authUser.id,
                    article.blog.blogId,
                    article.bloggerPostId,
                    newTitle || article.title,
                    version.html,
                    article.labels ? article.labels.split(",").map((l: string) => l.trim()) : undefined
                );
                bloggerResult = { success: true, postUrl: result.url };
            } catch (err: any) {
                bloggerResult = { success: false, error: err.message };
            }
        }

        return NextResponse.json({
            success: true,
            articleId: article.id,
            wordCount: updateData.wordCount,
            bloggerResult,
        });
    } catch (error: any) {
        console.error("Quality pass apply error:", error);
        return NextResponse.json({ error: error.message || "Apply failed" }, { status: 500 });
    }
}
