"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
    Image,
    Eye,
    Send,
    Tag,
    RefreshCw,
    Megaphone,
    Plus,
    Trash2,
    GripVertical,
    ChevronUp,
    ChevronDown,
    Edit3,
    MessageSquare,
    Code,
} from "lucide-react";

interface BrandProfile {
    id: string;
    name: string;
    tone: string;
    style?: string;
    niche?: string;
    language: string;
    targetAudience?: string;
    instructions?: string;
    isDefault: boolean;
}

const STEPS = [
    { id: 1, label: "Keyword", icon: FileText },
    { id: 2, label: "Titles", icon: ListChecks },
    { id: 3, label: "Outline", icon: ListChecks },
    { id: 4, label: "Article", icon: PenTool },
    { id: 5, label: "FAQs & Meta", icon: MessageSquare },
    { id: 6, label: "Image", icon: Image },
    { id: 7, label: "Preview", icon: Eye },
    { id: 8, label: "Publish", icon: Send },
];

const ARTICLE_TYPES = [
    { value: "how-to", label: "How-To Guide" },
    { value: "listicle", label: "Listicle" },
    { value: "comparison", label: "Comparison" },
    { value: "review", label: "Product Review" },
    { value: "informational", label: "Informational" },
    { value: "qa", label: "Q&A Article" },
    { value: "affiliate", label: "Affiliate Post" },
    { value: "recipe", label: "Recipe Post" },
    { value: "tutorial", label: "Tutorial" },
    { value: "local-seo", label: "Local Service Page" },
];

const TONES = [
    "professional",
    "casual",
    "expert",
    "friendly",
    "authoritative",
    "conversational",
];

const LANGUAGES = [
    { value: "en", label: "English" },
    { value: "ar", label: "Arabic" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
    { value: "pt", label: "Portuguese" },
    { value: "tr", label: "Turkish" },
    { value: "id", label: "Indonesian" },
    { value: "hi", label: "Hindi" },
];

export default function NewArticlePage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="w-6 h-6 border-2 border-[#FF6600] border-t-transparent rounded-full animate-spin" /></div>}>
            <NewArticleContent />
        </Suspense>
    );
}

