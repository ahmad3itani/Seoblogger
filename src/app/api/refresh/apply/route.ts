import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { getBloggerClient } from "@/lib/blogger-api";

/**
 * POST - Apply a refresh version to Blogger (update the live post)
 * Also supports rollback by passing rollback=true
 */
export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const { versionId, rollback } = await req.json();

        if (!versionId) {
            return NextResponse.json({ error: "versionId is required" }, { status: 400 });
        }

        // Get the version with candidate
        const version = await (prisma as any).refreshVersion.findFirst({
            where: { id: versionId },
            include: { candidate: true },
        });

        if (!version || version.candidate.userId !== authUser.id) {
            return NextResponse.json({ error: "Version not found" }, { status: 404 });
        }

        // Get the blog
        const blog = await prisma.blog.findFirst({ where: { id: version.candidate.blogId, userId: authUser.id } });
        if (!blog) {
            return NextResponse.json({ error: "Blog not found" }, { status: 404 });
        }

        const blogger = await getBloggerClient(authUser.id);

        // Fetch the current post to confirm it exists
        const currentPost = await blogger.posts.get({ blogId: blog.blogId, postId: version.candidate.postId });
        if (!currentPost.data) {
            return NextResponse.json({ error: "Post not found on Blogger" }, { status: 404 });
        }

        // Decide what content to apply
        const contentToApply = rollback ? version.oldHtml : version.newHtml;
        const titleToApply = rollback ? version.oldTitle : version.newTitle;

        // Apply the update to Blogger
        await blogger.posts.update({
            blogId: blog.blogId,
            postId: version.candidate.postId,
            requestBody: {
                title: titleToApply,
                content: contentToApply,
            },
        });

        // Verify the update was applied
        const verifyPost = await blogger.posts.get({ blogId: blog.blogId, postId: version.candidate.postId });
        const verified = verifyPost.data.content === contentToApply;

        // Update version status
        const newStatus = rollback ? "rolled_back" : "applied";
        await (prisma as any).refreshVersion.update({
            where: { id: version.id },
            data: {
                status: newStatus,
                appliedBy: authUser.id,
                appliedAt: new Date(),
                verifiedAt: verified ? new Date() : null,
                verificationNote: verified
                    ? `Successfully ${rollback ? "rolled back" : "applied"} to Blogger`
                    : "Applied but verification pending",
            },
        });

        // Update candidate status
        await (prisma as any).refreshCandidate.update({
            where: { id: version.candidate.id },
            data: { status: rollback ? "detected" : "applied" },
        });

        return NextResponse.json({
            success: true,
            action: rollback ? "rolled_back" : "applied",
            verified,
            postUrl: version.candidate.url,
            title: titleToApply,
        });
    } catch (error: any) {
        console.error("Refresh apply error:", error);
        return NextResponse.json({ error: error.message || "Failed to apply refresh" }, { status: 500 });
    }
}
