// ─── Article Writer Workflow Engine ─────────────────────────────────
// Orchestrates the 12-phase article writing workflow

import { prisma } from "@/lib/prisma";
import { openai, getModelForPlan } from "../client";
import type {
  ArticlePhase,
  StyleGuideSettings,
  ResearchSource,
  OutlineItem,
  DraftState,
} from "./types";
import {
  getIdeationPrompt,
  getResearchGatherPrompt,
  getTitleThesisPrompt,
  getOutlinePrompt,
  getWriteFullPrompt,
  getWriteSectionPrompt,
  getEditorPassPrompt,
  getMetadataPrompt,
  getStyleGuideSuggestionPrompt,
  getHumanizerPrompt,
} from "./prompts";

// ─── AI CALL HELPER ─────────────────────────────────────────────────
async function callAI(
  systemPrompt: string,
  userPlan?: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const model = getModelForPlan(userPlan);
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "You are an expert article writing assistant. Always respond with valid JSON when asked for JSON output. Never include markdown code fences in your JSON response." },
      { role: "user", content: systemPrompt },
    ],
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 4096,
  });
  return response.choices[0]?.message?.content || "";
}

async function callAIRaw(
  systemPrompt: string,
  userPlan?: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const model = getModelForPlan(userPlan);
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "You are an expert article writer. Write high-quality, engaging content. Output only the requested content, no explanations or markdown fences." },
      { role: "user", content: systemPrompt },
    ],
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 8192,
  });
  return response.choices[0]?.message?.content || "";
}

function cleanJSON(str: string): string {
  const text = str.trim();
  // Remove markdown code fences if present
  const stripped = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  const firstBrace = stripped.indexOf("{");
  const firstBracket = stripped.indexOf("[");
  const lastBrace = stripped.lastIndexOf("}");
  const lastBracket = stripped.lastIndexOf("]");

  let start = -1;
  let end = -1;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
    end = lastBrace;
  } else if (firstBracket !== -1) {
    start = firstBracket;
    end = lastBracket;
  }
  if (start !== -1 && end !== -1 && end > start) {
    return stripped.substring(start, end + 1);
  }
  return stripped;
}

function safeParseJSON<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(cleanJSON(raw));
  } catch {
    console.error("Failed to parse AI JSON response:", raw.substring(0, 200));
    return fallback;
  }
}

// ─── DRAFT MANAGEMENT ───────────────────────────────────────────────

export async function createDraft(
  userId: string,
  data: {
    initialIdea: string;
    language?: string;
    niche?: string;
    articleType?: string;
    wordCount?: number;
    blogId?: string;
  }
): Promise<string> {
  const draft = await prisma.articleDraft.create({
    data: {
      userId,
      phase: "ideation",
      initialIdea: data.initialIdea,
      language: data.language || "en",
      niche: data.niche,
      articleType: data.articleType || "blog-post",
      wordCount: data.wordCount || 2000,
      blogId: data.blogId,
    },
  });
  return draft.id;
}

export async function getDraft(draftId: string, userId: string) {
  return prisma.articleDraft.findFirst({
    where: { id: draftId, userId },
    include: { styleGuide: true },
  });
}

export async function updateDraft(
  draftId: string,
  userId: string,
  data: Record<string, any>
) {
  // Verify ownership first to prevent cross-user modification
  const existing = await prisma.articleDraft.findFirst({
    where: { id: draftId, userId },
  });
  if (!existing) throw new Error("Draft not found or access denied");

  return prisma.articleDraft.update({
    where: { id: draftId },
    data: { ...data, updatedAt: new Date() },
  });
}

