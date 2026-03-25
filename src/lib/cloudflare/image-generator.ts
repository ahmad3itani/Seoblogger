// Cloudflare Workers AI — Image Generation
// Model: @cf/black-forest-labs/flux-1-schnell
// (upgraded from SDXL — dramatically better quality, same free tier)
// Free tier: 10,000 AI requests/day, R2 10GB storage

interface ImageGenerationResult {
  url: string;
  altText: string;
  base64?: string;
}

// ─── Generate with FLUX.1 Schnell ────────────────────────────────────────────
// FLUX.1 Schnell is Black Forest Labs' fast model — photorealistic, high-quality.
// Steps: 4–8 is optimal (fast + high quality). Returns binary image data.
export async function generateImageWithCloudflare(
  prompt: string,
  accountId: string,
  apiToken: string,
  negativePrompt?: string
): Promise<string> {
  // FLUX.1 Schnell — better quality than SDXL, same Cloudflare free tier
  const model = "@cf/black-forest-labs/flux-1-schnell";
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const body: Record<string, any> = {
    prompt,
    num_steps: 8, // FLUX optimal: 4-8 steps. 8 = best quality within free tier speed.
  };

  // FLUX doesn't support negative_prompt natively, but we include it
  // in prompt context as it sometimes influences generation
  if (negativePrompt) {
    body.prompt = `${prompt}. Avoid: ${negativePrompt.split(",").slice(0, 5).join(", ")}.`;
  }

  console.log(`🎨 FLUX.1 prompt (${prompt.length} chars): ${prompt.substring(0, 100)}...`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    // Fallback to SDXL if FLUX isn't available on the account
    if (response.status === 404 || response.status === 400) {
      console.warn(`FLUX.1 not available, falling back to SDXL...`);
      return generateWithSDXLFallback(prompt, accountId, apiToken);
    }
    throw new Error(`Cloudflare AI error ${response.status}: ${err}`);
  }

  const imageBuffer = await response.arrayBuffer();
  return Buffer.from(imageBuffer).toString("base64");
}

// ─── SDXL Fallback ───────────────────────────────────────────────────────────
async function generateWithSDXLFallback(
  prompt: string,
  accountId: string,
  apiToken: string
): Promise<string> {
  const model = "@cf/stabilityai/stable-diffusion-xl-base-1.0";
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, num_steps: 20, guidance: 7.5 }),
  });

  if (!response.ok) {
    throw new Error(`SDXL fallback error: ${response.status}`);
  }

  const imageBuffer = await response.arrayBuffer();
  return Buffer.from(imageBuffer).toString("base64");
}

// ─── SEO-Friendly Filename ────────────────────────────────────────────────────
function generateImageFilename(keyword: string, imageType: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 7);
  const slug = keyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 35);
  // SEO-friendly filename: keyword-type-timestamp.webp
  return `${slug}-${imageType}-${timestamp}-${random}.png`;
}

// ─── Upload to Cloudflare R2 ──────────────────────────────────────────────────
// R2 uses S3-compatible API, not the Cloudflare REST API
export async function uploadToCloudflareR2(
  base64Image: string,
  fileName: string,
  accountId: string,
  accessKeyId: string,
  secretAccessKey: string,
  bucketName: string = "bloggerseo-images"
): Promise<string> {
  const imageBuffer = Buffer.from(base64Image, "base64");
  
  // R2 S3-compatible endpoint format
  const r2Endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const uploadUrl = `${r2Endpoint}/${bucketName}/${fileName}`;

  console.log(`📤 Uploading to R2: ${bucketName}/${fileName}`);

  // Use S3-compatible PUT with AWS Signature V4
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  
  const s3Client = new S3Client({
    region: "auto",
    endpoint: r2Endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: imageBuffer,
        ContentType: "image/png",
      })
    );

    const r2PublicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;
    if (!r2PublicUrl) {
      throw new Error("CLOUDFLARE_R2_PUBLIC_URL environment variable is required for image hosting");
    }
    return `${r2PublicUrl}/${fileName}`;
  } catch (error: any) {
    console.error(`❌ R2 upload failed:`, error.message);
    throw new Error(`R2 upload error: ${error.message}`);
  }
}

// ─── Full Pipeline: Generate → Host ──────────────────────────────────────────
export async function generateAndHostImage(
  prompt: string,
  keyword: string,
  imageType: "featured" | "content" | "social" | "process" = "featured",
  negativePrompt?: string,
  altText?: string
): Promise<ImageGenerationResult> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET || "bloggerseo-images";
  const r2PublicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;
  const finalAltText = altText || `${keyword} - ${imageType}`;

  // Detailed environment check
  if (!accountId || !apiToken) {
    console.warn("⚠️ Cloudflare AI credentials missing (CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN) — image generation skipped");
    return { url: "", altText: finalAltText };
  }

  if (!r2AccessKeyId || !r2SecretAccessKey) {
    console.warn("⚠️ R2 credentials missing (CLOUDFLARE_R2_ACCESS_KEY_ID or CLOUDFLARE_R2_SECRET_ACCESS_KEY) — image upload skipped");
    return { url: "", altText: finalAltText };
  }

  if (!r2PublicUrl) {
    console.warn("⚠️ CLOUDFLARE_R2_PUBLIC_URL not set — cannot generate public image URLs");
    return { url: "", altText: finalAltText };
  }

  try {
    console.log(`🖼️ Generating ${imageType} image (FLUX.1 Schnell)...`);
    const base64 = await generateImageWithCloudflare(prompt, accountId, apiToken, negativePrompt);

    console.log(`☁️ Uploading to R2 bucket: ${bucketName}...`);
    const fileName = generateImageFilename(keyword, imageType);
    const imageUrl = await uploadToCloudflareR2(
      base64,
      fileName,
      accountId,
      r2AccessKeyId,
      r2SecretAccessKey,
      bucketName
    );

    console.log(`✅ Image ready: ${imageUrl}`);
    return { url: imageUrl, altText: finalAltText, base64 };
  } catch (error: any) {
    // Log the failure clearly — do NOT fall back to base64 data URLs.
    // Embedding raw base64 in article HTML creates multi-megabyte blobs
    // that break publishing to Blogger and inflate page size massively.
    console.error("❌ Image pipeline failed:", error.message || error);
    console.error("   Stack:", error.stack?.split("\n").slice(0, 3).join("\n"));
    console.warn("⚠️ Image will be skipped for this article section.");
    return { url: "", altText: finalAltText };
  }
}
