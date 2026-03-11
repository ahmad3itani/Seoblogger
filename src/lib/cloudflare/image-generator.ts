// Cloudflare Workers AI Image Generation
// Uses @cf/stabilityai/stable-diffusion-xl-base-1.0 (free tier)

interface CloudflareAIResponse {
  result: {
    image: string; // base64 encoded image
  };
  success: boolean;
  errors: any[];
  messages: any[];
}

interface ImageGenerationResult {
  url: string;
  altText: string;
  base64?: string;
}

/**
 * Generate an image using Cloudflare Workers AI
 * Model: @cf/stabilityai/stable-diffusion-xl-base-1.0
 * Free tier: 10,000 requests/day
 */
export async function generateImageWithCloudflare(
  prompt: string,
  accountId: string,
  apiToken: string,
  negativePrompt?: string
): Promise<string> {
  const model = "@cf/stabilityai/stable-diffusion-xl-base-1.0";
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  try {
    const body: Record<string, any> = {
      prompt: prompt,
      num_steps: 20, // Maximum allowed by Cloudflare API
      guidance: 7.5, // How closely to follow prompt (7.5 is recommended)
    };
    if (negativePrompt) {
      body.negative_prompt = negativePrompt;
    }
    
    console.log(`🎨 Image prompt: ${prompt.substring(0, 120)}...`);
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudflare AI error: ${response.status} - ${errorText}`);
    }

    // Response is the image binary directly
    const imageBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    
    return base64Image;
  } catch (error) {
    console.error("Cloudflare AI image generation failed:", error);
    throw error;
  }
}

/**
 * Generate a unique filename for the image
 */
function generateImageFilename(keyword: string, imageType: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const sanitizedKeyword = keyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .substring(0, 30);
  return `${sanitizedKeyword}-${imageType}-${timestamp}-${random}.png`;
}

/**
 * Upload base64 image to Cloudflare R2 using REST API
 * Free tier: 10GB storage, unlimited egress to Cloudflare
 */
export async function uploadToCloudflareR2(
  base64Image: string,
  fileName: string,
  accountId: string,
  apiToken: string,
  bucketName: string = "bloggerseo-images"
): Promise<string> {
  try {
    const imageBuffer = Buffer.from(base64Image, "base64");
    
    // Upload using Cloudflare R2 REST API
    const uploadUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucketName}/objects/${fileName}`;
    
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "image/png",
      },
      body: imageBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`R2 upload error: ${response.status} - ${errorText}`);
    }

    // Return public URL using the R2 public development URL
    const r2PublicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || `https://pub-153f654887954c46b572eef9cc43ec55.r2.dev`;
    const publicUrl = `${r2PublicUrl}/${fileName}`;
    return publicUrl;
  } catch (error) {
    console.error("Cloudflare R2 upload failed:", error);
    throw error;
  }
}

/**
 * Complete image generation and hosting pipeline
 * Uses Cloudflare Workers AI + Cloudflare R2 (both free)
 */
export async function generateAndHostImage(
  prompt: string,
  keyword: string,
  imageType: "featured" | "content" | "social" | "process" = "featured",
  negativePrompt?: string,
  altText?: string
): Promise<ImageGenerationResult> {
  const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN;
  const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "bloggerseo-images";

  // Validate required credentials
  if (!cloudflareAccountId || !cloudflareApiToken) {
    console.warn("Cloudflare credentials missing. Image generation skipped.");
    return {
      url: "",
      altText: altText || `${keyword} - ${imageType} image`,
    };
  }

  const finalAltText = altText || `${keyword} - ${imageType} image`;

  try {
    // Step 1: Generate image with Cloudflare Workers AI
    console.log(`Generating ${imageType} image with Cloudflare Workers AI...`);
    const base64Image = await generateImageWithCloudflare(
      prompt,
      cloudflareAccountId,
      cloudflareApiToken,
      negativePrompt
    );

    // Step 2: Upload to Cloudflare R2
    console.log("Uploading to Cloudflare R2...");
    const fileName = generateImageFilename(keyword, imageType);
    
    const imageUrl = await uploadToCloudflareR2(
      base64Image,
      fileName,
      cloudflareAccountId,
      cloudflareApiToken,
      r2BucketName
    );

    console.log(`✅ Image generated and hosted: ${imageUrl}`);

    return {
      url: imageUrl,
      altText: finalAltText,
      base64: base64Image,
    };
  } catch (error) {
    console.error("❌ Image generation and hosting failed:", error);
    console.warn("⚠️ Falling back to base64 data URL");
    
    try {
      const base64Image = await generateImageWithCloudflare(
        prompt,
        cloudflareAccountId,
        cloudflareApiToken,
        negativePrompt
      );
      return {
        url: `data:image/png;base64,${base64Image}`,
        altText: finalAltText,
        base64: base64Image,
      };
    } catch (fallbackError) {
      console.error("❌ Fallback also failed:", fallbackError);
      return {
        url: "",
        altText: finalAltText,
      };
    }
  }
}
