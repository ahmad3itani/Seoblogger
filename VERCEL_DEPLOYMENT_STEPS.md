# 🚀 Vercel Deployment - Step by Step

## Current Step: Push to GitHub

Follow these steps exactly:

---

## Step 1: Create GitHub Repository (5 minutes)

1. **Go to GitHub:** https://github.com/new
   - If you don't have an account, sign up first at https://github.com/signup

2. **Create repository:**
   - Repository name: `bloggerseo` (or any name you prefer)
   - Description: "AI-powered SEO content generator for Blogger"
   - Choose: **Private** (recommended) or Public
   - **DO NOT** check "Initialize with README"
   - Click "Create repository"

3. **Copy the repository URL** (you'll need this)
   - Example: `https://github.com/yourusername/bloggerseo.git`

---

## Step 2: Push Code to GitHub (5 minutes)

Open your terminal in the BloggerSEO folder and run these commands:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - BloggerSEO ready for deployment"

# Set main branch
git branch -M main

# Add remote (replace with YOUR repository URL)
git remote add origin https://github.com/YOUR_USERNAME/bloggerseo.git

# Push to GitHub
git push -u origin main
```

**If you get an error about authentication:**
- GitHub now requires personal access token
- Go to: https://github.com/settings/tokens
- Generate new token (classic)
- Use token as password when prompted

---

## Step 3: Deploy to Vercel (10 minutes)

1. **Go to Vercel:** https://vercel.com/signup
   - Click "Continue with GitHub"
   - Authorize Vercel to access your GitHub

2. **Import Project:**
   - Click "Add New..." → "Project"
   - You'll see your GitHub repositories
   - Find "bloggerseo" and click "Import"

3. **Configure Project:**
   - **Project Name:** bloggerseo (or customize)
   - **Framework Preset:** Next.js (auto-detected) ✅
   - **Root Directory:** ./ (leave default)
   - **Build Command:** Leave default
   - **Output Directory:** Leave default
   - **Install Command:** Leave default

4. **DON'T DEPLOY YET!** Click "Environment Variables" first

---

## Step 4: Add Environment Variables (10 minutes)

**IMPORTANT:** Add ALL these variables before deploying!

Click "Environment Variables" and add each one:

### Required Variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Database
DATABASE_URL=
DIRECT_URL=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# OpenRouter AI
OPENROUTER_API_KEY=

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_PUBLIC_URL=

# Keyword Research
SERPER_API_KEY=

# Cron Secret
CRON_SECRET=

# NextAuth
NEXTAUTH_SECRET=
```

**For each variable:**
1. Copy the name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
2. Paste the value from your local `.env` file
3. Click "Add"
4. Repeat for all variables

**NEXTAUTH_URL:** Leave this for now, we'll update it after deployment

---

## Step 5: Deploy! (3 minutes)

1. After adding all environment variables, click **"Deploy"**

2. **Wait for deployment** (2-5 minutes)
   - You'll see build logs
   - Watch for any errors
   - Green checkmark = success!

3. **Get your URL:**
   - You'll get a URL like: `bloggerseo-abc123.vercel.app`
   - Click "Visit" to see your live site
   - **Copy this URL** - you'll need it for next steps

---

## Step 6: Update Environment Variables (2 minutes)

1. **In Vercel Dashboard:**
   - Go to Settings → Environment Variables
   - Find `NEXTAUTH_URL`
   - If it doesn't exist, add it:
     - Name: `NEXTAUTH_URL`
     - Value: `https://your-vercel-url.vercel.app`
     - Click "Add"

2. **Redeploy:**
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"

---

## Step 7: Update Google OAuth (5 minutes)

1. **Go to Google Cloud Console:**
   https://console.cloud.google.com/apis/credentials

2. **Find your OAuth 2.0 Client ID** and click edit

3. **Add Authorized Redirect URIs:**
   - Click "Add URI"
   - Add: `https://your-vercel-url.vercel.app/auth/callback`
   - Click "Add URI" again
   - Add: `https://your-vercel-url.vercel.app/api/auth/callback/google`
   - Click "Save"

---

## Step 8: Update Supabase (3 minutes)

1. **Go to Supabase Dashboard:**
   https://supabase.com/dashboard

2. **Select your project**

3. **Go to Authentication → URL Configuration:**
   - **Site URL:** `https://your-vercel-url.vercel.app`
   - **Redirect URLs:** Add `https://your-vercel-url.vercel.app/**`
   - Click "Save"

---

## Step 9: Test Your Deployment! (5 minutes)

1. **Visit your Vercel URL:** `https://your-vercel-url.vercel.app`

2. **Test these features:**
   - [ ] Homepage loads
   - [ ] Click "Sign In"
   - [ ] Login with Google
   - [ ] Dashboard loads
   - [ ] Try creating a test article
   - [ ] Check if Blogger connection works

**If something doesn't work:**
- Check Vercel build logs
- Verify all environment variables are set
- Check browser console for errors

---

## Step 10: Run Database Migration (Optional)

If you need to add Stripe fields to database:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Pull production environment
vercel env pull .env.production

# Run migration
npx prisma db push
```

---

## 🎉 You're Live!

Your BloggerSEO app is now running on Vercel at:
**https://your-vercel-url.vercel.app**

---

## Next Steps (Optional):

### Add Custom Domain
1. Buy domain on Hostinger or Namecheap
2. In Vercel: Settings → Domains → Add Domain
3. Follow DNS configuration instructions
4. Wait for SSL certificate (automatic)

### Add Stripe (Later)
1. Set up webhook with production URL
2. Add Stripe environment variables
3. Redeploy

### Set Up Monitoring
- Vercel Analytics (free)
- Error tracking with Sentry
- Uptime monitoring

---

## 🆘 Troubleshooting

**Build fails:**
- Check Vercel build logs
- Ensure all dependencies in package.json
- Verify Node.js version compatibility

**OAuth errors:**
- Double-check redirect URLs in Google Console
- Clear browser cache
- Try incognito mode

**Database errors:**
- Verify DATABASE_URL is correct
- Check Supabase project is active
- Run migrations if needed

**Environment variable issues:**
- Make sure all variables are added
- No typos in variable names
- Redeploy after adding variables

---

## 📞 Need Help?

Let me know which step you're on and I'll help you through it!
