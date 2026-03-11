-- Fix Article table schema to match Prisma exactly
-- Run this in Supabase SQL Editor

-- Drop the Article table completely and recreate it with correct schema
DROP TABLE IF EXISTS "GeneratedImage" CASCADE;
DROP TABLE IF EXISTS "PublishLog" CASCADE;
DROP TABLE IF EXISTS "Article" CASCADE;

-- Recreate Article table with correct schema
CREATE TABLE "Article" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "slug" TEXT,
  "content" TEXT NOT NULL,
  "outline" TEXT,
  "metaDescription" TEXT,
  "excerpt" TEXT,
  "labels" TEXT,
  "tone" TEXT NOT NULL DEFAULT 'informational',
  "articleType" TEXT NOT NULL DEFAULT 'blog-post',
  "wordCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "bloggerPostId" TEXT,
  "keywordId" TEXT,
  "blogId" TEXT,
  "userId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign keys
ALTER TABLE "Article" ADD CONSTRAINT "Article_blogId_fkey" 
  FOREIGN KEY ("blogId") REFERENCES "Blog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Article" ADD CONSTRAINT "Article_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create GeneratedImage table
CREATE TABLE "GeneratedImage" (
  "id" TEXT PRIMARY KEY,
  "url" TEXT NOT NULL,
  "altText" TEXT,
  "type" TEXT NOT NULL DEFAULT 'featured',
  "articleId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GeneratedImage_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create PublishLog table
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

-- Create indexes
CREATE INDEX "Article_userId_idx" ON "Article"("userId");
CREATE INDEX "Article_blogId_idx" ON "Article"("blogId");
CREATE INDEX "Article_status_idx" ON "Article"("status");
CREATE INDEX "GeneratedImage_articleId_idx" ON "GeneratedImage"("articleId");

-- Add unique constraint to Blog.blogId if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Blog_blogId_key'
    ) THEN
        DELETE FROM "Blog" a USING "Blog" b
        WHERE a.id > b.id AND a."blogId" = b."blogId";
        
        ALTER TABLE "Blog" ADD CONSTRAINT "Blog_blogId_key" UNIQUE ("blogId");
    END IF;
END $$;
