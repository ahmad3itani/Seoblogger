import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { prisma } from "@/lib/prisma";

// Resolve price IDs at runtime (not build time) so env vars are available
function getStripePriceId(planName: string, billing: string): string | null {
  const isYearly = billing === "yearly";
  switch (planName) {
    case "starter":
      return isYearly
        ? (process.env.STRIPE_PRICE_ID_STARTER_YEARLY || process.env.STRIPE_PRICE_ID_STARTER || null)
        : (process.env.STRIPE_PRICE_ID_STARTER || null);
    case "pro":
      return isYearly
        ? (process.env.STRIPE_PRICE_ID_PRO_YEARLY || process.env.STRIPE_PRICE_ID_PRO || null)
        : (process.env.STRIPE_PRICE_ID_PRO || null);
    case "enterprise":
      return isYearly
        ? (process.env.STRIPE_PRICE_ID_ENTERPRISE_YEARLY || process.env.STRIPE_PRICE_ID_ENTERPRISE || null)
        : (process.env.STRIPE_PRICE_ID_ENTERPRISE || null);
    default:
      return null;
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { user: authUser } = authResult;

    const { priceId: rawPriceId, planName, billing = "monthly" } = await req.json();

    if (!planName) {
      return NextResponse.json(
        { error: "Plan name is required" },
        { status: 400 }
      );
    }

    if (planName === "free") {
      return NextResponse.json(
        { error: "Free plans don't need checkout" },
        { status: 400 }
      );
    }

    // Resolve price ID at runtime
    let priceId = rawPriceId || getStripePriceId(planName, billing);

    // Auto-fix if user provided a Stripe Product ID (prod_*) instead of a Price ID (price_*)
    if (priceId && priceId.startsWith('prod_')) {
      try {
        const product = await stripe.products.retrieve(priceId);
        if (product.default_price) {
          priceId = typeof product.default_price === 'string' 
            ? product.default_price 
            : product.default_price.id;
        } else {
          const prices = await stripe.prices.list({ product: priceId, active: true, limit: 1 });
          if (prices.data.length > 0) {
            priceId = prices.data[0].id;
          }
        }
      } catch (err) {
        console.error("Failed to resolve Product ID to Price ID:", err);
      }
    }

    if (!priceId) {
      console.error(`Missing Stripe price ID for plan: ${planName}, billing: ${billing}. Check STRIPE_PRICE_ID_${planName.toUpperCase()} env var.`);
      return NextResponse.json(
        { error: `Payment is not configured for the ${planName} plan yet. Please contact support.` },
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

    // Determine base URL for redirects
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '') || "https://bloggerseowriting.com";

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
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
      metadata: {
        userId: user.id,
        planName,
      },
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          userId: user.id,
          planName,
        },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error?.message || error);

    // Surface useful error details
    const message = error?.message || "Failed to create checkout session";
    const isStripeError = error?.type?.startsWith("Stripe");

    return NextResponse.json(
      { error: isStripeError ? message : "Failed to create checkout session. Please try again or contact support." },
      { status: 500 }
    );
  }
}
