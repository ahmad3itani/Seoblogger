import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { getPost, updatePost } from "@/lib/blogger-api";
import { prisma } from "@/lib/prisma";
import * as cheerio from "cheerio";

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        const { bloggerPostId, blogId, issueId, suggestedFix, dbIssueId, pageUrl } = await req.json();

        if (!blogId || !issueId || !suggestedFix) {
            return NextResponse.json({ error: "Missing required data" }, { status: 400 });
        }

        // Find the original post ID from the URL we crawled
        let targetPostId = bloggerPostId;
        
        if (!targetPostId || targetPostId === "mock-post-id") {
            const cached = await prisma.cachedPost.findFirst({
                where: { url: pageUrl, blog: { blogId: blogId } }
            });
            if (cached) {
                targetPostId = cached.postId;
            } else {
                return NextResponse.json({ error: "Could not locate Blogger Post ID for this URL. Ensure posts are synced." }, { status: 404 });
            }
        }

        // 1. Fetch current post state from Blogger
        const originalPost = await getPost(userId, blogId, targetPostId);
        let newTitle = originalPost.title || "";
        let newContent = originalPost.content || "";

        // 2. Use cheerio for safe, targeted HTML manipulation
        const $ = cheerio.load(newContent);

        switch (issueId) {
            case "missing_title":
            case "title_too_short":
            case "title_too_long":
                newTitle = suggestedFix.replace(/^"|"$/g, "").trim();
                break;

            case "missing_meta_description":
            case "meta_description_too_short":
            case "meta_description_too_long":
                // Use Blogger's searchDescription field via the API
                // Also store as a hidden meta tag in content as fallback
                $("div[data-seo-meta-description]").remove(); // Remove old injected meta
                $.root().prepend(`<div style="display:none;" data-seo-meta-description="true">${suggestedFix}</div>\n`);
                newContent = $.html();
                break;

            case "thin_content":
            case "low_word_count":
                // Append AI-generated content at the end
                $.root().append(`\n\n${suggestedFix}`);
                newContent = $.html();
                break;

            case "missing_h1":
                // Prepend H1 before existing content
                $.root().prepend(`<h1>${suggestedFix}</h1>\n`);
                newContent = $.html();
                break;

            case "no_h2_tags":
                // AI returns H2 headings — append them as structural improvement
                $.root().append(`\n\n${suggestedFix}`);
                newContent = $.html();
                break;

            case "missing_alt_text":
                // AI returns JSON array of [{imgIndex, altText}]
                try {
                    const altFixes = typeof suggestedFix === "string" ? JSON.parse(suggestedFix) : suggestedFix;
                    if (Array.isArray(altFixes)) {
                        const imgs = $("img");
                        altFixes.forEach((fix: { imgIndex: number; altText: string }) => {
                            const img = imgs.eq(fix.imgIndex);
                            if (img.length && (!img.attr("alt") || img.attr("alt")?.trim() === "")) {
                                img.attr("alt", fix.altText);
                            }
                        });
                    } else {
                        // Fallback: apply to first image without alt
                        const firstNoAlt = $("img:not([alt]), img[alt='']").first();
                        if (firstNoAlt.length) {
                            firstNoAlt.attr("alt", String(suggestedFix));
                        }
                    }
                } catch {
                    // If JSON parse fails, apply as text to first image without alt
                    const firstNoAlt = $("img:not([alt]), img[alt='']").first();
                    if (firstNoAlt.length) {
                        firstNoAlt.attr("alt", String(suggestedFix));
                    }
                }
                newContent = $.html();
                break;

            case "orphan_page":
            case "low_internal_links":
                // AI returns HTML anchor tags — append as a "Related Posts" section
                $.root().append(`\n\n<div class="related-posts"><h3>Related Articles</h3>${suggestedFix}</div>`);
                newContent = $.html();
                break;

            default:
                console.warn("Unmapped fix type:", issueId);
                // For unmapped types, append the fix
                $.root().append(`\n\n${suggestedFix}`);
                newContent = $.html();
        }

        // 3. Push to Blogger API — only the changed title/content
        const updatedPost = await updatePost(userId, blogId, targetPostId, newTitle, newContent);

        // 4. Mark issue as "applied" in database
        if (dbIssueId) {
            await prisma.fixSuggestion.updateMany({
                where: { issueId: dbIssueId },
                data: { status: "applied", appliedAt: new Date() }
            });
        }

        // Also mark the SeoIssue itself
        try {
            const seoIssue = await prisma.seoIssue.findFirst({
                where: { issueId, page: { url: pageUrl } },
                orderBy: { createdAt: "desc" },
            });
            if (seoIssue) {
                await prisma.seoIssue.update({
                    where: { id: seoIssue.id },
                    data: { fixable: false, description: `✅ Fixed: ${seoIssue.description}` },
                });
            }
        } catch (e) {
            console.warn("Could not mark issue as fixed in DB:", e);
        }

        return NextResponse.json({
            success: true,
            postUrl: updatedPost.url,
            changedTitle: issueId.includes("title"),
            changedContent: !issueId.includes("title"),
        });

    } catch (error: any) {
        console.error("Auto-Fix Apply Error:", error);
        return NextResponse.json({ error: error.message || "Could not push update to Blogger" }, { status: 500 });
    }
}
