import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { generateLinkSuggestion } from "@/lib/linker/suggest";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        // Rate limit: 20 suggestions per minute
        const rl = checkRateLimit(`linker-suggest:${userId}`, 20, 60_000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` },
                { status: 429 }
            );
        }

        const {
            sourceUrl,
            sourceTitle,
            targetUrl,
            targetTitle,
            sourceParagraphHtml,
            sourceParagraphText,
            candidatePhrases,
            targetIncomingCount,
        } = await req.json();

        if (!sourceUrl || !targetUrl || !sourceParagraphHtml) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const suggestion = await generateLinkSuggestion({
            sourceUrl,
            sourceTitle,
            targetUrl,
            targetTitle,
            sourceParagraphHtml,
            sourceParagraphText,
            candidatePhrases: candidatePhrases || [],
            targetIncomingCount: targetIncomingCount || 0,
        });

        if (!suggestion) {
            return NextResponse.json({
                success: false,
                error: "Could not generate a natural link suggestion for this opportunity",
            });
        }

        return NextResponse.json({
            success: true,
            suggestion,
        });
    } catch (error: any) {
        console.error("Linker suggest error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate link suggestion" },
            { status: 500 }
        );
    }
}
