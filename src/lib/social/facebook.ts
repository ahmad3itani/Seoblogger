// ─── Facebook Graph API Client ──────────────────────────────────────────────

const GRAPH_API = "https://graph.facebook.com/v19.0";

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
}

/** Exchange short-lived user token for a long-lived token (60 days). */
export async function exchangeForLongLivedToken(shortToken: string): Promise<string> {
  const appId = process.env.FACEBOOK_APP_ID!;
  const appSecret = process.env.FACEBOOK_APP_SECRET!;
  const url = `${GRAPH_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.access_token as string;
}

/** Get all Pages the user manages and their access tokens. */
export async function getPages(userAccessToken: string): Promise<FacebookPage[]> {
  const url = `${GRAPH_API}/me/accounts?fields=id,name,access_token&access_token=${userAccessToken}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return (data.data || []) as FacebookPage[];
}

/** Post a message + link (+optional image) to a Facebook Page feed. */
export async function postToPage(
  pageId: string,
  pageAccessToken: string,
  opts: { message: string; link: string; imageUrl?: string }
): Promise<{ id: string }> {
  let endpoint = `${GRAPH_API}/${pageId}/feed`;
  let body: Record<string, string> = {
    message: opts.message,
    link: opts.link,
    access_token: pageAccessToken,
  };

  // If there's an image, post as a photo instead for higher engagement
  if (opts.imageUrl) {
    endpoint = `${GRAPH_API}/${pageId}/photos`;
    body = {
      caption: `${opts.message}\n\n${opts.link}`,
      url: opts.imageUrl,
      access_token: pageAccessToken,
    };
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return { id: data.id || data.post_id || "" };
}

/** Build the Facebook OAuth URL for the user to authorize. */
export function buildFacebookAuthUrl(redirectUri: string): string {
  const appId = process.env.FACEBOOK_APP_ID!;
  const scopes = ["pages_manage_posts", "pages_read_engagement"].join(",");
  return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code`;
}

/** Exchange OAuth code for a short-lived user access token. */
export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const appId = process.env.FACEBOOK_APP_ID!;
  const appSecret = process.env.FACEBOOK_APP_SECRET!;
  const url = `${GRAPH_API}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.access_token as string;
}
