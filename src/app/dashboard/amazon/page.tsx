"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
    LinkIcon,
    Sparkles,
    BarChart3,
    Copy,
    Check,
    RefreshCw,
    Globe,
} from "lucide-react";

interface AmazonProduct {
    name: string;
    priceRange: string;
    rating: string;
    bestFor: string;
    affiliateUrl: string;
}

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

export default function AmazonAffiliatePage() {
    const [niche, setNiche] = useState("");
    const [storeId, setStoreId] = useState("");
    const [storeRegion, setStoreRegion] = useState("us");
    const [productCount, setProductCount] = useState("5");
    const [articleType, setArticleType] = useState("roundup");
    const [language, setLanguage] = useState("English");
    const [tone, setTone] = useState("professional");
    const [includeTable, setIncludeTable] = useState(true);
    const [customInstructions, setCustomInstructions] = useState("");

    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedArticle, setGeneratedArticle] = useState<GeneratedArticle | null>(null);
    const [error, setError] = useState("");
    const [showPreview, setShowPreview] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishSuccess, setPublishSuccess] = useState(false);

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

    const handleGenerate = async () => {
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
                    productCount: parseInt(productCount),
                    articleType,
                    language,
                    tone,
                    includeComparisonTable: includeTable,
                    customInstructions: customInstructions.trim() || undefined,
                }),
            });

            const data = await res.json();
            if (data.success && data.article) {
                setGeneratedArticle(data.article);
                setShowPreview(true);
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

    const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

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

    return (
        <div className="space-y-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 mb-2 flex items-center gap-3">
                    <ShoppingCart className="w-8 h-8 text-[#FF9900]" />
                    Amazon Affiliate Generator
                </h1>
                <p className="text-muted-foreground">
                    Generate SEO-optimized product reviews and roundups with your Amazon affiliate links automatically embedded.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Configuration */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-card rounded-2xl p-6 space-y-5">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 rounded-lg bg-[#FF9900]/10 flex items-center justify-center">
                                <ShoppingCart className="w-4 h-4 text-[#FF9900]" />
                            </div>
                            <h2 className="font-semibold">Configuration</h2>
                        </div>

                        {/* Amazon Store Region */}
                        <div>
                            <Label className="text-sm font-medium flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5" />
                                Amazon Store Region *
                            </Label>
                            <Select value={storeRegion} onValueChange={(v) => v && setStoreRegion(v)}>
                                <SelectTrigger className="mt-1.5 bg-muted/30 border-border/50">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="us">🇺🇸 United States (.com)</SelectItem>
                                    <SelectItem value="ca">🇨🇦 Canada (.ca)</SelectItem>
                                    <SelectItem value="uk">🇬🇧 United Kingdom (.co.uk)</SelectItem>
                                    <SelectItem value="de">🇩🇪 Germany (.de)</SelectItem>
                                    <SelectItem value="fr">🇫🇷 France (.fr)</SelectItem>
                                    <SelectItem value="es">🇪🇸 Spain (.es)</SelectItem>
                                    <SelectItem value="it">🇮🇹 Italy (.it)</SelectItem>
                                    <SelectItem value="nl">🇳🇱 Netherlands (.nl)</SelectItem>
                                    <SelectItem value="se">🇸🇪 Sweden (.se)</SelectItem>
                                    <SelectItem value="pl">🇵🇱 Poland (.pl)</SelectItem>
                                    <SelectItem value="jp">🇯🇵 Japan (.co.jp)</SelectItem>
                                    <SelectItem value="au">🇦🇺 Australia (.com.au)</SelectItem>
                                    <SelectItem value="in">🇮🇳 India (.in)</SelectItem>
                                    <SelectItem value="sg">🇸🇬 Singapore (.sg)</SelectItem>
                                    <SelectItem value="mx">🇲🇽 Mexico (.com.mx)</SelectItem>
                                    <SelectItem value="br">🇧🇷 Brazil (.com.br)</SelectItem>
                                    <SelectItem value="ae">🇦🇪 UAE (.ae)</SelectItem>
                                    <SelectItem value="sa">🇸🇦 Saudi Arabia (.sa)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground mt-1">
                                Select the Amazon region where your store is registered. Links will use the correct domain.
                            </p>
                        </div>

                        {/* Amazon Store ID */}
                        <div>
                            <Label htmlFor="store-id" className="text-sm font-medium">
                                Amazon Store ID / Affiliate Tag *
                            </Label>
                            <Input
                                id="store-id"
                                placeholder="e.g., mystore-20"
                                value={storeId}
                                onChange={(e) => setStoreId(e.target.value)}
                                className="mt-1.5 bg-muted/30 border-border/50"
                            />
                            <p className="text-[11px] text-muted-foreground mt-1">
                                Found in your Amazon Associates account. Used in all affiliate links.
                            </p>
                        </div>

                        {/* Niche */}
                        <div>
                            <Label htmlFor="niche" className="text-sm font-medium">
                                Niche / Product Category *
                            </Label>
                            <Input
                                id="niche"
                                placeholder="e.g., Wireless Earbuds, Standing Desks, Air Fryers"
                                value={niche}
                                onChange={(e) => setNiche(e.target.value)}
                                className="mt-1.5 bg-muted/30 border-border/50"
                            />
                        </div>

                        {/* Article Type */}
                        <div>
                            <Label className="text-sm font-medium">Article Type</Label>
                            <Select value={articleType} onValueChange={(v) => v && setArticleType(v)}>
                                <SelectTrigger className="mt-1.5 bg-muted/30 border-border/50">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="roundup">Product Roundup (Best X of 2026)</SelectItem>
                                    <SelectItem value="single-review">Single Product Review</SelectItem>
                                    <SelectItem value="comparison">Product Comparison (vs)</SelectItem>
                                    <SelectItem value="buyers-guide">Buyer&apos;s Guide</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Product Count */}
                        {articleType !== "single-review" && (
                            <div>
                                <Label className="text-sm font-medium">Number of Products</Label>
                                <Select value={productCount} onValueChange={(v) => v && setProductCount(v)}>
                                    <SelectTrigger className="mt-1.5 bg-muted/30 border-border/50">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[3, 5, 7, 10].map((n) => (
                                            <SelectItem key={n} value={String(n)}>
                                                {n} Products
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Language & Tone */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-sm font-medium">Language</Label>
                                <Select value={language} onValueChange={(v) => v && setLanguage(v)}>
                                    <SelectTrigger className="mt-1.5 bg-muted/30 border-border/50">
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
                                <Label className="text-sm font-medium">Tone</Label>
                                <Select value={tone} onValueChange={(v) => v && setTone(v)}>
                                    <SelectTrigger className="mt-1.5 bg-muted/30 border-border/50">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {["professional", "casual", "expert", "friendly", "conversational"].map((t) => (
                                            <SelectItem key={t} value={t}>
                                                {t.charAt(0).toUpperCase() + t.slice(1)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Include Comparison Table */}
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Include Comparison Table</Label>
                            <button
                                onClick={() => setIncludeTable(!includeTable)}
                                className={`relative w-11 h-6 rounded-full transition-colors ${includeTable ? "bg-[#FF9900]" : "bg-gray-300"}`}
                            >
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${includeTable ? "translate-x-5" : ""}`} />
                            </button>
                        </div>

                        {/* Custom Instructions */}
                        <div>
                            <Label className="text-sm font-medium">Custom Instructions (optional)</Label>
                            <Textarea
                                placeholder="e.g., Focus on budget options, mention specific brands, target beginners..."
                                value={customInstructions}
                                onChange={(e) => setCustomInstructions(e.target.value)}
                                className="mt-1.5 bg-muted/30 border-border/50 min-h-[70px]"
                            />
                        </div>

                        {error && (
                            <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg border border-red-200">
                                {error}
                            </div>
                        )}

                        <Button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="w-full h-12 bg-gradient-to-r from-[#FF9900] to-[#FF6600] hover:from-[#e68a00] hover:to-[#e65c00] text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Generating Article...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    Generate Affiliate Article
                                </>
                            )}
                        </Button>
                    </div>

                    {/* How It Works */}
                    <div className="glass-card rounded-2xl p-6">
                        <h3 className="font-semibold mb-3 text-sm">Same Pipeline as Article Generator</h3>
                        <div className="space-y-3 text-xs text-muted-foreground">
                            <div className="flex gap-2">
                                <span className="w-5 h-5 rounded-full bg-[#FF9900]/10 text-[#FF9900] flex items-center justify-center shrink-0 text-[10px] font-bold">1</span>
                                <span>AI researches real Amazon products for your niche</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="w-5 h-5 rounded-full bg-[#FF9900]/10 text-[#FF9900] flex items-center justify-center shrink-0 text-[10px] font-bold">2</span>
                                <span>Generates SEO title → outline → 2500+ word article</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="w-5 h-5 rounded-full bg-[#FF9900]/10 text-[#FF9900] flex items-center justify-center shrink-0 text-[10px] font-bold">3</span>
                                <span>AI creates product images via Cloudflare Workers AI</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="w-5 h-5 rounded-full bg-[#FF9900]/10 text-[#FF9900] flex items-center justify-center shrink-0 text-[10px] font-bold">4</span>
                                <span>Affiliate links, FAQs, TOC, schema, and disclosure added</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="w-5 h-5 rounded-full bg-[#FF9900]/10 text-[#FF9900] flex items-center justify-center shrink-0 text-[10px] font-bold">5</span>
                                <span>Formatted for Blogger and saved as draft automatically</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Preview */}
                <div className="lg:col-span-2">
                    {!generatedArticle && !isGenerating && (
                        <div className="glass-card rounded-2xl p-16 text-center border-dashed h-full flex flex-col items-center justify-center">
                            <div className="w-20 h-20 bg-[#FF9900]/10 rounded-full flex items-center justify-center mb-6">
                                <FileText className="w-10 h-10 text-[#FF9900]" />
                            </div>
                            <h2 className="text-2xl font-bold mb-3">Ready to Generate</h2>
                            <p className="text-muted-foreground max-w-md">
                                Configure your settings and click generate. The AI will create a complete affiliate article with embedded Amazon links using your store ID.
                            </p>
                        </div>
                    )}

                    {isGenerating && (
                        <div className="glass-card rounded-2xl p-12 h-full flex flex-col items-center justify-center">
                            <div className="w-20 h-20 bg-[#FF9900]/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                <Sparkles className="w-10 h-10 text-[#FF9900]" />
                            </div>
                            <h2 className="text-2xl font-bold mb-3">Generating Article...</h2>
                            <p className="text-muted-foreground mb-8 text-center max-w-md">
                                Running the full article pipeline. This uses the same process as regular article generation with affiliate enhancements.
                            </p>
                            <div className="w-full max-w-sm space-y-3 text-sm">
                                {[
                                    "🔍 Researching real products on Amazon...",
                                    "🔗 Building affiliate links with your Store ID...",
                                    "📋 Generating SEO-optimized title...",
                                    "📝 Creating comprehensive outline...",
                                    "✍️ Writing full article with affiliate links...",
                                    "❓ Generating FAQ section...",
                                    "🔖 Creating meta description...",
                                    "🖼️ Generating AI product images...",
                                    "🎨 Formatting for Blogger...",
                                ].map((step, i) => (
                                    <div key={i} className="flex items-center gap-3 text-muted-foreground animate-in fade-in" style={{ animationDelay: `${i * 3}s`, animationFillMode: 'backwards' }}>
                                        <span>{step}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-8">
                                This typically takes 60-90 seconds for the full pipeline.
                            </p>
                        </div>
                    )}

                    {generatedArticle && !isGenerating && (
                        <div className="space-y-4">
                            {/* Stats Bar */}
                            <div className="glass-card rounded-2xl p-4">
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">{generatedArticle.wordCount.toLocaleString()} words</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <LinkIcon className="w-4 h-4 text-[#FF9900]" />
                                        <span className="text-sm font-medium">{generatedArticle.affiliateLinkCount} affiliate links</span>
                                    </div>
                                    <Badge className="bg-[#FF9900]/10 text-[#FF9900] border-[#FF9900]/20">
                                        {generatedArticle.articleType}
                                    </Badge>
                                    <Badge variant="outline">{generatedArticle.niche}</Badge>

                                    <div className="ml-auto flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleCopyHTML}
                                            className="h-8"
                                        >
                                            {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                                            {copied ? "Copied!" : "Copy HTML"}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowPreview(!showPreview)}
                                            className="h-8"
                                        >
                                            <Eye className="w-3 h-3 mr-1" />
                                            {showPreview ? "Source" : "Preview"}
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handlePublish}
                                            disabled={isPublishing || publishSuccess}
                                            className="h-8 bg-[#FF6600] hover:bg-orange-600 text-white"
                                        >
                                            {publishSuccess ? (
                                                <><Check className="w-3 h-3 mr-1" /> Published!</>
                                            ) : isPublishing ? (
                                                <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Publishing...</>
                                            ) : (
                                                <><Send className="w-3 h-3 mr-1" /> Publish to Blog</>
                                            )}
                                        </Button>
                                        {publishSuccess && publishedUrl && (
                                            <a href={publishedUrl} target="_blank" rel="noopener noreferrer">
                                                <Button variant="outline" size="sm" className="h-8">
                                                    <ExternalLink className="w-3 h-3 mr-1" /> View on Blogger
                                                </Button>
                                            </a>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleGenerate}
                                            className="h-8"
                                            title="Regenerate"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Products Found */}
                            {generatedArticle.products && generatedArticle.products.length > 0 && (
                                <div className="glass-card rounded-2xl p-4">
                                    <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Products Researched</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {generatedArticle.products.map((product, i) => (
                                            <a
                                                key={i}
                                                href={product.affiliateUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-start gap-2 p-2 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors text-xs"
                                            >
                                                <span className="w-5 h-5 rounded bg-[#FF9900]/10 text-[#FF9900] flex items-center justify-center shrink-0 text-[10px] font-bold">{i + 1}</span>
                                                <div className="min-w-0">
                                                    <p className="font-medium truncate">{product.name}</p>
                                                    <p className="text-muted-foreground">{product.priceRange} · {product.rating}</p>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Article Content */}
                            <div className="glass-card rounded-2xl overflow-hidden border">
                                <div className="bg-muted px-6 py-3 border-b">
                                    <h3 className="font-bold text-lg">{generatedArticle.title}</h3>
                                </div>
                                <div className="p-6 max-h-[700px] overflow-y-auto">
                                    {showPreview ? (
                                        <div
                                            className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-a:text-[#FF9900] prose-a:underline"
                                            dangerouslySetInnerHTML={{ __html: generatedArticle.content }}
                                        />
                                    ) : (
                                        <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono text-gray-700">
                                            {generatedArticle.content}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
