import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { openai } from "@/lib/ai/client";

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;

        const { issueId, description, pageTitle } = await req.json();

        if (!issueId || !description) {
            return NextResponse.json({ error: "Missing issue data" }, { status: 400 });
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Use mini for faster, cheaper explanations
            messages: [
                {
                    role: "system",
                    content: `You are an expert SEO consultant. Your job is to explain technical SEO issues to a beginner Blogger user in very simple language.

Output exactly 3 short paragraphs:
1. "The Problem": Explain what the issue is in 1-2 simple sentences.
2. "Why it Matters": Explain how this impacts their Google ranking or user experience.
3. "How to Fix": A simple tip on how to resolve it conceptually.

Do not output JSON, markdown headers, or bullet points. Just return the 3 short, conversational paragraphs.`
                },
                {
                    role: "user",
                    content: `Issue Code: ${issueId}\nTechnical Description: ${description}\nPage Title: ${pageTitle || "Unknown"}`
                }
            ],
            temperature: 0.7,
            max_tokens: 250,
        });

        const explanation = completion.choices[0].message.content?.trim();

        return NextResponse.json({ success: true, explanation });

    } catch (error: any) {
        console.error("AI Explanation Error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate explanation" }, { status: 500 });
    }
}
