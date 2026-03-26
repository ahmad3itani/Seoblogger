import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { prisma } from "@/lib/prisma";
import { exchangeLinkedInCode, getLinkedInProfile } from "@/lib/social/linkedin";
import { encryptToken } from "@/lib/social/token-crypto";

// GET /api/social/connect/linkedin/callback
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bloggerseo.app";
  const settingsUrl = `${baseUrl}/dashboard/settings`;

  if (error || !code) {
    return NextResponse.redirect(`${settingsUrl}?social_error=${encodeURIComponent(error || "linkedin_denied")}`);
  }

  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) {
      return NextResponse.redirect(`${settingsUrl}?social_error=not_authenticated`);
    }
    const { user: authUser } = authResult;

    const redirectUri = `${baseUrl}/api/social/connect/linkedin/callback`;
    const { access_token, expires_in } = await exchangeLinkedInCode(code, redirectUri);

    // Get user profile
    const profile = await getLinkedInProfile(access_token);

    const encToken = encryptToken(access_token);
    const tokenExpiry = new Date(Date.now() + expires_in * 1000);

    await prisma.socialAccount.upsert({
      where: {
        userId_platform_accountId: {
          userId: authUser.id,
          platform: "linkedin",
          accountId: profile.id,
        },
      },
      update: {
        encryptedToken: encToken,
        accountName: profile.name,
        tokenExpiry,
      },
      create: {
        userId: authUser.id,
        platform: "linkedin",
        accountId: profile.id,
        accountName: profile.name,
        encryptedToken: encToken,
        tokenExpiry,
      },
    });

    return NextResponse.redirect(`${settingsUrl}?social_success=linkedin_connected&pages=1`);
  } catch (err: any) {
    console.error("LinkedIn OAuth callback error:", err);
    return NextResponse.redirect(`${settingsUrl}?social_error=${encodeURIComponent(err.message)}`);
  }
}
