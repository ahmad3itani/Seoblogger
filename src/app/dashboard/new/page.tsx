"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/supabase/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Loader2,
  Check,
  FileText,
  Globe,
  AlertCircle,
  CheckCircle2,
  Plus,
  PenTool,
  Brain,
  Wand2,
  BarChart3,
  Image as ImageIcon,
  ListChecks,
  ExternalLink,
  Eye,
  ArrowRight,
  Zap,
} from "lucide-react";

interface BrandProfile {
  id: string;
  name: string;
  tone: string;
  language: string;
  niche?: string;
  instructions?: string;
  isDefault: boolean;
}

interface Blog {
  id: string;
  name: string;
  url: string;
  isDefault: boolean;
}

const ARTICLE_TYPES = [
  { value: "informational", label: "Informational" },
  { value: "how-to", label: "How-To Guide" },
  { value: "listicle", label: "Listicle" },
  { value: "comparison", label: "Comparison" },
  { value: "review", label: "Product Review" },
  { value: "tutorial", label: "Tutorial" },
  { value: "recipe", label: "Recipe Post" },
];

const TONES = [
  "professional",
  "casual",
  "friendly",
  "authoritative",
  "conversational",
  "technical",
  "educational",
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "ar", label: "Arabic" },
];

const AI_STEPS = [
  { label: "Planning structure", icon: Brain, duration: 8000 },
  { label: "Generating titles", icon: PenTool, duration: 6000 },
  { label: "Building outline", icon: ListChecks, duration: 8000 },
  { label: "Writing article", icon: Wand2, duration: 30000 },
  { label: "Optimizing SEO", icon: BarChart3, duration: 5000 },
  { label: "Generating images", icon: ImageIcon, duration: 15000 },
  { label: "Finalizing", icon: Sparkles, duration: 3000 },
];

