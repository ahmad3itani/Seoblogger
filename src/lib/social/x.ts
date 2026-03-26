// ─── X (Twitter) API v2 Client ───────────────────────────────────────────────
// Uses OAuth 2.0 PKCE flow (no PIN required) and the v2 tweets endpoint.
// Requires TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET env vars.

import crypto from "crypto";

const X_API = "https://api.twitter.com/2";
const X_AUTH = "https://twitter.com/i/oauth2";

/** Generate PKCE code_verifier and code_challenge. */
export function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

/** Build the X OAuth 2.0 PKCE authorization URL. */
export function buildXAuthUrl(
  redirectUri: string,
  state: string,
  codeChallenge: string
): string {
  const clientId = process.env.TWITTER_CLIENT_ID!;
  const scopes = ["tweet.write", "tweet.read", "users.read", "offline.access"].join(" ");
  return (
    `${X_AUTH}/authorize` +
    `?response_type=code` +
    `&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${state}` +
    `&code_challenge=${codeChallenge}` +
    `&code_challenge_method=S256`
  );
}

/** Exchange auth code for access + refresh tokens. */
export async function exchangeXCode(
  code: string,
  redirectUri: string,
  codeVerifier: string
): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
  const clientId = process.env.TWITTER_CLIENT_ID!;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET!;

  const params = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${X_AUTH}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: params.toString(),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in || 7200,
  };
}

/** Refresh an expired X access token. */
export async function refreshXToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const clientId = process.env.TWITTER_CLIENT_ID!;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET!;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${X_AUTH}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }).toString(),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? refreshToken,
    expires_in: data.expires_in || 7200,
  };
}

/** Get authenticated X user profile. */
export async function getXUser(accessToken: string): Promise<{ id: string; name: string; username: string }> {
  const res = await fetch(`${X_API}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0]?.message || "X profile fetch failed");
  return {
    id: data.data.id,
    name: data.data.name,
    username: data.data.username,
  };
}

/** Post a tweet (text only, max 280 chars). */
export async function postTweet(
  accessToken: string,
  text: string
): Promise<{ id: string }> {
  // Ensure tweet doesn't exceed 280 chars
  const finalText = text.length > 280 ? text.substring(0, 277) + "..." : text;

  const res = await fetch(`${X_API}/tweets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: finalText }),
  });

  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0]?.message || "Tweet failed");
  return { id: data.data?.id || "" };
}
