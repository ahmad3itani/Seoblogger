-- Complete schema fix to match Prisma schema exactly
-- Run this in Supabase SQL Editor

-- Drop and recreate Usage table with correct columns
DROP TABLE IF EXISTS "Usage" CASCADE;
CREATE TABLE "Usage" (
  "id" TEXT PRIMARY KEY,
  "userId" UUID NOT NULL UNIQUE,
  "articlesGenerated" INTEGER NOT NULL DEFAULT 0,
  "imagesGenerated" INTEGER NOT NULL DEFAULT 0,
  "apiCallsCount" INTEGER NOT NULL DEFAULT 0,
  "wordsGenerated" INTEGER NOT NULL DEFAULT 0,
  "totalArticles" INTEGER NOT NULL DEFAULT 0,
  "totalImages" INTEGER NOT NULL DEFAULT 0,
  "totalWords" INTEGER NOT NULL DEFAULT 0,
  "totalApiCalls" INTEGER NOT NULL DEFAULT 0,
  "lastResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Update Blog table to ensure description column exists
ALTER TABLE "Blog" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Drop and recreate Subscription table with correct schema
DROP TABLE IF EXISTS "Subscription" CASCADE;
CREATE TABLE "Subscription" (
  "id" TEXT PRIMARY KEY,
  "userId" UUID NOT NULL UNIQUE,
  "planId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
  "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT UNIQUE,
  "stripePaymentMethodId" TEXT,
  "trialStart" TIMESTAMP(3),
  "trialEnd" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON UPDATE CASCADE
);

-- Create Project table if not exists
CREATE TABLE IF NOT EXISTS "Project" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "niche" TEXT,
  "language" TEXT NOT NULL DEFAULT 'en',
  "country" TEXT NOT NULL DEFAULT 'US',
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create Keyword table if not exists
CREATE TABLE IF NOT EXISTS "Keyword" (
  "id" TEXT PRIMARY KEY,
  "keyword" TEXT NOT NULL,
  "volume" INTEGER,
  "difficulty" INTEGER,
  "cpc" DECIMAL(10,2),
  "projectId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Keyword_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create BrandProfile table if not exists
CREATE TABLE IF NOT EXISTS "BrandProfile" (
  "id" TEXT PRIMARY KEY,
  "userId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "tone" TEXT NOT NULL DEFAULT 'professional',
  "customInstructions" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrandProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create Campaign table if not exists
CREATE TABLE IF NOT EXISTS "Campaign" (
  "id" TEXT PRIMARY KEY,
  "userId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "niche" TEXT NOT NULL,
  "targetAudience" TEXT,
  "keywords" TEXT[],
  "frequency" TEXT NOT NULL DEFAULT 'weekly',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "nextRunAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Update Article table structure
DROP TABLE IF EXISTS "Article" CASCADE;
CREATE TABLE "Article" (
  "id" TEXT PRIMARY KEY,
  "userId" UUID NOT NULL,
  "blogId" TEXT,
  "campaignId" TEXT,
  "projectId" TEXT,
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
  CONSTRAINT "Article_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Article_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create PublishLog table
CREATE TABLE IF NOT EXISTS "PublishLog" (
  "id" TEXT PRIMARY KEY,
  "articleId" TEXT NOT NULL,
  "blogId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "error" TEXT,
  "publishedUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublishLog_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PublishLog_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "Blog"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "Usage_userId_idx" ON "Usage"("userId");
CREATE INDEX IF NOT EXISTS "Blog_userId_idx" ON "Blog"("userId");
CREATE INDEX IF NOT EXISTS "Article_userId_idx" ON "Article"("userId");
CREATE INDEX IF NOT EXISTS "Article_status_idx" ON "Article"("status");
CREATE INDEX IF NOT EXISTS "Campaign_userId_idx" ON "Campaign"("userId");
CREATE INDEX IF NOT EXISTS "BrandProfile_userId_idx" ON "BrandProfile"("userId");
CREATE INDEX IF NOT EXISTS "Project_userId_idx" ON "Project"("userId");
CREATE INDEX IF NOT EXISTS "Keyword_projectId_idx" ON "Keyword"("projectId");
