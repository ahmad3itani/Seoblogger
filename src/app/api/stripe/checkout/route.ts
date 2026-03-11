import { NextResponse } from "next/server";
import { stripe, STRIPE_PLANS } from "@/lib/stripe/client";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { user: authUser } = authResult;

    const { priceId, planName } = await req.json();

    if (!priceId || !planName) {
      return NextResponse.json(
        { error: "Price ID and plan name are required" },
        { status: 400 }
      );
    }

    // Validate the price ID matches our plans
    const validPlan = Object.entries(STRIPE_PLANS).find(
      ([name, config]) => name === planName && config.priceId === priceId
    );

    if (!validPlan) {
      return NextResponse.json(
        { error: "Invalid plan or price ID" },
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
