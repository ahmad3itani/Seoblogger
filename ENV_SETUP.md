# Environment Variables Setup

## Required Environment Variables

Add these to your `.env` file:

### AI Generation (OpenRouter - Free)
```env
OPENROUTER_API_KEY=your_openrouter_key_here
AI_MODEL=meta-llama/llama-3.3-70b-instruct:free
```

Get your free API key: https://openrouter.ai/

---

### Image Generation (Cloudflare Workers AI - Free)

**NEW: We now use Cloudflare Workers AI instead of OpenAI DALL-E**

```env
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
```

**Setup Instructions:**

1. **Create Cloudflare Account** (free): https://dash.cloudflare.com/sign-up

2. **Get Account ID:**
   - Go to: https://dash.cloudflare.com/
   - Click on "Workers & Pages" in the left sidebar
   - Your Account ID is displayed at the top right

3. **Create API Token:**
   - Go to: https://dash.cloudflare.com/profile/api-tokens
   - Click "Create Token"
   - Use template: "Edit Cloudflare Workers"
   - OR create custom token with permissions:
     - Account > Workers AI > Edit
   - Copy the token (you'll only see it once!)

**Free Tier Limits:**
- 10,000 image generations per day
- Model: `@cf/stabilityai/stable-diffusion-xl-base-1.0`
- No credit card required

---

### Image Hosting (Imgur - Free, Optional)

**Option 1: Imgur (Recommended - Easiest)**

```env
IMGUR_CLIENT_ID=your_imgur_client_id
```

**Setup Instructions:**

1. Go to: https://api.imgur.com/oauth2/addclient
2. Register your application:
   - Application name: "BloggerSEO"
   - Authorization type: "OAuth 2 authorization without a callback URL"
3. Copy the Client ID

**Free Tier:**
- 12,500 uploads per day
- No credit card required
- Permanent hosting

**Option 2: Base64 Data URLs (Fallback)**

If you don't configure Imgur, images will be embedded as base64 data URLs. This works but makes HTML files larger.

**Option 3: Cloudflare R2 (Advanced)**

For custom domain hosting, you can use Cloudflare R2:

```env
CLOUDFLARE_R2_ACCESS_KEY_ID=your_r2_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_r2_secret_key
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
CLOUDFLARE_R2_PUBLIC_DOMAIN=your-custom-domain.com
```

---

### Database (Required)
```env
DATABASE_URL=your_postgresql_connection_string
```

### Authentication (Required)
```env
NEXTAUTH_SECRET=your_random_secret_here
NEXTAUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
```

---

## Complete .env Template

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bloggerseo

# Authentication
NEXTAUTH_SECRET=generate_a_random_secret_here
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

# AI Generation (OpenRouter - Free)
OPENROUTER_API_KEY=your_openrouter_key_here
AI_MODEL=meta-llama/llama-3.3-70b-instruct:free

# Image Generation (Cloudflare Workers AI - Free)
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token

# Image Hosting (Imgur - Free, Optional)
IMGUR_CLIENT_ID=your_imgur_client_id

# Optional: Cloudflare R2 for custom domain hosting
# CLOUDFLARE_R2_ACCESS_KEY_ID=your_r2_access_key
# CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_r2_secret_key
# CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
# CLOUDFLARE_R2_PUBLIC_DOMAIN=your-custom-domain.com
```

---

## Cost Breakdown

| Service | Free Tier | Cost |
|---------|-----------|------|
| **OpenRouter AI** | 200 requests/day | $0 |
| **Cloudflare Workers AI** | 10,000 images/day | $0 |
| **Imgur Hosting** | 12,500 uploads/day | $0 |
| **Total** | - | **$0/month** |

**No credit card required for any service!**

---

## Testing Your Setup

1. Add all environment variables to `.env`
2. Restart your dev server: `npm run dev`
3. Go to `/dashboard/new`
4. Generate an article with images enabled
5. Check console logs for:
   - ✅ "Generating featured image with Cloudflare Workers AI..."
   - ✅ "Uploading to Imgur..."
   - ✅ "Image generated and hosted: https://i.imgur.com/..."

---

## Troubleshooting

### "Cloudflare credentials missing"
- Check that `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are set
- Verify Account ID format (32 hex characters)
- Verify API token has Workers AI permissions

### "Imgur upload failed"
- Check that `IMGUR_CLIENT_ID` is set correctly
- Verify you registered the application on Imgur
- Check daily upload limit (12,500/day)

### Images not showing in article
- Check browser console for errors
- Verify image URL is accessible
- If using base64, check HTML file size (may be large)

---

## Migration from OpenAI DALL-E

If you were previously using OpenAI DALL-E:

1. Remove `OPENAI_API_KEY` from `.env` (no longer needed for images)
2. Add Cloudflare credentials as shown above
3. Add Imgur credentials for hosting
4. Restart server

**Benefits of Cloudflare Workers AI:**
- ✅ Free tier (10,000/day vs OpenAI's paid-only)
- ✅ No credit card required
- ✅ Faster generation
- ✅ Stable Diffusion XL quality
- ✅ Imgur hosting = permanent URLs
