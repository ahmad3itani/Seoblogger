import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    console.log("🔄 Syncing user:", user.email);

    // Parse optional body (Google tokens from OAuth callback)
    let googleAccessToken: string | undefined;
    let googleRefreshToken: string | undefined;
    try {
      const body = await request.json();
      googleAccessToken = body.googleAccessToken;
      googleRefreshToken = body.googleRefreshToken;
    } catch {
      // No body is fine
    }

    // Get the free plan for default assignment - create if it doesn't exist
    let freePlan = await prisma.plan.findUnique({
      where: { name: "free" },
    });

    if (!freePlan) {
      console.log("📋 Creating default free plan...");
      freePlan = await prisma.plan.create({
        data: {
          name: "free",
          displayName: "Free Plan",
          price: 0,
          articlesPerMonth: 10,
          imagesPerMonth: 30,
        },
      });
    }

    // Upsert user profile in our database
    const profile = await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email || "",
        name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        avatarUrl: user.user_metadata?.avatar_url || null,
        ...(googleAccessToken && { googleAccessToken }),
        ...(googleRefreshToken && { googleRefreshToken }),
        ...(googleAccessToken && { googleTokenExpiry: new Date(Date.now() + 3600 * 1000) }),
      },
      create: {
        id: user.id,
        email: user.email || "",
        name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        avatarUrl: user.user_metadata?.avatar_url || null,
        role: "user",
        planId: freePlan.id,
        ...(googleAccessToken && { googleAccessToken }),
        ...(googleRefreshToken && { googleRefreshToken }),
        ...(googleAccessToken && { googleTokenExpiry: new Date(Date.now() + 3600 * 1000) }),
      },
      include: { plan: true },
    });

    // Ensure usage record exists
    await prisma.usage.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });

    console.log("✅ User synced:", profile.email, "Plan:", profile.plan?.name);
    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error("❌ User sync error:", error.message, error.stack);
    return NextResponse.json(
      { error: "Failed to sync user", details: error.message },
      { status: 500 }
    );
  }
}
