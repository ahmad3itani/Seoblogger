import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Monthly usage reset cron job.
 * This should be called by Vercel Cron Jobs (vercel.json) on the 1st of each month.
 * It resets monthly counters (articlesGenerated, imagesGenerated, wordsGenerated, apiCallsCount)
 * while preserving lifetime totals (totalArticles, totalImages, totalWords, totalApiCalls).
 * 
 * Security: Protected by CRON_SECRET env var to prevent unauthorized access.
 */
export async function GET(req: Request) {
    try {
        // Verify cron secret to prevent unauthorized access
        const authHeader = req.headers.get("authorization");
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        console.log("🔄 Starting monthly usage reset...");

        // Reset monthly counters for all users, keep lifetime totals
        const result = await prisma.usage.updateMany({
            data: {
                articlesGenerated: 0,
                imagesGenerated: 0,
                wordsGenerated: 0,
                apiCallsCount: 0,
                lastResetAt: new Date(),
            },
        });

        console.log(`✅ Reset monthly usage for ${result.count} users`);

        return NextResponse.json({
            success: true,
            usersReset: result.count,
            resetAt: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error("❌ Usage reset failed:", error);
        return NextResponse.json(
            { error: "Reset failed: " + error.message },
            { status: 500 }
        );
    }
}
