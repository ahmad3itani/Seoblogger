import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { getUserPlanName } from "@/lib/ai/client";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
    researchProducts,
    researchProductFromUrl,
    buildAffiliateData,
    checkTierDiversity,
} from "@/lib/amazon/generate";
import { detectIntent, getIntentColor, getIntentDescription } from "@/lib/amazon/intent";

/**
 * POST /api/amazon/research
 *
 * Step 1 of two-step Amazon flow:
 * Research products and return them for preview before generation.
 */
export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        // Rate limit: 10 research calls per minute
        const rl = checkRateLimit(`amazon-research:${userId}`, 10, 60_000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` },
                { status: 429 }
            );
        }

        const {
            niche,
            storeId,
            storeRegion = "us",
            productUrl,
            productCount = 5,
            articleType = "roundup",
        } = await req.json();

        if (!niche || !storeId) {
            return NextResponse.json(
                { error: "Niche and Amazon Store ID are required" },
                { status: 400 }
            );
        }

        // Get user's plan for model selection
        const userPlan = await getUserPlanName(userId);

        console.log(`🔍 Starting Amazon product research for "${niche}"...`);

        // Detect intent for the keyword
        const intentResult = detectIntent(niche);
        const intentColors = getIntentColor(intentResult.intent);
        const intentDescription = getIntentDescription(intentResult.intent);

        // Research products (with or without URL)
        let products;
        const isUrlReview = !!productUrl?.trim();

        if (isUrlReview) {
            console.log(`📦 Researching specific product from URL: ${productUrl}`);
            products = await researchProductFromUrl(productUrl, niche, userPlan, storeRegion);
        } else {
            console.log(`📦 Researching ${productCount} products for "${niche}"...`);
            products = await researchProducts(niche, productCount, articleType, userPlan, storeRegion);
        }

        // Build affiliate links
        const productsWithLinks = buildAffiliateData(products, storeId, storeRegion);

        // Check tier diversity
        const tierDiversity = checkTierDiversity(productsWithLinks);

        console.log(`✅ Research complete: ${productsWithLinks.length} products found`);

        return NextResponse.json({
            success: true,
            products: productsWithLinks,
            intent: {
                type: intentResult.intent,
                confidence: intentResult.confidence,
                isAffiliateReady: intentResult.isAffiliateReady,
                suggestion: intentResult.suggestion,
                colors: intentColors,
                description: intentDescription,
            },
            tierDiversity,
            meta: {
                niche,
                storeId,
                storeRegion,
                articleType: isUrlReview ? "single-review" : articleType,
                productCount: productsWithLinks.length,
                isUrlReview,
            },
        });

    } catch (error: any) {
        console.error("Amazon Research Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to research products" },
            { status: 500 }
        );
    }
}
