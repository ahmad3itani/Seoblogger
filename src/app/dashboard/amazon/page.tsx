"use client";

import { useState, useEffect } from "react";
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
    ShoppingCart,
    Loader2,
    FileText,
    Send,
    Eye,
    ExternalLink,
    Link2,
    Sparkles,
    Copy,
    Check,
    RefreshCw,
    Search,
    ArrowRight,
    ArrowLeft,
    Package,
} from "lucide-react";
import { ProductList } from "@/components/amazon/product-list";
import { IntentBadge } from "@/components/amazon/intent-badge";
import type { AmazonProduct } from "@/lib/amazon/generate";

interface GeneratedArticle {
    title: string;
    content: string;
    rawArticle?: string;
    wordCount: number;
    affiliateLinkCount: number;
    storeId: string;
    niche: string;
    articleType: string;
    products?: AmazonProduct[];
    meta?: { metaDescription: string; excerpt: string };
    faqs?: Array<{ question: string; answer: string }>;
    savedArticle?: { id: string } | null;
}

interface IntentData {
    type: 'informational' | 'commercial' | 'transactional';
    confidence: 'high' | 'medium' | 'low';
    isAffiliateReady: boolean;
    suggestion?: string;
    colors: { bg: string; text: string; border: string };
    description: string;
}

interface TierDiversity {
    hasBudget: boolean;
    hasMidRange: boolean;
    hasPremium: boolean;
    isBalanced: boolean;
}

type Step = 'input' | 'preview' | 'result';

