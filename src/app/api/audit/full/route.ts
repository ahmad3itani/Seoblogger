import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        const { searchParams } = new URL(req.url);
        const blogId = searchParams.get("blogId");

        if (!blogId) return NextResponse.json({ error: "Missing blogId" }, { status: 400 });

        const blog = await prisma.blog.findFirst({
            where: { blogId, userId }
        });

        if (!blog) return NextResponse.json({ error: "Blog not found" }, { status: 404 });

        // Get latest crawl session with its pages and issues
        const latestSession = await prisma.crawlSession.findFirst({
            where: { blogId: blog.id },
            orderBy: { startedAt: "desc" },
            include: {
                scannedPages: {
                    include: {
                        issues: {
                            include: {
                                suggestion: true
                            }
                        }
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            session: latestSession
        });

    } catch (error: any) {
        console.error("Full Audit Fetch Error:", error);
        return NextResponse.json({ error: error.message || "Could not fetch audit data" }, { status: 500 });
    }
}
