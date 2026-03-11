-- BloggerSEO Database Schema for Supabase PostgreSQL
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New Query

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Plans table
CREATE TABLE IF NOT EXISTS "Plan" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "yearlyPrice" DECIMAL(10,2),
  "articlesPerMonth" INTEGER NOT NULL DEFAULT 0,
  "imagesPerMonth" INTEGER NOT NULL DEFAULT 0,
  "blogsLimit" INTEGER NOT NULL DEFAULT 1,
  "projectsLimit" INTEGER NOT NULL DEFAULT 1,
  "brandProfilesLimit" INTEGER NOT NULL DEFAULT 1,
  "campaignsLimit" INTEGER NOT NULL DEFAULT 0,
  "wordsPerArticle" INTEGER NOT NULL DEFAULT 2000,
  "hasAutoPublish" BOOLEAN NOT NULL DEFAULT false,
  "hasScheduling" BOOLEAN NOT NULL DEFAULT false,
  "hasAnalytics" BOOLEAN NOT NULL DEFAULT false,
  "hasBulkGeneration" BOOLEAN NOT NULL DEFAULT false,
  "hasTrendIdeas" BOOLEAN NOT NULL DEFAULT false,
  "hasAutoClustering" BOOLEAN NOT NULL DEFAULT false,
  "hasContentRefresh" BOOLEAN NOT NULL DEFAULT false,
  "hasApiAccess" BOOLEAN NOT NULL DEFAULT false,
  "hasPrioritySupport" BOOLEAN NOT NULL DEFAULT false,
  "hasWhiteLabel" BOOLEAN NOT NULL DEFAULT false,
  "hasTeamAccess" BOOLEAN NOT NULL DEFAULT false,
  "teamMembersLimit" INTEGER NOT NULL DEFAULT 1,
  "hasAdvancedAI" BOOLEAN NOT NULL DEFAULT false,
  "hasCompetitorAnalysis" BOOLEAN NOT NULL DEFAULT false,
  "hasCustomPrompts" BOOLEAN NOT NULL DEFAULT false,
  "stripePriceId" TEXT,
  "stripeYearlyPriceId" TEXT,
  "stripeProductId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Users table (links to Supabase auth.users)
