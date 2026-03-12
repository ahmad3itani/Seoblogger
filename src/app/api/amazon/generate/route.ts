import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { generateFullAmazonArticle } from "@/lib/amazon/generate";
import { getUserPlanName } from "@/lib/ai/client";

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

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

        // Get user's plan for model selection
        const userPlan = await getUserPlanName(userId);

        console.log(`🚀 Starting Amazon article generation for "${niche}"`);

        // Use the full pipeline (same as regular articles)
        const result = await generateFullAmazonArticle({
            niche,
            storeId,
            productCount,
            articleType: articleType as "roundup" | "single-review" | "comparison" | "buyers-guide",
            language,
            tone,
            includeComparisonTable,
            customInstructions,
            userPlan,
        });

        const { selectedTitle, article, products, wordCount, affiliateLinkCount } = result;

        return NextResponse.json({
            success: true,
            article: {
                title: selectedTitle,
                content: article,
                wordCount,
                affiliateLinkCount,
                storeId,
                niche,
                articleType,
                products: products.map(p => ({
                    name: p.name,
                    imageUrl: p.imageUrl,
                    price: p.price,
                    rating: p.rating,
                })),
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
