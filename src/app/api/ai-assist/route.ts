import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
    generateSectionSuggestions,
    generateFAQSuggestions,
    expandOutlineSection,
    improveSection,
} from "@/lib/ai/editing";

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        // Get user's plan for model selection
        const currentUser = await prisma.user.findUnique({
            where: { id: authUser.id },
            include: { plan: true },
        });

        const body = await req.json();
        const { action, ...params } = body;

        const userPlan = currentUser?.plan?.name || "free";

        switch (action) {
            case "suggest-sections": {
                const { keyword, existingSections, articleType, niche } = params;
                const suggestions = await generateSectionSuggestions(
                    keyword,
                    existingSections,
                    articleType,
                    niche,
                    userPlan
                );
                return NextResponse.json({ suggestions });
            }

            case "suggest-faqs": {
                const { keyword, articleSummary, niche } = params;
                const faqs = await generateFAQSuggestions(
                    keyword,
                    articleSummary,
                    niche,
                    userPlan
                );
                return NextResponse.json({ faqs });
            }

            case "expand-section": {
                const { sectionHeading, keyword, niche } = params;
                const expanded = await expandOutlineSection(
                    sectionHeading,
                    keyword,
                    niche,
                    userPlan
                );
                return NextResponse.json({ section: expanded });
            }

            case "improve-content": {
                const { sectionContent, keyword, improvementType } = params;
                const improved = await improveSection(
                    sectionContent,
                    keyword,
                    improvementType,
                    userPlan
                );
                return NextResponse.json({ content: improved });
            }

            default:
                return NextResponse.json(
                    { error: "Invalid action" },
                    { status: 400 }
                );
        }
    } catch (error: any) {
        console.error("AI assist error:", error);
        return NextResponse.json(
            { error: error.message || "AI assist failed" },
            { status: 500 }
        );
    }
}
