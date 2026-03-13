import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { getBloggerClient } from "@/lib/blogger-api";
import { generateRefreshPlan } from "@/lib/refresh/ai-engine";
import { diagnoseContent } from "@/lib/refresh/diagnosis";

/**
 * POST - Generate a refresh plan for a specific candidate
 */
export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const { candidateId, mode } = await req.json();

        if (!candidateId) {
            return NextResponse.json({ error: "candidateId is required" }, { status: 400 });
        }

        // Get the candidate with diagnostic
        const candidate = await (prisma as any).refreshCandidate.findFirst({
            where: { id: candidateId, userId: authUser.id },
            include: { diagnostic: true },
        });

        if (!candidate) {
            return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
        }

        // Get the blog
        const blog = await prisma.blog.findFirst({ where: { id: candidate.blogId, userId: authUser.id } });
        if (!blog) {
            return NextResponse.json({ error: "Blog not found" }, { status: 404 });
        }

        // Fetch the actual post body from Blogger
        const blogger = await getBloggerClient(authUser.id);
        const postRes = await blogger.posts.get({ blogId: blog.blogId, postId: candidate.postId });
        const postBody = postRes.data.content || "";

        // Run fresh diagnosis on the actual body
        const diagnosis = diagnoseContent({
            title: candidate.title,
            bodyHtml: postBody,
            url: candidate.url,
            publishedAt: candidate.publishedAt,
            topQueries: candidate.diagnostic?.topQueries || [],
        });

        // Build the structured input for AI
        const bodyText = postBody.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

        const plan = await generateRefreshPlan(authUser.id, {
            post: {
                postId: candidate.postId,
                url: candidate.url,
                title: candidate.title,
                publishedAt: candidate.publishedAt?.toISOString() || "",
                bodyHtml: postBody,
                bodyTextExcerpt: bodyText.slice(0, 2000),
            },
            performance: {
                clicksLast28: candidate.clicksLast28,
                clicksPrev28: candidate.clicksPrev28,
                impressionsLast28: candidate.impressionsLast28,
                impressionsPrev28: candidate.impressionsPrev28,
                ctrLast28: candidate.ctrLast28,
                avgPositionLast28: candidate.avgPositionLast28,
            },
            diagnosis: {
                thinSections: diagnosis.thinSections,
                missingSubtopics: diagnosis.missingSubtopics,
                introQuality: diagnosis.introQuality,
                faqPresent: diagnosis.faqPresent,
                conclusionPresent: diagnosis.conclusionPresent,
                headingStructure: diagnosis.headingStructure,
                outdatedSignals: diagnosis.outdatedSignals,
                snippetReadiness: diagnosis.snippetReadiness,
            },
            existingHeadings: diagnosis.headings,
        });

        // Save the plan to the database
        const savedPlan = await (prisma as any).refreshPlan.create({
            data: {
                candidateId: candidate.id,
                mode: mode || "section",
                proposedOutline: plan.proposedOutline,
                proposedFaqs: plan.proposedFaqs,
                sectionsToExpand: plan.proposedOutline
                    .filter((o: any) => o.action === "expand" || o.action === "rewrite")
                    .map((o: any) => o.heading),
                subtopicsToAdd: plan.subtopicsToAdd,
                suggestedTitle: plan.suggestedTitle,
                expectedImpact: plan.expectedImpact,
                confidence: plan.confidence,
                whyRefresh: plan.whyRefresh,
                whatToAdd: plan.whatToAdd,
                whatToKeep: plan.whatToKeep,
                whatToRemove: plan.whatToRemove,
                status: "draft",
            },
        });

        // Update candidate status
        await (prisma as any).refreshCandidate.update({
            where: { id: candidate.id },
            data: { status: "planned" },
        });

        return NextResponse.json({
            success: true,
            plan: {
                id: savedPlan.id,
                ...plan,
            },
            diagnosis: {
                introQuality: diagnosis.introQuality,
                headingStructure: diagnosis.headingStructure,
                faqPresent: diagnosis.faqPresent,
                conclusionPresent: diagnosis.conclusionPresent,
                snippetReadiness: diagnosis.snippetReadiness,
                missingSubtopics: diagnosis.missingSubtopics,
                outdatedSignals: diagnosis.outdatedSignals,
                thinSections: diagnosis.thinSections,
                wordCount: diagnosis.wordCount,
                headings: diagnosis.headings,
                internalLinkCount: diagnosis.internalLinkCount,
                imageCount: diagnosis.imageCount,
            },
        });
    } catch (error: any) {
        console.error("Refresh plan error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate plan" }, { status: 500 });
    }
}
