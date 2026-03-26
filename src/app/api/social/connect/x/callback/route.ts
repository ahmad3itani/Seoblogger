import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { prisma } from "@/lib/prisma";
import { exchangeXCode, getXUser } from "@/lib/social/x";
import { encryptToken } from "@/lib/social/token-crypto";
import { cookies } from "next/headers";

// GET /api/social/connect/x/callback
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bloggerseo.app";
  const settingsUrl = `${baseUrl}/dashboard/settings`;

  if (error || !code) {
    return NextResponse.redirect(`${settingsUrl}?social_error=${encodeURIComponent(error || "x_denied")}`);
  }

  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) {
      return NextResponse.redirect(`${settingsUrl}?social_error=not_authenticated`);
    }
    const { user: authUser } = authResult;

    const cookieStore = await cookies();
    const storedVerifier = cookieStore.get("x_pkce_verifier")?.value;
    const storedState = cookieStore.get("x_oauth_state")?.value;

    if (!storedVerifier || storedState !== state) {
      return NextResponse.redirect(`${settingsUrl}?social_error=invalid_state`);
    }

    const redirectUri = `${baseUrl}/api/social/connect/x/callback`;
    const tokens = await exchangeXCode(code, redirectUri, storedVerifier);

    // Get X user profile
    const xUser = await getXUser(tokens.access_token);

    const encToken = encryptToken(tokens.access_token);
    const encRefresh = tokens.refresh_token ? encryptToken(tokens.refresh_token) : null;
    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

    await prisma.socialAccount.upsert({
      where: {
        userId_platform_accountId: {
          userId: authUser.id,
          platform: "x",
          accountId: xUser.id,
        },
      },
      update: {
        encryptedToken: encToken,
        encryptedRefresh: encRefresh,
        accountName: `@${xUser.username}`,
        tokenExpiry,
      },
      create: {
        userId: authUser.id,
        platform: "x",
        accountId: xUser.id,
        accountName: `@${xUser.username}`,
        encryptedToken: encToken,
        encryptedRefresh: encRefresh,
        tokenExpiry,
      },
    });

    // Clear PKCE cookies
    const response = NextResponse.redirect(`${settingsUrl}?social_success=x_connected&pages=1`);
    response.cookies.delete("x_pkce_verifier");
    response.cookies.delete("x_oauth_state");
    return response;
  } catch (err: any) {
    console.error("X OAuth callback error:", err);
    return NextResponse.redirect(`${settingsUrl}?social_error=${encodeURIComponent(err.message)}`);
  }
}
