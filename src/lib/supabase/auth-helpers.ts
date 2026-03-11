import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  planName: string;
  planId: string | null;
}

/**
 * Get authenticated user from Supabase + Prisma for API routes.
 * Returns null if not authenticated, or the user object with plan info.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { plan: true },
    });

    if (!dbUser) return null;

    return {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      planName: dbUser.plan?.name || "free",
      planId: dbUser.planId,
    };
  } catch {
    return null;
  }
}

/**
 * Require authentication - returns 401 if not authenticated
 */
export async function requireAuth(): Promise<{ user: AuthUser } | NextResponse> {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  return { user };
}

/**
 * Require admin role - returns 403 if not admin
 */
export async function requireAdmin(): Promise<{ user: AuthUser } | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;

  if (result.user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  return result;
}

/**
 * Check if user has access to a specific feature based on their plan
 */
export async function requireFeature(feature: string): Promise<{ user: AuthUser } | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;

  const plan = await prisma.plan.findFirst({
    where: { name: result.user.planName },
  });

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 500 });
  }

  const hasFeature = (plan as any)[feature];
  if (!hasFeature) {
    return NextResponse.json(
      { error: `This feature requires a higher plan. Current: ${result.user.planName}` },
      { status: 403 }
    );
  }

  return result;
}

/**
 * Check usage limit before allowing an action
 */
export async function checkUsageLimit(
  userId: string,
  type: "articles" | "images",
  count: number = 1
): Promise<{ allowed: boolean; remaining: number; error?: string }> {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { plan: true, usage: true },
  });

  if (!dbUser) return { allowed: false, remaining: 0, error: "User not found" };

  const plan = dbUser.plan;
  const usage = dbUser.usage;

  if (type === "articles") {
    const limit = plan?.articlesPerMonth || 10;
    const used = usage?.articlesGenerated || 0;
    const remaining = Math.max(0, limit - used);

    if (used + count > limit) {
      return {
        allowed: false,
        remaining,
        error: `Monthly article limit reached (${used}/${limit}). Upgrade your plan.`,
      };
    }
    return { allowed: true, remaining: remaining - count };
  }

  if (type === "images") {
    const limit = plan?.imagesPerMonth || 30;
    const used = usage?.imagesGenerated || 0;
    const remaining = Math.max(0, limit - used);

    if (used + count > limit) {
      return {
        allowed: false,
        remaining,
        error: `Monthly image limit reached (${used}/${limit}). Upgrade your plan.`,
      };
    }
    return { allowed: true, remaining: remaining - count };
  }

  return { allowed: true, remaining: 0 };
}

/**
 * Increment usage after a successful action
 */
export async function trackUsage(
  userId: string,
  type: "article" | "image" | "apiCall",
  count: number = 1,
  words: number = 0
): Promise<void> {
  const updates: any = {};
  const totalUpdates: any = {};

  switch (type) {
    case "article":
      updates.articlesGenerated = { increment: count };
      totalUpdates.totalArticles = { increment: count };
      if (words > 0) {
        updates.wordsGenerated = { increment: words };
        totalUpdates.totalWords = { increment: words };
      }
      break;
    case "image":
      updates.imagesGenerated = { increment: count };
      totalUpdates.totalImages = { increment: count };
      break;
    case "apiCall":
      updates.apiCallsCount = { increment: count };
      totalUpdates.totalApiCalls = { increment: count };
      break;
  }

  await prisma.usage.upsert({
    where: { userId },
    update: { ...updates, ...totalUpdates },
    create: {
      userId,
      articlesGenerated: type === "article" ? count : 0,
      imagesGenerated: type === "image" ? count : 0,
      apiCallsCount: type === "apiCall" ? count : 0,
      wordsGenerated: words,
      totalArticles: type === "article" ? count : 0,
      totalImages: type === "image" ? count : 0,
      totalWords: words,
      totalApiCalls: type === "apiCall" ? count : 0,
    },
  });
}

/**
 * Get Google OAuth tokens for Blogger API
 */
export async function getGoogleTokens(userId: string): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
} | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleAccessToken: true, googleRefreshToken: true },
  });

  if (!user) return null;

  return {
    accessToken: user.googleAccessToken,
    refreshToken: user.googleRefreshToken,
  };
}
