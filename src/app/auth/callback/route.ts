import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") || "/dashboard";

  console.log("🔄 Auth callback received. Code:", code ? "Present" : "Missing");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      console.log("✅ Session created for user:", data.session.user.email);
      console.log("📋 Provider token:", data.session.provider_token ? "Present" : "Missing");
      console.log("📋 Provider refresh token:", data.session.provider_refresh_token ? "Present" : "Missing");
      
      // Store Google provider tokens if available
      if (data.session.provider_token) {
        console.log("🔄 Syncing Google tokens to database...");
        try {
          const syncResponse = await fetch(`${origin}/api/user/sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: request.headers.get("cookie") || "",
            },
            body: JSON.stringify({
              googleAccessToken: data.session.provider_token,
              googleRefreshToken: data.session.provider_refresh_token,
            }),
          });
          
          if (!syncResponse.ok) {
            console.error("❌ User sync failed:", syncResponse.status, await syncResponse.text());
          } else {
            console.log("✅ User synced successfully - Google tokens saved to database");
          }
        } catch (e) {
          console.error("❌ Failed to sync user after OAuth:", e);
          // Continue with redirect even if sync fails
        }
      } else {
        console.warn("⚠️ No provider token received from Supabase. Blogger access may not work.");
        console.warn("⚠️ Check Supabase Dashboard → Authentication → Providers → Google");
        console.warn("⚠️ Ensure 'Skip nonce check' is enabled for provider tokens");
      }

      console.log("✅ Auth successful, redirecting to:", redirect);
      return NextResponse.redirect(`${origin}${redirect}`);
    }
    
    console.error("❌ Auth failed:", error);
    console.log("Redirecting to login with error");
  }

  // Auth error - redirect to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
