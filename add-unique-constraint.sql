-- Add unique constraint to Blog.blogId
-- Run this in Supabase SQL Editor

-- First, remove any duplicate blogId entries if they exist
DELETE FROM "Blog" a USING "Blog" b
WHERE a.id > b.id AND a."blogId" = b."blogId";

-- Now add the unique constraint
ALTER TABLE "Blog" ADD CONSTRAINT "Blog_blogId_key" UNIQUE ("blogId");
