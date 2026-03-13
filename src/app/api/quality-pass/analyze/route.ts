import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { runDeterministicAnalysis } from "@/lib/quality-pass/deterministic";
import { runAiAnalysis } from "@/lib/quality-pass/ai-analysis";

export const maxDuration = 60;

/**
 * POST - Run Stage 1 (deterministic) + Stage 2 (AI analysis) on an article.
 * Returns scores, flags, and creates a QualityPassRun record.
 */
export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const { articleId, primaryTopic, targetAudience, brandVoice } = await req.json();

        if (!articleId) {
            return NextResponse.json({ error: "articleId is required" }, { status: 400 });
        }

        // Fetch the article
        const article = await prisma.article.findFirst({
            where: { id: articleId, userId: authUser.id },
        });

        if (!article) {
            return NextResponse.json({ error: "Article not found" }, { status: 404 });
        }

        const startTime = Date.now();

        // ── Stage 1: Deterministic Analysis ──
        const deterministicResult = runDeterministicAnalysis(article.content);

        // ── Stage 2: AI Analysis (cheap model) ──
        const aiResult = await runAiAnalysis(authUser.id, {
            articleHtml: article.content,
            articleTitle: article.title,
            primaryTopic: primaryTopic || undefined,
            targetAudience: targetAudience || undefined,
            brandVoice: brandVoice || undefined,
        });

        // Combine scores
        const readabilityScore = deterministicResult.readabilityScore;
        const helpfulnessScore = aiResult.helpfulnessScore;
        const originalityScore = aiResult.originalityScore;
        const naturalnessScore = deterministicResult.naturalnessScore;
        const trustScore = deterministicResult.trustScore;
        const publishSafetyScore = deterministicResult.publishSafetyScore;

        const overallScore = Math.round(
            readabilityScore * 0.20 +
            helpfulnessScore * 0.25 +
            originalityScore * 0.20 +
            naturalnessScore * 0.15 +
            trustScore * 0.10 +
            publishSafetyScore * 0.10
        );

        const allFlags = [...deterministicResult.flags, ...aiResult.flags];
        const durationMs = Date.now() - startTime;

        // Save the QualityPassRun
        const passRun = await (prisma as any).qualityPassRun.create({
            data: {
                articleId: article.id,
                userId: authUser.id,
                readabilityScore,
                helpfulnessScore,
                originalityScore,
                naturalnessScore,
                trustScore,
                publishSafetyScore,
                overallScore,
                stage1Complete: true,
                stage2Complete: true,
                stage3Complete: false,
                modelUsed: "openrouter",
                status: "reviewed",
                durationMs,
            },
        });

        // Save flags
        for (const flag of allFlags) {
            await (prisma as any).qualityFlag.create({
                data: {
                    passRunId: passRun.id,
                    flagType: flag.flagType,
                    severity: flag.severity,
                    category: flag.category,
                    locationRef: flag.locationRef,
                    message: flag.message,
                    suggestedFix: flag.suggestedFix,
                    beforeSnippet: flag.beforeSnippet,
                    afterSnippet: flag.afterSnippet,
                    status: "open",
                },
            });
        }

        return NextResponse.json({
            success: true,
            passRunId: passRun.id,
            scores: {
                readability: readabilityScore,
                helpfulness: helpfulnessScore,
                originality: originalityScore,
                naturalness: naturalnessScore,
                trust: trustScore,
                publishSafety: publishSafetyScore,
                overall: overallScore,
            },
            flags: allFlags,
            metrics: {
                wordCount: deterministicResult.wordCount,
                sentenceCount: deterministicResult.sentenceCount,
                avgSentenceLength: deterministicResult.avgSentenceLength,
                paragraphCount: deterministicResult.paragraphCount,
                h2Count: deterministicResult.h2Count,
                h3Count: deterministicResult.h3Count,
                listCount: deterministicResult.listCount,
                linkCount: deterministicResult.linkCount,
                imageCount: deterministicResult.imageCount,
            },
            summary: aiResult.summary,
            durationMs,
        });
    } catch (error: any) {
        console.error("Quality pass analyze error:", error);
        return NextResponse.json({ error: error.message || "Analysis failed" }, { status: 500 });
    }
}
