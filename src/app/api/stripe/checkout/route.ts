import { NextResponse } from "next/server";
import { stripe, STRIPE_PLANS } from "@/lib/stripe/client";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { user: authUser } = authResult;

    const { priceId: rawPriceId, planName, billing } = await req.json();

    if (!planName) {
      return NextResponse.json(
        { error: "Plan name is required" },
        { status: 400 }
      );
    }

    // Look up the plan config
    const planConfig = STRIPE_PLANS[planName as keyof typeof STRIPE_PLANS];
    if (!planConfig || planConfig.price === 0) {
      return NextResponse.json(
        { error: "Invalid plan or free plans don't need checkout" },
        { status: 400 }
      );
    }

    // Use provided priceId or look it up from config (monthly vs yearly)
    const isYearly = billing === "yearly";
    const priceId = rawPriceId || (isYearly ? planConfig.yearlyPriceId : planConfig.priceId) || planConfig.priceId;
    if (!priceId) {
      return NextResponse.json(
        { error: `Payment is not configured for this plan yet. Please try a different billing cycle or contact support.` },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID to database
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
      metadata: {
        userId: user.id,
        planName,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          planName,
        },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
