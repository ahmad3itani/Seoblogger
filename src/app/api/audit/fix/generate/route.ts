import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import OpenAI from "openai";
import { getPost } from "@/lib/blogger-api";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "dummy_key_for_build",
});

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        const { issueId, description, pageUrl, bloggerPostId, blogId } = await req.json();

        // Find the original post ID from the URL we crawled
        let targetPostId = bloggerPostId;
        
        if (targetPostId === "mock-post-id" || !targetPostId) {
            // Find post in cache by URL
            const cached = await prisma.cachedPost.findFirst({
                where: { url: pageUrl, blog: { blogId: blogId } }
            });
            if (cached) {
                targetPostId = cached.postId;
            } else {
                return NextResponse.json({ error: "Could not locate Blogger Post ID for this URL. Ensure posts are synced." }, { status: 404 });
            }
        }

        // Fetch original post content to provide context to the AI
        const originalPost = await getPost(userId, blogId, targetPostId);
        const title = originalPost.title;
        const html = originalPost.content || "";

        // Extract a snippet of the HTML to save tokens
        const contentSnippet = html.slice(0, 3000);

        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // Need complex reasoning and structured JSON output
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `You are an expert SEO engineer. Your task is to analyze the provided blog post content, identify its primary target keyword, and then generate a specific, copy-pasteable fix for a technical SEO issue.
                    
Your output MUST be a precise JSON object following this exact schema:
{
  "analyzedKeyword": "The dominant SEO keyword identified from the content",
  "suggested_fix": "The exact replacement text, HTML snippet, or Title string to use.",
  "explanation": "A one-sentence explanation of why this fix is highly optimized and how it fits the keyword.",
  "confidence": 0.95
}

Rules depending on issue:
- If 'missing_meta_description' or 'meta_description_too_short', generate a compelling 150-160 char meta description including the primary keyword.
- If 'missing_title' or 'title_too_short', generate an SEO optimized title (50-60 chars) including the primary keyword.
- If 'missing_alt_text', suggest highly relevant alt text based on the analyzed keyword.
- If 'thin_content', suggest a brief <div class="faq">...</div> HTML block related to the analyzed keyword.`
                },
                {
                    role: "user",
                    content: `Issue: ${issueId} (${description})\nPost Title: ${title}\nContent Snippet: ${contentSnippet}`
                }
            ],
            temperature: 0.7,
            max_tokens: 800,
        });

        const rawJson = completion.choices[0].message.content || "{}";
        const parsedResult = JSON.parse(rawJson);

        return NextResponse.json({
            success: true,
            suggestion: parsedResult.suggested_fix,
            explanation: parsedResult.explanation,
            analyzedKeyword: parsedResult.analyzedKeyword
        });

    } catch (error: any) {
        console.error("AI Fix Gen Error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate AI fix" }, { status: 500 });
    }
}
