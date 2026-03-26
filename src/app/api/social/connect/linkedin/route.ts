import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { buildLinkedInAuthUrl } from "@/lib/social/linkedin";
import crypto from "crypto";

// GET /api/social/connect/linkedin
export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: "LINKEDIN_CLIENT_ID not set." }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bloggerseo.app";
    const redirectUri = `${baseUrl}/api/social/connect/linkedin/callback`;
    const state = crypto.randomBytes(16).toString("hex");

    const url = buildLinkedInAuthUrl(redirectUri, state);
    return NextResponse.redirect(url);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
