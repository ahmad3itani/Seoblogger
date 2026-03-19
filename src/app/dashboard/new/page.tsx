"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/supabase/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadBrandProfiles();
      loadBlogs();
    }
  }, [user]);

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
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-[#F97316]" />
            Article Generator
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Generate SEO-optimized articles with all features in one click
          </p>
        </div>

        {!result ? (
          <div className="space-y-6">
            {/* Main Settings */}
            <div className="rounded-xl bg-card border border-border/50 p-6 space-y-5">
              <h2 className="text-lg font-semibold">Article Settings</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <Label htmlFor="keyword">Keyword / Topic *</Label>
                  <Input
                    id="keyword"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="e.g., best coffee makers 2024"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select value={language} onValueChange={(v) => v && setLanguage(v)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tone">Tone</Label>
                  <Select value={tone} onValueChange={(v) => v && setTone(v)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="articleType">Article Type</Label>
                  <Select value={articleType} onValueChange={(v) => v && setArticleType(v)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ARTICLE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="wordCount">Word Count</Label>
                  <Select value={wordCount} onValueChange={(v) => v && setWordCount(v)}>
                    <SelectTrigger className="mt-1.5">
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
                  <Label htmlFor="niche">Niche (Optional)</Label>
                  <Input
                    id="niche"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="e.g., tech, health, finance"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="labels">Labels (comma-separated)</Label>
                  <Input
                    id="labels"
                    value={labelsInput}
                    onChange={(e) => setLabelsInput(e.target.value)}
                    placeholder="e.g., coffee, reviews, kitchen"
                    className="mt-1.5"
                  />
                </div>

                {brandProfiles.length > 0 && (
                  <div>
                    <Label htmlFor="brand">Brand Voice</Label>
                    <Select value={selectedBrandId} onValueChange={(v) => v && handleBrandSelect(v)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Brand Voice</SelectItem>
                        {brandProfiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {blogs.length > 0 && (
                  <div>
                    <Label htmlFor="blog">Target Blog</Label>
                    <Select value={selectedBlogId} onValueChange={(v) => v && setSelectedBlogId(v)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select blog" />
                      </SelectTrigger>
                      <SelectContent>
                        {blogs.map((blog) => (
                          <SelectItem key={blog.id} value={blog.id}>
                            {blog.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Content Features */}
            <div className="rounded-xl bg-card border border-border/50 p-6 space-y-5">
              <h2 className="text-lg font-semibold">Content Features</h2>
              
              <div className="flex flex-wrap gap-3">
                {[
                  { label: "FAQ Section", value: includeFaq, setter: setIncludeFaq },
                  { label: "AI Images", value: includeImages, setter: setIncludeImages },
                  { label: "Table of Contents", value: includeToc, setter: setIncludeToc },
                  { label: "Internal Links", value: includeInternalLinks, setter: setIncludeInternalLinks },
                  { label: "External Links", value: includeExternalLinks, setter: setIncludeExternalLinks },
                  { label: "Comparison Table", value: includeComparisonTable, setter: setIncludeComparisonTable },
                  { label: "Recipe Format", value: includeRecipe, setter: setIncludeRecipe },
                  { label: "Pros & Cons", value: includeProsCons, setter: setIncludeProsCons },
                  { label: "Step-by-Step", value: includeStepByStep, setter: setIncludeStepByStep },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => opt.setter(!opt.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                      opt.value
                        ? "bg-[#F97316]/20 text-orange-300 border border-[#F97316]/30"
                        : "bg-muted/20 text-muted-foreground border border-border/50"
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 ${opt.value ? "opacity-100" : "opacity-0"}`} />
                    {opt.label}
                  </button>
                ))}
              </div>

              {includeImages && (
                <div>
                  <Label htmlFor="numImages">Number of Images</Label>
                  <Select value={numImages.toString()} onValueChange={(v) => v && setNumImages(parseInt(v))}>
                    <SelectTrigger className="mt-1.5 max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Image (Featured)</SelectItem>
                      <SelectItem value="2">2 Images (Featured + 1 Inline)</SelectItem>
                      <SelectItem value="3">3 Images (Featured + 2 Inline)</SelectItem>
                      <SelectItem value="4">4 Images (Featured + 3 Inline)</SelectItem>
                      <SelectItem value="5">5 Images (Featured + 4 Inline)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Publishing Options */}
            <div className="rounded-xl bg-card border border-border/50 p-6 space-y-5">
              <h2 className="text-lg font-semibold">Publishing</h2>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPublishAction("draft")}
                  className={`p-4 rounded-lg border text-center ${
                    publishAction === "draft"
                      ? "border-[#F97316] bg-[#F97316]/10"
                      : "border-border/30 bg-muted/20"
                  }`}
                >
                  <FileText className="w-5 h-5 mx-auto mb-1.5 text-[#F97316]" />
                  <p className="text-sm font-medium">Save as Draft</p>
                </button>
                <button
                  onClick={() => setPublishAction("publish")}
                  className={`p-4 rounded-lg border text-center ${
                    publishAction === "publish"
                      ? "border-[#F97316] bg-[#F97316]/10"
                      : "border-border/30 bg-muted/20"
                  }`}
                >
                  <Globe className="w-5 h-5 mx-auto mb-1.5 text-[#F97316]" />
                  <p className="text-sm font-medium">Publish to Blogger</p>
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-[#F97316] hover:bg-[#F97316]/90 h-12 text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  {progress || "Generating..."}
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Article
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Success State */}
            <div className="rounded-xl bg-card border border-border/50 p-6 text-center space-y-4">
              <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
                result.publishedToBlogger ? "bg-green-500/15" : result.publishError ? "bg-yellow-500/15" : "bg-green-500/15"
              }`}>
                <CheckCircle2 className={`w-8 h-8 ${
                  result.publishedToBlogger ? "text-green-500" : result.publishError ? "text-yellow-500" : "text-green-500"
                }`} />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold">
                  {result.publishedToBlogger ? "Published to Blogger!" : "Article Generated!"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.publishedToBlogger
                    ? "Your article is now live on your Blogger blog."
                    : "Your article has been saved successfully."}
                </p>
              </div>

              {result.publishError && (
                <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-4 text-left">
                  <p className="text-sm font-medium text-yellow-400">Publishing Issue</p>
                  <p className="text-xs text-yellow-300/80 mt-1">{result.publishError}</p>
                </div>
              )}

              <div className="rounded-lg bg-muted/20 border border-border/30 p-4 text-left">
                <p className="text-sm font-medium">{result.article.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.article.wordCount?.toLocaleString()} words • {result.article.status}
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => window.location.href = "/dashboard/articles"}>
                  <FileText className="w-4 h-4 mr-2" />
                  View Articles
                </Button>
                <Button onClick={handleReset} className="bg-[#F97316] hover:bg-[#F97316]/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Write Another
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