export default function NewArticlePageV3() {
  const { user } = useAuth();
  
  // Form state
  const [keyword, setKeyword] = useState("");
  const [language, setLanguage] = useState("en");
  const [tone, setTone] = useState("professional");
  const [articleType, setArticleType] = useState("informational");
  const [wordCount, setWordCount] = useState("2000");
  const [niche, setNiche] = useState("");
  const [labelsInput, setLabelsInput] = useState("");
  
  // Content features
  const [includeFaq, setIncludeFaq] = useState(true);
  const [includeImages, setIncludeImages] = useState(true);
  const [numImages, setNumImages] = useState(3);
  const [includeComparisonTable, setIncludeComparisonTable] = useState(false);
  const [includeRecipe, setIncludeRecipe] = useState(false);
  const [includeProsCons, setIncludeProsCons] = useState(false);
  const [includeStepByStep, setIncludeStepByStep] = useState(false);
  const [includeToc, setIncludeToc] = useState(true);
  const [includeInternalLinks, setIncludeInternalLinks] = useState(true);
  const [includeExternalLinks, setIncludeExternalLinks] = useState(true);
  
  // Brand & Blog
  const [brandProfiles, setBrandProfiles] = useState<BrandProfile[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("none");
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState<string>("");
  
  // Publishing
  const [publishAction, setPublishAction] = useState<"draft" | "publish">("draft");
  
  // Generation state
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const stepTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      loadBrandProfiles();
      loadBlogs();
    }
  }, [user]);

  // AI progress step simulation
  useEffect(() => {
    if (loading) {
      setCurrentStep(0);
      let step = 0;
      const advanceStep = () => {
        if (step < AI_STEPS.length - 1) {
          step++;
          setCurrentStep(step);
          stepTimerRef.current = setTimeout(advanceStep, AI_STEPS[step].duration);
        }
      };
      stepTimerRef.current = setTimeout(advanceStep, AI_STEPS[0].duration);
    } else {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
      if (result) setCurrentStep(AI_STEPS.length);
    }
    return () => { if (stepTimerRef.current) clearTimeout(stepTimerRef.current); };
  }, [loading, result]);

  const loadBrandProfiles = async () => {
    try {
      const res = await fetch("/api/brand-voices");
      const data = await res.json();
      if (Array.isArray(data)) {
        setBrandProfiles(data);
        const defaultProfile = data.find((p) => p.isDefault);
        if (defaultProfile) {
          setSelectedBrandId(defaultProfile.id);
          setTone(defaultProfile.tone);
          if (defaultProfile.language) setLanguage(defaultProfile.language);
          if (defaultProfile.niche) setNiche(defaultProfile.niche);
        }
      }
    } catch (err) {
      console.error("Failed to load brand profiles:", err);
    }
  };

  const loadBlogs = async () => {
    try {
      const res = await fetch("/api/blogs");
      const data = await res.json();
      if (data.blogs) {
        setBlogs(data.blogs);
        const defaultBlog = data.blogs.find((b: Blog) => b.isDefault);
        if (defaultBlog) setSelectedBlogId(defaultBlog.id);
      }
    } catch (err) {
      console.error("Failed to load blogs:", err);
    }
  };

  const handleBrandSelect = (id: string) => {
    setSelectedBrandId(id);
    const profile = brandProfiles.find(p => p.id === id);
    if (profile) {
      setTone(profile.tone);
      if (profile.language) setLanguage(profile.language);
      if (profile.niche) setNiche(profile.niche);
    }
  };

  const handleGenerate = async () => {
    if (!keyword.trim()) {
      setError("Please enter a keyword");
      return;
    }

    setError("");
    setResult(null);
    setLoading(true);
    setProgress("Generating titles...");

    try {
      const labels = labelsInput.split(",").map(l => l.trim()).filter(Boolean);

      const response = await fetch("/api/generate-v3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          language,
          tone,
          niche,
          articleType,
          wordCount: parseInt(wordCount),
          brandVoiceId: selectedBrandId !== "none" ? selectedBrandId : undefined,
          includeFaq,
          includeImages,
          numImages,
          includeComparisonTable,
          includeRecipe,
          includeProsCons,
          includeStepByStep,
          includeToc,
          includeInternalLinks,
          includeExternalLinks,
          blogId: selectedBlogId || undefined,
          labels,
          publishAction,
        }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(`API error: ${text.substring(0, 200)}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setResult(data);
      setProgress("");
    } catch (err: any) {
      setError(err.message || "Failed to generate article");
      setProgress("");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setKeyword("");
    setNiche("");
    setLabelsInput("");
    setResult(null);
    setError("");
    setShowPreview(false);
    setCurrentStep(0);
  };

  const enabledFeatures = [
    includeFaq && "FAQ",
    includeImages && `${numImages} Images`,
    includeToc && "TOC",
    includeInternalLinks && "Internal Links",
    includeExternalLinks && "External Links",
    includeComparisonTable && "Comparison",
    includeRecipe && "Recipe",
    includeProsCons && "Pros/Cons",
    includeStepByStep && "Step-by-Step",
  ].filter(Boolean);

  return (
    <div className="h-full">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full">
        {/* ═══ LEFT PANEL: Input Configuration ═══ */}
        <div className="lg:col-span-2 space-y-5 overflow-y-auto max-h-[calc(100vh-8rem)] pr-1">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(108,76,241,0.12)", border: "1px solid rgba(108,76,241,0.25)" }}
              >
                <PenTool className="w-4.5 h-4.5" style={{ color: "var(--brand-primary)" }} />
              </div>
              <div>
                <h1 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                  Article Generator
                </h1>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  AI-powered SEO content engine
                </p>
              </div>
            </div>
          </div>

          {/* Keyword Input — Primary CTA area */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
          >
            <Label htmlFor="keyword" className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "var(--text-muted)" }}>
              Target Keyword *
            </Label>
            <Input
              id="keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g., best coffee makers 2025"
              className="h-11 text-sm"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleGenerate()}
            />
            {keyword && (
              <div className="mt-2.5 flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                <Zap className="w-3 h-3" style={{ color: "var(--brand-primary)" }} />
                <span>AI will research, outline, and write a full {parseInt(wordCount).toLocaleString()}-word article</span>
              </div>
            )}
          </div>

          {/* Article Settings */}
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Article Settings
            </h2>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Language</Label>
                <Select value={language} onValueChange={(v) => v && setLanguage(v)}>
                  <SelectTrigger className="h-9 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Tone</Label>
                <Select value={tone} onValueChange={(v) => v && setTone(v)}>
                  <SelectTrigger className="h-9 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Type</Label>
                <Select value={articleType} onValueChange={(v) => v && setArticleType(v)}>
                  <SelectTrigger className="h-9 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ARTICLE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Word Count</Label>
                <Select value={wordCount} onValueChange={(v) => v && setWordCount(v)}>
                  <SelectTrigger className="h-9 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="500">500 words</SelectItem>
                    <SelectItem value="1000">1,000 words</SelectItem>
                    <SelectItem value="1500">1,500 words</SelectItem>
                    <SelectItem value="2000">2,000 words</SelectItem>
                    <SelectItem value="3000">3,000 words</SelectItem>
                    <SelectItem value="4000">4,000 words</SelectItem>
                    <SelectItem value="5000">5,000 words</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Niche</Label>
                <Input
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="e.g., tech, health"
                  className="h-9 text-xs"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}
                />
              </div>

              <div>
                <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Labels</Label>
                <Input
                  value={labelsInput}
                  onChange={(e) => setLabelsInput(e.target.value)}
                  placeholder="coffee, reviews"
                  className="h-9 text-xs"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}
                />
              </div>

              {brandProfiles.length > 0 && (
                <div>
                  <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Brand Voice</Label>
                  <Select value={selectedBrandId} onValueChange={(v) => v && handleBrandSelect(v)}>
                    <SelectTrigger className="h-9 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Brand Voice</SelectItem>
                      {brandProfiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>{profile.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {blogs.length > 0 && (
                <div>
                  <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Target Blog</Label>
                  <Select value={selectedBlogId} onValueChange={(v) => v && setSelectedBlogId(v)}>
                    <SelectTrigger className="h-9 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}>
                      <SelectValue placeholder="Select blog" />
                    </SelectTrigger>
                    <SelectContent>
                      {blogs.map((blog) => (
                        <SelectItem key={blog.id} value={blog.id}>{blog.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Content Features */}
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Content Features
            </h2>
            
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "FAQ", value: includeFaq, setter: setIncludeFaq },
                { label: "AI Images", value: includeImages, setter: setIncludeImages },
                { label: "TOC", value: includeToc, setter: setIncludeToc },
                { label: "Int. Links", value: includeInternalLinks, setter: setIncludeInternalLinks },
                { label: "Ext. Links", value: includeExternalLinks, setter: setIncludeExternalLinks },
                { label: "Comparison", value: includeComparisonTable, setter: setIncludeComparisonTable },
                { label: "Recipe", value: includeRecipe, setter: setIncludeRecipe },
                { label: "Pros/Cons", value: includeProsCons, setter: setIncludeProsCons },
                { label: "Step Guide", value: includeStepByStep, setter: setIncludeStepByStep },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => opt.setter(!opt.value)}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all"
                  style={opt.value ? {
                    background: "rgba(108,76,241,0.12)",
                    color: "#A78BFA",
                    border: "1px solid rgba(108,76,241,0.30)",
                  } : {
                    background: "rgba(255,255,255,0.03)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div
                    className="w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0"
                    style={opt.value ? {
                      background: "var(--brand-primary)",
                    } : {
                      background: "transparent",
                      border: "1.5px solid rgba(255,255,255,0.15)",
                    }}
                  >
                    {opt.value && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  {opt.label}
                </button>
              ))}
            </div>

            {includeImages && (
              <div className="pt-1">
                <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Number of Images</Label>
                <Select value={numImages.toString()} onValueChange={(v) => v && setNumImages(parseInt(v))}>
                  <SelectTrigger className="h-9 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 (Featured only)</SelectItem>
                    <SelectItem value="2">2 (Featured + 1)</SelectItem>
                    <SelectItem value="3">3 (Featured + 2)</SelectItem>
                    <SelectItem value="4">4 (Featured + 3)</SelectItem>
                    <SelectItem value="5">5 (Featured + 4)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Publishing + Generate */}
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Publishing
            </h2>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPublishAction("draft")}
                className="p-3 rounded-xl text-center transition-all"
                style={publishAction === "draft" ? {
                  background: "rgba(108,76,241,0.10)",
                  border: "1px solid rgba(108,76,241,0.35)",
                } : {
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <FileText className="w-4 h-4 mx-auto mb-1" style={{ color: publishAction === "draft" ? "var(--brand-primary)" : "var(--text-muted)" }} />
                <p className="text-xs font-medium" style={{ color: publishAction === "draft" ? "var(--text-primary)" : "var(--text-muted)" }}>Save Draft</p>
              </button>
              <button
                onClick={() => setPublishAction("publish")}
                className="p-3 rounded-xl text-center transition-all"
                style={publishAction === "publish" ? {
                  background: "rgba(108,76,241,0.10)",
                  border: "1px solid rgba(108,76,241,0.35)",
                } : {
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <Globe className="w-4 h-4 mx-auto mb-1" style={{ color: publishAction === "publish" ? "var(--brand-primary)" : "var(--text-muted)" }} />
                <p className="text-xs font-medium" style={{ color: publishAction === "publish" ? "var(--text-primary)" : "var(--text-muted)" }}>Publish</p>
              </button>
            </div>

            {error && (
              <div className="rounded-lg p-3 flex items-start gap-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={loading || !keyword.trim()}
              className="w-full h-11 text-sm font-semibold btn-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Article
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ═══ RIGHT PANEL: Preview / AI Progress / Empty State ═══ */}
        <div className="lg:col-span-3 min-h-[500px] lg:min-h-0">
          {/* Empty state — before generation */}
          {!loading && !result && (
            <div
              className="rounded-2xl h-full flex flex-col items-center justify-center p-8 text-center"
              style={{ background: "var(--bg-card)", border: "1px dashed var(--border-glass)" }}
            >
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: "rgba(108,76,241,0.08)", border: "1px solid rgba(108,76,241,0.20)" }}
              >
                <Wand2 className="w-9 h-9" style={{ color: "var(--brand-primary)" }} />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                Your article will appear here
              </h2>
              <p className="text-sm max-w-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                Enter a keyword and configure your settings, then hit Generate. The AI will research, write, and optimize your article.
              </p>
              <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                {[
                  { icon: Brain, label: "SEO Research" },
                  { icon: PenTool, label: "Full Article" },
                  { icon: ImageIcon, label: "AI Images" },
                  { icon: BarChart3, label: "Optimization" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}
                  >
                    <item.icon className="w-3.5 h-3.5" style={{ color: "var(--brand-primary)" }} />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading state — AI Progress */}
          {loading && (
            <div
              className="rounded-2xl h-full flex flex-col items-center justify-center p-8"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
            >
              {/* Animated orb */}
              <div className="relative mb-8">
                <div
                  className="w-24 h-24 rounded-full animate-glow-pulse flex items-center justify-center"
                  style={{ background: "rgba(108,76,241,0.10)", border: "1px solid rgba(108,76,241,0.25)" }}
                >
                  <Sparkles className="w-10 h-10" style={{ color: "var(--brand-primary)" }} />
                </div>
                <div
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: "var(--brand-primary)", color: "#fff" }}
                >
                  {currentStep + 1}
                </div>
              </div>

              <h2 className="text-lg font-bold mb-1" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                AI is generating your article
              </h2>
              <p className="text-xs mb-8" style={{ color: "var(--text-muted)" }}>
                {keyword && <>Writing about <span style={{ color: "var(--brand-primary)" }}>&ldquo;{keyword}&rdquo;</span></>}
              </p>

              {/* Step progress */}
              <div className="w-full max-w-sm space-y-2">
                {AI_STEPS.map((step, i) => {
                  const StepIcon = step.icon;
                  const isActive = i === currentStep;
                  const isDone = i < currentStep;
                  return (
                    <div
                      key={step.label}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all"
                      style={{
                        background: isActive ? "rgba(108,76,241,0.10)" : "transparent",
                        border: isActive ? "1px solid rgba(108,76,241,0.25)" : "1px solid transparent",
                        opacity: isDone ? 0.5 : isActive ? 1 : 0.3,
                      }}
                    >
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                        background: isDone ? "rgba(34,197,94,0.12)" : isActive ? "rgba(108,76,241,0.15)" : "rgba(255,255,255,0.04)",
                      }}>
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        ) : isActive ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--brand-primary)" }} />
                        ) : (
                          <StepIcon className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                        )}
                      </div>
                      <span className="text-xs font-medium" style={{ color: isActive ? "var(--text-primary)" : isDone ? "var(--text-muted)" : "var(--text-muted)" }}>
                        {step.label}
                      </span>
                      {isActive && (
                        <span className="ml-auto text-[10px] font-medium animate-pulse" style={{ color: "var(--brand-primary)" }}>
                          In progress...
                        </span>
                      )}
                      {isDone && (
                        <span className="ml-auto text-[10px]" style={{ color: "#22C55E" }}>Done</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Feature summary */}
              {enabledFeatures.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-1.5 justify-center">
                  {enabledFeatures.map((f) => (
                    <span
                      key={f as string}
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(108,76,241,0.08)", color: "var(--brand-primary)", border: "1px solid rgba(108,76,241,0.20)" }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Success state — Result */}
          {!loading && result && (
            <div className="rounded-2xl h-full flex flex-col overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
              {/* Header bar */}
              <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={result.publishedToBlogger ? {
                      background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)"
                    } : {
                      background: "rgba(108,76,241,0.12)", border: "1px solid rgba(108,76,241,0.25)"
                    }}
                  >
                    {result.publishedToBlogger ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <FileText className="w-4 h-4" style={{ color: "var(--brand-primary)" }} />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                      {result.publishedToBlogger ? "Published!" : "Article Ready"}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {result.article.wordCount?.toLocaleString()} words
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)", color: "var(--text-secondary)" }}
                  >
                    <Eye className="w-3 h-3" />
                    {showPreview ? "Hide Preview" : "Preview"}
                  </button>
                  <a href="/dashboard/articles" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)", color: "var(--text-secondary)" }}>
                    <ExternalLink className="w-3 h-3" />
                    Articles
                  </a>
                </div>
              </div>

              {/* Result content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {result.publishError && (
                  <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
                    <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-yellow-400">Publishing Issue</p>
                      <p className="text-[11px] text-yellow-300/80 mt-0.5">{result.publishError}</p>
                    </div>
                  </div>
                )}

                {/* Article info card */}
                <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)" }}>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{result.article.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
                      background: result.article.status === "published" ? "rgba(34,197,94,0.12)" : "rgba(108,76,241,0.10)",
                      color: result.article.status === "published" ? "#22C55E" : "var(--brand-primary)",
                      border: `1px solid ${result.article.status === "published" ? "rgba(34,197,94,0.25)" : "rgba(108,76,241,0.20)"}`,
                    }}>
                      {result.article.status}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }}>
                      {result.article.wordCount?.toLocaleString()} words
                    </span>
                    {result.image?.url && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(0,194,255,0.08)", color: "#00C2FF", border: "1px solid rgba(0,194,255,0.20)" }}>
                        Featured image
                      </span>
                    )}
                  </div>
                </div>

                {/* Preview */}
                {showPreview && result.article.content && (
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-subtle)" }}>
                    <div className="px-4 py-2" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--border-subtle)" }}>
                      <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>ARTICLE PREVIEW</p>
                    </div>
                    <div
                      className="p-4 max-h-[400px] overflow-y-auto article-preview text-xs"
                      dangerouslySetInnerHTML={{ __html: result.article.content }}
                    />
                  </div>
                )}

                {/* Meta info */}
                {result.meta && (
                  <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Meta Description</p>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{result.meta.metaDescription}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = `/dashboard/articles/${result.article.id}`}
                    className="flex-1 h-9 text-xs btn-ghost"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    Edit Article
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleReset}
                    className="flex-1 h-9 text-xs btn-primary"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Write Another
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
