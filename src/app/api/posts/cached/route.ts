import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { syncBloggerPosts } from "@/lib/blogger-api";

export async function GET(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        // Get user's default blog
        const blog = await prisma.blog.findFirst({
            where: { userId: userId, isDefault: true }
        });

        if (!blog) {
            return NextResponse.json({ error: "No default blog found" }, { status: 400 });
        }

        // Try to sync latest posts first, but don't fail if it doesn't work perfectly
        try {
            await syncBloggerPosts(userId, blog.blogId, 50);
        } catch (e) {
            console.error("Failed to sync posts in /api/posts/cached:", e);
        }

        // Fetch the recent cached posts
        const posts = await prisma.cachedPost.findMany({
            where: { blogId: blog.blogId },
            orderBy: { publishedAt: 'desc' },
            take: 50,
        });

        return NextResponse.json({ success: true, posts });
    } catch (error) {
        console.error("Fetch cached posts error:", error);
        return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
    }
}
