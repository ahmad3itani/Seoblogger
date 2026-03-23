import { NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { encryptTokenSafe } from "@/lib/security/encryption";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state"); // User ID passed from the initial request

  console.log("🔄 Blogger OAuth callback received");

  // Check if Google returned an error
  if (error) {
    console.error("❌ Google OAuth error:", error);
    return NextResponse.redirect(`${origin}/dashboard/settings?error=google_${error}`);
  }

  if (!code) {
    console.error("❌ No authorization code received");
    return NextResponse.redirect(`${origin}/dashboard/settings?error=no_code`);
  }

  if (!state) {
    console.error("❌ No user ID in state parameter");
    return NextResponse.redirect(`${origin}/dashboard/settings?error=invalid_state`);
  }

  try {
    const userId = state;
    console.log("🔄 Exchanging code for Blogger tokens for user:", userId);
    console.log("   - Authorization code (first 20 chars):", code.substring(0, 20) + "...");

    // Use environment variables for OAuth credentials
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    console.log("🔍 Callback environment check:");
    console.log("   - GOOGLE_CLIENT_ID exists:", !!clientId);
    console.log("   - GOOGLE_CLIENT_SECRET exists:", !!clientSecret);

    if (!clientId || !clientSecret) {
      console.error("❌ Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment variables");
      return NextResponse.redirect(`${origin}/dashboard/settings?error=missing_env_credentials`);
    }

    const redirectUri = `${origin}/api/auth/google/callback`;
    console.log("   - Redirect URI for token exchange:", redirectUri);

    // Create OAuth client with environment credentials
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    console.log("🔄 Calling Google to exchange code for tokens...");
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    console.log("✅ Token exchange successful");
    
    if (!tokens.access_token) {
      console.error("❌ No access token in response");
      throw new Error("No access token received");
    }

    console.log("✅ Blogger tokens received");
    console.log("✅ Access token:", tokens.access_token.substring(0, 20) + "...");
    console.log("✅ Refresh token:", tokens.refresh_token ? "Present" : "Missing");

    // Calculate token expiry
    const expiryDate = tokens.expiry_date 
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600000); // Default 1 hour

    // Save tokens to database
    console.log("💾 Saving tokens to database for user:", userId);
    try {
      // First check if user exists in database
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      // Encrypt tokens before storing
      const encryptedAccessToken = encryptTokenSafe(tokens.access_token);
      const encryptedRefreshToken = encryptTokenSafe(tokens.refresh_token);

      if (existingUser) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            googleAccessToken: encryptedAccessToken,
            googleRefreshToken: encryptedRefreshToken || undefined,
            googleTokenExpiry: expiryDate,
          },
        });
      } else {
        // User not in our DB yet — create them with tokens
        console.log("⚠️ User not found in database, creating with tokens...");
        await prisma.user.create({
          data: {
            id: userId,
            email: "", // Will be updated on next sync
            googleAccessToken: encryptedAccessToken,
            googleRefreshToken: encryptedRefreshToken || undefined,
            googleTokenExpiry: expiryDate,
          },
        });
      }
    } catch (dbError: any) {
      console.error("❌ Database error saving tokens:", dbError.message);
      if (dbError.message?.includes("Tenant or user not found") || dbError.message?.includes("FATAL")) {
        return NextResponse.redirect(`${origin}/dashboard/settings?error=callback_failed&msg=${encodeURIComponent("Database connection failed. Check DATABASE_URL in Vercel environment variables. Error: " + dbError.message)}`);
      }
      throw dbError;
    }

    console.log("✅ Blogger tokens saved successfully to database");
    console.log("🔄 Redirecting to settings with success message");

    // Redirect back to settings with success
    return NextResponse.redirect(`${origin}/dashboard/settings?success=blogger_connected`);
  } catch (error: any) {
    console.error("❌ Blogger OAuth callback error:", error);
    console.error("   - Error message:", error.message);
    console.error("   - Error name:", error.name);
    console.error("   - Error code:", error.code);
    console.error("   - Full error:", JSON.stringify(error, null, 2));
    console.error("   - Stack trace:", error.stack);
    
    const errorMsg = error.message || error.code || 'unknown';
    return NextResponse.redirect(`${origin}/dashboard/settings?error=callback_failed&msg=${encodeURIComponent(errorMsg)}`);
  }
}
