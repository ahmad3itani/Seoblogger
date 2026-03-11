import { NextResponse } from "next/server";
import { requireAuth, requireFeature } from "@/lib/supabase/auth-helpers";
import { openai, getModelForUser } from "@/lib/ai/client";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: Request) {
    try {
        const authResult = await requireFeature("hasTrendIdeas");
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        // Rate limit: 10 idea generations per minute
        const rl = checkRateLimit(`ideas:${userId}`, 10, 60_000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` },
                { status: 429 }
            );
        }

        const model = await getModelForUser(userId);

        const { niche, audience, timeframe = "recent" } = await req.json();

        if (!niche) {
            return NextResponse.json({ error: "Niche is required" }, { status: 400 });
        }

        // Get user's plan for premium features
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { plan: true }
        });

        // Fetch real trending topics from Serper API if available
        let trendingTopics: string[] = [];
        const serperKey = process.env.SERPER_API_KEY;

        if (serperKey) {
            try {
                console.log(`🔍 Fetching trending topics for niche: ${niche}`);

                // Get related searches and trending queries
                const serperResponse = await fetch("https://google.serper.dev/search", {
                    method: "POST",
                    headers: {
                        "X-API-KEY": serperKey,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        q: `${niche} trends 2026`,
                        gl: "us",
                        hl: "en",
                        num: 10,
                    }),
                });

                if (serperResponse.ok) {
                    const serperData = await serperResponse.json();

                    // Extract related searches and questions
                    const relatedSearches = serperData.relatedSearches?.map((r: any) => r.query) || [];
                    const questions = serperData.peopleAlsoAsk?.map((q: any) => q.question) || [];

                    trendingTopics = [...relatedSearches, ...questions].slice(0, 15);
                    console.log(`✅ Found ${trendingTopics.length} trending topics from Serper`);
                }
            } catch (error) {
                console.error("Serper API error:", error);
            }
        }

        const systemPrompt = `You are an expert SEO Strategist and trend analyst specializing in identifying emerging trends and high-opportunity content topics.
Your job is to generate a list of 10 highly specific, trend-driven article ideas for a given niche and audience.

Focus on:
- Emerging trends and fresh angles (2026 trends)
- Long-tail, low-competition keywords
- Topics with commercial or informational intent
- Questions people are actively searching for
- Gaps in existing content

${trendingTopics.length > 0 ? `\n**Real Trending Topics to Consider:**\n${trendingTopics.map(t => `- ${t}`).join('\n')}\n` : ''}

Output strictly as a JSON object with this shape:
{
  "ideas": [
    {
      "keyword": "primary target keyword (long-tail, specific)",
      "title": "A catchy, CTR-optimized article title",
      "intent": "informational | commercial | transactional",
      "reasoning": "1-2 sentences why this topic is trending or high-opportunity",
      "searchVolume": "estimated monthly searches (e.g., 2.4K, 890, 12K)",
      "difficulty": "easy | medium | hard",
      "trendDirection": "rising | stable | declining"
    }
  ]
}`;

        const userPrompt = `Generate 10 trend-driven article ideas for:

**Niche/Topic:** ${niche}
**Target Audience:** ${audience || "General"}
**Focus:** ${timeframe === "recent" ? "Emerging 2026 trends, fresh angles, and rising search queries" : "Evergreen, high-volume cornerstone topics"}
**Date Context:** March 2026

Prioritize:
1. Topics with rising search interest
2. Long-tail keywords (3-5 words)
3. Questions and how-to queries
4. Commercial intent where applicable
5. Low competition opportunities

Make each idea unique, specific, and actionable.`;

        const response = await openai.chat.completions.create({
            model,
            messages: [
                { role: "system", content: systemPrompt + "\n\nOutput ONLY valid JSON." },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.8,
        });

        let content = response.choices[0]?.message?.content || '{"ideas":[]}';

        // Strip markdown code blocks if present
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const parsed = JSON.parse(content);

        return NextResponse.json(parsed);

    } catch (error) {
        console.error("Error generating trending ideas:", error);
        return NextResponse.json({ error: "Failed to generate ideas" }, { status: 500 });
    }
}
