-- Check if Blogger tokens are saved for your account
-- Run this in Supabase SQL Editor

SELECT 
  email,
  "googleAccessToken" IS NOT NULL as has_access_token,
  "googleRefreshToken" IS NOT NULL as has_refresh_token,
  "googleTokenExpiry"
FROM "User"
WHERE email = 'ahmed3itani@gmail.com';

-- If has_access_token is false, the OAuth callback didn't save the tokens
-- Check Vercel logs for errors during the OAuth callback
