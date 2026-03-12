import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getPost, updatePost } from "@/lib/blogger-api";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        // Rate limit: 10 applies per minute
        const rl = checkRateLimit(`linker-apply:${userId}`, 10, 60_000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` },
                { status: 429 }
            );
        }

        const {
            sourcePostId,
            sourceTitle,
            targetUrl,
            targetTitle,
            originalParagraphHtml,
            newParagraphHtml,
            anchorText,
        } = await req.json();

        if (!sourcePostId || !originalParagraphHtml || !newParagraphHtml || !targetUrl) {
            return NextResponse.json(
                { error: "Missing required fields for apply" },
                { status: 400 }
            );
        }

        // Get user's default blog
        const blog = await prisma.blog.findFirst({
            where: { userId, isDefault: true },
        });

        if (!blog) {
            return NextResponse.json(
                { error: "No default blog found" },
                { status: 400 }
            );
        }

        // SAFETY: Re-fetch the LATEST content from Blogger before applying
        console.log(`🔄 Re-fetching latest content for post ${sourcePostId}...`);
        const latestPost = await getPost(userId, blog.blogId, sourcePostId);
        const currentContent = latestPost.content || "";
        const currentTitle = latestPost.title || sourceTitle;

        // Verify the original paragraph still exists in the current content
        // Use a fuzzy match — trim whitespace and normalize
        const normalizedOriginal = originalParagraphHtml.trim();
        if (!currentContent.includes(normalizedOriginal)) {
            // Try a more lenient match (content may have slight whitespace differences)
            const strippedOriginal = normalizedOriginal.replace(/\s+/g, " ").trim();
            const strippedContent = currentContent.replace(/\s+/g, " ");
            
            if (!strippedContent.includes(strippedOriginal)) {
                return NextResponse.json({
                    success: false,
                    error: "The source paragraph has changed since the scan. Please re-scan to get fresh opportunities.",
                    stale: true,
                });
            }
            
            // Apply with whitespace-normalized match
            const updatedContent = currentContent.replace(
                new RegExp(escapeRegex(normalizedOriginal).replace(/\\s\+/g, "\\s+"), ""),
                newParagraphHtml
            );
            
            if (updatedContent === currentContent) {
                return NextResponse.json({
                    success: false,
                    error: "Could not locate the exact paragraph to replace. Please re-scan.",
                    stale: true,
                });
            }

            // Apply the update
            console.log(`✏️ Applying internal link to post: ${currentTitle}`);
            const updatedPost = await updatePost(userId, blog.blogId, sourcePostId, currentTitle, updatedContent);

            return NextResponse.json({
                success: true,
                postUrl: updatedPost.url,
                anchorText,
                targetUrl,
                targetTitle,
            });
        }

        // Direct match — apply the replacement
        const updatedContent = currentContent.replace(normalizedOriginal, newParagraphHtml);

        if (updatedContent === currentContent) {
            return NextResponse.json({
                success: false,
                error: "Replacement had no effect. The paragraph may have already been modified.",
                stale: true,
            });
        }

        // Validate: ensure only one replacement happened
        const replacementCount = currentContent.split(normalizedOriginal).length - 1;
        if (replacementCount > 1) {
            // Multiple matches — use indexOf to replace only the first
            const idx = currentContent.indexOf(normalizedOriginal);
            const safeContent =
                currentContent.substring(0, idx) +
                newParagraphHtml +
                currentContent.substring(idx + normalizedOriginal.length);

            console.log(`✏️ Applying internal link (first match) to post: ${currentTitle}`);
            const updatedPost = await updatePost(userId, blog.blogId, sourcePostId, currentTitle, safeContent);

            return NextResponse.json({
                success: true,
                postUrl: updatedPost.url,
                anchorText,
                targetUrl,
                targetTitle,
            });
        }

        // Apply the update via Blogger API
        console.log(`✏️ Applying internal link to post: ${currentTitle}`);
        const updatedPost = await updatePost(userId, blog.blogId, sourcePostId, currentTitle, updatedContent);

        console.log(`✅ Internal link applied: "${anchorText}" → ${targetUrl}`);

        return NextResponse.json({
            success: true,
            postUrl: updatedPost.url,
            anchorText,
            targetUrl,
            targetTitle,
        });
    } catch (error: any) {
        console.error("Linker apply error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to apply internal link" },
            { status: 500 }
        );
    }
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
