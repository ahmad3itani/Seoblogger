import { NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/settings?error=no_code`);
  }

  try {
    // Get the current authenticated user from Supabase
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/auth/login?error=not_authenticated`);
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token) {
      throw new Error("No access token received");
    }

    // Calculate token expiry (default 1 hour)
    const expiryDate = new Date(Date.now() + (tokens.expiry_date || 3600) * 1000);

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
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/settings?success=connected`);
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/settings?error=oauth_failed`);
  }
}
