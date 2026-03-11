import { NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Check if Google returned an error
  if (error) {
    console.error("❌ Google OAuth error:", error);
    return NextResponse.redirect(`${origin}/dashboard/settings?error=google_${error}`);
  }

  if (!code) {
    console.error("❌ No authorization code received");
    return NextResponse.redirect(`${origin}/dashboard/settings?error=no_code`);
  }

  try {
    // Get the current authenticated user from Supabase
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ User not authenticated:", authError);
      return NextResponse.redirect(`${origin}/auth/login?error=not_authenticated`);
    }

    console.log("🔄 Exchanging code for tokens for user:", user.email);

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

    console.log("✅ Tokens received. Access token:", tokens.access_token.substring(0, 20) + "...");
    console.log("✅ Refresh token:", tokens.refresh_token ? "Present" : "Missing");

    // Calculate token expiry (default 1 hour)
    const expiryDate = new Date(Date.now() + (tokens.expiry_date || 3600000));

    // Save tokens to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token || undefined,
        googleTokenExpiry: expiryDate,
      },
    });

    console.log("✅ Google OAuth tokens saved successfully for user:", user.email);

    // Redirect back to settings with success
    return NextResponse.redirect(`${origin}/dashboard/settings?success=connected`);
  } catch (error: any) {
    console.error("❌ Google OAuth callback error:", error);
    console.error("Error details:", error.message, error.stack);
    return NextResponse.redirect(`${origin}/dashboard/settings?error=oauth_failed&details=${encodeURIComponent(error.message || 'unknown')}`);
  }
}
