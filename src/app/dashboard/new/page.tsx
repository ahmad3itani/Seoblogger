"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  FileText,
  ListChecks,
  PenTool,
  Eye,
  Send,
  RefreshCw,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Search,
  Palette,
  Type,
  Layout,
  CheckCircle2,
  Edit3,
  Tags,
  GripVertical,
  Clock,
  Globe,
} from "lucide-react";

// ─── CONSTANTS ──────────────────────────────────────────────────────

const PHASES = [
  { id: "ideation", label: "Topic", icon: Sparkles, num: 1 },
  { id: "research", label: "Research", icon: Search, num: 2 },
  { id: "style", label: "Style", icon: Palette, num: 3 },
  { id: "thesis", label: "Title", icon: Type, num: 4 },
  { id: "outline", label: "Outline", icon: Layout, num: 5 },
  { id: "sections", label: "Sections", icon: ListChecks, num: 6 },
  { id: "writing", label: "Write", icon: PenTool, num: 7 },
  { id: "approval", label: "Review", icon: Eye, num: 8 },
  { id: "editor", label: "Editor", icon: Edit3, num: 9 },
  { id: "metadata", label: "Meta", icon: Tags, num: 10 },
  { id: "export", label: "Publish", icon: Send, num: 11 },
];

const ARTICLE_TYPES = [
  { value: "blog-post", label: "Blog Post" },
  { value: "how-to", label: "How-To Guide" },
  { value: "listicle", label: "Listicle" },
  { value: "comparison", label: "Comparison" },
  { value: "review", label: "Product Review" },
  { value: "informational", label: "Informational" },
  { value: "tutorial", label: "Tutorial" },
  { value: "affiliate", label: "Affiliate Post" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "tr", label: "Turkish" },
];

type Phase = "ideation" | "research" | "style" | "thesis" | "outline" | "sections" | "writing" | "approval" | "editor" | "metadata" | "export" | "finished";

interface StyleGuide {
  id: string;
  name: string;
  description?: string;
  voiceTone: number;
  voiceHumor: number;
  voiceOpinion: number;
  voiceTechnical: number;
  fmtEmojis: number;
  fmtEmDashes: number;
  fmtBlockquotes: string;
  structOpening: string;
  structClosing: string;
  structVisualBreaks: string;
  structExamples: string;
  structExampleTypes?: string;
  authorRole?: string;
  authorKnowledge: number;
  audienceRole?: string;
  audienceKnowledge: number;
  authorRelationship: number;
  isDefault: boolean;
}

interface DraftSummary {
  id: string;
  phase: Phase;
  title?: string;
  initialIdea?: string;
  refinedTopic?: string;
  keyword?: string;
  updatedAt: string;
}

interface OutlineItem {
  heading: string;
  type: string | null;
  status: string;
  points?: string[];
  wordCount?: number;
}

interface ResearchSource {
  url: string;
  title: string;
  author?: string;
  date?: string;
  domain: string;
  relevance: string;
  excerpt: string;
  suggestedRequired?: boolean;
  required?: boolean;
}

// ─── API HELPER ─────────────────────────────────────────────────────

async function api(action: string, params: Record<string, any> = {}) {
  const res = await fetch("/api/article-writer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...params }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────

export default function NewArticlePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <ArticleWriterContent />
    </Suspense>
  );
}

