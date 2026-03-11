-- Fix user sync issues
-- Run this in Supabase SQL Editor

-- 1. Check if Plans exist
SELECT * FROM "Plan";

-- 2. If no plans exist, create them
INSERT INTO "Plan" (id, name, "displayName", price, "articlesPerMonth", "imagesPerMonth", "campaignsAllowed", "bulkGeneration", "seoOptimization", "autoPublish", "prioritySupport")
VALUES 
  (gen_random_uuid(), 'free', 'Free', 0, 10, 30, false, false, true, false, false),
  (gen_random_uuid(), 'starter', 'Starter', 12, 50, 150, true, false, true, true, false),
  (gen_random_uuid(), 'pro', 'Pro', 39, 200, 600, true, true, true, true, true),
  (gen_random_uuid(), 'enterprise', 'Enterprise', 99, 999999, 999999, true, true, true, true, true)
ON CONFLICT (name) DO NOTHING;

-- 3. Manually create your user record (replace with your actual Supabase user ID)
-- First, get your Supabase user ID by running:
-- SELECT id, email FROM auth.users WHERE email = 'ahmed3itani@gmail.com';

-- Then insert your user (replace YOUR_SUPABASE_USER_ID with the actual ID):
-- INSERT INTO "User" (id, email, name, role, "planId")
-- VALUES (
--   'YOUR_SUPABASE_USER_ID',
--   'ahmed3itani@gmail.com',
--   'Ahmed Itani',
--   'admin',
--   (SELECT id FROM "Plan" WHERE name = 'enterprise')
-- )
-- ON CONFLICT (id) DO UPDATE SET
--   role = 'admin',
--   "planId" = (SELECT id FROM "Plan" WHERE name = 'enterprise');

-- 4. Create usage record
-- INSERT INTO "Usage" ("userId", "articlesGenerated", "imagesGenerated", "articlesLimit", "imagesLimit")
-- VALUES (
--   'YOUR_SUPABASE_USER_ID',
--   0,
--   0,
--   999999,
--   999999
-- )
-- ON CONFLICT ("userId") DO UPDATE SET
--   "articlesLimit" = 999999,
--   "imagesLimit" = 999999;
