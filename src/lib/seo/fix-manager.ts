/**
 * Fix History & Verification Manager
 * 
 * Tracks all fixes applied to Blogger posts with before/after content,
 * verification status, rollback support, and approval tracking.
 */

import { prisma } from "@/lib/prisma";
import { getPost, updatePost } from "@/lib/blogger-api";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FixRecord {
    id: string;
    issueType: string;
    issueTitle: string;
    pageUrl: string;
    pageTitle: string;
    blogId: string;
    postId: string;
    fixType: "auto" | "assisted" | "guided";
    beforeContent: string;
    afterContent: string;
    explanation: string;
    confidence: number;
    safety: string;
    status: "pending" | "approved" | "applied" | "verified" | "failed" | "rolled_back";
    appliedBy?: string;
    appliedAt?: Date;
    verifiedAt?: Date;
    verificationResult?: "success" | "failed" | "partial";
    rollbackAvailable: boolean;
    createdAt: Date;
}

export interface FixVerificationResult {
    success: boolean;
    changePresent: boolean;
    currentContent: string;
    message: string;
}

// ─── Record a Fix ────────────────────────────────────────────────────────────

export async function recordFix(params: {
    userId: string;
    blogId: string;
    postId: string;
    pageUrl: string;
    pageTitle: string;
    issueType: string;
    issueTitle: string;
    fixType: "auto" | "assisted" | "guided";
    beforeContent: string;
    afterContent: string;
    explanation: string;
    confidence: number;
    safety: string;
}): Promise<string> {
    const record = await prisma.fixHistory.create({
        data: {
            userId: params.userId,
            blogId: params.blogId,
            postId: params.postId,
            pageUrl: params.pageUrl,
            pageTitle: params.pageTitle,
            issueType: params.issueType,
            issueTitle: params.issueTitle,
            fixType: params.fixType,
            beforeContent: params.beforeContent,
            afterContent: params.afterContent,
            explanation: params.explanation,
            confidence: params.confidence,
            safety: params.safety,
            status: "pending",
        },
    });

    return record.id;
}

// ─── Apply a Fix ─────────────────────────────────────────────────────────────

export async function applyFix(params: {
    fixId: string;
    userId: string;
    blogId: string;
    postId: string;
    newContent: string;
    postTitle: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        // Update the Blogger post
        await updatePost(
            params.userId,
            params.blogId,
            params.postId,
            params.postTitle,
            params.newContent
        );

        // Mark fix as applied
        await prisma.fixHistory.update({
            where: { id: params.fixId },
            data: {
                status: "applied",
                appliedBy: params.userId,
                appliedAt: new Date(),
            },
        });

        return { success: true };
    } catch (error: any) {
        // Mark fix as failed
        await prisma.fixHistory.update({
            where: { id: params.fixId },
            data: {
                status: "failed",
                verificationNote: error.message || "Failed to apply fix",
            },
        });

        return { success: false, error: error.message };
    }
}

// ─── Verify a Fix ────────────────────────────────────────────────────────────

export async function verifyFix(params: {
    fixId: string;
    userId: string;
    blogId: string;
    postId: string;
    expectedContent: string;
}): Promise<FixVerificationResult> {
    try {
        // Re-fetch the post content from Blogger
        const post = await getPost(params.userId, params.blogId, params.postId);
        const currentContent = post?.content || "";

        // Check if the expected content is present
        const changePresent = currentContent.includes(
            params.expectedContent.substring(0, 200)
        );

        const result: FixVerificationResult = {
            success: changePresent,
            changePresent,
            currentContent,
            message: changePresent
                ? "Fix verified — the change is live on your blog."
                : "Verification failed — the expected content was not found in the live post.",
        };

        // Update fix record
        await prisma.fixHistory.update({
            where: { id: params.fixId },
            data: {
                status: changePresent ? "verified" : "failed",
                verifiedAt: new Date(),
                verificationNote: result.message,
            },
        });

        return result;
    } catch (error: any) {
        return {
            success: false,
            changePresent: false,
            currentContent: "",
            message: `Verification error: ${error.message}`,
        };
    }
}

// ─── Rollback a Fix ──────────────────────────────────────────────────────────

export async function rollbackFix(params: {
    fixId: string;
    userId: string;
}): Promise<{ success: boolean; error?: string }> {
    const fix = await prisma.fixHistory.findUnique({
        where: { id: params.fixId },
    });

    if (!fix) return { success: false, error: "Fix record not found" };
    if (!fix.beforeContent) return { success: false, error: "No previous content stored for rollback" };

    try {
        // Restore the original content
        await updatePost(
            params.userId,
            fix.blogId,
            fix.postId,
            fix.pageTitle,
            fix.beforeContent
        );

        // Mark as rolled back
        await prisma.fixHistory.update({
            where: { id: params.fixId },
            data: {
                status: "rolled_back",
                verificationNote: `Rolled back at ${new Date().toISOString()} by user ${params.userId}`,
            },
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ─── Get Fix History ─────────────────────────────────────────────────────────

export async function getFixHistory(params: {
    userId: string;
    blogId?: string;
    limit?: number;
    offset?: number;
}): Promise<{ fixes: any[]; total: number }> {
    const where: any = { userId: params.userId };
    if (params.blogId) where.blogId = params.blogId;

    const [fixes, total] = await Promise.all([
        prisma.fixHistory.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: params.limit || 50,
            skip: params.offset || 0,
        }),
        prisma.fixHistory.count({ where }),
    ]);

    return { fixes, total };
}

// ─── Get Fix Stats ───────────────────────────────────────────────────────────

export async function getFixStats(userId: string, blogId?: string) {
    const where: any = { userId };
    if (blogId) where.blogId = blogId;

    const fixes = await prisma.fixHistory.findMany({ where });

    return {
        total: fixes.length,
        applied: fixes.filter((f) => f.status === "applied" || f.status === "verified").length,
        verified: fixes.filter((f) => f.status === "verified").length,
        failed: fixes.filter((f) => f.status === "failed").length,
        rolledBack: fixes.filter((f) => f.status === "rolled_back").length,
        pending: fixes.filter((f) => f.status === "pending").length,
    };
}
