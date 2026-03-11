# 🚀 Deploy BloggerSEO to Hostinger - Complete Guide

## Overview

This guide will walk you through deploying your Next.js BloggerSEO application to Hostinger step-by-step.

---

## 📋 Prerequisites Checklist

Before starting, make sure you have:
- [ ] Hostinger account (we'll create one if needed)
- [ ] Domain name (can purchase through Hostinger)
- [ ] GitHub account (for code deployment)
- [ ] All API keys ready (Google, OpenRouter, Cloudflare, Stripe, etc.)

---

## 🎯 Deployment Strategy

**Important:** Hostinger's shared hosting doesn't support Node.js applications directly. We have **3 options**:

### **Option 1: Hostinger VPS (Recommended for Next.js)**
- Full control over server
- Can run Node.js applications
- Best performance
- Cost: ~$4-8/month

### **Option 2: Vercel (Easiest for Next.js)**
- Free tier available
- Optimized for Next.js
- Automatic deployments
- Use Hostinger only for domain
- Cost: Free (or $20/mo for Pro)

### **Option 3: Hostinger Business Hosting + Vercel**
- Host domain on Hostinger
- Deploy app on Vercel
- Best of both worlds
- Cost: Domain + Vercel free tier

**I recommend Option 2 or 3** because Next.js needs Node.js runtime which Hostinger shared hosting doesn't provide.

---

## 🚀 RECOMMENDED: Deploy to Vercel (Best for Next.js)

### Step 1: Prepare Your Code

1. **Push code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - BloggerSEO"
   git branch -M main
   git remote add origin https://github.com/yourusername/bloggerseo.git
   git push -u origin main
   ```

2. **Create `.gitignore` if not exists:**
   ```
   node_modules/
   .next/
   .env
   .env.local
   .DS_Store
   *.log
   ```

---

### Step 2: Set Up Database (Supabase - Already Done!)

✅ You're already using Supabase for database, so this is ready!

Just make sure you have:
- `DATABASE_URL` (for connection pooling)
- `DIRECT_URL` (for migrations)

---

### Step 3: Deploy to Vercel

1. **Go to Vercel:**
   - Visit: https://vercel.com
   - Click "Sign Up" → Use GitHub account

2. **Import Your Repository:**
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Select "BloggerSEO" repo

3. **Configure Project:**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./` (leave default)
   - **Build Command:** `npm run build` (auto-filled)
   - **Output Directory:** `.next` (auto-filled)

4. **Add Environment Variables:**
   Click "Environment Variables" and add ALL variables from your `.env` file:

   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key
   
   # Database
   DATABASE_URL=your-database-url
   DIRECT_URL=your-direct-url
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   
   # OpenRouter AI
   OPENROUTER_API_KEY=your-openrouter-key
   
   # Cloudflare
   CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
   CLOUDFLARE_API_TOKEN=your-cloudflare-token
   CLOUDFLARE_R2_BUCKET=your-bucket-name
   CLOUDFLARE_R2_PUBLIC_URL=your-r2-url
   
   # Keyword Research
   SERPER_API_KEY=your-serper-key
   
   # Cron Secret
   CRON_SECRET=your-cron-secret
   
   # Stripe (add later)
   STRIPE_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_ID_STARTER=price_...
   STRIPE_PRICE_ID_PRO=price_...
   STRIPE_PRICE_ID_ENTERPRISE=price_...
   
   # App URLs (update after deployment)
   NEXTAUTH_URL=https://your-domain.vercel.app
   NEXTAUTH_SECRET=your-nextauth-secret
   ```

5. **Click "Deploy"**
   - Vercel will build and deploy your app
   - Takes 2-5 minutes
   - You'll get a URL like: `bloggerseo.vercel.app`

---

### Step 4: Run Database Migrations

After deployment, run migrations:

1. **Install Vercel CLI locally:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Link your project:**
   ```bash
   vercel link
   ```

4. **Run migration:**
   ```bash
   vercel env pull .env.production
   npx prisma db push
   ```

---

### Step 5: Configure Custom Domain (Hostinger)

1. **Buy domain on Hostinger:**
   - Go to: https://www.hostinger.com/domain-name-search
   - Search for your domain (e.g., `bloggerseo.com`)
   - Purchase domain (~$10/year)

2. **Point domain to Vercel:**
   - In Hostinger DNS settings, add these records:
   
   **A Record:**
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   ```
   
   **CNAME Record:**
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

3. **Add domain in Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Domains
   - Add your domain: `bloggerseo.com`
   - Add `www.bloggerseo.com`
   - Vercel will auto-configure SSL (HTTPS)

4. **Wait for DNS propagation** (5-30 minutes)

---

### Step 6: Update OAuth Redirect URLs

After getting your production URL, update:

1. **Google OAuth Console:**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Edit your OAuth client
   - Add authorized redirect URIs:
     ```
     https://bloggerseo.com/auth/callback
     https://www.bloggerseo.com/auth/callback
     ```

2. **Supabase Auth Settings:**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add site URL: `https://bloggerseo.com`
   - Add redirect URLs:
     ```
     https://bloggerseo.com/**
     https://www.bloggerseo.com/**
     ```

---

### Step 7: Set Up Stripe Webhook (Production)

1. **Go to Stripe Dashboard:**
   - https://dashboard.stripe.com/webhooks
   - Make sure you're in **LIVE MODE**

2. **Add endpoint:**
   - Endpoint URL: `https://bloggerseo.com/api/stripe/webhook`
   - Select events (same as before)
   - Copy webhook secret

3. **Update Vercel environment variable:**
   - Go to Vercel → Settings → Environment Variables
   - Update `STRIPE_WEBHOOK_SECRET` with new value
   - Redeploy: `vercel --prod`

---

### Step 8: Set Up Cron Jobs (Vercel)

Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/publish",
      "schedule": "0 * * * *"
    }
  ]
}
```

This runs your auto-publish cron every hour.

---

## 🔧 Alternative: Hostinger VPS Deployment

If you prefer full control, here's how to deploy on Hostinger VPS:

### Step 1: Order Hostinger VPS

1. Go to: https://www.hostinger.com/vps-hosting
2. Choose a plan (KVM 1 is enough to start - $4.99/mo)
3. Complete purchase

### Step 2: Access VPS

1. Go to Hostinger hPanel
2. Click on your VPS
3. Note down:
   - IP Address
   - SSH Access credentials

### Step 3: Connect via SSH

```bash
ssh root@your-vps-ip
```

### Step 4: Install Node.js & Dependencies

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Install Nginx (web server)
apt install -y nginx

# Install Git
apt install -y git
```

