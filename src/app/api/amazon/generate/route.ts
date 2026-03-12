import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { openai } from "@/lib/ai/client";

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;

        const {
            niche,
            storeId,
            productCount = 5,
            articleType = "roundup",
            language = "English",
            tone = "professional",
            includeComparisonTable = true,
            customInstructions,
        } = await req.json();

        if (!niche || !storeId) {
            return NextResponse.json(
                { error: "Niche and Amazon Store ID are required" },
                { status: 400 }
            );
        }

        const amazonSearchBase = `https://www.amazon.com/s?k=`;
        const amazonTag = `&tag=${encodeURIComponent(storeId)}`;

        let systemPrompt = "";
        let userPrompt = "";

        if (articleType === "roundup") {
            systemPrompt = `You are an expert Amazon affiliate content writer. You create highly converting, SEO-optimized product roundup articles that drive affiliate revenue.

CRITICAL RULES:
1. Write in ${language}, ${tone} tone.
2. For EVERY product mentioned, create an affiliate link using this EXACT format:
   - For product links: https://www.amazon.com/s?k=PRODUCT+NAME+KEYWORDS&tag=${storeId}
   - Replace spaces with + in the search query
3. Include ${productCount} products in the roundup.
4. Each product section MUST have: Product name as H3, Why it's great (2-3 paragraphs), Pros list, Cons list, and a prominent "Check Price on Amazon" CTA link.
5. ${includeComparisonTable ? "Include an HTML comparison table at the top with key specs for all products." : "Do NOT include a comparison table."}
6. Start with an engaging intro about the niche and why choosing the right product matters.
7. End with a "Buying Guide" section with H2 heading and 3-5 factors to consider.
8. End with a brief conclusion and final recommendation.
9. Add an affiliate disclosure at the very top: "As an Amazon Associate, we earn from qualifying purchases."
10. Output ONLY valid HTML. No markdown. Use proper heading hierarchy (H1 > H2 > H3).
11. Make product names bold and linkable.
12. Include realistic product features, specs, and use cases based on your knowledge of the niche.
${customInstructions ? `13. Additional instructions: ${customInstructions}` : ""}`;

            userPrompt = `Write a complete "Best ${niche}" product roundup article with ${productCount} products.

The article should be comprehensive (2000+ words), highly detailed, and optimized for the keyword "best ${niche}".

Amazon Store ID for affiliate links: ${storeId}
Link format: https://www.amazon.com/s?k=SEARCH+TERMS&tag=${storeId}

Make the products realistic and based on actual popular products in this niche. Include specific features, specs, and pricing ranges where appropriate.`;

        } else if (articleType === "single-review") {
            systemPrompt = `You are an expert Amazon affiliate content writer specializing in in-depth single product reviews.

CRITICAL RULES:
1. Write in ${language}, ${tone} tone.
2. Create affiliate links using: https://www.amazon.com/s?k=PRODUCT+NAME&tag=${storeId}
3. Write a comprehensive 1500+ word review.
4. Include: Overview, Key Features (detailed), Performance, Pros & Cons, Who Should Buy, Alternatives, Verdict.
5. Use HTML only. Proper heading hierarchy.
6. Add affiliate disclosure at the top.
7. Include at least 2 "Check Price on Amazon" CTA buttons as styled HTML links.
${customInstructions ? `8. Additional instructions: ${customInstructions}` : ""}`;

            userPrompt = `Write a comprehensive single product review for the best/most popular product in the "${niche}" category.

Pick a specific, real, popular product in this niche and write an expert-level review.
Amazon Store ID: ${storeId}
Link format: https://www.amazon.com/s?k=SEARCH+TERMS&tag=${storeId}`;

        } else if (articleType === "comparison") {
            systemPrompt = `You are an expert Amazon affiliate content writer specializing in product comparisons.

CRITICAL RULES:
1. Write in ${language}, ${tone} tone.
2. Create affiliate links using: https://www.amazon.com/s?k=PRODUCT+NAME&tag=${storeId}
3. Compare ${Math.min(productCount, 3)} top products head-to-head.
4. Include: Introduction, individual overviews, comparison table, category winners, final verdict.
5. Use HTML only. Proper heading hierarchy.
6. Add affiliate disclosure at the top.
${customInstructions ? `7. Additional instructions: ${customInstructions}` : ""}`;

            userPrompt = `Write a detailed product comparison article for "${niche}".

Compare the top ${Math.min(productCount, 3)} products in this category head-to-head.
Amazon Store ID: ${storeId}
Link format: https://www.amazon.com/s?k=SEARCH+TERMS&tag=${storeId}`;

        } else {
            // buyers-guide
            systemPrompt = `You are an expert Amazon affiliate content writer specializing in buyer's guides.

CRITICAL RULES:
1. Write in ${language}, ${tone} tone.
2. Create affiliate links using: https://www.amazon.com/s?k=CATEGORY+KEYWORDS&tag=${storeId}
3. Write a comprehensive 2000+ word buyer's guide.
4. Include: Introduction, Types/Categories, Key Features to Consider, Budget Ranges, Top Picks (${productCount} products), FAQ section.
5. Use HTML only. Proper heading hierarchy.
6. Add affiliate disclosure at the top.
${customInstructions ? `7. Additional instructions: ${customInstructions}` : ""}`;

            userPrompt = `Write a comprehensive buyer's guide for "${niche}".

Help readers understand everything they need to know before purchasing.
Include ${productCount} top product recommendations with affiliate links.
Amazon Store ID: ${storeId}
Link format: https://www.amazon.com/s?k=SEARCH+TERMS&tag=${storeId}`;
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 4000,
        });

        const generatedHtml = completion.choices[0].message.content || "";

        // Extract a title from the generated content
        const titleMatch = generatedHtml.match(/<h1[^>]*>(.*?)<\/h1>/i);
        const title = titleMatch
            ? titleMatch[1].replace(/<[^>]*>/g, "")
            : `Best ${niche} - Top ${productCount} Picks`;

        // Count affiliate links
        const affiliateLinkCount = (generatedHtml.match(new RegExp(storeId, "g")) || []).length;

        // Count words
        const textOnly = generatedHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        const wordCount = textOnly.split(" ").length;

        return NextResponse.json({
            success: true,
            article: {
                title,
                content: generatedHtml,
                wordCount,
                affiliateLinkCount,
                storeId,
                niche,
                articleType,
            },
        });

    } catch (error: any) {
        console.error("Amazon Generate Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate article" },
            { status: 500 }
        );
    }
}
