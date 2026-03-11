-- Final complete schema sync to match Prisma schema exactly
-- Run this in Supabase SQL Editor

-- Add missing columns to Article table
ALTER TABLE "Article" DROP COLUMN IF EXISTS "campaignId";
ALTER TABLE "Article" DROP COLUMN IF EXISTS "projectId";
ALTER TABLE "Article" DROP COLUMN IF EXISTS "keywords";
ALTER TABLE "Article" DROP COLUMN IF EXISTS "seoScore";
ALTER TABLE "Article" DROP COLUMN IF EXISTS "publishedUrl";
ALTER TABLE "Article" DROP COLUMN IF EXISTS "scheduledFor";
ALTER TABLE "Article" DROP COLUMN IF EXISTS "publishedAt";

ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "outline" TEXT;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "metaDescription" TEXT;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "excerpt" TEXT;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "labels" TEXT;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "tone" TEXT NOT NULL DEFAULT 'informational';
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "articleType" TEXT NOT NULL DEFAULT 'blog-post';
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "wordCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "bloggerPostId" TEXT;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "keywordId" TEXT;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "blogId" TEXT;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "userId" UUID;

-- Add unique constraint to Blog.blogId if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Blog_blogId_key'
    ) THEN
        -- Remove duplicates first
        DELETE FROM "Blog" a USING "Blog" b
        WHERE a.id > b.id AND a."blogId" = b."blogId";
        
        -- Add constraint
        ALTER TABLE "Blog" ADD CONSTRAINT "Blog_blogId_key" UNIQUE ("blogId");
    END IF;
END $$;

-- Create GeneratedImage table if not exists
CREATE TABLE IF NOT EXISTS "GeneratedImage" (
  "id" TEXT PRIMARY KEY,
  "url" TEXT NOT NULL,
  "altText" TEXT,
  "type" TEXT NOT NULL DEFAULT 'featured',
  "articleId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GeneratedImage_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Update PublishLog table structure
DROP TABLE IF EXISTS "PublishLog" CASCADE;
CREATE TABLE "PublishLog" (
  "id" TEXT PRIMARY KEY,
  "action" TEXT NOT NULL,
  "bloggerPostId" TEXT,
  "blogId" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "response" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublishLog_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "Blog"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PublishLog_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add foreign key constraints to Article table
DO $$
BEGIN
    -- Add blogId foreign key if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Article_blogId_fkey'
    ) THEN
        ALTER TABLE "Article" ADD CONSTRAINT "Article_blogId_fkey" 
        FOREIGN KEY ("blogId") REFERENCES "Blog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    -- Add userId foreign key if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Article_userId_fkey'
    ) THEN
        ALTER TABLE "Article" ADD CONSTRAINT "Article_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "Article_userId_idx" ON "Article"("userId");
CREATE INDEX IF NOT EXISTS "Article_blogId_idx" ON "Article"("blogId");
CREATE INDEX IF NOT EXISTS "Article_status_idx" ON "Article"("status");
CREATE INDEX IF NOT EXISTS "GeneratedImage_articleId_idx" ON "GeneratedImage"("articleId");
