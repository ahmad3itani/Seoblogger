import Stripe from "stripe";

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as any)[prop];
  },
});

/**
 * Plan configuration mapping to Stripe Price IDs
 */
export const STRIPE_PLANS = {
  free: {
    name: "Free",
    priceId: null,
    price: 0,
    articles: 5,
    images: 0,
  },
  starter: {
    name: "Starter",
    priceId: process.env.STRIPE_PRICE_ID_STARTER || "price_1T9ezuDiOIRYzxL73oFfs016",
    price: 12,
    articles: 30,
    images: 10,
  },
  pro: {
    name: "Pro",
    priceId: process.env.STRIPE_PRICE_ID_PRO || "price_1T9f0XDiOIRYzxL7KNCChhHx",
    price: 39,
    articles: 100,
    images: 50,
  },
  enterprise: {
    name: "Enterprise",
    priceId: process.env.STRIPE_PRICE_ID_ENTERPRISE || "price_1T9f0vDiOIRYzxL79Pkg9GPi",
    price: 99,
    articles: 300,
    images: 200,
  },
} as const;

/**
 * Get plan name from Stripe Price ID
 */
export function getPlanFromPriceId(priceId: string): string {
  for (const [planName, config] of Object.entries(STRIPE_PLANS)) {
    if (config.priceId === priceId) {
      return planName;
    }
  }
  return "free";
}

/**
 * Check if a subscription is active
 */
export function isSubscriptionActive(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

/**
 * Check if subscription is past due (payment failed but still has access)
 */
export function isSubscriptionPastDue(status: string | null | undefined): boolean {
  return status === "past_due";
}

/**
 * Check if subscription needs renewal
 */
export function needsRenewal(
  status: string | null | undefined,
  periodEnd: Date | null | undefined
): boolean {
  if (!status || !periodEnd) return false;
  
  const now = new Date();
  const daysUntilEnd = Math.floor((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return (status === "active" || status === "trialing") && daysUntilEnd <= 7;
}
