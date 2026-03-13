import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCreditBalance, CREDIT_COSTS, PLAN_CREDITS } from "@/lib/credits";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { plan: true, usage: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const planName = dbUser.plan?.name || "free";
    const usage = dbUser.usage || {
      articlesGenerated: 0,
      imagesGenerated: 0,
      apiCallsCount: 0,
      wordsGenerated: 0,
    };

    const balance = getCreditBalance(planName, usage);

    return NextResponse.json({
      credits: balance,
      costs: CREDIT_COSTS,
      planCredits: PLAN_CREDITS[planName] || PLAN_CREDITS.free,
      usage: {
        articles: usage.articlesGenerated,
        images: usage.imagesGenerated,
        apiCalls: usage.apiCallsCount,
      },
      resetDate: (dbUser.usage as any)?.lastResetAt || null,
    });
  } catch (error: any) {
    console.error("Credits fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch credits", details: error.message },
      { status: 500 }
    );
  }
}
