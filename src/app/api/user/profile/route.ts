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

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        plan: true,
        usage: true,
        subscription: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        role: profile.role,
        plan: profile.plan
          ? { name: profile.plan.name, displayName: profile.plan.displayName }
          : { name: "free", displayName: "Free Plan" },
        usage: profile.usage
          ? {
              articlesGenerated: profile.usage.articlesGenerated,
              imagesGenerated: profile.usage.imagesGenerated,
              wordsGenerated: profile.usage.wordsGenerated,
              totalArticles: profile.usage.totalArticles,
              totalImages: profile.usage.totalImages,
            }
          : null,
        subscription: profile.subscription
          ? {
              status: profile.subscription.status,
              billingCycle: profile.subscription.billingCycle,
              currentPeriodEnd: profile.subscription.currentPeriodEnd,
              cancelAtPeriodEnd: profile.subscription.cancelAtPeriodEnd,
            }
          : null,
        limits: profile.plan
          ? {
              articlesPerMonth: profile.plan.articlesPerMonth,
              imagesPerMonth: profile.plan.imagesPerMonth,
              blogsLimit: profile.plan.blogsLimit,
              projectsLimit: profile.plan.projectsLimit,
            }
          : { articlesPerMonth: 10, imagesPerMonth: 30, blogsLimit: 1, projectsLimit: 1 },
        hasGoogleConnected: !!profile.googleAccessToken,
        createdAt: profile.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { name, avatarUrl } = body;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
    });

    // Also update Supabase user metadata
    await supabase.auth.updateUser({
      data: {
        full_name: name || updated.name,
      },
    });

    return NextResponse.json({ profile: updated });
  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile", details: error.message },
      { status: 500 }
    );
  }
}
