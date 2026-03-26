import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { prisma } from "@/lib/prisma";
import { generateSocialPackage } from "@/lib/social/social-generator";

// POST /api/social/generate
// Body: { articleId, generateImage? }
export async function POST(req: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { user: authUser } = authResult;

    const { articleId, generateImage = false } = await req.json();
    if (!articleId) return NextResponse.json({ error: "articleId required" }, { status: 400 });

    const article = await prisma.article.findFirst({
      where: { id: articleId, userId: authUser.id },
    });
    if (!article) return NextResponse.json({ error: "Article not found" }, { status: 404 });

    const liveUrl = article.liveUrl || `https://www.blogger.com`;
    const keyword = article.labels?.split(",")[0]?.trim() || article.title;

    const pkg = await generateSocialPackage({
      title: article.title,
      keyword,
      excerpt: article.metaDescription || article.excerpt || article.title,
      liveUrl,
      generateImage,
    });

    // Cache the package on the article row
    await prisma.article.update({
      where: { id: articleId },
      data: { socialPackage: pkg as any },
    });

    return NextResponse.json({ socialPackage: pkg });
  } catch (err: any) {
    console.error("Social generate error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
