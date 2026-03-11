import { NextResponse } from "next/server";
import { listPosts } from "@/lib/blogger";
import { prisma } from "@/lib/prisma";
import { getValidAccessToken } from "@/lib/google";
import { requireAuth } from "@/lib/supabase/auth-helpers";

export async function GET(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const { searchParams } = new URL(req.url);
        const blogId = searchParams.get("blogId");

        if (!blogId) {
            return NextResponse.json({ error: "blogId is required" }, { status: 400 });
        }

        // Verify blog belongs to authenticated user
        const blog = await prisma.blog.findFirst({
            where: { blogId, userId: authUser.id },
        });

        if (!blog) {
            return NextResponse.json({ error: "Blog not found or unauthorized" }, { status: 404 });
        }

        let accessToken;
        try {
            accessToken = await getValidAccessToken(authUser.id);
        } catch (error: any) {
            if (error.message === "NEEDS_RECONNECT") {
                return NextResponse.json({ error: "Session expired. Please reconnect Google Account in Settings." }, { status: 401 });
            }
            return NextResponse.json(
                { error: "No Google account linked. Please reconnect." },
                { status: 400 }
            );
        }

        const data = await listPosts(blogId, accessToken);

        return NextResponse.json(data.items || []);
    } catch (error) {
        console.error("Error fetching blogger posts:", error);
        return NextResponse.json(
            { error: "Failed to fetch blogger posts" },
            { status: 500 }
        );
    }
}