export default function AmazonAffiliatePage() {
    // Form state
    const [niche, setNiche] = useState("");
    const [storeId, setStoreId] = useState("");
    const [storeRegion, setStoreRegion] = useState("us");
    const [productCount, setProductCount] = useState("5");
    const [articleType, setArticleType] = useState("roundup");
    const [language, setLanguage] = useState("English");
    const [tone, setTone] = useState("professional");
    const [productUrl, setProductUrl] = useState("");
    const [includeTable, setIncludeTable] = useState(true);
    const [includeInternalLinks, setIncludeInternalLinks] = useState(true);
    const [includeExternalLinks, setIncludeExternalLinks] = useState(true);
    const [customInstructions, setCustomInstructions] = useState("");

    // Flow state
    const [step, setStep] = useState<Step>('input');
    const [isResearching, setIsResearching] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState("");

    // Research results
    const [products, setProducts] = useState<AmazonProduct[]>([]);
    const [intent, setIntent] = useState<IntentData | null>(null);
    const [tierDiversity, setTierDiversity] = useState<TierDiversity | null>(null);

    // Generation results
    const [generatedArticle, setGeneratedArticle] = useState<GeneratedArticle | null>(null);
    const [showPreview, setShowPreview] = useState(true);
    const [copied, setCopied] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishSuccess, setPublishSuccess] = useState(false);
    const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

    // Load saved store ID and region from localStorage
    useEffect(() => {
        const savedId = localStorage.getItem("amazon_store_id");
        const savedRegion = localStorage.getItem("amazon_store_region");
        if (savedId) setStoreId(savedId);
        if (savedRegion) setStoreRegion(savedRegion);
    }, []);

    // Save store ID and region when they change
    useEffect(() => {
        if (storeId) localStorage.setItem("amazon_store_id", storeId);
    }, [storeId]);
    useEffect(() => {
        localStorage.setItem("amazon_store_region", storeRegion);
    }, [storeRegion]);

    // Step 1: Research products
    const handleResearch = async () => {
        if (!niche.trim()) {
            setError("Please enter a niche or product category");
            return;
        }
        if (!storeId.trim()) {
            setError("Please enter your Amazon Store ID (affiliate tag)");
            return;
        }

        setError("");
        setIsResearching(true);

        try {
            const res = await fetch("/api/amazon/research", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    niche: niche.trim(),
                    storeId: storeId.trim(),
                    storeRegion,
                    productUrl: productUrl.trim() || undefined,
                    productCount: parseInt(productCount),
                    articleType: productUrl.trim() ? "single-review" : articleType,
                }),
            });

            const data = await res.json();
            if (data.success && data.products) {
                setProducts(data.products);
                setIntent(data.intent);
                setTierDiversity(data.tierDiversity);
                setStep('preview');
            } else {
                setError(data.error || "Failed to research products");
            }
        } catch (err) {
            setError("Network error. Please try again.");
        } finally {
            setIsResearching(false);
        }
    };

    // Step 2: Generate article with selected products
    const handleGenerate = async () => {
        if (products.length === 0) {
            setError("No products selected");
            return;
        }

        setError("");
        setIsGenerating(true);
        setGeneratedArticle(null);
        setPublishSuccess(false);

        try {
            // Sanitize products to ensure proper serialization
            const sanitizedProducts = products.map(p => ({
                name: p.name || '',
                searchTerms: p.searchTerms || p.name || '',
                priceRange: p.priceRange || '',
                rating: p.rating || '4.5 out of 5',
                keyFeatures: Array.isArray(p.keyFeatures) ? p.keyFeatures : [],
                bestFor: p.bestFor || '',
                affiliateUrl: p.affiliateUrl || '',
                tier: p.tier,
                tierLabel: p.tierLabel,
                tierColor: p.tierColor,
            }));

            const res = await fetch("/api/amazon/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    niche: niche.trim(),
                    storeId: storeId.trim(),
                    storeRegion,
                    productUrl: productUrl.trim() || undefined,
                    productCount: sanitizedProducts.length,
                    articleType: productUrl.trim() ? "single-review" : articleType,
                    language,
                    tone,
                    includeComparisonTable: includeTable,
                    includeInternalLinks,
                    includeExternalLinks,
                    customInstructions: customInstructions.trim() || undefined,
                    // Pass pre-researched products to skip research phase
                    preResearchedProducts: sanitizedProducts,
                }),
            });

            if (!res.ok) {
                const text = await res.text();
                console.error("Generate API error:", res.status, text);
                try {
                    const errorData = JSON.parse(text);
                    setError(errorData.error || `Server error: ${res.status}`);
                } catch {
                    setError(`Server error: ${res.status}`);
                }
                return;
            }

            const data = await res.json();
            if (data.success && data.article) {
                setGeneratedArticle(data.article);
                setStep('result');
            } else {
                setError(data.error || "Failed to generate article");
            }
        } catch (err: any) {
            console.error("Generate error:", err);
            setError(err?.message || "Network error. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    // Quick generate (skip preview)
    const handleQuickGenerate = async () => {
        if (!niche.trim()) {
            setError("Please enter a niche or product category");
            return;
        }
        if (!storeId.trim()) {
            setError("Please enter your Amazon Store ID (affiliate tag)");
            return;
        }

        setError("");
        setIsGenerating(true);
        setGeneratedArticle(null);
        setPublishSuccess(false);

        try {
            const res = await fetch("/api/amazon/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    niche: niche.trim(),
                    storeId: storeId.trim(),
                    storeRegion,
                    productUrl: productUrl.trim() || undefined,
                    productCount: parseInt(productCount),
                    articleType: productUrl.trim() ? "single-review" : articleType,
                    language,
                    tone,
                    includeComparisonTable: includeTable,
                    includeInternalLinks,
                    includeExternalLinks,
                    customInstructions: customInstructions.trim() || undefined,
                }),
            });

            const data = await res.json();
            if (data.success && data.article) {
                setGeneratedArticle(data.article);
                setProducts(data.article.products || []);
                setStep('result');
            } else {
                setError(data.error || "Failed to generate article");
            }
        } catch (err) {
            setError("Network error. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyHTML = () => {
        if (generatedArticle) {
            navigator.clipboard.writeText(generatedArticle.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handlePublish = async () => {
        if (!generatedArticle) return;
        setIsPublishing(true);
        setError("");

        try {
            const res = await fetch("/api/amazon/publish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: generatedArticle.title,
                    content: generatedArticle.content,
                    wordCount: generatedArticle.wordCount,
                    labels: `amazon,affiliate,${generatedArticle.niche}`,
                    tone: tone,
                }),
            });

            const data = await res.json();
            if (data.success) {
                setPublishSuccess(true);
                setPublishedUrl(data.article?.bloggerUrl || null);
            } else {
                setError(data.error || "Failed to publish");
            }
        } catch (err) {
            setError("Failed to publish article");
        } finally {
            setIsPublishing(false);
        }
    };

    const handleBack = () => {
        if (step === 'preview') {
            setStep('input');
        } else if (step === 'result') {
            setStep('preview');
        }
    };

    const handleStartOver = () => {
        setStep('input');
        setProducts([]);
        setIntent(null);
        setTierDiversity(null);
        setGeneratedArticle(null);
        setPublishSuccess(false);
    };

    const toggleOptions = [
        { label: "Comparison Table", value: includeTable, setter: setIncludeTable },
        { label: "Internal Links", value: includeInternalLinks, setter: setIncludeInternalLinks },
        { label: "External Links", value: includeExternalLinks, setter: setIncludeExternalLinks },
    ];

    const AMAZON_STEPS = [
        "Building affiliate links with your Store ID...",
        "Generating SEO-optimized title...",
        "Creating comprehensive outline...",
        "Writing full article with affiliate links...",
        "Adding featured snippet & comparison table...",
        "Generating FAQ section...",
        "Creating meta description...",
        "Generating product images...",
        "Adding trust signals & formatting...",
    ];

    return (
        <div className="space-y-6 max-w-7xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: "rgba(255,153,0,0.12)", border: "1px solid rgba(255,153,0,0.25)" }}
                    >
                        <ShoppingCart className="w-5 h-5" style={{ color: "#FF9900" }} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                            Amazon Affiliate SEO Engine
                        </h1>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            High-converting product reviews with smart tier selection
                        </p>
                    </div>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2.5 py-1 rounded-full ${step === 'input' ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-800 text-gray-500'}`}>
                        1. Configure
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-600" />
                    <span className={`px-2.5 py-1 rounded-full ${step === 'preview' ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-800 text-gray-500'}`}>
                        2. Preview
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-600" />
                    <span className={`px-2.5 py-1 rounded-full ${step === 'result' ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-800 text-gray-500'}`}>
                        3. Generate
                    </span>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* STEP 1: INPUT */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {step === 'input' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Configuration */}
                    <div className="lg:col-span-1 space-y-5">
                        <div
                            className="rounded-2xl p-5 space-y-4"
                            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                        >
                            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                                Amazon Configuration
                            </h2>

                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Store Region *</Label>
                                <Select value={storeRegion} onValueChange={(v) => v && setStoreRegion(v)}>
                                    <SelectTrigger className="h-9 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="us">United States (.com)</SelectItem>
                                        <SelectItem value="ca">Canada (.ca)</SelectItem>
                                        <SelectItem value="uk">United Kingdom (.co.uk)</SelectItem>
                                        <SelectItem value="de">Germany (.de)</SelectItem>
                                        <SelectItem value="fr">France (.fr)</SelectItem>
                                        <SelectItem value="es">Spain (.es)</SelectItem>
                                        <SelectItem value="it">Italy (.it)</SelectItem>
                                        <SelectItem value="nl">Netherlands (.nl)</SelectItem>
                                        <SelectItem value="se">Sweden (.se)</SelectItem>
                                        <SelectItem value="pl">Poland (.pl)</SelectItem>
                                        <SelectItem value="jp">Japan (.co.jp)</SelectItem>
                                        <SelectItem value="au">Australia (.com.au)</SelectItem>
                                        <SelectItem value="in">India (.in)</SelectItem>
                                        <SelectItem value="sg">Singapore (.sg)</SelectItem>
                                        <SelectItem value="mx">Mexico (.com.mx)</SelectItem>
                                        <SelectItem value="br">Brazil (.com.br)</SelectItem>
                                        <SelectItem value="ae">UAE (.ae)</SelectItem>
                                        <SelectItem value="sa">Saudi Arabia (.sa)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Store ID / Affiliate Tag *</Label>
                                <Input
                                    placeholder="e.g., mystore-20"
                                    value={storeId}
                                    onChange={(e) => setStoreId(e.target.value)}
                                    className="h-9 text-xs"
                                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}
                                />
                                <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>Found in your Amazon Associates account</p>
                            </div>

                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Niche / Product Category *</Label>
                                <Input
                                    placeholder="e.g., Wireless Earbuds, Standing Desks"
                                    value={niche}
                                    onChange={(e) => setNiche(e.target.value)}
                                    className="h-9 text-xs"
                                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}
                                />
                            </div>

                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Product URL (optional)</Label>
                                <Input
                                    placeholder="https://www.amazon.com/dp/..."
                                    value={productUrl}
                                    onChange={(e) => setProductUrl(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}
                                />
                                {productUrl.trim() && (
                                    <div className="mt-2 flex items-center gap-2 text-[10px] px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,153,0,0.08)", color: "#FF9900", border: "1px solid rgba(255,153,0,0.20)" }}>
                                        <Link2 className="w-3 h-3 shrink-0" />
                                        <span>Deep single-product review mode</span>
                                    </div>
                                )}
                            </div>

                            {!productUrl.trim() && (
                                <div>
                                    <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Article Type</Label>
                                    <Select value={articleType} onValueChange={(v) => v && setArticleType(v)}>
                                        <SelectTrigger className="h-9 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="roundup">Product Roundup</SelectItem>
                                            <SelectItem value="single-review">Single Product Review</SelectItem>
                                            <SelectItem value="comparison">Product Comparison</SelectItem>
                                            <SelectItem value="buyers-guide">Buyer&apos;s Guide</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {!productUrl.trim() && articleType !== "single-review" && (
                                <div>
                                    <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Number of Products</Label>
                                    <Select value={productCount} onValueChange={(v) => v && setProductCount(v)}>
                                        <SelectTrigger className="h-9 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[3, 5, 7, 10].map((n) => (
                                                <SelectItem key={n} value={String(n)}>{n} Products</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {error && (
                                <div className="rounded-lg p-3 flex items-start gap-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
                                    <span className="text-xs text-red-300">{error}</span>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    onClick={handleResearch}
                                    disabled={isResearching}
                                    className="flex-1 h-11 text-sm font-semibold btn-primary"
                                >
                                    {isResearching ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Researching...</>
                                    ) : (
                                        <><Search className="w-4 h-4 mr-2" />Research Products</>
                                    )}
                                </Button>
                            </div>

                            <button
                                onClick={handleQuickGenerate}
                                disabled={isGenerating || isResearching}
                                className="w-full text-xs text-gray-500 hover:text-gray-400 py-2 transition-colors"
                            >
                                {isGenerating ? "Generating..." : "Skip preview & generate directly"}
                            </button>
                        </div>
                    </div>

                    {/* Right: Empty state */}
                    <div className="lg:col-span-2 min-h-[500px]">
                        <div
                            className="rounded-2xl h-full flex flex-col items-center justify-center p-8 text-center"
                            style={{ background: "var(--bg-card)", border: "1px dashed var(--border-glass)" }}
                        >
                            <div
                                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                                style={{ background: "rgba(255,153,0,0.08)", border: "1px solid rgba(255,153,0,0.20)" }}
                            >
                                <Package className="w-9 h-9" style={{ color: "#FF9900" }} />
                            </div>
                            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                                Two-Step Generation
                            </h2>
                            <p className="text-sm max-w-md mb-4" style={{ color: "var(--text-secondary)" }}>
                                First, we&apos;ll research products for your niche. Then you can review, reorder, or remove products before generating the article.
                            </p>
                            <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-green-500" /> Budget picks
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-500" /> Mid-range
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-purple-500" /> Premium
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* STEP 2: PRODUCT PREVIEW */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {step === 'preview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Article settings */}
                    <div className="lg:col-span-1 space-y-5">
                        <div
                            className="rounded-2xl p-5 space-y-4"
                            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                                    Article Settings
                                </h2>
                                <button
                                    onClick={handleBack}
                                    className="text-xs text-gray-500 hover:text-gray-400 flex items-center gap-1"
                                >
                                    <ArrowLeft className="w-3 h-3" /> Back
                                </button>
                            </div>

                            {/* Intent Badge */}
                            {intent && (
                                <div className="pb-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                    <IntentBadge
                                        intent={intent.type}
                                        confidence={intent.confidence}
                                        isAffiliateReady={intent.isAffiliateReady}
                                        suggestion={intent.suggestion}
                                        colors={intent.colors}
                                        description={intent.description}
                                        showDetails={true}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Language</Label>
                                    <Select value={language} onValueChange={(v) => v && setLanguage(v)}>
                                        <SelectTrigger className="h-9 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {["English", "Spanish", "French", "German", "Arabic", "Portuguese"].map((l) => (
                                                <SelectItem key={l} value={l}>{l}</SelectItem>
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
                                            {["professional", "casual", "expert", "friendly", "conversational"].map((t) => (
                                                <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Feature Toggles */}
                            <div className="space-y-1.5">
                                {toggleOptions.map((opt) => (
                                    <button
                                        key={opt.label}
                                        onClick={() => opt.setter(!opt.value)}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
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
                                            style={opt.value ? { background: "var(--brand-primary)" } : { background: "transparent", border: "1.5px solid rgba(255,255,255,0.15)" }}
                                        >
                                            {opt.value && <Check className="w-2.5 h-2.5 text-white" />}
                                        </div>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>

                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Custom Instructions</Label>
                                <Textarea
                                    placeholder="e.g., Focus on budget options, mention specific brands..."
                                    value={customInstructions}
                                    onChange={(e) => setCustomInstructions(e.target.value)}
                                    className="min-h-[60px] text-xs"
                                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}
                                />
                            </div>

                            {error && (
                                <div className="rounded-lg p-3 flex items-start gap-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
                                    <span className="text-xs text-red-300">{error}</span>
                                </div>
                            )}

                            <Button
                                onClick={handleGenerate}
                                disabled={isGenerating || products.length === 0}
                                className="w-full h-11 text-sm font-semibold btn-primary"
                            >
                                {isGenerating ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                                ) : (
                                    <><Sparkles className="w-4 h-4 mr-2" />Generate Article</>
                                )}
                            </Button>
                        </div>

                        {/* Estimated stats */}
                        <div
                            className="rounded-2xl p-4"
                            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                        >
                            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
                                Estimated Output
                            </h3>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span style={{ color: "var(--text-secondary)" }}>Word count</span>
                                    <span style={{ color: "var(--text-primary)" }}>{Math.max(2500, products.length * 500)}+</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: "var(--text-secondary)" }}>Affiliate links</span>
                                    <span style={{ color: "#FF9900" }}>{products.length * 3}+</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: "var(--text-secondary)" }}>Sections</span>
                                    <span style={{ color: "var(--text-primary)" }}>~{6 + products.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Product list */}
                    <div className="lg:col-span-2">
                        <div
                            className="rounded-2xl p-5"
                            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                        >
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                                    Products for &quot;{niche}&quot;
                                </h3>
                                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                    Review and reorder products. The first product will be highlighted as &quot;Top Pick&quot;.
                                </p>
                            </div>

                            <ProductList
                                products={products}
                                onProductsChange={setProducts}
                                maxProducts={10}
                                minProducts={1}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* STEP 3: GENERATION / RESULTS */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {step === 'result' && (
                <div className="space-y-4">
                    {/* Loading state */}
                    {isGenerating && (
                        <div
                            className="rounded-2xl h-[500px] flex flex-col items-center justify-center p-8"
                            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                        >
                            <div
                                className="w-20 h-20 rounded-full animate-glow-pulse flex items-center justify-center mb-6"
                                style={{ background: "rgba(255,153,0,0.10)", border: "1px solid rgba(255,153,0,0.25)" }}
                            >
                                <Sparkles className="w-9 h-9" style={{ color: "#FF9900" }} />
                            </div>
                            <h2 className="text-lg font-bold mb-1" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                                Generating Article...
                            </h2>
                            <p className="text-xs mb-8" style={{ color: "var(--text-muted)" }}>Full SEO pipeline running (45-60 seconds)</p>
                            <div className="w-full max-w-sm space-y-2">
                                {AMAZON_STEPS.map((s, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-3 px-4 py-2 rounded-lg text-xs animate-in fade-in"
                                        style={{ color: "var(--text-secondary)", animationDelay: `${i * 3}s`, animationFillMode: 'backwards' }}
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#FF9900" }} />
                                        <span>{s}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Results */}
                    {generatedArticle && !isGenerating && (
                        <>
                            {/* Stats Bar */}
                            <div
                                className="rounded-2xl p-4"
                                style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                            >
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}>
                                        {generatedArticle.wordCount.toLocaleString()} words
                                    </span>
                                    <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: "rgba(255,153,0,0.08)", color: "#FF9900", border: "1px solid rgba(255,153,0,0.20)" }}>
                                        {generatedArticle.affiliateLinkCount} affiliate links
                                    </span>
                                    <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: "rgba(108,76,241,0.08)", color: "var(--brand-primary)", border: "1px solid rgba(108,76,241,0.20)" }}>
                                        {generatedArticle.articleType}
                                    </span>

                                    <div className="ml-auto flex gap-1.5">
                                        <button
                                            onClick={handleCopyHTML}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)", color: "var(--text-secondary)" }}
                                        >
                                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                            {copied ? "Copied!" : "Copy"}
                                        </button>
                                        <button
                                            onClick={() => setShowPreview(!showPreview)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)", color: "var(--text-secondary)" }}
                                        >
                                            <Eye className="w-3 h-3" />
                                            {showPreview ? "Source" : "Preview"}
                                        </button>
                                        <Button
                                            size="sm"
                                            onClick={handlePublish}
                                            disabled={isPublishing || publishSuccess}
                                            className="h-7 text-xs btn-primary px-3"
                                        >
                                            {publishSuccess ? (
                                                <><Check className="w-3 h-3 mr-1" /> Published!</>
                                            ) : isPublishing ? (
                                                <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Publishing...</>
                                            ) : (
                                                <><Send className="w-3 h-3 mr-1" /> Publish</>
                                            )}
                                        </Button>
                                        {publishSuccess && publishedUrl && (
                                            <a href={publishedUrl} target="_blank" rel="noopener noreferrer">
                                                <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)", color: "var(--text-secondary)" }}>
                                                    <ExternalLink className="w-3 h-3" /> View
                                                </button>
                                            </a>
                                        )}
                                        <button
                                            onClick={handleStartOver}
                                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all"
                                            style={{ color: "var(--text-muted)" }}
                                            title="Start Over"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Products summary */}
                            {generatedArticle.products && generatedArticle.products.length > 0 && (
                                <div
                                    className="rounded-2xl p-4"
                                    style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                                >
                                    <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Products Featured</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {generatedArticle.products.map((product, i) => (
                                            <a
                                                key={i}
                                                href={product.affiliateUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-start gap-2 p-2.5 rounded-xl text-xs transition-all"
                                                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)" }}
                                            >
                                                <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 text-[9px] font-bold" style={{ background: "rgba(255,153,0,0.10)", color: "#FF9900" }}>{i + 1}</div>
                                                <div className="min-w-0">
                                                    <p className="font-medium truncate" style={{ color: "var(--text-primary)" }}>{product.name}</p>
                                                    <p style={{ color: "var(--text-muted)" }}>{product.priceRange} · {product.rating}</p>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Article Content */}
                            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                                <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                    <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{generatedArticle.title}</h3>
                                </div>
                                <div className="p-5 max-h-[700px] overflow-y-auto">
                                    {showPreview ? (
                                        <div
                                            className="article-preview text-xs"
                                            dangerouslySetInnerHTML={{ __html: generatedArticle.content }}
                                        />
                                    ) : (
                                        <pre className="text-xs p-4 rounded-xl overflow-x-auto whitespace-pre-wrap font-mono" style={{ background: "rgba(255,255,255,0.02)", color: "var(--text-secondary)" }}>
                                            {generatedArticle.content}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
