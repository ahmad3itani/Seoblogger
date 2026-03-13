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

    const { planName } = await request.json();

    if (!planName || !["free", "starter", "pro", "enterprise"].includes(planName)) {
      return NextResponse.json({ error: "Invalid plan name" }, { status: 400 });
    }

    // For paid plans, redirect to Stripe checkout (handled client-side)
    // This endpoint only handles Free plan selection directly
    if (planName !== "free") {
      return NextResponse.json({ error: "Paid plans require Stripe checkout" }, { status: 400 });
    }

    // Get or create free plan
    let freePlan = await prisma.plan.findUnique({
      where: { name: "free" },
    });

    if (!freePlan) {
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

    // Assign free plan to user
    await prisma.user.update({
      where: { id: user.id },
      data: { planId: freePlan.id },
    });

    return NextResponse.json({ success: true, plan: { name: "free", displayName: "Free Plan" } });
  } catch (error: any) {
    console.error("Plan selection error:", error);
    return NextResponse.json(
      { error: "Failed to select plan", details: error.message },
      { status: 500 }
    );
  }
}
