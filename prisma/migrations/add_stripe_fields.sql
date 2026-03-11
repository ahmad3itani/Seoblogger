-- Add Stripe fields to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT UNIQUE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT UNIQUE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeSubscriptionStatus" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCurrentPeriodEnd" TIMESTAMP(3);

-- Add Stripe Price ID to Plan table
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT UNIQUE;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS "User_stripeCustomerId_idx" ON "User"("stripeCustomerId");
CREATE INDEX IF NOT EXISTS "User_stripeSubscriptionId_idx" ON "User"("stripeSubscriptionId");
