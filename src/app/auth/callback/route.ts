import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const rawRedirect = searchParams.get("redirect") || "/dashboard";
  // Prevent open redirect — only allow internal paths
  const redirect = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/dashboard";

  console.log("🔄 Auth callback received. Code:", code ? "Present" : "Missing");

  // Handle OAuth error response
  if (errorParam) {
    console.error("❌ OAuth error:", errorParam, errorDescription);
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed&details=${encodeURIComponent(errorDescription || errorParam)}`);
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data.session) {
        console.log("✅ Session created for user:", data.session.user.email);
        
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
              console.error("❌ User sync failed:", syncResponse.status);
            } else {
              console.log("✅ User synced successfully");
            }
          } catch (e) {
            console.error("❌ Failed to sync user after OAuth:", e);
          }
        } else {
          // Still sync user profile (without Google tokens)
          try {
            await fetch(`${origin}/api/user/sync`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Cookie: request.headers.get("cookie") || "",
              },
            });
          } catch (e) {
            console.error("❌ Failed to sync user:", e);
          }
        }

        console.log("✅ Auth successful, redirecting to:", redirect);
        return NextResponse.redirect(`${origin}${redirect}`);
      }
      
      console.error("❌ Auth code exchange failed:", error?.message);
    } catch (e) {
      console.error("❌ Auth callback exception:", e);
    }
  }

  // Auth error - redirect to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
