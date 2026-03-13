import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { getBloggerClient } from "@/lib/blogger-api";
import { generateRefreshContent } from "@/lib/refresh/ai-engine";
import { validateBloggerHtml, sanitizeForBlogger, computeChangeSummary } from "@/lib/refresh/html-safety";

/**
 * POST - Generate refreshed content based on an approved plan
 */
export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const { planId, mode, sectionsToRewrite, brandVoice, language } = await req.json();

        if (!planId) {
            return NextResponse.json({ error: "planId is required" }, { status: 400 });
        }

        // Get the plan with candidate
        const plan = await (prisma as any).refreshPlan.findFirst({
            where: { id: planId },
            include: { candidate: true },
        });

        if (!plan || plan.candidate.userId !== authUser.id) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        // Get the blog
        const blog = await prisma.blog.findFirst({ where: { id: plan.candidate.blogId, userId: authUser.id } });
        if (!blog) {
            return NextResponse.json({ error: "Blog not found" }, { status: 404 });
        }

        // Fetch the current post body from Blogger
        const blogger = await getBloggerClient(authUser.id);
        const postRes = await blogger.posts.get({ blogId: blog.blogId, postId: plan.candidate.postId });
        const currentHtml = postRes.data.content || "";
        const currentTitle = postRes.data.title || plan.candidate.title;

        // Update plan status
        await (prisma as any).refreshPlan.update({
            where: { id: plan.id },
            data: { status: "generating" },
        });

        // Generate refreshed content
        const result = await generateRefreshContent(authUser.id, {
            post: {
                title: currentTitle,
                bodyHtml: currentHtml,
                url: plan.candidate.url,
            },
            plan: {
                whyRefresh: plan.whyRefresh || "",
                whatToAdd: plan.whatToAdd || "",
                whatToKeep: plan.whatToKeep || "",
                whatToRemove: plan.whatToRemove || "",
                proposedOutline: plan.proposedOutline as any[] || [],
                proposedFaqs: plan.proposedFaqs as any[] || [],
                subtopicsToAdd: plan.subtopicsToAdd as string[] || [],
                suggestedTitle: plan.suggestedTitle || currentTitle,
                expectedImpact: plan.expectedImpact as any || "medium",
                confidence: plan.confidence || 70,
            },
            mode: mode || plan.mode || "section",
            sectionsToRewrite,
            brandVoice,
            language,
        });

        // Validate the generated HTML
        const validation = validateBloggerHtml(result.newHtml);
        let finalHtml = result.newHtml;

        if (!validation.valid) {
            // Sanitize if there are issues
            finalHtml = sanitizeForBlogger(result.newHtml);
        }

        // Compute change summary
        const changeSummary = computeChangeSummary(currentHtml, finalHtml);

        // Save as a refresh version
        const version = await (prisma as any).refreshVersion.create({
            data: {
                candidateId: plan.candidate.id,
                oldTitle: currentTitle,
                newTitle: result.newTitle,
                oldHtml: currentHtml,
                newHtml: finalHtml,
                sectionsExpanded: changeSummary.sectionsExpanded,
                subtopicsAdded: changeSummary.sectionsAdded,
                faqsAdded: changeSummary.faqsAdded,
                wordCountBefore: changeSummary.wordCountBefore,
                wordCountAfter: changeSummary.wordCountAfter,
                confidence: result.confidence,
                aiModel: "openrouter",
                status: "draft",
            },
        });

        // Update plan status
        await (prisma as any).refreshPlan.update({
            where: { id: plan.id },
            data: { status: "completed" },
        });

        // Update candidate status
        await (prisma as any).refreshCandidate.update({
            where: { id: plan.candidate.id },
            data: { status: "refreshed" },
        });

        return NextResponse.json({
            success: true,
            version: {
                id: version.id,
                oldTitle: currentTitle,
                newTitle: result.newTitle,
                oldHtml: currentHtml,
                newHtml: finalHtml,
                changeSummary,
                confidence: result.confidence,
                validation,
            },
        });
    } catch (error: any) {
        console.error("Refresh generate error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate refresh" }, { status: 500 });
    }
}
