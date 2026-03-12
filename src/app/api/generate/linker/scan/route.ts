import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { openai } from "@/lib/ai/client";
import { getPost } from "@/lib/blogger-api";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        const body = await req.json();
        const { targetUrl, targetTitle, targetKeyword } = body;

        if (!targetUrl || !targetKeyword) {
            return NextResponse.json({ error: "Missing target URL or keyword" }, { status: 400 });
        }

        const blog = await prisma.blog.findFirst({
            where: { userId: userId, isDefault: true }
        });

        if (!blog) {
            return NextResponse.json({ error: "No default blog found" }, { status: 400 });
        }

        // Find 5 recent posts that are NOT the target post
        const candidates = await prisma.cachedPost.findMany({
            where: {
                blogId: blog.blogId,
                url: { not: targetUrl }
            },
            orderBy: { publishedAt: 'desc' },
            take: 5,
        });

        const opportunities: any[] = [];

        // Process each candidate sequentially to avoid rate limits and massive parallel AI calls
        for (const post of candidates) {
            try {
                const originalPost = await getPost(userId, blog.blogId, post.postId);
                const html = originalPost.content || "";

                // Skip if the post already links to the target
                if (html.includes(targetUrl)) {
                    continue;
                }

                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini", // fast and cheap for scanning
                    messages: [
                        {
                            role: "system",
                            content: `You are an SEO internal linking AI. Your task is to find exactly ONE natural place in the provided HTML to inject a link back to a target URL.
    
    Target URL: ${targetUrl}
    Target Keyword / Anchor Text to use: "${targetKeyword}"
    
    Rules:
    1. Reply ONLY with valid JSON. Focus on a single <p> tag context.
    2. If there is absolutely no relevant place to insert the link, return { "found": false }.
    3. If there is a good place, rewrite that specific paragraph to naturally include the <a> tag.
    4. Return format:
    {
       "found": true,
       "originalContext": "The exact original text of the paragraph",
       "newContextHtml": "The new HTML for just that paragraph containing the <a href='...'>keyword</a>",
       "fullNewHtml": "The ENTIRE original HTML but with that one paragraph replaced with the new one"
    }
    
    Do NOT use markdown blocks like \`\`\`json. Just raw parsable JSON.`
                        },
                        {
                            role: "user",
                            content: `HTML Content of "${post.title}":\n\n${html}`
                        }
                    ],
                    temperature: 0.3,
                });

                const content = completion.choices[0].message.content?.trim() || "";
                const cleanJson = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');

                try {
                    const result = JSON.parse(cleanJson);
                    if (result.found && result.newContextHtml && result.fullNewHtml) {
                        opportunities.push({
                            postId: post.postId,
                            postTitle: post.title,
                            postUrl: post.url,
                            originalContext: result.originalContext,
                            newContextHtml: result.newContextHtml,
                            fullNewHtml: result.fullNewHtml, // We send this to the client
                            status: "pending"
                        });
                    }
                } catch (e) {
                    console.error("Failed to parse linker suggestion JSON", content);
                }

            } catch (e) {
                console.error(`Linker failed on post ${post.postId}`, e);
            }
        }

        return NextResponse.json({ success: true, opportunities });
    } catch (error: any) {
        console.error("Linker scan route error:", error);
        return NextResponse.json({ error: error.message || "Failed to scan for links" }, { status: 500 });
    }
}
