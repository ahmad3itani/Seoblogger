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

        const body = await req.json();
        const { postId, keywords, instructions } = body;

        if (!postId || !keywords) {
            return NextResponse.json({ error: "Missing postId or keywords" }, { status: 400 });
        }

        const blog = await prisma.blog.findFirst({
            where: { userId: userId, isDefault: true }
        });

        if (!blog) {
            return NextResponse.json({ error: "No default blog found" }, { status: 400 });
        }

        // 1. Fetch the original post HTML from Blogger
        const originalPost = await getPost(userId, blog.blogId, postId);
        const originalHtml = originalPost.content || "";

        // 2. Call OpenAI to refresh the HTML content natively
        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // Using gpt-4o for complex HTML merging and semantic understanding
            messages: [
                {
                    role: "system",
                    content: `You are an expert SEO copywriter and HTML editor working for a premium SaaS platform. Your task is to refresh, expand, and heavily optimize an old blog post.

Objective:
1. Retain the core meaning, existing links, and valuable information from the original post.
2. Substantially expand thin sections to make the content an authoritative, comprehensive guide.
3. Naturally inject the provided LSI/Target SEO keywords throughout the text.
4. Add a highly relevant "Frequently Asked Questions (FAQ)" <h2> section at the bottom to target PAA (People Also Ask) snippets.
5. Return ONLY clean, well-formated HTML (using <h2>, <h3>, <p>, <ul>, <li>). Do not include <html>, <head>, or <body> wrappers. Fix any broken HTML tags. Do not wrap the response in markdown blocks like \`\`\`html.

${instructions ? `\nCustom Editorial Instructions:\n${instructions}` : ""}`
                },
                {
                    role: "user",
                    content: `TARGET KEYWORDS TO INJECT: ${keywords}\n\n--- ORIGINAL HTML CONTENT ---\n${originalHtml}`
                }
            ],
            temperature: 0.7,
            max_tokens: 3000,
        });

        const newContent = completion.choices[0].message.content?.trim() || "";
        // Clean up potential markdown code block artifacts
        const cleanHtml = newContent.replace(/^```html\s*/i, '').replace(/\s*```$/i, '');

        return NextResponse.json({
            success: true,
            originalContent: originalHtml,
            newContent: cleanHtml
        });

    } catch (error: any) {
        console.error("Content Refresh Generation Error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate refreshed content" }, { status: 500 });
    }
}
