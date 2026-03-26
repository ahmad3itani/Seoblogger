import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForToken, exchangeForLongLivedToken, getPages } from "@/lib/social/facebook";
import { encryptToken } from "@/lib/social/token-crypto";

// GET /api/social/connect/facebook/callback
// Facebook redirects here after the user grants permission
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bloggerseo.app";
  const settingsUrl = `${baseUrl}/dashboard/settings`;

  if (error || !code) {
    return NextResponse.redirect(`${settingsUrl}?social_error=${encodeURIComponent(error || "facebook_denied")}`);
  }

  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) {
      return NextResponse.redirect(`${settingsUrl}?social_error=not_authenticated`);
    }
    const { user: authUser } = authResult;

    const redirectUri = `${baseUrl}/api/social/connect/facebook/callback`;

    // 1. Exchange code for short-lived token
    const shortToken = await exchangeCodeForToken(code, redirectUri);

    // 2. Exchange for long-lived token (60 days)
    const longToken = await exchangeForLongLivedToken(shortToken);

    // 3. Get all pages the user manages
    const pages = await getPages(longToken);

    if (pages.length === 0) {
      return NextResponse.redirect(`${settingsUrl}?social_error=no_pages`);
    }

    // 4. Upsert each page as a SocialAccount
    for (const page of pages) {
      const encToken = encryptToken(page.access_token);
      await prisma.socialAccount.upsert({
        where: {
          userId_platform_accountId: {
            userId: authUser.id,
            platform: "facebook",
            accountId: page.id,
          },
        },
        update: {
          encryptedToken: encToken,
          accountName: page.name,
          tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // ~60 days
        },
        create: {
          userId: authUser.id,
          platform: "facebook",
          accountId: page.id,
          accountName: page.name,
          encryptedToken: encToken,
          tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
      });
    }

    return NextResponse.redirect(`${settingsUrl}?social_success=facebook_connected&pages=${pages.length}`);
  } catch (err: any) {
    console.error("Facebook OAuth callback error:", err);
    return NextResponse.redirect(`${settingsUrl}?social_error=${encodeURIComponent(err.message)}`);
  }
}