function NewArticleContent() {
    const searchParams = useSearchParams();
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Form state
    const [keyword, setKeyword] = useState("");
    const [language, setLanguage] = useState("en");
    const [tone, setTone] = useState("professional");
    const [articleType, setArticleType] = useState("informational");
    const [wordCount, setWordCount] = useState("2000");
    const [niche, setNiche] = useState("");
    const [includeFaq, setIncludeFaq] = useState(true);
    const [includeImages, setIncludeImages] = useState(true);
    const [numInlineImages, setNumInlineImages] = useState(3);
    const [includeToc, setIncludeToc] = useState(true);
    const [includeInternalLinks, setIncludeInternalLinks] = useState(true);
    const [includeExternalLinks, setIncludeExternalLinks] = useState(true);
    const [includeComparisonTable, setIncludeComparisonTable] = useState(false);
    const [includeRecipe, setIncludeRecipe] = useState(false);
    const [includeProsCons, setIncludeProsCons] = useState(false);
    const [includeStepByStep, setIncludeStepByStep] = useState(false);
    const [affiliateLinks, setAffiliateLinks] = useState("");
    const [competitorUrl, setCompetitorUrl] = useState("");
    const [competitorData, setCompetitorData] = useState<any>(null);
    const [savedArticleId, setSavedArticleId] = useState<string | null>(null);

    const [brandProfiles, setBrandProfiles] = useState<BrandProfile[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<string>("none");
    const [autoGenerateTriggered, setAutoGenerateTriggered] = useState(false);

    // Generation results
    const [titles, setTitles] = useState<string[]>([]);
    const [selectedTitle, setSelectedTitle] = useState("");
    const [outline, setOutline] = useState<any>(null);
    const [article, setArticle] = useState("");
    const [faqs, setFaqs] = useState<Array<{ question: string; answer: string }>>([]);
    const [meta, setMeta] = useState<{ metaDescription: string; excerpt: string } | null>(null);
    const [image, setImage] = useState<{ url: string; altText: string } | null>(null);
    const [labelsInput, setLabelsInput] = useState("");
    const [publishAction, setPublishAction] = useState("draft");

    // Editing states
    const [editingTitleIdx, setEditingTitleIdx] = useState<number | null>(null);
    const [editingOutlineIdx, setEditingOutlineIdx] = useState<number | null>(null);
    const [articleEditMode, setArticleEditMode] = useState<"preview" | "html">("preview");

    // Handle URL parameters from keyword research
    useEffect(() => {
        const keywordParam = searchParams.get("keyword");
        const autoGenerate = searchParams.get("autoGenerate");

        if (keywordParam) {
            setKeyword(keywordParam);
            console.log(`📝 Auto-filled keyword from URL: "${keywordParam}"`);

            // If autoGenerate is true, trigger generation after a short delay
            if (autoGenerate === "true" && !autoGenerateTriggered) {
                setAutoGenerateTriggered(true);
                console.log("🚀 Auto-generation triggered from keyword research");
                // Will trigger generation after brand profiles are loaded
            }
        }
    }, [searchParams, autoGenerateTriggered]);

    useEffect(() => {
        const fetchProfiles = async () => {
            try {
                const res = await fetch("/api/brand-voices");
                if (res.ok) {
                    const data: BrandProfile[] = await res.json();
                    setBrandProfiles(data);
                    const defaultProfile = data.find((p) => p.isDefault);
                    if (defaultProfile) {
                        handleBrandProfileSelect(defaultProfile.id, data);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch brand profiles:", error);
            }
        };
        fetchProfiles();
    }, []);

    // Auto-generate article when triggered from keyword research
    useEffect(() => {
        if (autoGenerateTriggered && keyword && !isLoading) {
            if (currentStep === 1) {
                console.log("🎯 Step 1: Starting title generation for keyword:", keyword);
                setTimeout(() => {
                    handleGenerateTitles();
                }, 500);
            } else if (currentStep === 2 && titles.length > 0 && selectedTitle) {
                console.log("🎯 Step 2: Auto-generating outline...");
                setTimeout(() => {
                    handleGenerateOutline();
                }, 1000);
            } else if (currentStep === 3 && outline) {
                console.log("🎯 Step 3: Auto-generating article...");
                setTimeout(() => {
                    handleGenerateArticle();
                }, 1000);
            }
        }
    }, [autoGenerateTriggered, keyword, isLoading, currentStep, titles, selectedTitle, outline]);

    const handleBrandProfileSelect = (id: string, profilesList = brandProfiles) => {
        setSelectedProfileId(id);
        const profile = profilesList.find(p => p.id === id);
        if (profile) {
            setTone(profile.tone);
            if (profile.language) setLanguage(profile.language);
            if (profile.niche) setNiche(profile.niche);
        }
    };

    const getBrandVoice = useCallback(() => {
        if (selectedProfileId === "none") return undefined;
        return brandProfiles.find(p => p.id === selectedProfileId)?.instructions;
    }, [selectedProfileId, brandProfiles]);

    // ─── TITLE GENERATION ────────────────────────────────────────────
    const handleGenerateTitles = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    keyword, language, tone, articleType,
                    wordCount: parseInt(wordCount), niche,
                    brandVoice: getBrandVoice(),
                    step: "titles",
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            if (data.titles) {
                setTitles(data.titles);
                setSelectedTitle(data.titles[0] || "");
                setCurrentStep(2);
            }
        } catch (error) {
            alert("Generation failed: " + (error as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    // ─── OUTLINE GENERATION ──────────────────────────────────────────
    const handleGenerateOutline = async () => {
        setIsLoading(true);
        try {
            let scrapedData = competitorData;
            if (competitorUrl && !scrapedData) {
                try {
                    const scrapeRes = await fetch("/api/scrape", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ url: competitorUrl }),
                    });
                    if (scrapeRes.ok) {
                        scrapedData = await scrapeRes.json();
                        setCompetitorData(scrapedData);
                    }
                } catch (err) {
                    console.error("Failed to scrape competitor", err);
                }
            }
            const res = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    keyword, language, tone, articleType,
                    wordCount: parseInt(wordCount), niche,
                    brandVoice: getBrandVoice(),
                    selectedTitle, competitorData: scrapedData,
                    step: "outline",
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            if (data.outline) {
                setOutline(data.outline);
                if (data.outline.suggestedLabels) {
                    setLabelsInput(data.outline.suggestedLabels.join(", "));
                }
                setCurrentStep(3);
            }
        } catch (error) {
            alert("Generation failed: " + (error as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    // ─── ARTICLE GENERATION ──────────────────────────────────────────
    const handleGenerateArticle = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    keyword, language, tone, articleType,
                    wordCount: parseInt(wordCount), niche,
                    brandVoice: getBrandVoice(),
                    selectedTitle, outline, includeFaq, includeImages,
                    numInlineImages,
                    includeToc,
                    includeInternalLinks,
                    includeExternalLinks,
                    includeComparisonTable,
                    includeRecipe,
                    includeProsCons,
                    includeStepByStep,
                    affiliateLinks: affiliateLinks.split("\n").map(l => l.trim()).filter(Boolean),
                    labels: labelsInput.split(",").map(l => l.trim()).filter(Boolean),
                    step: "article",
                }),
            });
            const textResponse = await res.text();
            let data;
            try { data = JSON.parse(textResponse); } catch {
                throw new Error("Server returned invalid response.");
            }
            if (!res.ok) throw new Error(data.error || "Failed");
            if (data.article) {
                setArticle(data.article);
                if (data.faqs) setFaqs(data.faqs);
                if (data.meta) setMeta(data.meta);
                if (data.image) setImage(data.image);
                if (data.savedArticle?.id) setSavedArticleId(data.savedArticle.id);
                setCurrentStep(4);
            }
        } catch (error) {
            alert("Generation failed: " + (error as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    // ─── PUBLISH ─────────────────────────────────────────────────────
    const handlePublish = async () => {
        if (!savedArticleId) return;
        setIsLoading(true);
        try {
            const res = await fetch("/api/publish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ articleId: savedArticleId, action: publishAction }),
            });
            if (res.ok) {
                setCurrentStep(8);
            } else {
                const error = await res.json();
                throw new Error(error.error || "Failed to publish");
            }
        } catch (error) {
            alert("Publishing failed: " + (error as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    // ─── OUTLINE EDITING HELPERS ─────────────────────────────────────
    const updateSection = (idx: number, field: string, value: any) => {
        const newSections = [...(outline?.sections || [])];
        newSections[idx] = { ...newSections[idx], [field]: value };
        setOutline({ ...outline, sections: newSections });
    };

    const removeSection = (idx: number) => {
        const newSections = [...(outline?.sections || [])];
        newSections.splice(idx, 1);
        setOutline({ ...outline, sections: newSections });
    };

    const moveSection = (idx: number, dir: "up" | "down") => {
        const newSections = [...(outline?.sections || [])];
        const target = dir === "up" ? idx - 1 : idx + 1;
        if (target < 0 || target >= newSections.length) return;
        [newSections[idx], newSections[target]] = [newSections[target], newSections[idx]];
        setOutline({ ...outline, sections: newSections });
    };

    const addSection = () => {
        const newSections = [...(outline?.sections || [])];
        newSections.push({ heading: "New Section", level: 2, points: ["Point 1"], wordCount: 200 });
        setOutline({ ...outline, sections: newSections });
    };

    const updatePoint = (sIdx: number, pIdx: number, value: string) => {
        const newSections = [...(outline?.sections || [])];
        const points = [...(newSections[sIdx].points || [])];
        points[pIdx] = value;
        newSections[sIdx] = { ...newSections[sIdx], points };
        setOutline({ ...outline, sections: newSections });
    };

    const removePoint = (sIdx: number, pIdx: number) => {
        const newSections = [...(outline?.sections || [])];
        const points = [...(newSections[sIdx].points || [])];
        points.splice(pIdx, 1);
        newSections[sIdx] = { ...newSections[sIdx], points };
        setOutline({ ...outline, sections: newSections });
    };

    const addPoint = (sIdx: number) => {
        const newSections = [...(outline?.sections || [])];
        const points = [...(newSections[sIdx].points || []), "New point"];
        newSections[sIdx] = { ...newSections[sIdx], points };
        setOutline({ ...outline, sections: newSections });
    };

    // ─── FAQ EDITING HELPERS ─────────────────────────────────────────
    const updateFaq = (idx: number, field: "question" | "answer", value: string) => {
        const newFaqs = [...faqs];
        newFaqs[idx] = { ...newFaqs[idx], [field]: value };
        setFaqs(newFaqs);
    };

    const removeFaq = (idx: number) => {
        const newFaqs = [...faqs];
        newFaqs.splice(idx, 1);
        setFaqs(newFaqs);
    };

    const addFaq = () => {
        setFaqs([...faqs, { question: "New question?", answer: "Answer here." }]);
    };

    // ─── RENDER STEPS ────────────────────────────────────────────────
    const renderStep = () => {
        switch (currentStep) {
            // ════════════════════════════════════════════════════════════
            // STEP 1: KEYWORD & SETTINGS
            // ════════════════════════════════════════════════════════════
            case 1:
                return (
                    <div className="space-y-6 animate-slide-up opacity-0 stagger-1">
                        <div>
                            <h2 className="text-xl font-bold mb-1">Enter Your Keyword</h2>
                            <p className="text-sm text-muted-foreground">
                                Tell us what you want to write about and set your preferences.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4 md:col-span-2">
                                <div>
                                    <Label htmlFor="keyword">Main Keyword *</Label>
                                    <Input
                                        id="keyword"
                                        placeholder="e.g., best protein powder, sourdough bread recipe, iPhone 16 review"
                                        className="mt-1.5 bg-muted/30 border-border/50 h-11"
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label>Article Type</Label>
                                <Select value={articleType} onValueChange={(v) => v && setArticleType(v)}>
                                    <SelectTrigger className="mt-1.5 bg-muted/30 border-border/50">
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
                                <Label>Language</Label>
                                <Select value={language} onValueChange={(v) => v && setLanguage(v)}>
                                    <SelectTrigger className="mt-1.5 bg-muted/30 border-border/50">
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
                                <Label className="flex items-center gap-1.5">
                                    Brand Voice
                                    <Megaphone className="w-3.5 h-3.5 text-[#FF6600]" />
                                </Label>
                                <Select value={selectedProfileId} onValueChange={(v) => v && handleBrandProfileSelect(v)}>
                                    <SelectTrigger className="mt-1.5 bg-[#FF6600]/5 border-[#FF6600]/20 text-violet-100">
                                        <SelectValue placeholder="Select a voice..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None (Default AI)</SelectItem>
                                        {brandProfiles.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Tone</Label>
                                <Select value={tone} onValueChange={(v) => v && setTone(v)}>
                                    <SelectTrigger className="mt-1.5 bg-muted/30 border-border/50">
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
                                <Label>Word Count</Label>
                                <Select value={wordCount} onValueChange={(v) => v && setWordCount(v)}>
                                    <SelectTrigger className="mt-1.5 bg-muted/30 border-border/50">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {["1000", "1500", "2000", "2500", "3000", "4000"].map((wc) => (
                                            <SelectItem key={wc} value={wc}>{wc} words</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="md:col-span-2">
                                <Label htmlFor="niche">Niche / Topic Area (optional)</Label>
                                <Input
                                    id="niche"
                                    placeholder="e.g., fitness, cooking, technology, finance"
                                    className="mt-1.5 bg-muted/30 border-border/50"
                                    value={niche}
                                    onChange={(e) => setNiche(e.target.value)}
                                />
                            </div>

                            {articleType === "affiliate" && (
                                <div className="md:col-span-2 space-y-2 animate-in fade-in zoom-in duration-300">
                                    <Label className="flex items-center gap-1.5 text-emerald-500 font-semibold">
                                        <Tag className="w-4 h-4" />
                                        Affiliate Links / Products
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        One per line. The AI will embed them naturally.
                                    </p>
                                    <Textarea
                                        placeholder={"https://amazon.com/dp/B08XJG8KVG\nhttps://shareasale.com/r.cfm?b=123\nProduct Name"}
                                        className="h-24 bg-emerald-500/5 border-emerald-500/20 focus-visible:ring-emerald-500"
                                        value={affiliateLinks}
                                        onChange={(e) => setAffiliateLinks(e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="md:col-span-2">
                                <Label htmlFor="competitorUrl" className="flex items-center gap-1.5 text-blue-500 font-semibold">
                                    Competitor URL (Optional)
                                </Label>
                                <p className="text-xs text-muted-foreground mt-1 mb-1.5">
                                    Top-ranking article URL. We'll reverse-engineer a superior outline.
                                </p>
                                <Input
                                    id="competitorUrl"
                                    placeholder="https://competitor-blog.com/their-article"
                                    className="bg-blue-500/5 border-blue-500/20 focus-visible:ring-blue-500"
                                    value={competitorUrl}
                                    onChange={(e) => setCompetitorUrl(e.target.value)}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <Label className="text-sm font-medium mb-3 block">Content Features</Label>
                                <div className="flex flex-wrap gap-3">
                                    {[
                                        { label: "Include FAQ", value: includeFaq, setter: setIncludeFaq },
                                        { label: "Generate Image", value: includeImages, setter: setIncludeImages },
                                        { label: "Table of Contents", value: includeToc, setter: setIncludeToc },
                                        { label: "Internal Links", value: includeInternalLinks, setter: setIncludeInternalLinks },
                                        { label: "External Links", value: includeExternalLinks, setter: setIncludeExternalLinks },
                                        { label: "Comparison Table", value: includeComparisonTable, setter: setIncludeComparisonTable },
                                        { label: "Recipe Format", value: includeRecipe, setter: setIncludeRecipe },
                                        { label: "Pros & Cons", value: includeProsCons, setter: setIncludeProsCons },
                                        { label: "Step-by-Step Guide", value: includeStepByStep, setter: setIncludeStepByStep },
                                    ].map((opt) => (
                                        <button
                                            key={opt.label}
                                            onClick={() => opt.setter(!opt.value)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${opt.value
                                                    ? "bg-orange-500/20 text-violet-300 border border-[#FF6600]/30"
                                                    : "bg-muted/20 text-muted-foreground border border-border/50"
                                                }`}
                                        >
                                            <Check className={`w-3.5 h-3.5 ${opt.value ? "opacity-100" : "opacity-0"}`} />
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {includeImages && (
                                <div className="md:col-span-2">
                                    <Label htmlFor="numImages" className="text-sm font-medium mb-2 block">
                                        Number of Inline Images (Featured + Article Images)
                                    </Label>
                                    <Select value={numInlineImages.toString()} onValueChange={(v) => v && setNumInlineImages(parseInt(v))}>
                                        <SelectTrigger className="mt-1.5 bg-muted/30 border-border/50">
                                            <SelectValue placeholder="Select number of images" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="2">2 Images (1 Featured + 1 Inline)</SelectItem>
                                            <SelectItem value="3">3 Images (1 Featured + 2 Inline)</SelectItem>
                                            <SelectItem value="4">4 Images (1 Featured + 3 Inline)</SelectItem>
                                            <SelectItem value="5">5 Images (1 Featured + 4 Inline)</SelectItem>
                                            <SelectItem value="6">6 Images (1 Featured + 5 Inline)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground mt-1.5">
                                        Featured image is always included. Inline images are distributed throughout the article.
                                    </p>
                                </div>
                            )}
                        </div>

                        <Button
                            className="glow-button text-white border-0 px-8 h-11"
                            disabled={!keyword.trim() || isLoading}
                            onClick={handleGenerateTitles}
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                            {isLoading ? "Generating Titles... (est. 5s)" : "Generate Titles"}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                );

            // ════════════════════════════════════════════════════════════
            // STEP 2: TITLES — Select, Edit Inline, or Write Custom
            // ════════════════════════════════════════════════════════════
            case 2:
                return (
                    <div className="space-y-6 animate-slide-up opacity-0 stagger-1">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold mb-1">Choose & Edit Your Title</h2>
                                <p className="text-sm text-muted-foreground">
                                    Click a title to select it. Click the edit icon to change it. Or write your own.
                                </p>
                            </div>
                            <Button variant="outline" size="sm" className="glass-card" onClick={handleGenerateTitles} disabled={isLoading}>
                                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
                                Regenerate
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {titles.map((title, i) => (
                                <div
                                    key={i}
                                    onClick={() => { setSelectedTitle(title); setEditingTitleIdx(null); }}
                                    className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-200 ${selectedTitle === title
                                            ? "bg-[#FF6600]/15 border-2 border-[#FF6600]/40"
                                            : "glass-card hover:bg-muted/20 border-2 border-transparent"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${selectedTitle === title ? "bg-[#FF6600] text-white" : "bg-muted/50 text-muted-foreground"
                                            }`}>
                                            {selectedTitle === title ? <Check className="w-3.5 h-3.5" /> : <span className="text-xs">{i + 1}</span>}
                                        </div>

                                        {editingTitleIdx === i ? (
                                            <Input
                                                autoFocus
                                                className="flex-1 bg-muted/30 border-border/50 text-sm"
                                                value={titles[i]}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => {
                                                    const newTitles = [...titles];
                                                    newTitles[i] = e.target.value;
                                                    setTitles(newTitles);
                                                    setSelectedTitle(e.target.value);
                                                }}
                                                onBlur={() => setEditingTitleIdx(null)}
                                                onKeyDown={(e) => { if (e.key === "Enter") setEditingTitleIdx(null); }}
                                            />
                                        ) : (
                                            <span className="flex-1 text-sm font-medium">{title}</span>
                                        )}

                                        <button
                                            onClick={(e) => { e.stopPropagation(); setEditingTitleIdx(i); setSelectedTitle(titles[i]); }}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-muted/30 transition-all"
                                        >
                                            <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                                        </button>
                                    </div>
                                    <div className="ml-9 mt-1 text-xs text-muted-foreground/60">
                                        {title.length} chars {title.length > 60 ? "(long — consider shortening)" : title.length < 30 ? "(short — consider expanding)" : ""}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="glass-card rounded-xl p-4">
                            <Label htmlFor="custom-title" className="text-xs text-[#FF6600] mb-2 block">Custom Title</Label>
                            <Input
                                id="custom-title"
                                className="bg-muted/30 border-border/50"
                                placeholder="Write your own title..."
                                value={selectedTitle}
                                onChange={(e) => setSelectedTitle(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1.5">{selectedTitle.length}/60 characters</p>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" className="glass-card" onClick={() => setCurrentStep(1)}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back
                            </Button>
                            <Button
                                className="glow-button text-white border-0 px-8"
                                disabled={!selectedTitle.trim() || isLoading}
                                onClick={handleGenerateOutline}
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                {isLoading ? "Creating Outline... (est. 10s)" : "Generate Outline"}
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                );

            // ════════════════════════════════════════════════════════════
            // STEP 3: OUTLINE — Full Editing (add/remove/reorder/edit)
            // ════════════════════════════════════════════════════════════
            case 3:
                return (
                    <div className="space-y-6 animate-slide-up opacity-0 stagger-1">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold mb-1">Edit Your Outline</h2>
                                <p className="text-sm text-muted-foreground">
                                    Add, remove, reorder sections and edit every point before generating.
                                </p>
                            </div>
                            <Button variant="outline" size="sm" className="glass-card" onClick={handleGenerateOutline} disabled={isLoading}>
                                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
                                Regenerate
                            </Button>
                        </div>

                        <div className="glass-card rounded-xl p-4">
                            <Label className="text-xs text-[#FF6600] mb-2 block">Article Title</Label>
                            <Input
                                className="bg-muted/30 border-border/50 font-semibold"
                                value={selectedTitle}
                                onChange={(e) => setSelectedTitle(e.target.value)}
                            />
                        </div>

                        {outline && outline.sections && (
                            <div className="space-y-3">
                                {outline.sections.map((section: any, i: number) => (
                                    <div key={i} className="glass-card rounded-xl p-4 group">
                                        <div className="flex items-start gap-2">
                                            <div className="flex flex-col gap-0.5 mt-1">
                                                <button onClick={() => moveSection(i, "up")} disabled={i === 0}
                                                    className="p-0.5 rounded hover:bg-muted/30 disabled:opacity-20 transition-all">
                                                    <ChevronUp className="w-3.5 h-3.5" />
                                                </button>
                                                <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 mx-auto" />
                                                <button onClick={() => moveSection(i, "down")} disabled={i === outline.sections.length - 1}
                                                    className="p-0.5 rounded hover:bg-muted/30 disabled:opacity-20 transition-all">
                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge variant="secondary" className="text-[10px] shrink-0">
                                                        H{section.level || 2}
                                                    </Badge>
                                                    <Select
                                                        value={String(section.level || 2)}
                                                        onValueChange={(v) => v && updateSection(i, "level", parseInt(v))}
                                                    >
                                                        <SelectTrigger className="w-16 h-6 text-[10px] bg-muted/30 border-border/50">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="2">H2</SelectItem>
                                                            <SelectItem value="3">H3</SelectItem>
                                                            <SelectItem value="4">H4</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    {editingOutlineIdx === i ? (
                                                        <Input
                                                            autoFocus
                                                            className="flex-1 h-8 text-sm bg-muted/30 border-border/50"
                                                            value={section.heading}
                                                            onChange={(e) => updateSection(i, "heading", e.target.value)}
                                                            onBlur={() => setEditingOutlineIdx(null)}
                                                            onKeyDown={(e) => { if (e.key === "Enter") setEditingOutlineIdx(null); }}
                                                        />
                                                    ) : (
                                                        <span
                                                            className="flex-1 text-sm font-medium cursor-pointer hover:text-[#FF6600] transition-colors"
                                                            onClick={() => setEditingOutlineIdx(i)}
                                                        >
                                                            {section.heading}
                                                        </span>
                                                    )}
                                                </div>

                                                {section.points && (
                                                    <div className="space-y-1.5 ml-1">
                                                        {section.points.map((point: string, j: number) => (
                                                            <div key={j} className="flex items-center gap-2 group/point">
                                                                <span className="text-xs text-muted-foreground/50 shrink-0">•</span>
                                                                <Input
                                                                    className="flex-1 h-7 text-xs bg-transparent border-transparent hover:border-border/50 focus:border-border/50 focus:bg-muted/30 transition-all px-2"
                                                                    value={point}
                                                                    onChange={(e) => updatePoint(i, j, e.target.value)}
                                                                />
                                                                <button
                                                                    onClick={() => removePoint(i, j)}
                                                                    className="opacity-0 group-hover/point:opacity-100 p-1 rounded hover:bg-red-500/10 transition-all"
                                                                >
                                                                    <Trash2 className="w-3 h-3 text-red-400" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <button
                                                            onClick={() => addPoint(i)}
                                                            className="flex items-center gap-1 text-xs text-[#FF6600] hover:text-orange-500 ml-4 mt-1"
                                                        >
                                                            <Plus className="w-3 h-3" /> Add point
                                                        </button>
                                                    </div>
                                                )}

                                                {section.wordCount && (
                                                    <div className="flex items-center gap-2 mt-2 ml-1">
                                                        <span className="text-[10px] text-muted-foreground/50">Words:</span>
                                                        <Input
                                                            type="number"
                                                            className="w-20 h-6 text-[10px] bg-transparent border-border/30 px-2"
                                                            value={section.wordCount}
                                                            onChange={(e) => updateSection(i, "wordCount", parseInt(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => removeSection(i)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-500/10 transition-all shrink-0"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1 glass-card border-dashed" onClick={addSection}>
                                <Plus className="w-4 h-4 mr-2" /> Add Section Manually
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 glass-card border-dashed border-[#FF6600]/30 hover:border-[#FF6600]/50 hover:bg-[#FF6600]/5"
                                onClick={async () => {
                                    setIsLoading(true);
                                    try {
                                        const existingSections = outline?.sections?.map((s: any) => s.heading) || [];
                                        const res = await fetch("/api/ai-assist", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                                action: "suggest-sections",
                                                keyword,
                                                existingSections,
                                                articleType,
                                                niche,
                                            }),
                                        });
                                        if (res.ok) {
                                            const { suggestions } = await res.json();
                                            if (suggestions && suggestions.length > 0) {
                                                setOutline((prev: any) => ({
                                                    ...prev,
                                                    sections: [...(prev?.sections || []), ...suggestions],
                                                }));
                                            }
                                        }
                                    } catch (error) {
                                        console.error("AI section suggestion failed:", error);
                                    } finally {
                                        setIsLoading(false);
                                    }
                                }}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Sparkles className="w-4 h-4 mr-2 text-[#FF6600]" />
                                )}
                                Generate Sections with AI
                            </Button>
                        </div>

                        {outline && outline.suggestedLabels && (
                            <div className="glass-card rounded-xl p-4">
                                <Label className="text-xs text-muted-foreground mb-2 block">Suggested Labels</Label>
                                <div className="flex flex-wrap gap-2">
                                    {outline.suggestedLabels.map((label: string) => (
                                        <Badge key={label} variant="secondary" className="bg-orange-500/10 text-violet-300 border-[#FF6600]/20">
                                            <Tag className="w-3 h-3 mr-1" />{label}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <Label htmlFor="labels">Labels (comma-separated)</Label>
                            <Input
                                id="labels"
                                className="mt-1.5 bg-muted/30 border-border/50"
                                placeholder="e.g., fitness, nutrition, health"
                                value={labelsInput}
                                onChange={(e) => setLabelsInput(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" className="glass-card" onClick={() => setCurrentStep(2)}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back
                            </Button>
                            <Button
                                className="glow-button text-white border-0 px-8"
                                disabled={isLoading}
                                onClick={handleGenerateArticle}
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PenTool className="w-4 h-4 mr-2" />}
                                {isLoading ? "Writing Article... (est. 1-2m)" : "Generate Full Article"}
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                );

            // ════════════════════════════════════════════════════════════
            // STEP 4: ARTICLE — Edit HTML with Preview/Code toggle
            // ════════════════════════════════════════════════════════════
            case 4:
                return (
                    <div className="space-y-6 animate-slide-up opacity-0 stagger-1">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold mb-1">Edit Your Article</h2>
                                <p className="text-sm text-muted-foreground">
                                    Switch between preview and HTML editor. Edit anything before continuing.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline" size="sm"
                                    className={`glass-card ${articleEditMode === "preview" ? "bg-orange-500/10 border-[#FF6600]/30" : ""}`}
                                    onClick={() => setArticleEditMode("preview")}
                                >
                                    <Eye className="w-3.5 h-3.5 mr-1.5" /> Preview
                                </Button>
                                <Button
                                    variant="outline" size="sm"
                                    className={`glass-card ${articleEditMode === "html" ? "bg-orange-500/10 border-[#FF6600]/30" : ""}`}
                                    onClick={() => setArticleEditMode("html")}
                                >
                                    <Code className="w-3.5 h-3.5 mr-1.5" /> HTML
                                </Button>
                                <Button variant="outline" size="sm" className="glass-card" onClick={() => { setCurrentStep(3); }} disabled={isLoading}>
                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Regenerate
                                </Button>
                            </div>
                        </div>

                        <div className="glass-card rounded-xl p-4">
                            <Label className="text-xs text-[#FF6600] mb-2 block">Title</Label>
                            <Input
                                className="bg-muted/30 border-border/50 font-semibold text-lg"
                                value={selectedTitle}
                                onChange={(e) => setSelectedTitle(e.target.value)}
                            />
                        </div>

                        {articleEditMode === "html" ? (
                            <Textarea
                                className="min-h-[500px] font-mono text-xs bg-muted/10 border-border/50 leading-relaxed"
                                value={article}
                                onChange={(e) => setArticle(e.target.value)}
                            />
                        ) : (
                            <div className="glass-card rounded-xl p-6 max-h-[600px] overflow-y-auto">
                                <div
                                    className="article-preview text-sm prose prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{ __html: article || "<p>No content generated yet.</p>" }}
                                />
                            </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Word count: ~{article.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length}</span>
                            <span>Target: {wordCount}</span>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" className="glass-card" onClick={() => setCurrentStep(3)}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Outline
                            </Button>
                            <Button
                                className="glow-button text-white border-0 px-8"
                                onClick={() => setCurrentStep(5)}
                            >
                                FAQs & Meta <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                );

            // ════════════════════════════════════════════════════════════
            // STEP 5: FAQs & META — Edit each FAQ, meta description
            // ════════════════════════════════════════════════════════════
            case 5:
                return (
                    <div className="space-y-6 animate-slide-up opacity-0 stagger-1">
                        <div>
                            <h2 className="text-xl font-bold mb-1">Edit FAQs & Meta</h2>
                            <p className="text-sm text-muted-foreground">
                                Edit, add, or remove FAQs. Edit your meta description and excerpt.
                            </p>
                        </div>

                        {/* Meta Description */}
                        <div className="glass-card rounded-xl p-5 space-y-4">
                            <h3 className="text-sm font-semibold text-[#FF6600]">Meta Description & Excerpt</h3>
                            <div>
                                <Label className="text-xs">Meta Description ({meta?.metaDescription?.length || 0}/160 chars)</Label>
                                <Textarea
                                    className="mt-1.5 bg-muted/30 border-border/50 h-20 text-sm"
                                    value={meta?.metaDescription || ""}
                                    onChange={(e) => setMeta({ ...meta!, metaDescription: e.target.value })}
                                    maxLength={160}
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Excerpt</Label>
                                <Textarea
                                    className="mt-1.5 bg-muted/30 border-border/50 h-16 text-sm"
                                    value={meta?.excerpt || ""}
                                    onChange={(e) => setMeta({ ...meta!, excerpt: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* FAQs */}
                        {faqs.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-[#FF6600]">FAQs ({faqs.length})</h3>
                                {faqs.map((faq, i) => (
                                    <div key={i} className="glass-card rounded-xl p-4 group">
                                        <div className="flex items-start gap-3">
                                            <div className="w-6 h-6 rounded-full bg-orange-500/10 text-[#FF6600] flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                                                {i + 1}
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <Input
                                                    className="bg-muted/30 border-border/50 text-sm font-medium"
                                                    value={faq.question}
                                                    onChange={(e) => updateFaq(i, "question", e.target.value)}
                                                    placeholder="Question?"
                                                />
                                                <Textarea
                                                    className="bg-muted/30 border-border/50 text-sm h-16"
                                                    value={faq.answer}
                                                    onChange={(e) => updateFaq(i, "answer", e.target.value)}
                                                    placeholder="Answer..."
                                                />
                                                <p className="text-[10px] text-muted-foreground/50">{faq.answer.split(/\s+/).length} words (optimal: 40-60)</p>
                                            </div>
                                            <button
                                                onClick={() => removeFaq(i)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-500/10 transition-all shrink-0"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <Button variant="outline" className="w-full glass-card border-dashed" onClick={addFaq}>
                            <Plus className="w-4 h-4 mr-2" /> Add FAQ
                        </Button>

                        <div className="flex gap-3">
                            <Button variant="outline" className="glass-card" onClick={() => setCurrentStep(4)}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Article
                            </Button>
                            <Button
                                className="glow-button text-white border-0 px-8"
                                onClick={() => setCurrentStep(includeImages ? 6 : 7)}
                            >
                                {includeImages ? "Featured Image" : "Preview"} <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                );

            // ════════════════════════════════════════════════════════════
            // STEP 6: IMAGE — View, edit alt text, regenerate
            // ════════════════════════════════════════════════════════════
            case 6:
                return (
                    <div className="space-y-6 animate-slide-up opacity-0 stagger-1">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold mb-1">Featured Image</h2>
                                <p className="text-sm text-muted-foreground">
                                    {image?.url ? "Edit alt text or skip. You can also add your own image URL." : "No image generated. Add your own URL or skip."}
                                </p>
                            </div>
                        </div>

                        {image && image.url && (
                            <div className="glass-card rounded-xl overflow-hidden">
                                <img src={image.url} alt={image.altText} className="w-full h-72 object-cover" />
                            </div>
                        )}

                        <div className="glass-card rounded-xl p-4 space-y-3">
                            <div>
                                <Label className="text-xs">Image URL</Label>
                                <Input
                                    className="mt-1.5 bg-muted/30 border-border/50 text-sm"
                                    value={image?.url || ""}
                                    placeholder="https://example.com/image.jpg"
                                    onChange={(e) => setImage({ url: e.target.value, altText: image?.altText || "" })}
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Alt Text (SEO important)</Label>
                                <Input
                                    className="mt-1.5 bg-muted/30 border-border/50 text-sm"
                                    value={image?.altText || ""}
                                    placeholder="Descriptive alt text with keyword"
                                    onChange={(e) => setImage({ url: image?.url || "", altText: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" className="glass-card" onClick={() => setCurrentStep(5)}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back
                            </Button>
                            <Button className="glow-button text-white border-0 px-8" onClick={() => setCurrentStep(7)}>
                                <Eye className="w-4 h-4 mr-2" /> Preview Article
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                );

            // ════════════════════════════════════════════════════════════
            // STEP 7: FULL PREVIEW & PUBLISH
            // ════════════════════════════════════════════════════════════
            case 7:
                return (
                    <div className="space-y-6 animate-slide-up opacity-0 stagger-1">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold mb-1">Preview & Publish</h2>
                                <p className="text-sm text-muted-foreground">
                                    Final review. Everything is editable — go back to any step if needed.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="glass-card" onClick={() => setCurrentStep(4)}>
                                    <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit Article
                                </Button>
                                <Button variant="outline" size="sm" className="glass-card" onClick={() => setCurrentStep(5)}>
                                    <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Edit FAQs
                                </Button>
                            </div>
                        </div>

                        {/* Meta preview */}
                        {meta && (
                            <div className="glass-card rounded-xl p-5 space-y-2">
                                <div className="text-sm font-semibold text-blue-400 truncate">{selectedTitle}</div>
                                <div className="text-xs text-emerald-400 truncate">yourblog.blogspot.com</div>
                                <div className="text-xs text-muted-foreground">{meta.metaDescription}</div>
                            </div>
                        )}

                        {/* Labels */}
                        <div>
                            <Label htmlFor="labels-final">Labels</Label>
                            <Input
                                id="labels-final"
                                className="mt-1.5 bg-muted/30 border-border/50"
                                value={labelsInput}
                                onChange={(e) => setLabelsInput(e.target.value)}
                            />
                        </div>

                        {/* Featured image */}
                        {image && image.url && (
                            <div className="glass-card rounded-xl overflow-hidden">
                                <img src={image.url} alt={image.altText} className="w-full h-48 object-cover" />
                            </div>
                        )}

                        {/* Article body */}
                        <div className="glass-card rounded-xl p-6">
                            <h1 className="text-xl font-bold text-[#FF6600] mb-4">{selectedTitle}</h1>
                            <div
                                className="article-preview text-sm prose prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: article || "<p>No content generated.</p>" }}
                            />
                        </div>

                        {/* FAQs preview */}
                        {faqs.length > 0 && (
                            <div className="glass-card rounded-xl p-6">
                                <h2 className="text-lg font-semibold mb-4">Frequently Asked Questions</h2>
                                <div className="space-y-4">
                                    {faqs.map((faq, i) => (
                                        <div key={i}>
                                            <h3 className="text-sm font-semibold">{faq.question}</h3>
                                            <p className="text-sm text-muted-foreground mt-1">{faq.answer}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Word count */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground glass-card rounded-xl p-3">
                            <span>Words: ~{article.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length}</span>
                            <span>FAQs: {faqs.length}</span>
                            <span>Meta: {meta?.metaDescription?.length || 0}/160 chars</span>
                            <span>Labels: {labelsInput.split(",").filter(l => l.trim()).length}</span>
                        </div>

                        {/* Publish controls */}
                        <div className="glass-card rounded-xl p-5">
                            <Label className="mb-3 block">Publish Action</Label>
                            <div className="flex flex-wrap gap-3 mb-4">
                                {[
                                    { value: "draft", label: "Save as Draft", desc: "Save to Blogger as draft" },
                                    { value: "publish", label: "Publish Now", desc: "Publish immediately" },
                                ].map((action) => (
                                    <button
                                        key={action.value}
                                        onClick={() => setPublishAction(action.value)}
                                        className={`flex-1 min-w-[150px] p-4 rounded-xl text-left transition-all duration-200 ${publishAction === action.value
                                                ? "bg-[#FF6600]/15 border-2 border-[#FF6600]/40"
                                                : "bg-muted/10 border-2 border-border/30"
                                            }`}
                                    >
                                        <div className="text-sm font-medium">{action.label}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">{action.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" className="glass-card" onClick={() => setCurrentStep(includeImages ? 6 : 5)}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back
                            </Button>
                            <Button
                                className="glow-button text-white border-0 px-8 h-11"
                                disabled={isLoading}
                                onClick={handlePublish}
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                                {isLoading ? "Publishing..." : publishAction === "draft" ? "Save as Draft" : "Publish to Blogger"}
                            </Button>
                        </div>
                    </div>
                );

            // ════════════════════════════════════════════════════════════
            // STEP 8: SUCCESS
            // ════════════════════════════════════════════════════════════
            case 8:
                return (
                    <div className="text-center py-16 animate-slide-up opacity-0 stagger-1">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                            <Check className="w-8 h-8 text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">
                            Article {publishAction === "draft" ? "Saved" : "Published"} Successfully!
                        </h2>
                        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                            Your article &ldquo;{selectedTitle}&rdquo; has been {publishAction === "draft" ? "saved as a draft" : "published"} to your Blogger site.
                        </p>
                        <div className="flex justify-center gap-3">
                            <Button
                                variant="outline"
                                className="glass-card"
                                onClick={() => {
                                    setCurrentStep(1);
                                    setKeyword(""); setTitles([]); setSelectedTitle("");
                                    setOutline(null); setArticle(""); setFaqs([]);
                                    setMeta(null); setImage(null); setLabelsInput("");
                                    setSavedArticleId(null);
                                }}
                            >
                                <PenTool className="w-4 h-4 mr-2" /> Write Another Article
                            </Button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            {currentStep < 8 && (
                <div className="flex items-center justify-center gap-1 mb-8 overflow-x-auto pb-2">
                    {STEPS.filter((s) => s.id <= 8).map((step) => (
                        <div key={step.id} className="flex items-center">
                            <button
                                onClick={() => {
                                    // Allow clicking back to completed steps
                                    if (step.id < currentStep) setCurrentStep(step.id);
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${currentStep === step.id
                                        ? "bg-orange-500/20 text-violet-300 border border-[#FF6600]/30"
                                        : currentStep > step.id
                                            ? "bg-green-500/10 text-green-400 cursor-pointer hover:bg-green-500/20"
                                            : "text-muted-foreground/50"
                                    }`}
                            >
                                {currentStep > step.id ? <Check className="w-3 h-3" /> : <step.icon className="w-3 h-3" />}
                                <span className="hidden sm:inline">{step.label}</span>
                            </button>
                            {step.id < 8 && (
                                <div className={`w-4 h-px mx-1 ${currentStep > step.id ? "bg-green-500/30" : "bg-border/30"}`} />
                            )}
                        </div>
                    ))}
                </div>
            )}
            {renderStep()}
        </div>
    );
}
