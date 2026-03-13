import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/supabase/auth-helpers";

export async function GET(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const url = new URL(req.url);
        const blogId = url.searchParams.get("blogId") || undefined;
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");

        const where: any = { userId: authUser.id };
        if (blogId) where.blogId = blogId;

        const [fixes, total] = await Promise.all([
            prisma.fixHistory.findMany({
                where,
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: offset,
            }),
            prisma.fixHistory.count({ where }),
        ]);

        // Compute stats
        const allFixes = await prisma.fixHistory.findMany({ where, select: { status: true } });
        const stats = {
            total: allFixes.length,
            applied: allFixes.filter((f) => f.status === "applied" || f.status === "verified").length,
            verified: allFixes.filter((f) => f.status === "verified").length,
            failed: allFixes.filter((f) => f.status === "failed").length,
            rolledBack: allFixes.filter((f) => f.status === "rolled_back").length,
            pending: allFixes.filter((f) => f.status === "pending").length,
        };

        return NextResponse.json({ fixes, total, stats });

    } catch (error: any) {
        console.error("Fix History Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch fix history" },
            { status: 500 }
        );
    }
}
