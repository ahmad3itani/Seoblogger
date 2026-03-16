import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  
  console.log("🔐 Google OAuth flow initiated from origin:", origin);
  
  // Verify user is authenticated
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    console.error("❌ User not authenticated:", error?.message);
    return NextResponse.redirect(`${origin}/auth/login?error=not_authenticated`);
  }

  console.log("✅ User authenticated:", user.email);

  // Use environment variables for OAuth credentials (simpler and more reliable)
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  console.log("🔍 Environment check:");
  console.log("   - GOOGLE_CLIENT_ID exists:", !!clientId);
  console.log("   - GOOGLE_CLIENT_SECRET exists:", !!clientSecret);

  if (!clientId || !clientSecret) {
    console.error("❌ Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment variables");
    console.error("   Please add these to your hosting platform (Vercel/Netlify) and redeploy");
    return NextResponse.redirect(`${origin}/dashboard/settings?error=missing_env_credentials`);
  }

  console.log("✅ Using OAuth credentials from environment variables");
  console.log("   - Client ID (first 30 chars):", clientId.substring(0, 30) + "...");
  console.log("   - Client ID (last 20 chars): ..." + clientId.substring(clientId.length - 20));

  const redirectUri = `${origin}/api/auth/google/callback`;
  console.log("🔄 Redirect URI that will be sent to Google:", redirectUri);
  console.log("   Make sure this EXACTLY matches the URI in Google Cloud Console");

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  const scopes = [
    'https://www.googleapis.com/auth/blogger',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: user.id, // Pass user ID to callback
  });

  console.log("✅ Redirecting to Google OAuth:", authUrl.substring(0, 100) + "...");
  return NextResponse.redirect(authUrl);
}