### Step 5: Clone Your Repository

```bash
cd /var/www
git clone https://github.com/yourusername/bloggerseo.git
cd bloggerseo
npm install
```

### Step 6: Set Up Environment Variables

```bash
nano .env
```

Paste all your environment variables, then save (Ctrl+X, Y, Enter)

### Step 7: Build Application

```bash
npm run build
```

### Step 8: Start with PM2

```bash
pm2 start npm --name "bloggerseo" -- start
pm2 save
pm2 startup
```

### Step 9: Configure Nginx

```bash
nano /etc/nginx/sites-available/bloggerseo
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name bloggerseo.com www.bloggerseo.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/bloggerseo /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Step 10: Install SSL Certificate

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d bloggerseo.com -d www.bloggerseo.com
```

---

## 📊 Cost Comparison

| Option | Monthly Cost | Pros | Cons |
|--------|-------------|------|------|
| **Vercel Free** | $0 | Easy, fast, auto-deploy | Limited bandwidth |
| **Vercel Pro** | $20 | Unlimited, best performance | More expensive |
| **Hostinger VPS** | $5-8 | Full control, cheap | Manual setup, maintenance |
| **Hostinger + Vercel** | $10/year domain + Vercel | Best of both | Need to manage domain |

---

## ✅ Post-Deployment Checklist

- [ ] Site loads at your domain
- [ ] HTTPS/SSL working
- [ ] Google OAuth login works
- [ ] Can create articles
- [ ] Can publish to Blogger
- [ ] Stripe checkout works (test mode first!)
- [ ] Webhooks receiving events
- [ ] Cron jobs running
- [ ] Database migrations applied
- [ ] All API integrations working

---

## 🐛 Troubleshooting

### Build Fails on Vercel
- Check build logs in Vercel dashboard
- Ensure all dependencies in `package.json`
- Verify environment variables are set

### OAuth Redirect Error
- Update redirect URLs in Google Console
- Update Supabase site URL
- Clear browser cache

### Database Connection Error
- Verify `DATABASE_URL` is correct
- Check Supabase is not paused
- Ensure IP is whitelisted (if applicable)

### Stripe Webhook Not Working
- Verify webhook URL is correct
- Check webhook secret matches
- Test with Stripe CLI locally first

---

## 🎉 You're Live!

Once deployed, your BloggerSEO app will be accessible at your domain with:
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Automatic deployments on git push
- ✅ Serverless functions for API routes
- ✅ Edge caching for static assets

**Recommended:** Start with Vercel free tier, then upgrade as you grow!
