import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { getKeywordData, getEstimatedKeywordData } from "@/lib/seo/keyword-api";

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;

        const { keyword } = await req.json();

        if (!keyword || typeof keyword !== "string") {
            return NextResponse.json(
                { error: "Keyword is required" },
                { status: 400 }
            );
        }

        // Check if any API keys are configured
        const hasAPIKeys = !!(
            process.env.SERPER_API_KEY ||
            process.env.VALUESERP_API_KEY ||
            (process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD)
        );

        let data;
        
        if (hasAPIKeys) {
            // Fetch real data from APIs
            console.log(`🔑 API keys detected - fetching real data for: "${keyword}"`);
            try {
                data = await getKeywordData(keyword);
                console.log(`✅ Successfully fetched keyword data for: "${keyword}"`);
            } catch (apiError: any) {
                console.error(`❌ API fetch failed, falling back to estimates:`, apiError);
                // Fallback to estimates if API fails
                data = getEstimatedKeywordData(keyword);
                data = {
                    ...data,
                    isEstimated: true,
                    message: `API error: ${apiError.message}. Showing estimates instead.`
                };
            }
        } else {
            // Use estimated data as fallback
            console.log(`⚠️ No API keys configured - using estimated data for: "${keyword}"`);
            data = getEstimatedKeywordData(keyword);
            
            // Add a flag to indicate this is estimated data
            data = {
                ...data,
                isEstimated: true,
                message: "Configure API keys (SERPER_API_KEY, VALUESERP_API_KEY, or DataForSEO) for real keyword data"
            };
        }

        // Ensure we always return valid data
        if (!data || typeof data !== 'object') {
            throw new Error("Invalid data returned from keyword analysis");
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Keyword analysis error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to analyze keyword" },
            { status: 500 }
        );
    }
}
