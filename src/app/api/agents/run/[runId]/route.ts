import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { user: authUser } = authResult;
    const { runId } = await params;

    const run = await prisma.agentRun.findUnique({
      where: { id: runId },
    });

    if (!run) {
      return NextResponse.json({ error: "Agent run not found" }, { status: 404 });
    }

    if (run.userId !== authUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({
      id: run.id,
      agentType: run.agentType,
      status: run.status,
      scores: run.scores,
      report: run.report,
      summary: run.summary,
      metadata: run.metadata,
      durationMs: run.durationMs,
      input: run.input,
      createdAt: run.createdAt,
    });
  } catch (error: any) {
    console.error("Agent run detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent run" },
      { status: 500 }
    );
  }
}
