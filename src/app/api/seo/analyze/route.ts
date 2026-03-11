import { NextResponse } from "next/server";
import { analyzeSEO } from "@/lib/seo/analyzer";
import { generateAllSchemas } from "@/lib/seo/schema";
import { requireAuth } from "@/lib/supabase/auth-helpers";

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;

        const body = await req.json();
        const {
            keyword,
            title,
            content,
            metaDescription,
            targetWordCount,
            faqs,
            articleType,
        } = body;

        if (!keyword || !title || !content) {
            return NextResponse.json(
                { error: "Missing required fields: keyword, title, content" },
                { status: 400 }
            );
        }

        // Perform SEO analysis
        const seoScore = analyzeSEO({
            keyword,
            title,
            content,
            metaDescription,
            targetWordCount: targetWordCount || 2000,
        });

        // Generate schema markup
        const schemas = generateAllSchemas({
            title,
            description: metaDescription,
            content,
            faqs,
            articleType,
        });

        return NextResponse.json({
            seoScore,
            schemas,
            wordCount: content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter((w: string) => w.length > 0).length,
        });
    } catch (error) {
        console.error("SEO analysis error:", error);
        return NextResponse.json(
            { error: "SEO analysis failed. Please try again." },
            { status: 500 }
        );
    }
}
