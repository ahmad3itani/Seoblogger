import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  
  // Verify user is authenticated
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return NextResponse.redirect(`${origin}/auth/login?error=not_authenticated`);
  }

  // Fetch user's Google OAuth credentials from database
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      googleClientId: true,
      googleClientSecret: true,
    },
  });

  if (!dbUser?.googleClientId || !dbUser?.googleClientSecret) {
    return NextResponse.redirect(`${origin}/dashboard/settings?error=missing_credentials`);
  }

  const oauth2Client = new google.auth.OAuth2(
    dbUser.googleClientId,
    dbUser.googleClientSecret,
    `${origin}/api/auth/google/callback`
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

  return NextResponse.redirect(authUrl);
}
