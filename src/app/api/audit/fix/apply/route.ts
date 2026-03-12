import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { getPost, updatePost } from "@/lib/blogger-api";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        const { bloggerPostId, blogId, issueId, suggestedFix, dbIssueId, pageUrl } = await req.json();

        if (!bloggerPostId || !blogId || !issueId || !suggestedFix) {
            return NextResponse.json({ error: "Missing required data" }, { status: 400 });
        }

        // Find the original post ID from the URL we crawled
        let targetPostId = bloggerPostId;
        
        if (targetPostId === "mock-post-id" || !targetPostId) {
            // Find post in cache by URL
            const cached = await prisma.cachedPost.findFirst({
                where: { url: pageUrl, blogId: blogId }
            });
            if (cached) {
                targetPostId = cached.postId;
            } else {
                return NextResponse.json({ error: "Could not locate Blogger Post ID for this URL. Ensure posts are synced." }, { status: 404 });
            }
        }

        // 1. Fetch current post state from Blogger
        const originalPost = await getPost(userId, blogId, targetPostId);

        // 2. Map the fix to the Blogger properties
        let newTitle = originalPost.title;
        let newContent = originalPost.content || "";

        switch (issueId) {
            case "missing_title":
            case "title_too_short":
            case "title_too_long":
                // AI suggestion replaces the entire title
                newTitle = suggestedFix.replace(/^"|"$/g, '').trim();
                break;

            case "missing_meta_description":
            case "meta_description_too_short":
            case "meta_description_too_long":
                // Blogger doesn't have a native "meta description" API property for posts
                // But it does have a `customMetaData` property, though we'll inject it into the HTML head if standard
                // Alternatively, we can inject it at the top of the content in a hidden span or schema tag.
                // For safety, we'll append a hidden div or use standard Blogger schema syntax.
                newContent = `\n<div style="display:none;" data-seo-meta-description="true">${suggestedFix}</div>\n` + newContent;
                break;

            case "thin_content":
            case "low_word_count":
                // AI generated an FAQ block to append
                newContent = newContent + `\n\n${suggestedFix}`;
                break;

            case "missing_h1":
                newContent = `<h1>${suggestedFix}</h1>\n` + newContent;
                break;

            case "missing_alt_text":
                // Very naive replace for the first image without an alt tag.
                // A true parser would require Cheerio here as well, but for simplicity we regex inject.
                newContent = newContent.replace(/<img(.*?)>/, `<img alt="${suggestedFix.replace(/"/g, "'")}" $1>`);
                break;

            default:
                // For anything else (or unmapped custom fixes), we append it or ignore
                console.warn("Unmapped fix type:", issueId);
        }

        // 3. Push to Blogger API
        const updatedPost = await updatePost(userId, blogId, targetPostId, newTitle || "", newContent);

        // 4. Mark issue as "applied" in our local database history
        if (dbIssueId) {
            await prisma.fixSuggestion.updateMany({
                where: { issueId: dbIssueId },
                data: { status: "applied", appliedAt: new Date() }
            });
        }

        return NextResponse.json({
            success: true,
            postUrl: updatedPost.url
        });

    } catch (error: any) {
        console.error("Auto-Fix Apply Error:", error);
        return NextResponse.json({ error: error.message || "Could not push update to Blogger" }, { status: 500 });
    }
}
