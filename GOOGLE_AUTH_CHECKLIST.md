# 🔐 Google OAuth Sign-In Checklist

Your Google sign-in is failing. Follow this checklist to fix it:

## ✅ Step 1: Verify Supabase Configuration

### In Supabase Dashboard:
1. Go to **Authentication** → **Providers** → **Google**
2. **Enable Google provider**
3. Add these **Authorized redirect URIs**:
   ```
   https://your-project.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback
   ```

### Get Google OAuth Credentials:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create/Select a project
3. Enable **Google+ API** and **Blogger API**
4. Go to **APIs & Services** → **Credentials**
5. Create **OAuth 2.0 Client ID** (Web application)
6. Add **Authorized redirect URIs**:
   ```
   https://your-project.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback
   ```
7. Copy **Client ID** and **Client Secret**

### Add to Supabase:
1. Paste **Client ID** and **Client Secret** in Supabase Google provider settings
2. **Save**

## ✅ Step 2: Verify Environment Variables

Check your `.env` file has:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Database (Required)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Google OAuth (Optional - only if you want to store tokens)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Serper API (Already configured)
SERPER_API_KEY=0be058f0f9036db0f73e5ad1a0dbd6bf3a9d2ac1
```

**Note:** You don't need `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env` if you configured them in Supabase. Supabase handles the OAuth flow.

## ✅ Step 3: Check Database Schema

Ensure your `User` table has these columns:
- `id` (UUID, primary key)
- `email` (String)
- `googleAccessToken` (String, nullable)
- `googleRefreshToken` (String, nullable)
- `googleTokenExpiry` (DateTime, nullable)

Run this if needed:
```sql
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "googleAccessToken" TEXT,
ADD COLUMN IF NOT EXISTS "googleRefreshToken" TEXT,
ADD COLUMN IF NOT EXISTS "googleTokenExpiry" TIMESTAMP;
```

## ✅ Step 4: Test the Flow

1. **Restart your dev server:**
   ```bash
   npm run dev
   ```

2. **Open browser console** (F12)

3. **Go to login page:**
   ```
   http://localhost:3000/auth/login
   ```

4. **Click "Continue with Google"**

5. **Watch console logs:**
   - Should redirect to Google
   - After Google auth, should redirect to `/auth/callback`
   - Should see: `✅ Auth successful, redirecting to: /dashboard`
   - Should redirect to dashboard

## 🐛 Common Issues & Fixes

### Issue 1: "Authentication failed. Please try again."
**Cause:** OAuth callback failed
**Fix:** 
- Check Supabase redirect URIs match exactly
- Verify Google OAuth credentials are correct in Supabase
- Check browser console for specific error

### Issue 2: Stuck on callback page
**Cause:** Middleware blocking redirect
**Fix:** Already fixed - middleware now skips API routes

### Issue 3: "Unexpected token '<', '<!DOCTYPE'..."
**Cause:** API returning HTML instead of JSON
**Fix:** Already fixed - middleware and error handling improved

### Issue 4: Redirects to login with error
**Cause:** `exchangeCodeForSession` failed
**Check:**
- Browser console for error message
- Server logs for detailed error
- Supabase logs in dashboard

## 🔍 Debug Mode

Add this to your `.env` for detailed logs:
```bash
NEXT_PUBLIC_SUPABASE_DEBUG=true
```

Then check browser console during login for detailed Supabase auth logs.

## 📝 Current Code Status

✅ **Login page** - Correctly configured with Google OAuth
✅ **Auth callback** - Handles Google OAuth with error logging
✅ **Middleware** - Skips API routes, won't interfere
✅ **User sync** - Stores Google tokens after successful auth
✅ **Error handling** - Comprehensive logging and fallbacks

## 🎯 Most Likely Issue

**Your Supabase Google OAuth is not configured.**

The code is correct. You need to:
1. Enable Google provider in Supabase Dashboard
2. Add Google OAuth credentials to Supabase
3. Add correct redirect URIs

Without this, Google OAuth will fail every time.

## 🆘 Still Not Working?

Check browser console and tell me the exact error message. The logs will show:
- `❌ Auth failed:` with error details
- Or specific Supabase error messages

This will tell us exactly what's wrong.