CREATE TABLE IF NOT EXISTS "User" (
  "id" UUID PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT,
  "avatarUrl" TEXT,
  "role" TEXT NOT NULL DEFAULT 'user',
  "planId" TEXT,
  "googleAccessToken" TEXT,
  "googleRefreshToken" TEXT,
  "googleTokenExpiry" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" TEXT PRIMARY KEY,
  "userId" UUID NOT NULL UNIQUE,
  "stripeCustomerId" TEXT UNIQUE,
  "stripeSubscriptionId" TEXT UNIQUE,
  "stripePriceId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'inactive',
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Usage tracking table
CREATE TABLE IF NOT EXISTS "Usage" (
  "id" TEXT PRIMARY KEY,
  "userId" UUID NOT NULL UNIQUE,
  "articlesThisMonth" INTEGER NOT NULL DEFAULT 0,
  "imagesThisMonth" INTEGER NOT NULL DEFAULT 0,
  "apiCallsThisMonth" INTEGER NOT NULL DEFAULT 0,
  "lastResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Blog table
CREATE TABLE IF NOT EXISTS "Blog" (
  "id" TEXT PRIMARY KEY,
  "userId" UUID NOT NULL,
  "blogId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Blog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Brand Profile table
CREATE TABLE IF NOT EXISTS "BrandProfile" (
  "id" TEXT PRIMARY KEY,
  "userId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "tone" TEXT NOT NULL DEFAULT 'professional',
  "instructions" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrandProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Campaign table
CREATE TABLE IF NOT EXISTS "Campaign" (
  "id" TEXT PRIMARY KEY,
  "userId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "niche" TEXT NOT NULL,
  "targetAudience" TEXT NOT NULL,
  "keywords" TEXT[],
  "frequency" TEXT NOT NULL DEFAULT 'weekly',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Article table
CREATE TABLE IF NOT EXISTS "Article" (
  "id" TEXT PRIMARY KEY,
  "userId" UUID NOT NULL,
  "blogId" TEXT,
  "campaignId" TEXT,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "excerpt" TEXT,
  "metaDescription" TEXT,
  "keywords" TEXT[],
  "labels" TEXT[],
  "status" TEXT NOT NULL DEFAULT 'draft',
  "wordCount" INTEGER NOT NULL DEFAULT 0,
  "seoScore" INTEGER,
  "publishedUrl" TEXT,
  "bloggerPostId" TEXT,
  "scheduledFor" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Article_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Article_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "Blog"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Article_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Template table
CREATE TABLE IF NOT EXISTS "Template" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT,
  "structure" TEXT NOT NULL,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_planId_idx" ON "User"("planId");
CREATE INDEX IF NOT EXISTS "Blog_userId_idx" ON "Blog"("userId");
CREATE INDEX IF NOT EXISTS "Article_userId_idx" ON "Article"("userId");
CREATE INDEX IF NOT EXISTS "Article_status_idx" ON "Article"("status");
CREATE INDEX IF NOT EXISTS "Campaign_userId_idx" ON "Campaign"("userId");
CREATE INDEX IF NOT EXISTS "BrandProfile_userId_idx" ON "BrandProfile"("userId");

-- Insert default plans
INSERT INTO "Plan" ("id", "name", "displayName", "description", "price", "yearlyPrice", 
  "articlesPerMonth", "imagesPerMonth", "blogsLimit", "projectsLimit", "brandProfilesLimit", "campaignsLimit",
  "wordsPerArticle", "hasAutoPublish", "hasScheduling", "hasAnalytics", "hasBulkGeneration", "hasTrendIdeas",
  "hasAutoClustering", "hasContentRefresh", "hasApiAccess", "hasPrioritySupport", "hasWhiteLabel", 
  "hasTeamAccess", "teamMembersLimit", "hasAdvancedAI", "hasCompetitorAnalysis", "hasCustomPrompts",
  "isActive", "sortOrder")
VALUES 
  (gen_random_uuid()::text, 'free', 'Free Plan', 'Perfect for trying out BloggerSEO', 0, 0,
   10, 30, 1, 1, 1, 0, 2000, false, false, false, false, false, false, false, false, false, false, false, 1, false, false, false, true, 1),
  (gen_random_uuid()::text, 'pro', 'Pro Plan', 'For serious content creators and bloggers', 29.99, 299.99,
   100, 300, 5, 10, 5, 3, 5000, true, true, true, true, true, true, true, false, true, false, false, 1, true, true, true, true, 2),
  (gen_random_uuid()::text, 'enterprise', 'Enterprise Plan', 'For agencies and large teams', 99.99, 999.99,
   1000, 3000, 50, 100, 50, 50, 10000, true, true, true, true, true, true, true, true, true, true, true, 10, true, true, true, true, 3)
ON CONFLICT ("name") DO NOTHING;

-- Insert default templates
INSERT INTO "Template" ("id", "name", "type", "description", "structure", "isSystem")
VALUES 
  (gen_random_uuid()::text, 'How-To Guide', 'how-to', 'Step-by-step tutorial format', 
   '{"sections":["Introduction","What You''ll Need","Step-by-Step Instructions","Tips & Tricks","Conclusion"]}', true),
  (gen_random_uuid()::text, 'Product Review', 'review', 'Comprehensive product review',
   '{"sections":["Overview","Features","Pros & Cons","Performance","Pricing","Verdict"]}', true),
  (gen_random_uuid()::text, 'Comparison Article', 'comparison', 'Compare multiple options',
   '{"sections":["Introduction","Comparison Table","Option 1 Deep Dive","Option 2 Deep Dive","Which One to Choose","Conclusion"]}', true),
  (gen_random_uuid()::text, 'Listicle', 'listicle', 'Top X list format',
   '{"sections":["Introduction","Item 1","Item 2","Item 3","Item 4","Item 5","Conclusion"]}', true)
ON CONFLICT DO NOTHING;
