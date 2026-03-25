# Cloudflare Image Generation Setup Guide

This guide will help you set up Cloudflare Workers AI and R2 for automatic image generation in your blog articles.

## Prerequisites

- A Cloudflare account (free tier works!)
- Access to Cloudflare Dashboard

## Step 1: Get Your Cloudflare Account ID

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **Workers & Pages** → **Overview**
3. On the right sidebar, you'll see your **Account ID**
4. Copy it and add to your `.env`:
   ```
   CLOUDFLARE_ACCOUNT_ID=your-account-id-here
   ```

## Step 2: Create API Token for Workers AI

1. Go to **My Profile** → **API Tokens**
2. Click **Create Token**
3. Click **Get started** next to "Create Custom Token"
4. Configure the token:
   - **Token name**: BloggerSEO Image Generation
   - **Permissions**:
     - Account → Workers AI → Read
     - Account → R2 Storage → Edit
   - **Account Resources**: Include → Your Account
5. Click **Continue to summary** → **Create Token**
6. Copy the token and add to your `.env`:
   ```
   CLOUDFLARE_API_TOKEN=your-api-token-here
   ```

## Step 3: Create R2 Bucket

1. In Cloudflare Dashboard, go to **R2**
2. Click **Create bucket**
3. Enter bucket name: `bloggerseo-images` (or your preferred name)
4. Choose a location (automatic is fine)
5. Click **Create bucket**

## Step 4: Create R2 API Tokens (S3-compatible)

1. In R2 dashboard, click **Manage R2 API Tokens**
2. Click **Create API token**
3. Configure:
   - **Token name**: BloggerSEO Image Upload
   - **Permissions**: Object Read & Write
   - **Specify bucket(s)**: Select your `bloggerseo-images` bucket
   - **TTL**: Forever (or your preference)
4. Click **Create API Token**
5. Copy both the **Access Key ID** and **Secret Access Key**
6. Add to your `.env`:
   ```
   CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key-id
   CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-access-key
   CLOUDFLARE_R2_BUCKET_NAME=bloggerseo-images
   ```

## Step 5: Configure Public Access URL

You have two options for making images publicly accessible:

### Option A: R2.dev Subdomain (Quick & Free)

1. Go to your R2 bucket → **Settings**
2. Under **Public access**, click **Allow Access**
3. Click **Enable R2.dev subdomain**
4. Copy the public URL (e.g., `https://pub-xxxxx.r2.dev`)
5. Add to your `.env`:
   ```
   CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
   ```

### Option B: Custom Domain (Recommended for Production)

1. Go to your R2 bucket → **Settings**
2. Under **Custom Domains**, click **Connect Domain**
3. Enter your domain (e.g., `images.yourdomain.com`)
4. Follow the DNS setup instructions
5. Add to your `.env`:
   ```
   CLOUDFLARE_R2_PUBLIC_URL=https://images.yourdomain.com
   ```

## Step 6: Verify Setup

After adding all environment variables, restart your development server:

```bash
npm run dev
```

When you generate an article with images enabled, check the console logs for:
- ✅ Environment variables detected
- 🎨 Image generation starting
- ☁️ Upload to R2
- ✅ Image ready with public URL

## Troubleshooting

### Images not generating?

Check the console logs for specific error messages:

1. **Missing credentials**: Verify all environment variables are set
2. **R2 upload failed**: Check R2 API token permissions
3. **Invalid URL**: Verify CLOUDFLARE_R2_PUBLIC_URL is correct
4. **Workers AI error**: Ensure API token has Workers AI Read permission

### Common Issues

**"R2 upload error: Access Denied"**
- Your R2 API token doesn't have write permissions
- Recreate the token with "Object Read & Write" permissions

**"CLOUDFLARE_R2_PUBLIC_URL not set"**
- Add the public URL to your `.env` file
- Use either R2.dev subdomain or custom domain

**"Image generation skipped"**
- Check that `includeImages` is enabled in article generation
- Verify CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are set

## Cost & Limits

### Free Tier Includes:
- **Workers AI**: 10,000 AI requests/day
- **R2 Storage**: 10 GB storage
- **R2 Operations**: 1 million Class A operations/month

This is more than enough for most blogs! Each article with 3-5 images uses:
- 3-5 AI requests (image generation)
- 3-5 R2 uploads
- ~1-2 MB storage per article

## Security Notes

- Never commit your `.env` file to version control
- Keep your API tokens secure
- Use environment variables in production (Vercel, Netlify, etc.)
- Consider rotating API tokens periodically

## Need Help?

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify all environment variables are correctly set
3. Test R2 bucket access in Cloudflare Dashboard
4. Ensure your Cloudflare account has Workers AI enabled
