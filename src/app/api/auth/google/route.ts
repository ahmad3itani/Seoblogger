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

  // Fetch user's Google OAuth credentials from database
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      googleClientId: true,
      googleClientSecret: true,
    },
  });

  if (!dbUser?.googleClientId || !dbUser?.googleClientSecret) {
    console.error("❌ Missing Google OAuth credentials for user:", user.email);
    console.error("   - Has Client ID:", !!dbUser?.googleClientId);
    console.error("   - Has Client Secret:", !!dbUser?.googleClientSecret);
    return NextResponse.redirect(`${origin}/dashboard/settings?error=missing_credentials`);
  }

  console.log("✅ User has OAuth credentials saved");
  console.log("   - Client ID:", dbUser.googleClientId.substring(0, 20) + "...");

  const redirectUri = `${origin}/api/auth/google/callback`;
  console.log("🔄 Redirect URI:", redirectUri);

  const oauth2Client = new google.auth.OAuth2(
    dbUser.googleClientId,
    dbUser.googleClientSecret,
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
