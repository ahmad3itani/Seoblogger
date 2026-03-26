import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";

const FACEBOOK_AUTH_URL = "https://www.facebook.com/v19.0/dialog/oauth";

// GET /api/social/connect/facebook
// Redirects the user to Facebook OAuth
export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const appId = process.env.FACEBOOK_APP_ID;
    if (!appId) {
      return NextResponse.json(
        { error: "FACEBOOK_APP_ID environment variable not set." },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bloggerseo.app";
    const redirectUri = `${baseUrl}/api/social/connect/facebook/callback`;
    const scopes = ["pages_manage_posts", "pages_read_engagement"].join(",");

    const url = `${FACEBOOK_AUTH_URL}?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code`;

    return NextResponse.redirect(url);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
