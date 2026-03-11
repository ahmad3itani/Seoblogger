import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface PlanLimits {
  articlesPerMonth: number;
  imagesPerMonth: number;
  blogsLimit: number;
  projectsLimit: number;
  brandProfilesLimit: number;
  campaignsLimit: number;
  hasAutoPublish: boolean;
  hasScheduling: boolean;
  hasAnalytics: boolean;
  hasApiAccess: boolean;
  hasPrioritySupport: boolean;
  hasWhiteLabel: boolean;
  hasTeamAccess: boolean;
  teamMembersLimit: number;
  hasAdvancedAI: boolean;
  hasCompetitorAnalysis: boolean;
  hasCustomPrompts: boolean;
}

export interface UsageStats {
  articlesGenerated: number;
  imagesGenerated: number;
  apiCallsCount: number;
  articlesRemaining: number;
  imagesRemaining: number;
  percentUsed: number;
}

/**
 * Get user's current plan and limits
 */
export async function getUserPlan(userId: string): Promise<PlanLimits | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { plan: true },
  });

  if (!user?.plan) {
    // Return free plan limits if no plan assigned
    const freePlan = await prisma.plan.findUnique({
      where: { name: "free" },
    });
    return freePlan as PlanLimits;
  }

  return user.plan as PlanLimits;
}

/**
 * Get user's current usage stats
 */
export async function getUserUsage(userId: string): Promise<UsageStats | null> {
  const usage = await prisma.usage.findUnique({
    where: { userId },
  });

  if (!usage) {
    // Create usage record if doesn't exist
    const newUsage = await prisma.usage.create({
      data: { userId },
    });
    return {
      articlesGenerated: 0,
      imagesGenerated: 0,
      apiCallsCount: 0,
      articlesRemaining: 10, // Free plan default
      imagesRemaining: 30,
      percentUsed: 0,
    };
  }

  const plan = await getUserPlan(userId);
  const articlesRemaining = Math.max(0, (plan?.articlesPerMonth || 10) - usage.articlesGenerated);
  const imagesRemaining = Math.max(0, (plan?.imagesPerMonth || 30) - usage.imagesGenerated);
  const percentUsed = Math.round((usage.articlesGenerated / (plan?.articlesPerMonth || 10)) * 100);

  return {
    articlesGenerated: usage.articlesGenerated,
    imagesGenerated: usage.imagesGenerated,
    apiCallsCount: usage.apiCallsCount,
    articlesRemaining,
    imagesRemaining,
    percentUsed,
  };
}

/**
 * Check if user can generate an article
 */
export async function canGenerateArticle(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const plan = await getUserPlan(userId);
  const usage = await getUserUsage(userId);

  if (!plan || !usage) {
    return { allowed: false, reason: "Unable to verify plan" };
  }

  if (usage.articlesGenerated >= plan.articlesPerMonth) {
    return {
      allowed: false,
      reason: `Monthly limit reached (${plan.articlesPerMonth} articles). Upgrade your plan to continue.`,
    };
  }

  return { allowed: true };
}

/**
 * Check if user can generate images
 */
export async function canGenerateImages(userId: string, count: number = 1): Promise<{ allowed: boolean; reason?: string }> {
  const plan = await getUserPlan(userId);
  const usage = await getUserUsage(userId);

  if (!plan || !usage) {
    return { allowed: false, reason: "Unable to verify plan" };
  }

  if (usage.imagesGenerated + count > plan.imagesPerMonth) {
    return {
      allowed: false,
      reason: `Monthly image limit reached (${plan.imagesPerMonth} images). Upgrade your plan to continue.`,
    };
  }

  return { allowed: true };
}

/**
 * Increment article usage
 */
export async function incrementArticleUsage(userId: string): Promise<void> {
  await prisma.usage.upsert({
    where: { userId },
    update: {
      articlesGenerated: { increment: 1 },
      totalArticles: { increment: 1 },
    },
    create: {
      userId,
      articlesGenerated: 1,
      totalArticles: 1,
    },
  });
}

/**
 * Increment image usage
 */
export async function incrementImageUsage(userId: string, count: number = 1): Promise<void> {
  await prisma.usage.upsert({
    where: { userId },
    update: {
      imagesGenerated: { increment: count },
      totalImages: { increment: count },
    },
    create: {
      userId,
      imagesGenerated: count,
      totalImages: count,
    },
  });
}

/**
 * Increment API call usage
 */
export async function incrementApiUsage(userId: string): Promise<void> {
  await prisma.usage.upsert({
    where: { userId },
    update: {
      apiCallsCount: { increment: 1 },
      totalApiCalls: { increment: 1 },
    },
    create: {
      userId,
      apiCallsCount: 1,
      totalApiCalls: 1,
    },
  });
}

/**
 * Reset monthly usage (run via cron job on 1st of each month)
 */
export async function resetMonthlyUsage(userId: string): Promise<void> {
  await prisma.usage.update({
    where: { userId },
    data: {
      articlesGenerated: 0,
      imagesGenerated: 0,
      apiCallsCount: 0,
      lastResetAt: new Date(),
    },
  });
}

/**
 * Assign free plan to new user
 */
export async function assignFreePlan(userId: string): Promise<void> {
  const freePlan = await prisma.plan.findUnique({
    where: { name: "free" },
  });

  if (!freePlan) {
    throw new Error("Free plan not found. Run database seed.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { planId: freePlan.id },
  });

  // Create usage record
  await prisma.usage.create({
    data: { userId },
  });
}

/**
 * Check if user has access to a feature
 */
export async function hasFeatureAccess(userId: string, feature: keyof PlanLimits): Promise<boolean> {
  const plan = await getUserPlan(userId);
  if (!plan) return false;
  return Boolean(plan[feature]);
}
