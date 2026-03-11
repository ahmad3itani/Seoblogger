import { NextResponse } from "next/server";
import { requireAuth, requireFeature } from "@/lib/supabase/auth-helpers";
import { openai, getModelForUser } from "@/lib/ai/client";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { sanitizeStringArray } from "@/lib/security/validate";

export async function POST(req: Request) {
    try {
        const authResult = await requireFeature("hasAutoClustering");
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        // Rate limit: 10 cluster requests per minute
        const rl = checkRateLimit(`cluster:${userId}`, 10, 60_000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` },
                { status: 429 }
            );
        }

        const model = await getModelForUser(userId);

        const body = await req.json();
        const keywords = sanitizeStringArray(body.keywords, 200, 200);

        if (keywords.length === 0) {
            return NextResponse.json({ error: "Keywords array is required" }, { status: 400 });
        }

        const prompt = `You are an expert SEO strategist specializing in keyword topic clustering (hub and spoke strategy). 
I have a list of keywords. I need you to group them into highly relevant semantic topical clusters.
Group keywords that share the same search intent or semantic meaning together into the same cluster. 
If a keyword doesn't clearly fit into any specific cluster, put it in a "Miscellaneous" cluster.

List of keywords to cluster:
${keywords.join("\n")}

Respond ONLY with a valid JSON object in this exact structure:
{
  "clusters": [
    {
      "clusterName": "Main Topic Name",
      "keywords": ["keyword 1", "keyword 2"]
    }
  ]
}`;

        const response = await openai.chat.completions.create({
            model,
            messages: [
                { role: "system", content: "You are an SEO topic clustering API. You only respond in pure JSON." },
                { role: "user", content: prompt }
            ],
            temperature: 0.1,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error("No content returned from AI");
        }

        const parsed = JSON.parse(content);
        return NextResponse.json({ clusters: parsed.clusters || [] });
    } catch (error: any) {
        console.error("Clustering Error:", error);
        return NextResponse.json({ error: error.message || "Failed to cluster keywords" }, { status: 500 });
    }
}
