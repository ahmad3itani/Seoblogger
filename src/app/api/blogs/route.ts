import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listBlogs } from "@/lib/blogger";
import { getValidAccessToken } from "@/lib/google";
import { requireAuth } from "@/lib/supabase/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const { searchParams } = new URL(req.url);
        const refresh = searchParams.get("refresh") === "true";

        const user = await prisma.user.findUnique({
            where: { id: authUser.id },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Only call Blogger API when explicitly requested (e.g. after connecting or clicking refresh)
        if (refresh) {
            console.log("🔄 Refreshing blogs from Blogger API for user:", user.email);
            try {
                const accessToken = await getValidAccessToken(user.id);
                console.log("✅ Got valid access token");
                
                const blogs = await listBlogs(accessToken);
                console.log("📝 Blogger API returned", blogs.length, "blogs");
                
                if (blogs.length === 0) {
                    console.log("⚠️ No blogs found on Blogger account. User needs to create a blog at blogger.com");
                }

                for (const blog of blogs) {
                    console.log("  - Saving blog:", blog.name, "("+blog.id+")");
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
            } catch (error: any) {
                console.error("❌ Error fetching blogs from Blogger API:", error.message);
                if (error.message === "NEEDS_RECONNECT") {
                    return NextResponse.json({ error: "Session expired. Please reconnect Google Account." }, { status: 401 });
                }
                // Don't fail the whole request if Blogger API is down - just return cached blogs
                console.error("Blogger API sync error (returning cached):", error.message);
            }
        } else {
            console.log("📋 Returning cached blogs (refresh=false)");
        }

        // Always return blogs from database (fast)
        const userBlogs = await prisma.blog.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' }
        });
        
        console.log("💾 Database has", userBlogs.length, "blogs for user");

        // If no default blog exists, set the first one as default
        if (userBlogs.length > 0 && !userBlogs.find((b: any) => b.isDefault)) {
            await prisma.blog.update({
                where: { id: userBlogs[0].id },
                data: { isDefault: true }
            });
            userBlogs[0].isDefault = true;
        }

        // If no blogs and no Google connection, tell frontend
        if (userBlogs.length === 0 && !user.googleAccessToken) {
            console.log("⚠️ No Google connection and no cached blogs");
            return NextResponse.json({ error: "Google account not connected", blogs: [] }, { status: 200 });
        }
        
        if (userBlogs.length === 0 && user.googleAccessToken) {
            console.log("⚠️ User has Google connection but no blogs in database. They may need to create a blog on blogger.com");
        }

        console.log("✅ Returning", userBlogs.length, "blogs to frontend");
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
