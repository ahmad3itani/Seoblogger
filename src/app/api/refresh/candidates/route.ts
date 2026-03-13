import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { runRefreshPipeline } from "@/lib/refresh/pipeline";

export const maxDuration = 120;

/**
 * GET  - List existing refresh candidates for the user's blog
 * POST - Run the detection pipeline to find new candidates
 */
export async function GET(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const { searchParams } = new URL(req.url);
        const blogId = searchParams.get("blogId");
        const tier = searchParams.get("tier");

        const where: any = { userId: authUser.id };
        if (blogId) where.blogId = blogId;
        if (tier) where.tier = parseInt(tier);

        const candidates = await prisma.refreshCandidate.findMany({
            where,
            include: { diagnostic: true },
            orderBy: { refreshScore: "desc" },
            take: 100,
        });

        const stats = {
            total: candidates.length,
            tier1: candidates.filter((c: any) => c.tier === 1).length,
            tier2: candidates.filter((c: any) => c.tier === 2).length,
            tier3: candidates.filter((c: any) => c.tier === 3).length,
            avgScore: candidates.length > 0 ? Math.round(candidates.reduce((s: number, c: any) => s + c.refreshScore, 0) / candidates.length) : 0,
        };

        return NextResponse.json({ success: true, candidates, stats });
    } catch (error: any) {
        console.error("Refresh candidates GET error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch candidates" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const { blogId } = await req.json();

        // Find the blog
        const blog = blogId
            ? await prisma.blog.findFirst({ where: { id: blogId, userId: authUser.id } })
            : await prisma.blog.findFirst({ where: { userId: authUser.id, isDefault: true } })
              || await prisma.blog.findFirst({ where: { userId: authUser.id } });

        if (!blog) {
            return NextResponse.json({ error: "No blog connected" }, { status: 400 });
        }

        // Rate limit: 1 pipeline run per 10 minutes
        const rl = checkRateLimit(`refresh-pipeline:${authUser.id}`, 1, 600_000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` },
                { status: 429 }
            );
        }

        const result = await runRefreshPipeline(
            authUser.id,
            blog.id,
            blog.blogId,
            blog.url
        );

        return NextResponse.json({ success: true, ...result });
    } catch (error: any) {
        console.error("Refresh pipeline error:", error);
        return NextResponse.json({ error: error.message || "Pipeline failed" }, { status: 500 });
    }
}