export async function listDrafts(userId: string) {
  return prisma.articleDraft.findMany({
    where: { userId, phase: { not: "finished" } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      phase: true,
      title: true,
      initialIdea: true,
      refinedTopic: true,
      keyword: true,
      language: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// ─── STYLE GUIDE MANAGEMENT ─────────────────────────────────────────

export async function listStyleGuides(userId: string) {
  return prisma.writingStyleGuide.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getStyleGuide(id: string, userId: string) {
  return prisma.writingStyleGuide.findFirst({
    where: { id, userId },
  });
}

export function dbStyleToSettings(dbStyle: any): StyleGuideSettings {
  return {
    voice: {
      tone: dbStyle.voiceTone,
      humor: dbStyle.voiceHumor,
      opinion: dbStyle.voiceOpinion,
      technical: dbStyle.voiceTechnical,
    },
    formatting: {
      emojis: dbStyle.fmtEmojis,
      emDashes: dbStyle.fmtEmDashes,
      blockquotes: dbStyle.fmtBlockquotes as any,
    },
    structure: {
      opening: (dbStyle.structOpening || "direct").split(",").map((s: string) => s.trim()),
      closing: (dbStyle.structClosing || "call_to_action").split(",").map((s: string) => s.trim()),
      visualBreaks: dbStyle.structVisualBreaks as any,
      examples: dbStyle.structExamples as any,
      exampleTypes: dbStyle.structExampleTypes
        ? dbStyle.structExampleTypes.split(",").map((s: string) => s.trim())
        : [],
    },
    context: {
      authorRole: dbStyle.authorRole || "",
      authorKnowledge: dbStyle.authorKnowledge,
      audienceRole: dbStyle.audienceRole || "",
      audienceKnowledge: dbStyle.audienceKnowledge,
      authorRelationship: dbStyle.authorRelationship,
    },
  };
}

export async function createStyleGuide(
  userId: string,
  data: {
    name: string;
    description?: string;
    voice: StyleGuideSettings["voice"];
    formatting: StyleGuideSettings["formatting"];
    structure: StyleGuideSettings["structure"];
    context: StyleGuideSettings["context"];
    isDefault?: boolean;
  }
) {
  // If setting as default, unset other defaults first
  if (data.isDefault) {
    await prisma.writingStyleGuide.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.writingStyleGuide.create({
    data: {
      userId,
      name: data.name,
      description: data.description,
      voiceTone: data.voice.tone,
      voiceHumor: data.voice.humor,
      voiceOpinion: data.voice.opinion,
      voiceTechnical: data.voice.technical,
      fmtEmojis: data.formatting.emojis,
      fmtEmDashes: data.formatting.emDashes,
      fmtBlockquotes: data.formatting.blockquotes,
      structOpening: data.structure.opening.join(","),
      structClosing: data.structure.closing.join(","),
      structVisualBreaks: data.structure.visualBreaks,
      structExamples: data.structure.examples,
      structExampleTypes: data.structure.exampleTypes.join(","),
      authorRole: data.context.authorRole,
      authorKnowledge: data.context.authorKnowledge,
      audienceRole: data.context.audienceRole,
      audienceKnowledge: data.context.audienceKnowledge,
      authorRelationship: data.context.authorRelationship,
      isDefault: data.isDefault || false,
    },
  });
}

export async function suggestStyleGuide(
  topic: string,
  userPlan: string,
  niche?: string,
  brandVoice?: string
) {
  const prompt = getStyleGuideSuggestionPrompt(topic, niche, brandVoice);
  const raw = await callAI(prompt, userPlan);
  return safeParseJSON(raw, {
    name: "Default Style",
    description: "Balanced professional style",
    voice: { tone: 5, humor: 3, opinion: 5, technical: 5 },
    formatting: { emojis: 0, emDashes: 3, blockquotes: "occasional" },
    structure: {
      opening: ["direct"],
      closing: ["call_to_action"],
      visualBreaks: "moderate",
      examples: "some",
      exampleTypes: ["lists"],
    },
    context: {
      authorRole: "Content Expert",
      authorKnowledge: 7,
      audienceRole: "General Readers",
      audienceKnowledge: 3,
      authorRelationship: 7,
    },
  });
}

// ─── PHASE EXECUTORS ────────────────────────────────────────────────

export async function executeIdeation(
  draftId: string,
  userId: string,
  userPlan: string
) {
  const draft = await getDraft(draftId, userId);
  if (!draft) throw new Error("Draft not found");

  const prompt = getIdeationPrompt(
    draft.initialIdea || "",
    draft.language,
    draft.niche || undefined
  );

  const raw = await callAI(prompt, userPlan);
  const result = safeParseJSON(raw, {
    refinedTopic: draft.initialIdea || "",
    angles: [],
    exploratoryResearch: { searchesPerformed: [], findings: [] },
    suggestedKeyword: "",
    feedback: "",
  });

  await updateDraft(draftId, userId, {
    refinedTopic: result.refinedTopic,
    keyword: result.suggestedKeyword || draft.keyword,
    exploratoryResearch: result.exploratoryResearch,
    phase: "research",
  });

  return result;
}

export async function executeResearchConfig(
  draftId: string,
  userId: string,
  wantResearch: boolean,
  depth?: "light" | "medium" | "heavy",
  includeCitations?: boolean,
  userPlan?: string
) {
  const draft = await getDraft(draftId, userId);
  if (!draft) throw new Error("Draft not found");

  if (!wantResearch) {
    await updateDraft(draftId, userId, {
      researchDepth: "none",
      phase: "style",
    });
    return { sources: [], skipped: true };
  }

  const researchDepth = depth || "medium";
  const prompt = getResearchGatherPrompt(
    draft.refinedTopic || draft.initialIdea || "",
    researchDepth,
    draft.keyword || "",
    draft.language
  );

  const raw = await callAI(prompt, userPlan, { maxTokens: 6000 });
  const result = safeParseJSON(raw, { sources: [], researchSummary: "" });

  await updateDraft(draftId, userId, {
    researchDepth,
    includeCitations: includeCitations ?? false,
    phase: "research", // stay in research until sources are approved
  });

  return result;
}

export async function approveResearchSources(
  draftId: string,
  userId: string,
  approvedSources: ResearchSource[],
  includeCitations: boolean
) {
  await updateDraft(draftId, userId, {
    approvedSources,
    includeCitations,
    phase: "style",
  });
}

export async function executeThesis(
  draftId: string,
  userId: string,
  styleGuideId: string | null,
  userPlan: string
) {
  const draft = await getDraft(draftId, userId);
  if (!draft) throw new Error("Draft not found");

  let style: StyleGuideSettings | undefined;
  if (styleGuideId) {
    const dbStyle = await getStyleGuide(styleGuideId, userId);
    if (dbStyle) style = dbStyleToSettings(dbStyle);
    await updateDraft(draftId, userId, { styleGuideId });
  }

  const sources = (draft.approvedSources as ResearchSource[] | null) || [];

  const prompt = getTitleThesisPrompt(
    draft.refinedTopic || draft.initialIdea || "",
    draft.keyword || "",
    draft.language,
    style,
    sources.length > 0 ? sources : undefined
  );

  const raw = await callAI(prompt, userPlan);
  const result = safeParseJSON(raw, { options: [] });

  // Don't advance phase yet — user picks title/thesis
  return result;
}

export async function confirmThesis(
  draftId: string,
  userId: string,
  selectedTitle: string,
  selectedThesis: string
) {
  await updateDraft(draftId, userId, {
    title: selectedTitle,
    thesis: selectedThesis,
    phase: "outline",
  });
}

export async function executeOutline(
  draftId: string,
  userId: string,
  userPlan: string
) {
  const draft = await getDraft(draftId, userId);
  if (!draft) throw new Error("Draft not found");

  let style: StyleGuideSettings | undefined;
  if (draft.styleGuideId && draft.styleGuide) {
    style = dbStyleToSettings(draft.styleGuide);
  }

  const sources = (draft.approvedSources as ResearchSource[] | null) || [];

  const prompt = getOutlinePrompt(
    draft.title || "",
    draft.thesis || "",
    draft.keyword || "",
    draft.wordCount,
    draft.language,
    style,
    sources.length > 0 ? sources : undefined
  );

  const raw = await callAI(prompt, userPlan, { maxTokens: 4096 });
  const result = safeParseJSON(raw, { outline: [], totalWordCount: 0, suggestedLabels: [] });

  await updateDraft(draftId, userId, {
    outline: result.outline,
    phase: "sections",
  });

  return result;
}

export async function confirmSections(
  draftId: string,
  userId: string,
  confirmedOutline: OutlineItem[]
) {
  await updateDraft(draftId, userId, {
    outline: confirmedOutline,
    phase: "writing",
  });
}

export async function executeWriteFull(
  draftId: string,
  userId: string,
  userPlan: string
) {
  const draft = await getDraft(draftId, userId);
  if (!draft) throw new Error("Draft not found");

  let style: StyleGuideSettings | undefined;
  if (draft.styleGuideId && draft.styleGuide) {
    style = dbStyleToSettings(draft.styleGuide);
  }

  const sources = (draft.approvedSources as ResearchSource[] | null) || [];
  const outline = (draft.outline as OutlineItem[] | null) || [];

  const prompt = getWriteFullPrompt(
    draft.title || "",
    draft.thesis || "",
    outline,
    draft.keyword || "",
    draft.wordCount,
    draft.language,
    style,
    sources.length > 0 ? sources : undefined,
    draft.includeCitations
  );

  const raw = await callAIRaw(prompt, userPlan, { maxTokens: 16000, temperature: 0.75 });

  // Build sections object from outline
  const sections: Record<string, string> = {};
  outline.forEach((item) => {
    const slug = item.heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    sections[slug] = "complete";
  });

  await updateDraft(draftId, userId, {
    writingMode: "full",
    draftContent: raw,
    sections,
    phase: "approval",
  });

  return { content: raw, wordCount: raw.split(/\s+/).length };
}

export async function executeWriteSection(
  draftId: string,
  userId: string,
  sectionIndex: number,
  userPlan: string
) {
  const draft = await getDraft(draftId, userId);
  if (!draft) throw new Error("Draft not found");

  const outline = (draft.outline as any[] | null) || [];
  const section = outline[sectionIndex];
  if (!section) throw new Error("Section not found");

  let style: StyleGuideSettings | undefined;
  if (draft.styleGuideId && draft.styleGuide) {
    style = dbStyleToSettings(draft.styleGuide);
  }

  const sources = (draft.approvedSources as ResearchSource[] | null) || [];

  const prompt = getWriteSectionPrompt(
    draft.title || "",
    draft.thesis || "",
    section.heading,
    section.points || [],
    section.type || null,
    section.wordCount || Math.floor(draft.wordCount / outline.length),
    draft.keyword || "",
    draft.language,
    draft.draftContent || "",
    style,
    sources.length > 0 ? sources : undefined,
    draft.includeCitations
  );

  const raw = await callAIRaw(prompt, userPlan, { maxTokens: 4096 });

  // Update section status and append to draft
  const updatedOutline = [...outline];
  updatedOutline[sectionIndex] = { ...section, status: "complete" };

  const existingContent = draft.draftContent || "";
  const updatedContent = existingContent + "\n\n" + raw;

  const sections = (draft.sections as Record<string, string>) || {};
  const slug = section.heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  sections[slug] = raw;

  const allComplete = updatedOutline.every((s: any) => s.status === "complete");

  await updateDraft(draftId, userId, {
    writingMode: "section",
    outline: updatedOutline,
    draftContent: updatedContent,
    sections,
    phase: allComplete ? "approval" : "writing",
  });

  return { content: raw, allComplete, sectionIndex };
}

export async function executeEditorPass(
  draftId: string,
  userId: string,
  userPlan: string,
  skip: boolean = false
) {
  const draft = await getDraft(draftId, userId);
  if (!draft) throw new Error("Draft not found");

  if (skip) {
    await updateDraft(draftId, userId, { phase: "metadata" });
    return { skipped: true, content: draft.draftContent };
  }

  // Use the new Humanizer layer instead of the generic editor pass
  const prompt = getHumanizerPrompt(draft.draftContent || "");
  const raw = await callAIRaw(prompt, userPlan, { maxTokens: 16000, temperature: 0.8 });

  await updateDraft(draftId, userId, {
    editorContent: raw,
    editorSuggestions: { summary: "Humanizer pass applied to break AI patterns." },
    phase: "metadata",
  });

  return { editedContent: raw, changes: {}, summary: "Humanizer pass applied." };
}

export async function executeMetadata(
  draftId: string,
  userId: string,
  userPlan: string
) {
  const draft = await getDraft(draftId, userId);
  if (!draft) throw new Error("Draft not found");

  const content = draft.editorContent || draft.draftContent || "";
  const prompt = getMetadataPrompt(
    draft.title || "",
    content,
    draft.keyword || "",
    draft.language
  );

  const raw = await callAI(prompt, userPlan);
  const result = safeParseJSON(raw, {
    metaTitle: draft.title || "",
    metaDescription: "",
    metaKeywords: [],
    excerpt: "",
  });

  await updateDraft(draftId, userId, {
    metaTitle: result.metaTitle,
    metaDescription: result.metaDescription,
    metaKeywords: result.metaKeywords,
    phase: "export",
  });

  return result;
}

export async function confirmMetadata(
  draftId: string,
  userId: string,
  metaTitle: string,
  metaDescription: string,
  metaKeywords: string[]
) {
  await updateDraft(draftId, userId, {
    metaTitle,
    metaDescription,
    metaKeywords,
    phase: "export",
  });
}

// Export function is handled by the existing /api/generate route's
// article saving and Blogger publishing logic. The draft's final
// content is passed to it.
export async function finalizeDraft(
  draftId: string,
  userId: string,
  exportedArticleId?: string
) {
  await updateDraft(draftId, userId, {
    exportedArticleId,
    phase: "finished",
  });
}
