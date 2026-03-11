# Quick Start: Free Image Generation Setup

Get AI-generated images working in 5 minutes with **zero cost**.

---

## Step 1: Get Cloudflare Credentials (2 minutes)

### 1.1 Create Free Account
Go to: https://dash.cloudflare.com/sign-up

### 1.2 Get Account ID
1. After login, go to: https://dash.cloudflare.com/
2. Click "Workers & Pages" in left sidebar
3. Copy your **Account ID** (top right corner)

### 1.3 Create API Token
1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"**
3. Use template: **"Edit Cloudflare Workers"**
4. Click **"Continue to summary"** → **"Create Token"**
5. **Copy the token** (you'll only see it once!)

---

## Step 2: Create R2 Bucket (2 minutes)

### 2.1 Create Bucket
1. Go to: https://dash.cloudflare.com/
2. Click **"R2"** in the left sidebar
3. Click **"Create bucket"**
4. Bucket name: **bloggerseo-images** (or any name you prefer)
5. Click **"Create bucket"**

### 2.2 Enable Public Access
1. Click on your bucket name
2. Go to **"Settings"** tab
3. Scroll to **"Public access"**
4. Click **"Allow Access"** (this enables R2.dev subdomain)
5. Copy the **Public R2.dev Bucket URL** (you'll need this later)

---

## Step 3: Add to .env File (1 minute)

Create or edit `.env` in your project root:

```env
# Image Generation (Cloudflare Workers AI - Free)
CLOUDFLARE_ACCOUNT_ID=paste_your_account_id_here
CLOUDFLARE_API_TOKEN=paste_your_api_token_here

# Image Hosting (Cloudflare R2 - Free)
CLOUDFLARE_R2_BUCKET_NAME=bloggerseo-images
```

**Example:**
```env
CLOUDFLARE_ACCOUNT_ID=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
CLOUDFLARE_API_TOKEN=7AY-VBdzXxMfLWAap3lMfviOIDni8WvBWirS1Kor
CLOUDFLARE_R2_BUCKET_NAME=bloggerseo-images
```

**Note:** If you named your bucket something else, use that name instead.

---

## Step 4: Restart Server (30 seconds)

```bash
# Stop current server (Ctrl+C)
# Start again
npm run dev
```

---

## Step 5: Test It! (1 minute)

1. Go to: http://localhost:3000/dashboard/new
2. Enter any keyword (e.g., "best coffee maker")
3. Enable **"Include Images"** toggle
4. Click **"Generate Article"**
5. Watch the console logs:
   ```
   ✅ Generating featured image with Cloudflare Workers AI...
   ✅ Uploading to Cloudflare R2...
   ✅ Image generated and hosted: https://pub-xxxxx.r2.dev/...
   ```

---

## ✅ You're Done!

**What You Get:**
- 🎨 **10,000 AI images/day** (Cloudflare Workers AI)
- 🖼️ **10GB free storage** (Cloudflare R2)
- 💰 **$0/month** (completely free)
- 🚀 **Permanent image URLs with CDN**
- ⚡ **5-9 seconds per image**
- 🌐 **Your own R2.dev subdomain**

---

## Troubleshooting

### "Cloudflare credentials missing"
- Check `.env` file exists in project root
- Verify `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are set
- Restart server after adding credentials

### "R2 upload failed"
- Verify bucket name matches `.env` file
- Check that public access is enabled on the bucket
- Verify API token has R2 permissions
- Make sure you created the bucket in the same account

### Images not showing
- Check browser console for errors
- Verify image URL is accessible (click it)
- Make sure you restarted the server after adding credentials

---

## What Happens Behind the Scenes

```
1. AI generates image prompt from your keyword
   ↓
2. Cloudflare Workers AI creates the image (Stable Diffusion XL)
   ↓
3. Image uploaded to Cloudflare R2 bucket
   ↓
4. Public R2.dev URL returned and embedded in article
```

---

## Free Tier Limits

| Service | Free Tier | Notes |
|---------|-----------|-------|
| Cloudflare Workers AI | 10,000 images/day | ~300,000/month |
| Cloudflare R2 Storage | 10GB storage | Unlimited requests |
| R2 Egress | Unlimited | Free to Cloudflare network |

**No credit card required!**

---

## Next Steps

- Generate your first article with images
- Try different image types (featured, content, social)
- Check out `ENV_SETUP.md` for advanced options
- Read `src/lib/cloudflare/README.md` for API details

---

## Need Help?

Check the full documentation:
- `ENV_SETUP.md` - Complete environment setup
- `src/lib/cloudflare/README.md` - Image generation API reference

**Common Issues:**
- Account ID format: 32 hexadecimal characters
- API token: Needs "Workers AI > Edit" permission
- Imgur Client ID: From OAuth registration page
