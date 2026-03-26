// ─── LinkedIn Posts API Client ───────────────────────────────────────────────
// Uses LinkedIn's newer Posts API (v2) — replacing the deprecated UGC Posts API.

const LI_API = "https://api.linkedin.com/v2";
const LI_AUTH = "https://www.linkedin.com/oauth/v2";

/** Build the LinkedIn OAuth authorization URL. */
export function buildLinkedInAuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.LINKEDIN_CLIENT_ID!;
  const scopes = ["openid", "profile", "w_member_social"].join(" ");
  return `${LI_AUTH}/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}`;
}

/** Exchange OAuth code for access token. Returns { access_token, expires_in }. */
export async function exchangeLinkedInCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; expires_in: number }> {
  const clientId = process.env.LINKEDIN_CLIENT_ID!;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(`${LI_AUTH}/accessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);
  return { access_token: data.access_token, expires_in: data.expires_in };
}

/** Get the authenticated LinkedIn member's profile (sub = member urn). */
export async function getLinkedInProfile(
  accessToken: string
): Promise<{ id: string; name: string }> {
  const res = await fetch(`${LI_API}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return {
    id: data.sub,
    name: data.name || `${data.given_name || ""} ${data.family_name || ""}`.trim(),
  };
}

/**
 * Create a LinkedIn post using the Posts API.
 * Supports text + optional image.
 */
export async function createLinkedInPost(
  accessToken: string,
  authorUrn: string,           // e.g. "urn:li:person:abc123"
  text: string,
  imageUrn?: string            // optional pre-uploaded image URN
): Promise<{ id: string }> {
  const body: any = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: imageUrn ? "IMAGE" : "NONE",
        ...(imageUrn ? {
          media: [{
            status: "READY",
            media: imageUrn,
          }],
        } : {}),
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const res = await fetch(`${LI_API}/ugcPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LinkedIn post failed: ${err}`);
  }

  const location = res.headers.get("x-restli-id") || "";
  return { id: location };
}
