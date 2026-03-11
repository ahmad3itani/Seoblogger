import { NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

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

    // Create OAuth client with dynamic redirect URI
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${origin}/api/auth/google/callback`
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
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
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token || undefined,
        googleTokenExpiry: expiryDate,
      },
    });

    console.log("✅ Blogger tokens saved successfully to database");

    // Redirect back to settings with success
    return NextResponse.redirect(`${origin}/dashboard/settings?success=blogger_connected`);
  } catch (error: any) {
    console.error("❌ Blogger OAuth callback error:", error);
    console.error("Error details:", error.message, error.stack);
    return NextResponse.redirect(`${origin}/dashboard/settings?error=blogger_failed&details=${encodeURIComponent(error.message || 'unknown')}`);
  }
}
