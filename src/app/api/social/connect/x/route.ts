import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { buildXAuthUrl, generatePKCE } from "@/lib/social/x";
import crypto from "crypto";

// We store PKCE verifier temporarily in an HTTP-only cookie
export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const clientId = process.env.TWITTER_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: "TWITTER_CLIENT_ID not set." }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bloggerseo.app";
    const redirectUri = `${baseUrl}/api/social/connect/x/callback`;
    const state = crypto.randomBytes(16).toString("hex");
    const { verifier, challenge } = generatePKCE();

    const url = buildXAuthUrl(redirectUri, state, challenge);

    // Store verifier + state in cookies for the callback to verify
    const response = NextResponse.redirect(url);
    response.cookies.set("x_pkce_verifier", verifier, { httpOnly: true, maxAge: 600, path: "/" });
    response.cookies.set("x_oauth_state", state, { httpOnly: true, maxAge: 600, path: "/" });
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
