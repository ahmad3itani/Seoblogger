-- Add missing columns to existing tables
-- Run this in Supabase SQL Editor

-- Add missing columns to Usage table
ALTER TABLE "Usage" ADD COLUMN IF NOT EXISTS "articlesGenerated" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Usage" ADD COLUMN IF NOT EXISTS "imagesGenerated" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Usage" ADD COLUMN IF NOT EXISTS "totalWordsGenerated" INTEGER NOT NULL DEFAULT 0;

-- Add missing columns to Blog table
ALTER TABLE "Blog" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Add missing columns to User table (if not already added)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3);

-- Create index on Usage table if not exists
CREATE INDEX IF NOT EXISTS "Usage_userId_idx" ON "Usage"("userId");
