import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

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

    const plan = dbUser.plan;
    const usage = dbUser.usage;

    const articlesLimit = plan?.articlesPerMonth || 10;
    const imagesLimit = plan?.imagesPerMonth || 30;

    return NextResponse.json({
      usage: {
        articles: { used: usage?.articlesGenerated || 0, limit: articlesLimit },
        images: { used: usage?.imagesGenerated || 0, limit: imagesLimit },
        words: { used: usage?.wordsGenerated || 0 },
        apiCalls: { used: usage?.apiCallsCount || 0 },
      },
      lifetime: {
        totalArticles: usage?.totalArticles || 0,
        totalImages: usage?.totalImages || 0,
        totalWords: usage?.totalWords || 0,
      },
      plan: plan?.name || "free",
      resetDate: usage?.lastResetAt || new Date(),
    });
  } catch (error: any) {
    console.error("Usage fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch usage" }, { status: 500 });
  }
}
