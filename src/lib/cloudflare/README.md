# Cloudflare Workers AI Image Generation

This module handles AI image generation using Cloudflare Workers AI and automatic hosting.

## Features

- ✅ **Free Image Generation**: 10,000 images/day with Cloudflare Workers AI
- ✅ **Stable Diffusion XL**: High-quality image generation
- ✅ **Automatic Hosting**: Upload to Imgur (free, permanent URLs)
- ✅ **No Credit Card**: Completely free tier
- ✅ **Multiple Image Types**: Featured, content, social, process images

## Architecture

```
User Request
    ↓
Generate Image Prompt (OpenRouter AI)
    ↓
Generate Image (Cloudflare Workers AI)
    ↓
Upload to Imgur (or R2)
    ↓
Return Public URL
```

## API Reference

### `generateImageWithCloudflare(prompt, accountId, apiToken)`

Generates an image using Cloudflare Workers AI.

**Parameters:**
- `prompt` (string): Image generation prompt
- `accountId` (string): Cloudflare account ID
- `apiToken` (string): Cloudflare API token with Workers AI permissions

**Returns:** Base64 encoded image string

**Model:** `@cf/stabilityai/stable-diffusion-xl-base-1.0`

**Settings:**
- `num_steps`: 20 (quality vs speed balance)
- `guidance`: 7.5 (prompt adherence)

---

### `uploadToImgur(base64Image, clientId)`

Uploads a base64 image to Imgur for permanent hosting.

**Parameters:**
- `base64Image` (string): Base64 encoded image
- `clientId` (string): Imgur API client ID

**Returns:** Public image URL (e.g., `https://i.imgur.com/abc123.png`)

**Free Tier:** 12,500 uploads/day

---

### `uploadToCloudflareR2(base64Image, fileName, ...)`

Uploads to Cloudflare R2 for custom domain hosting (advanced).

**Parameters:**
- `base64Image` (string): Base64 encoded image
- `fileName` (string): File name for the image
- `accountId` (string): Cloudflare account ID
- `accessKeyId` (string): R2 access key
- `secretAccessKey` (string): R2 secret key
- `bucketName` (string): R2 bucket name
- `publicDomain` (string, optional): Custom public domain

**Returns:** Public image URL

---

### `generateAndHostImage(prompt, keyword, imageType)`

Complete pipeline: generate image and upload to hosting.

**Parameters:**
- `prompt` (string): Image generation prompt
- `keyword` (string): Primary keyword for alt text
- `imageType` (string): "featured" | "content" | "social" | "process"

**Returns:**
```typescript
{
  url: string;        // Public image URL
  altText: string;    // SEO-optimized alt text
  base64?: string;    // Optional base64 data
}
```

**Environment Variables Required:**
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `IMGUR_CLIENT_ID` (optional, recommended)

---

## Usage Example

```typescript
import { generateAndHostImage } from "@/lib/cloudflare/image-generator";

const result = await generateAndHostImage(
  "A modern restaurant kitchen with chefs preparing food, professional photography",
  "labor cost in food and beverage sector",
  "featured"
);

console.log(result.url); // https://i.imgur.com/abc123.png
console.log(result.altText); // "labor cost in food and beverage sector - featured image"
```

---

## Integration with Article Generation

The image generator is automatically used in `src/lib/ai/generate.ts`:

```typescript
// Old: OpenAI DALL-E (paid)
const image = await generateFeaturedImage(title, keyword);

// New: Cloudflare Workers AI (free)
const image = await generateFeaturedImage(title, keyword);
// Internally uses generateAndHostImage()
```

No code changes needed in your application!

---

## Hosting Options

### Option 1: Imgur (Recommended)

**Pros:**
- ✅ Free, no credit card
- ✅ 12,500 uploads/day
- ✅ Permanent hosting
- ✅ CDN delivery
- ✅ No setup required

**Cons:**
- ❌ Imgur branding in URL
- ❌ No custom domain

**Setup:** Add `IMGUR_CLIENT_ID` to `.env`

---

### Option 2: Cloudflare R2 (Advanced)

**Pros:**
- ✅ Custom domain support
- ✅ 10GB free storage
- ✅ No egress fees
- ✅ Full control

**Cons:**
- ❌ Requires bucket setup
- ❌ More complex configuration

**Setup:**
1. Create R2 bucket in Cloudflare dashboard
2. Generate access keys
3. Configure custom domain (optional)
4. Add credentials to `.env`

---

### Option 3: Base64 Data URLs (Fallback)

**Pros:**
- ✅ No external dependencies
- ✅ Works immediately

**Cons:**
- ❌ Large HTML file size
- ❌ Slower page load
- ❌ Not recommended for production

**Setup:** None (automatic fallback)

---

## Error Handling

The module gracefully handles errors:

```typescript
try {
  const result = await generateAndHostImage(prompt, keyword, imageType);
  // result.url may be empty string if generation failed
} catch (error) {
  // Returns empty URL and alt text
  // Article generation continues without image
}
```

**Fallback Behavior:**
- Missing credentials → Skip image generation
- API error → Return empty URL
- Upload failure → Try base64 fallback
- All failures → Continue article generation

---

## Performance

| Step | Time | Notes |
|------|------|-------|
| Prompt generation | 1-2s | OpenRouter AI |
| Image generation | 3-5s | Cloudflare Workers AI |
| Upload to Imgur | 1-2s | Fast CDN |
| **Total** | **5-9s** | Per image |

**Optimization Tips:**
- Generate images in parallel for bulk operations
- Cache prompts for similar keywords
- Use lower `num_steps` for faster generation (trade quality)

---

## Troubleshooting

### "Cloudflare credentials missing"
```bash
# Check .env file
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_API_TOKEN=your_api_token_here
```

### "Imgur upload failed"
- Verify `IMGUR_CLIENT_ID` is correct
- Check daily limit (12,500/day)
- Try regenerating client ID

### "Image generation timeout"
- Cloudflare Workers AI may be under load
- Retry the request
- Check Cloudflare status page

### Images not displaying
- Verify URL is accessible in browser
- Check CORS settings (Imgur handles this)
- Ensure alt text is present for SEO

---

## API Limits

| Service | Free Tier | Rate Limit |
|---------|-----------|------------|
| Cloudflare Workers AI | 10,000/day | ~100/min |
| Imgur | 12,500/day | 50/hour |
| Cloudflare R2 | 10GB storage | Unlimited requests |

---

## Security Notes

- ✅ API tokens stored in environment variables
- ✅ No tokens exposed to client
- ✅ Server-side generation only
- ✅ Imgur handles image CDN security
- ⚠️ Base64 fallback increases HTML size (use Imgur)

---

## Future Enhancements

- [ ] Support for multiple Cloudflare AI models
- [ ] Image optimization (compression, resizing)
- [ ] Batch image generation
- [ ] Custom watermarking
- [ ] Image variation generation
- [ ] A/B testing different prompts
