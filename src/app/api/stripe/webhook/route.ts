import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe, getPlanFromPriceId } from "@/lib/stripe/client";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    console.error("❌ No Stripe signature found");
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("❌ STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature - CRITICAL for security
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  console.log(`✅ Webhook received: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`❌ Error processing webhook ${event.type}:`, error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const planName = session.metadata?.planName;

  if (!userId) {
    console.error("No userId in checkout session metadata");
    return;
  }

  console.log(`💳 Checkout completed for user ${userId}, plan: ${planName}`);

  // Get subscription details
  const subscriptionId = session.subscription as string;
  if (!subscriptionId) return;

  const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as Stripe.Subscription;
  
  // Get the plan from database
  const plan = await prisma.plan.findUnique({
    where: { name: planName || "free" },
  });

  // Update user with subscription info
  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: subscriptionId,
      stripeSubscriptionStatus: subscription.status,
      stripePriceId: subscription.items.data[0]?.price.id,
      stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      planId: plan?.id || null,
    },
  });

  console.log(`✅ User ${userId} subscribed to ${planName}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  
  if (!userId) {
    // Try to find user by customer ID
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: subscription.customer as string },
    });
    if (!user) {
      console.error("No user found for subscription update");
      return;
    }
  }

  const priceId = subscription.items.data[0]?.price.id;
  const planName = getPlanFromPriceId(priceId);
  
  const plan = await prisma.plan.findUnique({
    where: { name: planName },
  });

  await prisma.user.update({
    where: userId ? { id: userId } : { stripeCustomerId: subscription.customer as string },
    data: {
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: subscription.status,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      planId: plan?.id || null,
    },
  });

  console.log(`✅ Subscription updated: ${subscription.id} - Status: ${subscription.status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!user) {
    console.error("No user found for deleted subscription");
    return;
  }

  // Get free plan
  const freePlan = await prisma.plan.findUnique({
    where: { name: "free" },
  });

  // Downgrade to free plan
  await prisma.user.update({
    where: { id: user.id },
    data: {
      stripeSubscriptionId: null,
      stripeSubscriptionStatus: "canceled",
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
      planId: freePlan?.id || null,
    },
  });

  console.log(`✅ Subscription canceled for user ${user.id}`);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string;
  if (!subscriptionId) return;

  const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as Stripe.Subscription;
  
  await prisma.user.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      stripeSubscriptionStatus: subscription.status,
      stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
    },
  });

  console.log(`✅ Payment succeeded for subscription ${subscriptionId}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string;
  if (!subscriptionId) return;

  await prisma.user.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      stripeSubscriptionStatus: "past_due",
    },
  });

  console.log(`⚠️ Payment failed for subscription ${subscriptionId}`);
}
