import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") || "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // Store Google provider tokens if available
      if (data.session.provider_token) {
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
            console.error("User sync failed:", syncResponse.status, await syncResponse.text());
          } else {
            console.log("✅ User synced successfully after OAuth");
          }
        } catch (e) {
          console.error("Failed to sync user after OAuth:", e);
          // Continue with redirect even if sync fails
        }
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
