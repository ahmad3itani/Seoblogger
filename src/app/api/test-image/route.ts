import { NextRequest, NextResponse } from "next/server";
import { generateAndHostImage } from "@/lib/cloudflare/image-generator";

/**
 * Test endpoint for Cloudflare image generation
 * GET /api/test-image
 * 
 * This endpoint helps diagnose image generation issues by:
 * 1. Checking all required environment variables
 * 2. Testing image generation with Cloudflare Workers AI
 * 3. Testing R2 upload with S3-compatible API
 * 4. Returning detailed diagnostic information
 */
export async function GET(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: {},
    tests: {},
    errors: [],
  };

  // Step 1: Check environment variables
  console.log("🔍 Checking Cloudflare environment variables...");
  
  const requiredEnvVars = {
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
    CLOUDFLARE_R2_ACCESS_KEY_ID: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    CLOUDFLARE_R2_BUCKET_NAME: process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET,
    CLOUDFLARE_R2_PUBLIC_URL: process.env.CLOUDFLARE_R2_PUBLIC_URL,
  };

  for (const [key, value] of Object.entries(requiredEnvVars)) {
    const isSet = !!value;
    diagnostics.environment[key] = {
      set: isSet,
      value: isSet ? `${value.substring(0, 8)}...` : "NOT SET",
    };
    
    if (!isSet) {
      diagnostics.errors.push(`Missing environment variable: ${key}`);
    }
  }

  // Step 2: Check if all required variables are present
  const allEnvVarsSet = Object.values(requiredEnvVars).every(v => !!v);
  
  if (!allEnvVarsSet) {
    return NextResponse.json({
      success: false,
      message: "Missing required environment variables. Please check your .env file.",
      diagnostics,
      setupGuide: "/src/lib/cloudflare/SETUP.md",
    }, { status: 400 });
  }

  // Step 3: Test image generation
  console.log("🎨 Testing image generation...");
  
  try {
    const testPrompt = "A modern, professional blog illustration featuring abstract geometric shapes in vibrant colors, clean composition, high quality digital art";
    const testKeyword = "test-image";
    
    diagnostics.tests.imageGeneration = {
      status: "starting",
      prompt: testPrompt.substring(0, 50) + "...",
    };

    const result = await generateAndHostImage(
      testPrompt,
      testKeyword,
      "featured",
      "blurry, low quality, distorted",
      "Test image for BloggerSEO"
    );

    if (result.url && result.url.startsWith("http")) {
      diagnostics.tests.imageGeneration = {
        status: "success",
        url: result.url,
        altText: result.altText,
        message: "Image generated and uploaded successfully!",
      };

      return NextResponse.json({
        success: true,
        message: "✅ Cloudflare image generation is working correctly!",
        imageUrl: result.url,
        diagnostics,
      });
    } else {
      diagnostics.tests.imageGeneration = {
        status: "failed",
        message: "Image generation returned empty or invalid URL",
        result,
      };
      diagnostics.errors.push("Image generation failed - check console logs for details");

      return NextResponse.json({
        success: false,
        message: "Image generation failed. Check the diagnostics for details.",
        diagnostics,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("❌ Image generation test failed:", error);
    
    diagnostics.tests.imageGeneration = {
      status: "error",
      error: error.message,
      stack: error.stack?.split("\n").slice(0, 5),
    };
    diagnostics.errors.push(`Image generation error: ${error.message}`);

    return NextResponse.json({
      success: false,
      message: "Image generation test failed with error",
      diagnostics,
      setupGuide: "/src/lib/cloudflare/SETUP.md",
    }, { status: 500 });
  }
}
