import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { runQualityRewrite } from "@/lib/quality-pass/ai-rewrite";
import { runDeterministicAnalysis } from "@/lib/quality-pass/deterministic";
import { validateFinalVersion } from "@/lib/quality-pass/validation";

export const maxDuration = 120;

/**
 * POST - Run Stage 3 (stronger model rewrite) on an article.
 * Requires a passRunId from a prior analyze call.
 */
export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const { passRunId, brandVoice, targetAudience, language, userContext } = await req.json();

        if (!passRunId) {
            return NextResponse.json({ error: "passRunId is required" }, { status: 400 });
        }

        // Get the pass run with flags
        const passRun = await (prisma as any).qualityPassRun.findFirst({
            where: { id: passRunId, userId: authUser.id },
            include: { flags: true, article: true },
        });

        if (!passRun) {
            return NextResponse.json({ error: "Quality pass run not found" }, { status: 404 });
        }

        if (!passRun.article) {
            return NextResponse.json({ error: "Article not found" }, { status: 404 });
        }

        // Build the flags list for the rewrite engine
        const activeFlags = passRun.flags
            .filter((f: any) => f.status !== "rejected")
            .map((f: any) => ({
                flagType: f.flagType,
                severity: f.severity,
                category: f.category,
                locationRef: f.locationRef,
                message: f.message,
                suggestedFix: f.suggestedFix,
                beforeSnippet: f.beforeSnippet,
                afterSnippet: f.afterSnippet,
            }));

        // ── Stage 3: Stronger model rewrite ──
        const rewriteResult = await runQualityRewrite(authUser.id, {
            articleHtml: passRun.article.content,
            articleTitle: passRun.article.title,
            flags: activeFlags,
            brandVoice: brandVoice || undefined,
            targetAudience: targetAudience || undefined,
            language: language || undefined,
            userContext: userContext || undefined,
        });

        // Run deterministic analysis on the new version to get updated scores
        const newAnalysis = runDeterministicAnalysis(rewriteResult.newHtml);

        // Run validation
        const validation = validateFinalVersion(
            passRun.article.content,
            rewriteResult.newHtml,
            brandVoice
        );

        // Compute new scores (keep AI scores from stage 2, update deterministic ones)
        const newScores = {
            readability: newAnalysis.readabilityScore,
            helpfulness: passRun.helpfulnessScore, // AI score stays until re-analyzed
            originality: passRun.originalityScore,
            naturalness: newAnalysis.naturalnessScore,
            trust: newAnalysis.trustScore,
            publishSafety: newAnalysis.publishSafetyScore,
            overall: 0,
        };
        newScores.overall = Math.round(
            newScores.readability * 0.20 +
            newScores.helpfulness * 0.25 +
            newScores.originality * 0.20 +
            newScores.naturalness * 0.15 +
            newScores.trust * 0.10 +
            newScores.publishSafety * 0.10
        );

        // Save the quality version
        const version = await (prisma as any).qualityVersion.create({
            data: {
                passRunId: passRun.id,
                articleId: passRun.article.id,
                versionType: "rewrite",
                html: rewriteResult.newHtml,
                changeSummary: rewriteResult.changeSummary,
                readabilityScore: newScores.readability,
                helpfulnessScore: newScores.helpfulness,
                originalityScore: newScores.originality,
                naturalnessScore: newScores.naturalness,
                trustScore: newScores.trust,
                publishSafetyScore: newScores.publishSafety,
                overallScore: newScores.overall,
            },
        });

        // Update pass run
        await (prisma as any).qualityPassRun.update({
            where: { id: passRun.id },
            data: {
                stage3Complete: true,
                status: "rewritten",
                readabilityScore: newScores.readability,
                naturalnessScore: newScores.naturalness,
                trustScore: newScores.trust,
                publishSafetyScore: newScores.publishSafety,
                overallScore: newScores.overall,
            },
        });

        return NextResponse.json({
            success: true,
            versionId: version.id,
            newTitle: rewriteResult.newTitle,
            newHtml: rewriteResult.newHtml,
            originalHtml: passRun.article.content,
            changeSummary: rewriteResult.changeSummary,
            changesApplied: rewriteResult.changesApplied,
            wordCountBefore: rewriteResult.wordCountBefore,
            wordCountAfter: rewriteResult.wordCountAfter,
            scores: newScores,
            scoresBefore: {
                readability: passRun.readabilityScore,
                helpfulness: passRun.helpfulnessScore,
                originality: passRun.originalityScore,
                naturalness: passRun.naturalnessScore,
                trust: passRun.trustScore,
                publishSafety: passRun.publishSafetyScore,
                overall: passRun.overallScore,
            },
            validation,
            newFlags: newAnalysis.flags,
        });
    } catch (error: any) {
        console.error("Quality pass rewrite error:", error);
        return NextResponse.json({ error: error.message || "Rewrite failed" }, { status: 500 });
    }
}
