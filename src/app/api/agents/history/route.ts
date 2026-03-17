import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { user: authUser } = authResult;

    const { searchParams } = new URL(req.url);
    const agentType = searchParams.get("agentType");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = { userId: authUser.id };
    if (agentType) where.agentType = agentType;

    const [runs, total] = await Promise.all([
      prisma.agentRun.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(limit, 50),
        skip: offset,
        select: {
          id: true,
          agentType: true,
          status: true,
          scores: true,
          summary: true,
          metadata: true,
          durationMs: true,
          createdAt: true,
        },
      }),
      prisma.agentRun.count({ where }),
    ]);

    // Get usage stats for current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usedThisMonth = await prisma.agentRun.count({
      where: {
        userId: authUser.id,
        createdAt: { gte: startOfMonth },
        status: { in: ["completed", "running"] },
      },
    });

    return NextResponse.json({ runs, total, usedThisMonth });
  } catch (error: any) {
    console.error("Agent history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent history" },
      { status: 500 }
    );
  }
}
