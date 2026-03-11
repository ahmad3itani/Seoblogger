-- Grant full admin access to ahmed3itani@gmail.com
-- Run this in Supabase SQL Editor

-- First, find the Enterprise plan ID
DO $$
DECLARE
  enterprise_plan_id TEXT;
  user_id UUID;
BEGIN
  -- Get Enterprise plan ID
  SELECT id INTO enterprise_plan_id FROM "Plan" WHERE name = 'enterprise' LIMIT 1;
  
  -- Get user ID by email
  SELECT id INTO user_id FROM "User" WHERE email = 'ahmed3itani@gmail.com' LIMIT 1;
  
  -- Update user to Enterprise plan with admin role
  UPDATE "User"
  SET 
    "planId" = enterprise_plan_id,
    role = 'admin',
    "stripeSubscriptionStatus" = 'active',
    "stripeCurrentPeriodEnd" = NOW() + INTERVAL '100 years'
  WHERE email = 'ahmed3itani@gmail.com';
  
  -- Reset or create usage limits for unlimited access
  INSERT INTO "Usage" (
    "userId",
    "articlesGenerated",
    "imagesGenerated",
    "articlesLimit",
    "imagesLimit",
    "resetDate"
  )
  VALUES (
    user_id,
    0,
    0,
    999999,
    999999,
    NOW() + INTERVAL '100 years'
  )
  ON CONFLICT ("userId") 
  DO UPDATE SET
    "articlesLimit" = 999999,
    "imagesLimit" = 999999,
    "resetDate" = NOW() + INTERVAL '100 years';
  
  RAISE NOTICE 'Admin access granted to ahmed3itani@gmail.com';
END $$;
