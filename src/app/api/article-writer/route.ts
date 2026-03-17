import { NextResponse } from "next/server";
import { requireAuth, checkUsageLimit, trackUsage } from "@/lib/supabase/auth-helpers";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { sanitizeString, sanitizeNumber } from "@/lib/security/validate";
import {
  createDraft,
  getDraft,
  updateDraft,
  listDrafts,
  listStyleGuides,
  getStyleGuide,
  createStyleGuide,
  suggestStyleGuide,
  executeIdeation,
  executeResearchConfig,
  approveResearchSources,
  executeThesis,
  confirmThesis,
  executeOutline,
  confirmSections,
  executeWriteFull,
  executeWriteSection,
  executeEditorPass,
  executeMetadata,
  confirmMetadata,
  finalizeDraft,
} from "@/lib/ai/article-writer";
import { prisma } from "@/lib/prisma";
import { formatForBlogger, countWords } from "@/lib/formatter";

export async function POST(req: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { user: authUser } = authResult;

    const rl = checkRateLimit(`article-writer:${authUser.id}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` },
        { status: 429 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { plan: true },
    });
    const userPlan = currentUser?.plan?.name || "free";

    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      // ─── DRAFT MANAGEMENT ──────────────────────────────────
      case "list-drafts": {
        const drafts = await listDrafts(authUser.id);
        return NextResponse.json({ drafts });
      }

      case "get-draft": {
        const draft = await getDraft(params.draftId, authUser.id);
        if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
        return NextResponse.json({ draft });
      }

      case "delete-draft": {
        await prisma.articleDraft.deleteMany({
          where: { id: params.draftId, userId: authUser.id },
        });
        return NextResponse.json({ success: true });
      }

      // ─── STYLE GUIDE MANAGEMENT ───────────────────────────
      case "list-styles": {
        const styles = await listStyleGuides(authUser.id);
        return NextResponse.json({ styles });
      }

      case "get-style": {
        const style = await getStyleGuide(params.styleId, authUser.id);
        if (!style) return NextResponse.json({ error: "Style not found" }, { status: 404 });
        return NextResponse.json({ style });
      }

      case "create-style": {
        const style = await createStyleGuide(authUser.id, {
          name: sanitizeString(params.name, 100) || "Untitled Style",
          description: params.description,
          voice: params.voice,
          formatting: params.formatting,
          structure: params.structure,
          context: params.context,
          isDefault: params.isDefault,
        });
        return NextResponse.json({ style });
      }

      case "update-style": {
        const existing = await getStyleGuide(params.styleId, authUser.id);
        if (!existing) return NextResponse.json({ error: "Style not found" }, { status: 404 });

        if (params.isDefault) {
          await prisma.writingStyleGuide.updateMany({
            where: { userId: authUser.id, isDefault: true },
            data: { isDefault: false },
          });
        }

        const updated = await prisma.writingStyleGuide.update({
          where: { id: params.styleId },
          data: {
            name: params.name ?? existing.name,
            description: params.description ?? existing.description,
            voiceTone: params.voice?.tone ?? existing.voiceTone,
            voiceHumor: params.voice?.humor ?? existing.voiceHumor,
            voiceOpinion: params.voice?.opinion ?? existing.voiceOpinion,
            voiceTechnical: params.voice?.technical ?? existing.voiceTechnical,
            fmtEmojis: params.formatting?.emojis ?? existing.fmtEmojis,
            fmtEmDashes: params.formatting?.emDashes ?? existing.fmtEmDashes,
            fmtBlockquotes: params.formatting?.blockquotes ?? existing.fmtBlockquotes,
            structOpening: params.structure?.opening?.join(",") ?? existing.structOpening,
            structClosing: params.structure?.closing?.join(",") ?? existing.structClosing,
            structVisualBreaks: params.structure?.visualBreaks ?? existing.structVisualBreaks,
            structExamples: params.structure?.examples ?? existing.structExamples,
            structExampleTypes: params.structure?.exampleTypes?.join(",") ?? existing.structExampleTypes,
            authorRole: params.context?.authorRole ?? existing.authorRole,
            authorKnowledge: params.context?.authorKnowledge ?? existing.authorKnowledge,
            audienceRole: params.context?.audienceRole ?? existing.audienceRole,
            audienceKnowledge: params.context?.audienceKnowledge ?? existing.audienceKnowledge,
            authorRelationship: params.context?.authorRelationship ?? existing.authorRelationship,
            isDefault: params.isDefault ?? existing.isDefault,
          },
        });
        return NextResponse.json({ style: updated });
      }

      case "delete-style": {
        await prisma.writingStyleGuide.deleteMany({
          where: { id: params.styleId, userId: authUser.id },
        });
        return NextResponse.json({ success: true });
      }

      case "suggest-style": {
        const suggestion = await suggestStyleGuide(
          params.topic || "",
          userPlan,
          params.niche,
          params.brandVoice
        );
        return NextResponse.json({ suggestion });
      }

      // ─── PHASE 1: IDEATION ────────────────────────────────
      case "ideation": {
        const idea = sanitizeString(params.initialIdea, 2000);
        if (!idea) return NextResponse.json({ error: "Initial idea is required" }, { status: 400 });

        let draftId = params.draftId;
        if (!draftId) {
          draftId = await createDraft(authUser.id, {
            initialIdea: idea,
            language: params.language,
            niche: params.niche,
            articleType: params.articleType,
            wordCount: sanitizeNumber(params.wordCount, 300, 10000, 2000),
            blogId: params.blogId,
          });
        } else {
          await updateDraft(draftId, authUser.id, {
            initialIdea: idea,
            language: params.language || "en",
            niche: params.niche,
            articleType: params.articleType || "blog-post",
            wordCount: sanitizeNumber(params.wordCount, 300, 10000, 2000),
          });
        }

        const result = await executeIdeation(draftId, authUser.id, userPlan);
        return NextResponse.json({ draftId, ...result });
      }

      // ─── PHASE 2: RESEARCH ────────────────────────────────
      case "research-config": {
        if (!params.draftId) return NextResponse.json({ error: "draftId required" }, { status: 400 });

        const result = await executeResearchConfig(
          params.draftId,
          authUser.id,
          params.wantResearch ?? false,
          params.researchDepth,
          params.includeCitations,
          userPlan
        );
        return NextResponse.json(result);
      }

      case "research-approve": {
        if (!params.draftId) return NextResponse.json({ error: "draftId required" }, { status: 400 });

        await approveResearchSources(
          params.draftId,
          authUser.id,
          params.approvedSources || [],
          params.includeCitations ?? false
        );
        return NextResponse.json({ success: true });
      }

      // ─── PHASE 3: STYLE SELECTION (handled by style CRUD above) ──

      // ─── PHASE 4: TITLE & THESIS ──────────────────────────
      case "thesis": {
        if (!params.draftId) return NextResponse.json({ error: "draftId required" }, { status: 400 });

        // First update phase to style/thesis if needed
        await updateDraft(params.draftId, authUser.id, { phase: "thesis" });

        const result = await executeThesis(
          params.draftId,
          authUser.id,
          params.styleGuideId || null,
          userPlan
        );
        return NextResponse.json(result);
      }

      case "thesis-confirm": {
        if (!params.draftId || !params.selectedTitle)
          return NextResponse.json({ error: "draftId and selectedTitle required" }, { status: 400 });

        await confirmThesis(
          params.draftId,
          authUser.id,
          sanitizeString(params.selectedTitle, 300) || "",
          sanitizeString(params.selectedThesis, 2000) || ""
        );
        return NextResponse.json({ success: true });
      }

      // ─── PHASE 5: OUTLINE ─────────────────────────────────
      case "outline": {
        if (!params.draftId) return NextResponse.json({ error: "draftId required" }, { status: 400 });

        const result = await executeOutline(params.draftId, authUser.id, userPlan);
        return NextResponse.json(result);
      }

      // ─── PHASE 6: SECTION CONFIRMATION ─────────────────────
      case "sections-confirm": {
        if (!params.draftId || !params.confirmedOutline)
          return NextResponse.json({ error: "draftId and confirmedOutline required" }, { status: 400 });

        await confirmSections(params.draftId, authUser.id, params.confirmedOutline);
        return NextResponse.json({ success: true });
      }

      // ─── PHASE 7: WRITE ARTICLE ───────────────────────────
      case "write-full": {
        if (!params.draftId) return NextResponse.json({ error: "draftId required" }, { status: 400 });

        const usageCheck = await checkUsageLimit(authUser.id, "articles");
        if (!usageCheck.allowed) {
          return NextResponse.json(
            { error: usageCheck.error, usageLimit: true },
            { status: 403 }
          );
        }

        const result = await executeWriteFull(params.draftId, authUser.id, userPlan);
        return NextResponse.json(result);
      }

      case "write-section": {
        if (!params.draftId || params.sectionIndex === undefined)
          return NextResponse.json({ error: "draftId and sectionIndex required" }, { status: 400 });

        const result = await executeWriteSection(
          params.draftId,
          authUser.id,
          params.sectionIndex,
          userPlan
        );
        return NextResponse.json(result);
      }

      // ─── PHASE 8: APPROVAL (user reviews, moves to editor) ──
      case "approve-draft": {
        if (!params.draftId) return NextResponse.json({ error: "draftId required" }, { status: 400 });
        await updateDraft(params.draftId, authUser.id, { phase: "editor" });
        return NextResponse.json({ success: true });
      }

      case "revise-draft": {
        if (!params.draftId) return NextResponse.json({ error: "draftId required" }, { status: 400 });
        await updateDraft(params.draftId, authUser.id, {
          draftContent: params.revisedContent,
          phase: "approval",
        });
        return NextResponse.json({ success: true });
      }

      // ─── PHASE 9-10: EDITOR PASS ──────────────────────────
      case "editor-pass": {
        if (!params.draftId) return NextResponse.json({ error: "draftId required" }, { status: 400 });

        const result = await executeEditorPass(
          params.draftId,
          authUser.id,
          userPlan,
          params.skipEditor ?? false
        );
        return NextResponse.json(result);
      }

      // ─── PHASE 11: METADATA ───────────────────────────────
      case "metadata": {
        if (!params.draftId) return NextResponse.json({ error: "draftId required" }, { status: 400 });

        const result = await executeMetadata(params.draftId, authUser.id, userPlan);
        return NextResponse.json(result);
      }

      case "metadata-confirm": {
        if (!params.draftId) return NextResponse.json({ error: "draftId required" }, { status: 400 });

        await confirmMetadata(
          params.draftId,
          authUser.id,
          params.metaTitle || "",
          params.metaDescription || "",
          params.metaKeywords || []
        );
        return NextResponse.json({ success: true });
      }

      // ─── PHASE 12: EXPORT & PUBLISH ───────────────────────
      case "export": {
        if (!params.draftId) return NextResponse.json({ error: "draftId required" }, { status: 400 });

        const draft = await getDraft(params.draftId, authUser.id);
        if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

        const finalContent = draft.editorContent || draft.draftContent || "";
        const sources = (draft.approvedSources as any[] | null) || [];

        // Build references section if citations are included
        let referencesHtml = "";
        if (draft.includeCitations && sources.length > 0 && params.includeCitationsInExport !== false) {
          referencesHtml = '\n\n<h2>References</h2>\n<ol class="references">';
          sources.forEach((s: any, i: number) => {
            referencesHtml += `\n<li id="fn${i + 1}"><a href="${s.url}" target="_blank" rel="noopener">${s.title}</a> — ${s.domain}${s.date ? ` (${s.date})` : ""}</li>`;
          });
          referencesHtml += "\n</ol>";
        }

        // Format for Blogger using existing formatter
        const formattedContent = formatForBlogger(finalContent + referencesHtml, {
          includeToc: params.includeToc ?? true,
          keyword: draft.keyword || "",
          showReadTime: true,
          addKeywordToIntro: true,
        });

        const wordCountResult = countWords(formattedContent);

        // Determine article status
        let articleStatus = "draft";
        let scheduledFor = null;
        if (params.publishAction === "schedule" && params.scheduleDate) {
          articleStatus = "scheduled";
          scheduledFor = new Date(params.scheduleDate);
        } else if (params.publishAction === "publish") {
          articleStatus = "published";
        }

        // Save to Article model
        const savedArticle = await prisma.article.create({
          data: {
            title: draft.title || "Untitled",
            content: formattedContent,
            outline: draft.outline ? JSON.stringify(draft.outline) : null,
            metaDescription: draft.metaDescription,
            excerpt: draft.metaDescription?.substring(0, 200),
            labels: params.labels?.join(",") || "",
            tone: "professional",
            articleType: draft.articleType,
            wordCount: wordCountResult,
            status: articleStatus,
            scheduledFor,
            blogId: params.blogId || draft.blogId || undefined,
            userId: authUser.id,
          },
        });

        // Track usage
        await trackUsage(authUser.id, "article", 1, wordCountResult);

        // Mark draft as finished
        await finalizeDraft(params.draftId, authUser.id, savedArticle.id);

        return NextResponse.json({
          article: formattedContent,
          wordCount: wordCountResult,
          savedArticle,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error("Article Writer API error:", error);
    return NextResponse.json(
      { error: "Article Writer error: " + (error as Error).message },
      { status: 500 }
    );
  }
}
