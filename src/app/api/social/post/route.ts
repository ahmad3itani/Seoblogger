import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { prisma } from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/lib/social/token-crypto";
import { postToPage } from "@/lib/social/facebook";
import { createLinkedInPost } from "@/lib/social/linkedin";
import { postTweet, refreshXToken } from "@/lib/social/x";

// POST /api/social/post
// Body: { articleId, platforms: ['facebook','linkedin','x'], captions: { facebook, linkedin, x } }
export async function POST(req: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { user: authUser } = authResult;

    const { articleId, platforms, captions } = await req.json();
    if (!articleId || !platforms?.length) {
      return NextResponse.json({ error: "articleId and platforms required" }, { status: 400 });
    }

    const article = await prisma.article.findFirst({
      where: { id: articleId, userId: authUser.id },
    });
    if (!article) return NextResponse.json({ error: "Article not found" }, { status: 404 });

    const results: Record<string, { status: string; postId?: string; error?: string }> = {};

    for (const platform of platforms as string[]) {
      try {
        const account = await prisma.socialAccount.findFirst({
          where: { userId: authUser.id, platform },
        });

        if (!account) {
          results[platform] = { status: "failed", error: `No connected ${platform} account` };
          continue;
        }

        let accessToken = decryptToken(account.encryptedToken);
        const caption = captions?.[platform] || `New article: "${article.title}" ${(article as any).liveUrl || ""}`;
        const imageUrl = ((article as any).socialPackage as any)?.imageUrl || undefined;
        const link = (article as any).liveUrl || "";

        // Auto-refresh expired X tokens
        if (platform === "x" && account.tokenExpiry && account.tokenExpiry < new Date()) {
          if (account.encryptedRefresh) {
            try {
              const refreshToken = decryptToken(account.encryptedRefresh);
              const refreshed = await refreshXToken(refreshToken);
              accessToken = refreshed.access_token;
              await prisma.socialAccount.update({
                where: { id: account.id },
                data: {
                  encryptedToken: encryptToken(refreshed.access_token),
                  encryptedRefresh: encryptToken(refreshed.refresh_token),
                  tokenExpiry: new Date(Date.now() + refreshed.expires_in * 1000),
                },
              });
            } catch (refreshErr: any) {
              results[platform] = { status: "failed", error: `X token expired and refresh failed: ${refreshErr.message}` };
              continue;
            }
          } else {
            results[platform] = { status: "failed", error: "X access token expired. Please reconnect." };
            continue;
          }
        }

        let platformPostId: string | undefined;

        if (platform === "facebook") {
          const result = await postToPage(account.accountId, accessToken, { message: caption, link, imageUrl });
          platformPostId = result.id;
        } else if (platform === "linkedin") {
          const authorUrn = `urn:li:person:${account.accountId}`;
          // Include link in text for LinkedIn (no native link attachment in UGC API without extra steps)
          const liText = link ? `${caption}\n\n${link}` : caption;
          const result = await createLinkedInPost(accessToken, authorUrn, liText);
          platformPostId = result.id;
        } else if (platform === "x") {
          // X has 280 char limit — include link in the caption (already in AI-generated caption)
          const result = await postTweet(accessToken, caption);
          platformPostId = result.id;
        } else {
          results[platform] = { status: "failed", error: `Unsupported platform: ${platform}` };
          continue;
        }

        await prisma.socialPost.create({
          data: {
            articleId,
            userId: authUser.id,
            platform,
            platformPostId,
            caption,
            imageUrl,
            status: "posted",
            postedAt: new Date(),
          },
        });

        results[platform] = { status: "posted", postId: platformPostId };
      } catch (err: any) {
        console.error(`Failed to post to ${platform}:`, err);
        await prisma.socialPost.create({
          data: {
            articleId,
            userId: authUser.id,
            platform,
            caption: captions?.[platform] || "",
            status: "failed",
            errorMessage: err.message,
          },
        }).catch(() => {});
        results[platform] = { status: "failed", error: err.message };
      }
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error("Social post error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
