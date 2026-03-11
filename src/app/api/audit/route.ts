import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/supabase/auth-helpers";

export async function GET(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        const blog = await prisma.blog.findFirst({
            where: { userId: userId, isDefault: true }
        });

        if (!blog) {
            return NextResponse.json({ error: "No default blog found" }, { status: 400 });
        }

        const audit = await prisma.siteAudit.findFirst({
            where: { blogId: blog.id },
            orderBy: { runAt: 'desc' }
        });

        return NextResponse.json({ audit });
    } catch (error) {
        console.error("Failed to fetch audit:", error);
        return NextResponse.json({ error: "Failed to fetch audit" }, { status: 500 });
    }
}
