import { NextResponse } from "next/server";
import { requireAuth, requireFeature } from "@/lib/supabase/auth-helpers";
import { openai, getModelForUser } from "@/lib/ai/client";

export async function POST(req: Request) {
    try {
        const authResult = await requireFeature("hasContentRefresh");
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        const model = await getModelForUser(userId);

        const { title, content, instructions } = await req.json();

        if (!title || !content || !instructions) {
            return NextResponse.json(
                { error: "Title, content, and instructions are required" },
                { status: 400 }
            );
        }

        const systemPrompt = `You are an expert SEO blog updater. Your task is to update, expand, or rewrite an existing blog post based on the specific instructions provided by the user.

Rules:
- You must carefully follow the user's instructions (e.g., adding a new section, updating statistics, rewriting the intro).
- You must return the updated article as clean, well-formatted HTML.
- DO NOT wrap the response in markdown code blocks (\`\`\`html). Output strictly the raw HTML content.
- DO NOT include <html>, <head>, or <body> tags. Just the substantive post content.
- Ensure formatting remains consistent (H2s, H3s, lists, etc).
- CRITICAL: Generate the text in the same language as the original post unless instructed otherwise.`;

        const userPrompt = `Existing Title: ${title}

Update Instructions: ${instructions}

Original HTML Content:
${content}

Provide the complete updated HTML content based on the instructions.`;

        const response = await openai.chat.completions.create({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
        });

        const newContent = response.choices[0]?.message?.content || content;

        // Clean up any stray markdown formatting
        const cleanedContent = newContent
            .replace(/^```html\s*/, "")
            .replace(/```$/, "")
            .trim();

        return NextResponse.json({
            content: cleanedContent,
        });
    } catch (error) {
        console.error("Error refreshing article:", error);
        return NextResponse.json(
            { error: "Failed to refresh article" },
            { status: 500 }
        );
    }
}