function ArticleWriterContent() {
  const searchParams = useSearchParams();

  // ─── STATE ──────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("ideation");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);

  // Phase 1: Ideation
  const [initialIdea, setInitialIdea] = useState("");
  const [language, setLanguage] = useState("en");
  const [niche, setNiche] = useState("");
  const [articleType, setArticleType] = useState("blog-post");
  const [wordCount, setWordCount] = useState("2000");
  const [includeImages, setIncludeImages] = useState(false);
  const [numImages, setNumImages] = useState("3");
  const [ideationResult, setIdeationResult] = useState<any>(null);

  // Phase 2: Research
  const [wantResearch, setWantResearch] = useState(false);
  const [researchDepth, setResearchDepth] = useState<"light" | "medium" | "heavy">("medium");
  const [includeCitations, setIncludeCitations] = useState(false);
  const [researchSources, setResearchSources] = useState<ResearchSource[]>([]);
  const [researchSummary, setResearchSummary] = useState("");

  // Phase 3: Style
  const [styleGuides, setStyleGuides] = useState<StyleGuide[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string>("");
  const [showNewStyle, setShowNewStyle] = useState(false);
  const [newStyleName, setNewStyleName] = useState("");
  const [styleSuggestion, setStyleSuggestion] = useState<any>(null);

  // Phase 4: Title & Thesis
  const [titleOptions, setTitleOptions] = useState<any[]>([]);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [selectedThesis, setSelectedThesis] = useState("");

  // Phase 5: Outline
  const [outline, setOutline] = useState<OutlineItem[]>([]);

  // Phase 7: Writing
  const [writingMode, setWritingMode] = useState<"full" | "section">("full");
  const [draftContent, setDraftContent] = useState("");
  const [currentWritingSection, setCurrentWritingSection] = useState(0);

  // Phase 9: Editor
  const [editorContent, setEditorContent] = useState("");
  const [editorChanges, setEditorChanges] = useState<any>(null);

  // Phase 10: Metadata
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState<string[]>([]);

  // Phase 11: Export
  const [publishAction, setPublishAction] = useState("draft");
  const [savedArticle, setSavedArticle] = useState<any>(null);

  // ─── LOAD DRAFTS ON MOUNT ───────────────────────────────────────
  useEffect(() => {
    loadDrafts();
    loadStyleGuides();
    const resumeId = searchParams.get("draft");
    if (resumeId) resumeDraft(resumeId);
  }, []);

  const loadDrafts = async () => {
    try {
      const data = await api("list-drafts");
      setDrafts(data.drafts || []);
    } catch {}
  };

  const loadStyleGuides = async () => {
    try {
      const data = await api("list-styles");
      setStyleGuides(data.styles || []);
      const def = (data.styles || []).find((s: StyleGuide) => s.isDefault);
      if (def) setSelectedStyleId(def.id);
    } catch {}
  };

  const resumeDraft = async (id: string) => {
    try {
      setLoading(true);
      const data = await api("get-draft", { draftId: id });
      const d = data.draft;
      setDraftId(d.id);
      setPhase(d.phase);
      setInitialIdea(d.initialIdea || "");
      setLanguage(d.language || "en");
      setNiche(d.niche || "");
      setArticleType(d.articleType || "blog-post");
      setWordCount(String(d.wordCount || 2000));
      if (d.refinedTopic) setIdeationResult({ refinedTopic: d.refinedTopic });
      if (d.title) setSelectedTitle(d.title);
      if (d.thesis) setSelectedThesis(d.thesis);
      if (d.outline) setOutline(d.outline);
      if (d.draftContent) setDraftContent(d.draftContent);
      if (d.editorContent) setEditorContent(d.editorContent);
      if (d.metaTitle) setMetaTitle(d.metaTitle);
      if (d.metaDescription) setMetaDescription(d.metaDescription);
      if (d.metaKeywords) setMetaKeywords(d.metaKeywords);
      if (d.styleGuideId) setSelectedStyleId(d.styleGuideId);
      if (d.approvedSources) setResearchSources(d.approvedSources);
      if (d.includeCitations) setIncludeCitations(d.includeCitations);
      setShowDrafts(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── PHASE HANDLERS ────────────────────────────────────────────

  const handleIdeation = async () => {
    if (!initialIdea.trim()) return setError("Enter a topic idea");
    setError("");
    setLoading(true);
    try {
      const data = await api("ideation", {
        draftId,
        initialIdea: initialIdea.trim(),
        language,
        niche,
        articleType,
        wordCount: parseInt(wordCount),
      });
      setDraftId(data.draftId);
      setIdeationResult(data);
      setPhase("research");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResearch = async () => {
    setError("");
    setLoading(true);
    try {
      if (!wantResearch) {
        await api("research-config", { draftId, wantResearch: false });
        setPhase("style");
      } else {
        const data = await api("research-config", {
          draftId,
          wantResearch: true,
          researchDepth,
          includeCitations,
        });
        const sources = (data.sources || []).map((s: any) => ({
          ...s,
          required: s.suggestedRequired ?? false,
        }));
        setResearchSources(sources);
        setResearchSummary(data.researchSummary || "");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveResearch = async () => {
    setError("");
    setLoading(true);
    try {
      await api("research-approve", {
        draftId,
        approvedSources: researchSources,
        includeCitations,
      });
      setPhase("style");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStyleDone = () => {
    setPhase("thesis");
  };

  const handleThesis = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await api("thesis", {
        draftId,
        styleGuideId: selectedStyleId || undefined,
      });
      setTitleOptions(data.options || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmThesis = async () => {
    if (!selectedTitle) return setError("Select a title first");
    setError("");
    setLoading(true);
    try {
      await api("thesis-confirm", {
        draftId,
        selectedTitle,
        selectedThesis,
      });
      setPhase("outline");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOutline = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await api("outline", { draftId });
      setOutline(data.outline || []);
      setPhase("sections");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSections = async () => {
    setError("");
    setLoading(true);
    try {
      await api("sections-confirm", { draftId, confirmedOutline: outline });
      setPhase("writing");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWriteFull = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await api("write-full", { draftId });
      setDraftContent(data.content || "");
      setPhase("approval");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWriteSection = async (idx: number) => {
    setError("");
    setLoading(true);
    try {
      const data = await api("write-section", { draftId, sectionIndex: idx });
      setDraftContent((prev) => prev + "\n\n" + (data.content || ""));
      // Update outline status client-side so UI shows section as complete
      setOutline((prev) => {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], status: "complete" };
        return updated;
      });
      if (data.allComplete) setPhase("approval");
      else setCurrentWritingSection(idx + 1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDraft = async () => {
    setError("");
    setLoading(true);
    try {
      await api("approve-draft", { draftId });
      setPhase("editor");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditorPass = async (skip: boolean) => {
    setError("");
    setLoading(true);
    try {
      const data = await api("editor-pass", { draftId, skipEditor: skip });
      if (!skip) {
        setEditorContent(data.editedContent || draftContent);
        setEditorChanges(data.changes || null);
        // Don't auto-advance — let user review changes first
      } else {
        setPhase("metadata");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMetadata = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await api("metadata", { draftId });
      setMetaTitle(data.metaTitle || "");
      setMetaDescription(data.metaDescription || "");
      setMetaKeywords(data.metaKeywords || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMetadata = async () => {
    setError("");
    setLoading(true);
    try {
      await api("metadata-confirm", { draftId, metaTitle, metaDescription, metaKeywords });
      setPhase("export");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await api("export", {
        draftId,
        publishAction,
        includeToc: true,
        includeImages,
        includeCitationsInExport: includeCitations,
      });
      setSavedArticle(data.savedArticle);
      setPhase("finished");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestStyle = async () => {
    setLoading(true);
    try {
      const data = await api("suggest-style", {
        topic: ideationResult?.refinedTopic || initialIdea,
        niche,
      });
      setStyleSuggestion(data.suggestion);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStyleGuide = async () => {
    if (!styleSuggestion) return;
    setLoading(true);
    try {
      const data = await api("create-style", {
        name: newStyleName || styleSuggestion.name,
        description: styleSuggestion.description,
        voice: styleSuggestion.voice,
        formatting: styleSuggestion.formatting,
        structure: styleSuggestion.structure,
        context: styleSuggestion.context,
        isDefault: styleGuides.length === 0,
      });
      setStyleGuides((prev) => [...prev, data.style]);
      setSelectedStyleId(data.style.id);
      setShowNewStyle(false);
      setStyleSuggestion(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── OUTLINE HELPERS ────────────────────────────────────────────

  const updateOutlineItem = (idx: number, field: string, value: any) => {
    const newOutline = [...outline];
    newOutline[idx] = { ...newOutline[idx], [field]: value };
    setOutline(newOutline);
  };

  const removeOutlineItem = (idx: number) => {
    setOutline(outline.filter((_, i) => i !== idx));
  };

  const moveOutlineItem = (idx: number, dir: "up" | "down") => {
    const arr = [...outline];
    const t = dir === "up" ? idx - 1 : idx + 1;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    setOutline(arr);
  };

  const addOutlineItem = () => {
    setOutline([...outline, { heading: "New Section", type: null, status: "pending", points: ["Key point"], wordCount: 300 }]);
  };

  // ─── PHASE INDEX ────────────────────────────────────────────────
  const phaseIndex = PHASES.findIndex((p) => p.id === phase);
  const progressPct = phase === "finished" ? 100 : Math.round(((phaseIndex + 1) / PHASES.length) * 100);

  // ─── RENDER ─────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PenTool className="w-6 h-6 text-[#F97316]" />
            Article Writer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {phase === "finished" ? "Article published successfully!" : `Phase ${phaseIndex + 1} of ${PHASES.length}: ${PHASES[phaseIndex]?.label || "Done"}`}
          </p>
        </div>
        <div className="flex gap-2">
          {drafts.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowDrafts(!showDrafts)}>
              <Clock className="w-4 h-4 mr-1" /> Drafts ({drafts.length})
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress value={progressPct} className="h-2" />
        <div className="flex justify-between overflow-x-auto gap-1 pb-1">
          {PHASES.map((p, i) => {
            const Icon = p.icon;
            const isActive = p.id === phase;
            const isDone = phaseIndex > i || phase === "finished";
            return (
              <div
                key={p.id}
                className={`flex flex-col items-center gap-0.5 min-w-[54px] ${isActive ? "text-[#F97316]" : isDone ? "text-green-500" : "text-muted-foreground/50"}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${isActive ? "bg-[#F97316]/15 ring-2 ring-[#F97316]" : isDone ? "bg-green-500/15" : "bg-muted/30"}`}>
                  {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span className="text-[10px] font-medium leading-tight text-center">{p.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Drafts Panel */}
      {showDrafts && (
        <div className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-3 animate-slide-up">
          <h3 className="font-semibold text-sm">Resume a Draft</h3>
          {drafts.map((d) => (
            <button
              key={d.id}
              onClick={() => resumeDraft(d.id)}
              className="w-full text-left p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{d.title || d.refinedTopic || d.initialIdea || "Untitled"}</span>
                <Badge variant="secondary" className="text-[10px]">{d.phase}</Badge>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(d.updatedAt).toLocaleDateString()}</span>
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
          {error}
          <button onClick={() => setError("")} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {/* Phase Content */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-6">
        {/* ═══ PHASE 1: IDEATION ═══ */}
        {phase === "ideation" && (
          <div className="space-y-5 animate-slide-up opacity-0 stagger-1">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#F97316]" /> Topic Ideation
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                What do you want to write about? I&apos;ll refine your idea into compelling angles.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Your Topic Idea *</Label>
                <Textarea
                  placeholder="e.g., benefits of intermittent fasting for weight loss, best CRM software for small business..."
                  className="mt-1.5 bg-muted/30 border-border/50 min-h-[100px]"
                  value={initialIdea}
                  onChange={(e) => setInitialIdea(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Article Type</Label>
                  <Select value={articleType} onValueChange={(v) => v && setArticleType(v)}>
                    <SelectTrigger className="mt-1 bg-muted/30 border-border/50 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ARTICLE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Language</Label>
                  <Select value={language} onValueChange={(v) => v && setLanguage(v)}>
                    <SelectTrigger className="mt-1 bg-muted/30 border-border/50 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((l) => (
                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Word Count</Label>
                  <Select value={wordCount} onValueChange={(v) => v && setWordCount(v)}>
                    <SelectTrigger className="mt-1 bg-muted/30 border-border/50 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["1000", "1500", "2000", "2500", "3000", "4000", "5000"].map((w) => (
                        <SelectItem key={w} value={w}>{parseInt(w).toLocaleString()} words</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Niche</Label>
                  <Input
                    placeholder="e.g., health, tech..."
                    className="mt-1 bg-muted/30 border-border/50 h-9 text-xs"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                  />
                </div>
              </div>

              {/* Image Generation Options */}
              <div className="border border-border/50 rounded-lg p-4 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Generate AI Images</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Add featured image and inline images to your article</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIncludeImages(!includeImages)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      includeImages ? 'bg-[#F97316]' : 'bg-muted-foreground/30'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        includeImages ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {includeImages && (
                  <div>
                    <Label className="text-xs">Number of Inline Images</Label>
                    <Select value={numImages} onValueChange={(v) => v && setNumImages(v)}>
                      <SelectTrigger className="mt-1 bg-muted/30 border-border/50 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["1", "2", "3", "4", "5"].map((n) => (
                          <SelectItem key={n} value={n}>{n} {n === "1" ? "image" : "images"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1.5">1 featured image + {numImages} inline images = {parseInt(numImages) + 1} total</p>
                  </div>
                )}
              </div>
            </div>

            <Button onClick={handleIdeation} disabled={loading || !initialIdea.trim()} className="bg-[#F97316] hover:bg-[#F97316]/90 w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {loading ? "Analyzing Topic..." : "Analyze & Refine Topic"}
            </Button>
          </div>
        )}

        {/* ═══ PHASE 2: RESEARCH ═══ */}
        {phase === "research" && (
          <div className="space-y-5 animate-slide-up opacity-0 stagger-1">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Search className="w-5 h-5 text-[#F97316]" /> Research Planning
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Want to back your article with research and sources?
              </p>
            </div>

            {ideationResult && (
              <div className="rounded-lg bg-muted/20 p-4 space-y-2 border border-border/30">
                <div className="text-xs font-medium text-[#F97316] uppercase tracking-wider">Refined Topic</div>
                <p className="text-sm font-medium">{ideationResult.refinedTopic}</p>
                {ideationResult.suggestedKeyword && (
                  <p className="text-xs text-muted-foreground">Suggested keyword: <span className="font-mono text-[#F97316]">{ideationResult.suggestedKeyword}</span></p>
                )}
                {ideationResult.angles?.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs font-medium text-muted-foreground">Possible angles:</span>
                    <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                      {ideationResult.angles.map((a: string, i: number) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-[#F97316] mt-0.5">•</span> {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/30">
              <div>
                <span className="text-sm font-medium">Include Research & Sources</span>
                <p className="text-xs text-muted-foreground">AI will gather authoritative sources to strengthen your article</p>
              </div>
              <Switch checked={wantResearch} onCheckedChange={setWantResearch} />
            </div>

            {wantResearch && (
              <div className="space-y-3 pl-4 border-l-2 border-[#F97316]/30">
                <div>
                  <Label className="text-xs">Research Depth</Label>
                  <Select value={researchDepth} onValueChange={(v: any) => setResearchDepth(v)}>
                    <SelectTrigger className="mt-1 bg-muted/30 border-border/50 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light (3-5 sources)</SelectItem>
                      <SelectItem value="medium">Medium (6-10 sources)</SelectItem>
                      <SelectItem value="heavy">Heavy (10-15 sources)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={includeCitations} onCheckedChange={setIncludeCitations} />
                  <Label className="text-xs">Include inline citations [^1] in article</Label>
                </div>
              </div>
            )}

            {researchSources.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Gathered Sources — Review & Approve</h3>
                {researchSummary && <p className="text-xs text-muted-foreground">{researchSummary}</p>}
                {researchSources.map((s, i) => (
                  <div key={i} className="rounded-lg bg-muted/20 p-3 border border-border/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{s.title}</span>
                      <div className="flex items-center gap-2">
                        <Label className="text-[10px]">Required</Label>
                        <Switch
                          checked={s.required}
                          onCheckedChange={(v) => {
                            const updated = [...researchSources];
                            updated[i] = { ...s, required: v };
                            setResearchSources(updated);
                          }}
                        />
                        <button onClick={() => setResearchSources(researchSources.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.domain} {s.date && `• ${s.date}`}</p>
                    <p className="text-xs">{s.excerpt}</p>
                  </div>
                ))}
                <Button onClick={handleApproveResearch} disabled={loading} className="w-full bg-[#F97316] hover:bg-[#F97316]/90">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Approve Sources & Continue
                </Button>
              </div>
            )}

            {researchSources.length === 0 && (
              <Button onClick={handleResearch} disabled={loading} className="w-full bg-[#F97316] hover:bg-[#F97316]/90">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                {loading ? (wantResearch ? "Gathering Sources..." : "Continuing...") : (wantResearch ? "Gather Sources" : "Skip Research & Continue")}
              </Button>
            )}
          </div>
        )}

        {/* ═══ PHASE 3: STYLE ═══ */}
        {phase === "style" && (
          <div className="space-y-5 animate-slide-up opacity-0 stagger-1">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#F97316]" /> Writing Style
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Select or create a reusable style guide to control voice, tone, and formatting.
              </p>
            </div>

            {styleGuides.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Select a Style Guide</Label>
                <div className="grid gap-2">
                  <button
                    onClick={() => setSelectedStyleId("")}
                    className={`text-left p-3 rounded-lg border transition-colors ${!selectedStyleId ? "border-[#F97316] bg-[#F97316]/10" : "border-border/30 bg-muted/20 hover:bg-muted/30"}`}
                  >
                    <span className="text-sm font-medium">Default Style</span>
                    <p className="text-xs text-muted-foreground">Balanced professional tone, standard formatting</p>
                  </button>
                  {styleGuides.map((sg) => (
                    <button
                      key={sg.id}
                      onClick={() => setSelectedStyleId(sg.id)}
                      className={`text-left p-3 rounded-lg border transition-colors ${selectedStyleId === sg.id ? "border-[#F97316] bg-[#F97316]/10" : "border-border/30 bg-muted/20 hover:bg-muted/30"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{sg.name}</span>
                        {sg.isDefault && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                      </div>
                      {sg.description && <p className="text-xs text-muted-foreground mt-0.5">{sg.description}</p>}
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">Tone: {sg.voiceTone}/10</Badge>
                        <Badge variant="outline" className="text-[10px]">Technical: {sg.voiceTechnical}/10</Badge>
                        <Badge variant="outline" className="text-[10px]">{sg.structVisualBreaks} breaks</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setShowNewStyle(!showNewStyle); if (!styleSuggestion) handleSuggestStyle(); }}>
                <Plus className="w-3.5 h-3.5 mr-1" /> AI-Suggest Style
              </Button>
            </div>

            {showNewStyle && styleSuggestion && (
              <div className="rounded-lg bg-muted/20 p-4 border border-border/30 space-y-3">
                <h3 className="text-sm font-semibold">AI Suggested Style</h3>
                <div>
                  <Label className="text-xs">Style Name</Label>
                  <Input
                    className="mt-1 bg-muted/30 border-border/50 h-9 text-xs"
                    value={newStyleName || styleSuggestion.name}
                    onChange={(e) => setNewStyleName(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{styleSuggestion.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Tone: {styleSuggestion.voice?.tone}/10</div>
                  <div>Humor: {styleSuggestion.voice?.humor}/10</div>
                  <div>Opinion: {styleSuggestion.voice?.opinion}/10</div>
                  <div>Technical: {styleSuggestion.voice?.technical}/10</div>
                  <div>Emojis: {styleSuggestion.formatting?.emojis}/10</div>
                  <div>Examples: {styleSuggestion.structure?.examples}</div>
                </div>
                <Button size="sm" onClick={handleSaveStyleGuide} disabled={loading}>
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                  Save & Select
                </Button>
              </div>
            )}

            <Button onClick={handleStyleDone} className="w-full bg-[#F97316] hover:bg-[#F97316]/90">
              <ArrowRight className="w-4 h-4 mr-2" /> Continue to Title & Thesis
            </Button>
          </div>
        )}

        {/* ═══ PHASE 4: TITLE & THESIS ═══ */}
        {phase === "thesis" && (
          <div className="space-y-5 animate-slide-up opacity-0 stagger-1">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Type className="w-5 h-5 text-[#F97316]" /> Title & Thesis
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a compelling title and direction for your article.
              </p>
            </div>

            {titleOptions.length === 0 && (
              <Button onClick={handleThesis} disabled={loading} className="w-full bg-[#F97316] hover:bg-[#F97316]/90">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {loading ? "Generating Titles..." : "Generate Title & Thesis Options"}
              </Button>
            )}

            {titleOptions.length > 0 && (
              <div className="space-y-3">
                {titleOptions.map((opt: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => { setSelectedTitle(opt.title); setSelectedThesis(opt.thesis); }}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${selectedTitle === opt.title ? "border-[#F97316] bg-[#F97316]/10" : "border-border/30 bg-muted/20 hover:bg-muted/30"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{opt.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{opt.thesis}</p>
                      </div>
                      {opt.approach && <Badge variant="outline" className="text-[10px] shrink-0">{opt.approach}</Badge>}
                    </div>
                  </button>
                ))}

                <div className="space-y-2">
                  <Label className="text-xs">Or write a custom title</Label>
                  <Input
                    className="bg-muted/30 border-border/50 text-sm"
                    value={selectedTitle}
                    onChange={(e) => setSelectedTitle(e.target.value)}
                    placeholder="Your custom title..."
                  />
                  <Textarea
                    className="bg-muted/30 border-border/50 text-xs min-h-[60px]"
                    value={selectedThesis}
                    onChange={(e) => setSelectedThesis(e.target.value)}
                    placeholder="Your thesis statement..."
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleThesis} disabled={loading} variant="outline" className="flex-1">
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Regenerate
                  </Button>
                  <Button onClick={handleConfirmThesis} disabled={loading || !selectedTitle} className="flex-1 bg-[#F97316] hover:bg-[#F97316]/90">
                    <ArrowRight className="w-4 h-4 mr-2" /> Confirm & Generate Outline
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ PHASE 5: OUTLINE ═══ */}
        {phase === "outline" && (
          <div className="space-y-5 animate-slide-up opacity-0 stagger-1">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Layout className="w-5 h-5 text-[#F97316]" /> Outline
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Generating a structured outline for: <span className="font-medium text-foreground">{selectedTitle}</span>
              </p>
            </div>
            <Button onClick={handleOutline} disabled={loading} className="w-full bg-[#F97316] hover:bg-[#F97316]/90">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Layout className="w-4 h-4 mr-2" />}
              {loading ? "Building Outline..." : "Generate Outline"}
            </Button>
          </div>
        )}

        {/* ═══ PHASE 6: SECTIONS CONFIRM ═══ */}
        {phase === "sections" && (
          <div className="space-y-5 animate-slide-up opacity-0 stagger-1">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-[#F97316]" /> Confirm Sections
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Review, reorder, edit, or add sections before writing.
              </p>
            </div>

            <div className="space-y-3">
              {outline.map((item, i) => (
                <div key={i} className="rounded-lg bg-muted/20 border border-border/30 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                    <Input
                      className="bg-transparent border-none h-8 text-sm font-medium p-0 focus-visible:ring-0"
                      value={item.heading}
                      onChange={(e) => updateOutlineItem(i, "heading", e.target.value)}
                    />
                    <div className="flex gap-0.5 shrink-0">
                      <button onClick={() => moveOutlineItem(i, "up")} className="p-1 hover:bg-muted/50 rounded" disabled={i === 0}>
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => moveOutlineItem(i, "down")} className="p-1 hover:bg-muted/50 rounded" disabled={i === outline.length - 1}>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => removeOutlineItem(i)} className="p-1 hover:bg-red-500/20 rounded text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {item.points && (
                    <div className="pl-6 space-y-1">
                      {item.points.map((pt, j) => (
                        <div key={j} className="flex items-center gap-1">
                          <span className="text-muted-foreground text-xs">•</span>
                          <Input
                            className="bg-transparent border-none h-6 text-xs p-0 focus-visible:ring-0"
                            value={pt}
                            onChange={(e) => {
                              const newOutline = [...outline];
                              const pts = [...(newOutline[i].points || [])];
                              pts[j] = e.target.value;
                              newOutline[i] = { ...newOutline[i], points: pts };
                              setOutline(newOutline);
                            }}
                          />
                          <button
                            onClick={() => {
                              const newOutline = [...outline];
                              const pts = [...(newOutline[i].points || [])];
                              pts.splice(j, 1);
                              newOutline[i] = { ...newOutline[i], points: pts };
                              setOutline(newOutline);
                            }}
                            className="text-muted-foreground hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const newOutline = [...outline];
                          newOutline[i] = { ...newOutline[i], points: [...(newOutline[i].points || []), "New point"] };
                          setOutline(newOutline);
                        }}
                        className="text-xs text-[#F97316] hover:underline"
                      >
                        + Add point
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={addOutlineItem} className="w-full p-2 text-sm text-[#F97316] border border-dashed border-[#F97316]/30 rounded-lg hover:bg-[#F97316]/5">
                <Plus className="w-4 h-4 inline mr-1" /> Add Section
              </button>
            </div>

            <Button onClick={handleConfirmSections} disabled={loading || outline.length === 0} className="w-full bg-[#F97316] hover:bg-[#F97316]/90">
              <ArrowRight className="w-4 h-4 mr-2" /> Confirm & Start Writing
            </Button>
          </div>
        )}

        {/* ═══ PHASE 7: WRITING ═══ */}
        {phase === "writing" && (
          <div className="space-y-5 animate-slide-up opacity-0 stagger-1">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <PenTool className="w-5 h-5 text-[#F97316]" /> Write Article
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Choose how to generate your article content.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setWritingMode("full")}
                className={`p-4 rounded-lg border text-left ${writingMode === "full" ? "border-[#F97316] bg-[#F97316]/10" : "border-border/30 bg-muted/20"}`}
              >
                <FileText className="w-5 h-5 text-[#F97316] mb-2" />
                <p className="text-sm font-semibold">Full Draft</p>
                <p className="text-xs text-muted-foreground">Generate the entire article at once</p>
              </button>
              <button
                onClick={() => setWritingMode("section")}
                className={`p-4 rounded-lg border text-left ${writingMode === "section" ? "border-[#F97316] bg-[#F97316]/10" : "border-border/30 bg-muted/20"}`}
              >
                <ListChecks className="w-5 h-5 text-[#F97316] mb-2" />
                <p className="text-sm font-semibold">Section by Section</p>
                <p className="text-xs text-muted-foreground">Write and review one section at a time</p>
              </button>
            </div>

            {writingMode === "full" && (
              <Button onClick={handleWriteFull} disabled={loading} className="w-full bg-[#F97316] hover:bg-[#F97316]/90">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PenTool className="w-4 h-4 mr-2" />}
                {loading ? "Writing Full Article... (this may take a minute)" : "Generate Full Article"}
              </Button>
            )}

            {writingMode === "section" && (
              <div className="space-y-2">
                {outline.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                    <div className="flex items-center gap-2">
                      {item.status === "complete" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-muted-foreground/30" />
                      )}
                      <span className="text-sm">{item.heading}</span>
                    </div>
                    {item.status !== "complete" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loading || (i > 0 && outline[i - 1]?.status !== "complete")}
                        onClick={() => handleWriteSection(i)}
                      >
                        {loading && currentWritingSection === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Write"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {draftContent && (
              <div className="mt-4 space-y-2">
                <Label className="text-xs">Draft Preview</Label>
                <div className="rounded-lg bg-muted/10 border border-border/30 p-4 max-h-[400px] overflow-y-auto text-sm prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: draftContent }}
                />
              </div>
            )}
          </div>
        )}

        {/* ═══ PHASE 8: APPROVAL ═══ */}
        {phase === "approval" && (
          <div className="space-y-5 animate-slide-up opacity-0 stagger-1">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#F97316]" /> Review Article
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Review the generated article. You can edit it directly or approve to continue.
              </p>
            </div>

            <div className="rounded-lg bg-muted/10 border border-border/30 p-4 max-h-[500px] overflow-y-auto text-sm prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: draftContent }}
            />

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{draftContent.split(/\s+/).length.toLocaleString()} words</span>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setPhase("writing")} variant="outline" className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Writing
              </Button>
              <Button onClick={handleApproveDraft} disabled={loading} className="flex-1 bg-[#F97316] hover:bg-[#F97316]/90">
                <Check className="w-4 h-4 mr-2" /> Approve & Continue
              </Button>
            </div>
          </div>
        )}

        {/* ═══ PHASE 9: EDITOR PASS ═══ */}
        {phase === "editor" && (
          <div className="space-y-5 animate-slide-up opacity-0 stagger-1">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#F97316]" /> Editor Pass
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                AI editorial review: removes AI tells, tightens prose, ensures tone consistency, and enhances formatting.
              </p>
            </div>

            <div className="rounded-lg bg-muted/20 p-4 border border-border/30 space-y-2">
              <h3 className="text-sm font-semibold">What the editor will do:</h3>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>✓ Remove AI tell phrases ("It&apos;s important to note...", "Additionally...")</li>
                <li>✓ Tighten prose (remove redundant words, strengthen verbs)</li>
                <li>✓ Ensure consistent tone throughout</li>
                <li>✓ Add bold/italic emphasis on key terms</li>
                <li>✓ Optimize visual breaks and paragraph lengths</li>
                <li>✓ Fix grammar and spelling</li>
              </ul>
            </div>

            {editorChanges && (
              <div className="space-y-4">
                <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-green-400">Editor Pass Complete</h3>
                  {editorChanges.aiTellsRemoved?.length > 0 && (
                    <p className="text-xs">AI patterns removed: {editorChanges.aiTellsRemoved.length}</p>
                  )}
                  {editorChanges.proseTightened?.length > 0 && (
                    <p className="text-xs">Prose improvements: {editorChanges.proseTightened.length}</p>
                  )}
                  {editorChanges.emphasisAdded?.length > 0 && (
                    <p className="text-xs">Emphasis additions: {editorChanges.emphasisAdded.length}</p>
                  )}
                  {editorChanges.structuralChanges?.length > 0 && (
                    <p className="text-xs">Structural changes: {editorChanges.structuralChanges.length}</p>
                  )}
                </div>
                <div className="rounded-lg bg-muted/10 border border-border/30 p-4 max-h-[400px] overflow-y-auto text-sm prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: editorContent }}
                />
                <Button onClick={() => setPhase("metadata")} className="w-full bg-[#F97316] hover:bg-[#F97316]/90">
                  <ArrowRight className="w-4 h-4 mr-2" /> Continue to Metadata
                </Button>
              </div>
            )}

            {!editorChanges && (
              <div className="flex gap-2">
                <Button onClick={() => handleEditorPass(true)} disabled={loading} variant="outline" className="flex-1">
                  Skip Editor
                </Button>
                <Button onClick={() => handleEditorPass(false)} disabled={loading} className="flex-1 bg-[#F97316] hover:bg-[#F97316]/90">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Edit3 className="w-4 h-4 mr-2" />}
                  {loading ? "Running Editor Pass..." : "Run Editor Pass"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ═══ PHASE 10: METADATA ═══ */}
        {phase === "metadata" && (
          <div className="space-y-5 animate-slide-up opacity-0 stagger-1">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Tags className="w-5 h-5 text-[#F97316]" /> Article Metadata
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Generate and customize SEO metadata for your article.
              </p>
            </div>

            {!metaTitle && (
              <Button onClick={handleMetadata} disabled={loading} className="w-full bg-[#F97316] hover:bg-[#F97316]/90">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Tags className="w-4 h-4 mr-2" />}
                {loading ? "Generating Metadata..." : "Generate SEO Metadata"}
              </Button>
            )}

            {metaTitle && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">SEO Title ({metaTitle.length}/60)</Label>
                  <Input
                    className="mt-1 bg-muted/30 border-border/50"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Meta Description ({metaDescription.length}/160)</Label>
                  <Textarea
                    className="mt-1 bg-muted/30 border-border/50 min-h-[80px]"
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Keywords</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {metaKeywords.map((kw, i) => (
                      <Badge key={i} variant="secondary" className="text-xs gap-1">
                        {kw}
                        <button onClick={() => setMetaKeywords(metaKeywords.filter((_, j) => j !== i))} className="hover:text-red-400">×</button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleMetadata} disabled={loading} variant="outline" className="flex-1">
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Regenerate
                  </Button>
                  <Button onClick={handleConfirmMetadata} disabled={loading} className="flex-1 bg-[#F97316] hover:bg-[#F97316]/90">
                    <ArrowRight className="w-4 h-4 mr-2" /> Confirm & Export
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ PHASE 11: EXPORT ═══ */}
        {phase === "export" && (
          <div className="space-y-5 animate-slide-up opacity-0 stagger-1">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Send className="w-5 h-5 text-[#F97316]" /> Export & Publish
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your article is ready! Choose how to save it.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "draft", label: "Save as Draft", icon: FileText },
                { value: "publish", label: "Publish Now", icon: Globe },
                { value: "schedule", label: "Schedule", icon: Clock },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPublishAction(opt.value)}
                  className={`p-4 rounded-lg border text-center ${publishAction === opt.value ? "border-[#F97316] bg-[#F97316]/10" : "border-border/30 bg-muted/20"}`}
                >
                  <opt.icon className="w-5 h-5 mx-auto mb-1.5 text-[#F97316]" />
                  <p className="text-xs font-medium">{opt.label}</p>
                </button>
              ))}
            </div>

            <Button onClick={handleExport} disabled={loading} className="w-full bg-[#F97316] hover:bg-[#F97316]/90">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {loading ? "Exporting..." : `${publishAction === "publish" ? "Publish" : publishAction === "schedule" ? "Schedule" : "Save"} Article`}
            </Button>
          </div>
        )}

        {/* ═══ FINISHED ═══ */}
        {phase === "finished" && (
          <div className="space-y-5 text-center animate-slide-up opacity-0 stagger-1">
            <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Article Published!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your article has been saved successfully.
              </p>
            </div>
            {savedArticle && (
              <div className="rounded-lg bg-muted/20 p-4 border border-border/30 text-left">
                <p className="text-sm font-medium">{savedArticle.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{savedArticle.wordCount?.toLocaleString()} words • {savedArticle.status}</p>
              </div>
            )}
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => window.location.href = "/dashboard/articles"}>
                <FileText className="w-4 h-4 mr-1" /> View Articles
              </Button>
              <Button onClick={() => { setPhase("ideation"); setDraftId(null); setIdeationResult(null); setTitleOptions([]); setOutline([]); setDraftContent(""); setEditorContent(""); setMetaTitle(""); setMetaDescription(""); setMetaKeywords([]); setSavedArticle(null); setSelectedTitle(""); setSelectedThesis(""); setResearchSources([]); setError(""); }} className="bg-[#F97316] hover:bg-[#F97316]/90">
                <Plus className="w-4 h-4 mr-1" /> Write Another
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
