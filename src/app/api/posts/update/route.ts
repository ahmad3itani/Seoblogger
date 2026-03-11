import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { updatePost } from "@/lib/blogger-api";

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        const body = await req.json();
        const { postId, title, content, labels } = body;

        if (!postId || !content) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Get user's default blog
        const blog = await prisma.blog.findFirst({
            where: { userId: userId, isDefault: true }
        });

        if (!blog) {
            return NextResponse.json({ error: "No default blog found" }, { status: 400 });
        }

        // Push update to Blogger
        const result = await updatePost(userId, blog.blogId, postId, title, content, labels);

        // Update the local cache
        await prisma.cachedPost.updateMany({
            where: { blogId: blog.blogId, postId: postId },
            data: { title: title }
        });

        return NextResponse.json({ success: true, url: result.url });
    } catch (error: any) {
        console.error("Update Blogger post error:", error);
        return NextResponse.json({ error: error.message || "Failed to update post" }, { status: 500 });
    }
}
