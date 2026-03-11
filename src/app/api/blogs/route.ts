import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listBlogs } from "@/lib/blogger";
import { getValidAccessToken } from "@/lib/google";
import { requireAuth } from "@/lib/supabase/auth-helpers";

export async function GET() {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const user = await prisma.user.findUnique({
            where: { id: authUser.id },
            include: { blogs: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Get valid Google account access token (auto-refreshes if needed)
        let accessToken: string;
        try {
            accessToken = await getValidAccessToken(user.id);
        } catch (error: any) {
            if (error.message === "NEEDS_RECONNECT") {
                // Tell the frontend they must reconnect because their refresh token is missing/invalid
                return NextResponse.json({ error: "Session expired. Please reconnect Google Account." }, { status: 401 });
            }
            return NextResponse.json(
                { error: "Google account not connected" },
                { status: 400 }
            );
        }

        // Fetch blogs from Blogger API (now safely returns [] on 404s)
        const blogs = await listBlogs(accessToken);

        // Sync blogs to database
        for (const blog of blogs) {
            await prisma.blog.upsert({
                where: { blogId: blog.id },
                update: {
                    name: blog.name,
                    url: blog.url,
                    description: blog.description || null,
                },
                create: {
                    blogId: blog.id,
                    name: blog.name,
                    url: blog.url,
                    description: blog.description || null,
                    userId: user.id,
                },
            });
        }

        // Return all user blogs from DB
        const userBlogs = await prisma.blog.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' }
        });

        // If no default blog exists, set the first one as default
        if (userBlogs.length > 0 && !userBlogs.find((b: any) => b.isDefault)) {
            await prisma.blog.update({
                where: { id: userBlogs[0].id },
                data: { isDefault: true }
            });
            userBlogs[0].isDefault = true;
        }

        return NextResponse.json({ blogs: userBlogs });
    } catch (error) {
        console.error("Blogs API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch blogs" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const { blogId } = await req.json();

        const user = await prisma.user.findUnique({
            where: { id: authUser.id },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Set default blog
        await prisma.blog.updateMany({
            where: { userId: user.id },
            data: { isDefault: false },
        });

        await prisma.blog.update({
            where: { id: blogId },
            data: { isDefault: true },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Set default blog error:", error);
        return NextResponse.json(
            { error: "Failed to set default blog" },
            { status: 500 }
        );
    }
}
