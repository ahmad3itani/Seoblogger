"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Link as LinkIcon,
    Network,
    ArrowRight,
    CheckCircle2,
    Loader2,
    Sparkles,
    AlertTriangle,
    ExternalLink,
    BarChart3,
    Target,
    XCircle,
    ChevronDown,
    ChevronUp,
    Shield,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────

interface GraphStats {
    totalPages: number;
    totalInternalLinks: number;
    avgIncomingLinks: number;
    avgOutgoingLinks: number;
    orphanPages: number;
    weakPages: number;
    strongPages: number;
}

interface PageSummary {
    url: string;
    postId: string;
    title: string;
    wordCount: number;
    incomingCount: number;
    outgoingCount: number;
}

interface Opportunity {
    id: string;
    sourceUrl: string;
    sourceTitle: string;
    sourcePostId: string;
    targetUrl: string;
    targetTitle: string;
    targetPostId: string;
    candidatePhrases: string[];
    sourceParagraphIndex: number;
    sourceParagraphText: string;
    sourceParagraphHtml: string;
    relevanceScore: number;
    priority: "high" | "medium" | "low";
    reason: string;
    targetIncomingCount: number;
    sourceOutgoingCount: number;
    // UI state
    suggestion?: {
        anchorText: string;
        newParagraphHtml: string;
        reason: string;
        confidence: number;
    } | null;
    suggestLoading?: boolean;
    applyStatus?: "idle" | "applying" | "applied" | "error";
    applyError?: string;
    expanded?: boolean;
}

// ─── Component ──────────────────────────────────────────────

export default function LinkerPage() {
    const [error, setError] = useState("");
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState("");

    // Graph data
    const [stats, setStats] = useState<GraphStats | null>(null);
    const [pages, setPages] = useState<PageSummary[]>([]);
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

    // View state
    const [activeTab, setActiveTab] = useState<"overview" | "opportunities" | "pages">("overview");
    const [appliedCount, setAppliedCount] = useState(0);

    // ─── Scan ───────────────────────────────────────────────

    const handleScan = async () => {
        setError("");
        setIsScanning(true);
        setScanProgress("Fetching all posts from Blogger...");
        setStats(null);
        setPages([]);
        setOpportunities([]);
        setAppliedCount(0);

        try {
            const res = await fetch("/api/linker/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setStats(data.stats);
            setPages(data.pages || []);
            setOpportunities(
                (data.opportunities || []).map((o: any) => ({
                    ...o,
                    suggestion: undefined,
                    suggestLoading: false,
                    applyStatus: "idle",
                    expanded: false,
                }))
            );
            setActiveTab(data.opportunities?.length > 0 ? "opportunities" : "overview");
        } catch (err: any) {
            setError(err.message || "Failed to scan site");
        } finally {
            setIsScanning(false);
            setScanProgress("");
        }
    };

    // ─── Get AI Suggestion ──────────────────────────────────

    const handleGetSuggestion = async (oppId: string) => {
        setOpportunities((prev) =>
            prev.map((o) => (o.id === oppId ? { ...o, suggestLoading: true, expanded: true } : o))
        );

        const opp = opportunities.find((o) => o.id === oppId);
        if (!opp) return;

        try {
            const res = await fetch("/api/linker/suggest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sourceUrl: opp.sourceUrl,
                    sourceTitle: opp.sourceTitle,
                    targetUrl: opp.targetUrl,
                    targetTitle: opp.targetTitle,
                    sourceParagraphHtml: opp.sourceParagraphHtml,
                    sourceParagraphText: opp.sourceParagraphText,
                    candidatePhrases: opp.candidatePhrases,
                    targetIncomingCount: opp.targetIncomingCount,
                }),
            });

            const data = await res.json();

            setOpportunities((prev) =>
                prev.map((o) =>
                    o.id === oppId
                        ? {
                              ...o,
                              suggestLoading: false,
                              suggestion: data.success ? data.suggestion : null,
                          }
                        : o
                )
            );
        } catch {
            setOpportunities((prev) =>
                prev.map((o) =>
                    o.id === oppId ? { ...o, suggestLoading: false, suggestion: null } : o
                )
            );
        }
    };

    // ─── Apply Link ─────────────────────────────────────────

    const handleApply = async (oppId: string) => {
        const opp = opportunities.find((o) => o.id === oppId);
        if (!opp || !opp.suggestion) return;

        setOpportunities((prev) =>
            prev.map((o) => (o.id === oppId ? { ...o, applyStatus: "applying" } : o))
        );

        try {
            const res = await fetch("/api/linker/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sourcePostId: opp.sourcePostId,
                    sourceTitle: opp.sourceTitle,
                    targetUrl: opp.targetUrl,
                    targetTitle: opp.targetTitle,
                    originalParagraphHtml: opp.sourceParagraphHtml,
                    newParagraphHtml: opp.suggestion.newParagraphHtml,
                    anchorText: opp.suggestion.anchorText,
                }),
            });

            const data = await res.json();

            if (data.success) {
                setOpportunities((prev) =>
                    prev.map((o) =>
                        o.id === oppId ? { ...o, applyStatus: "applied" } : o
                    )
                );
                setAppliedCount((c) => c + 1);
            } else {
                setOpportunities((prev) =>
                    prev.map((o) =>
                        o.id === oppId
                            ? { ...o, applyStatus: "error", applyError: data.error }
                            : o
                    )
                );
            }
        } catch (err: any) {
            setOpportunities((prev) =>
                prev.map((o) =>
                    o.id === oppId
                        ? { ...o, applyStatus: "error", applyError: "Network error" }
                        : o
                )
            );
        }
    };

    // ─── Toggle Expand ──────────────────────────────────────

    const toggleExpand = (oppId: string) => {
        setOpportunities((prev) =>
            prev.map((o) => (o.id === oppId ? { ...o, expanded: !o.expanded } : o))
        );
    };

    const priorityColor = (p: string) => {
        switch (p) {
            case "high": return "bg-red-500/10 text-red-500 border-red-500/20";
            case "medium": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
            default: return "bg-blue-500/10 text-blue-500 border-blue-500/20";
        }
    };

    // ─── Render ─────────────────────────────────────────────

    return (
        <div className="space-y-6 max-w-7xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
                        <Network className="w-6 h-6 text-[#FF6600]" />
                        Internal Linking Engine
                    </h1>
                    <p className="text-sm text-muted-foreground max-w-xl">
                        Scans your entire Blogger site, builds an internal link graph, detects pages needing support, and uses AI to generate natural link insertions.
                    </p>
                </div>
                <Button
                    className="glow-button text-white border-0 shrink-0"
                    onClick={handleScan}
                    disabled={isScanning}
                >
                    {isScanning ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Network className="w-4 h-4 mr-2" />
                    )}
                    {isScanning ? "Scanning..." : stats ? "Re-scan Site" : "Scan Entire Site"}
                </Button>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
                    <XCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Scanning State */}
            {isScanning && (
                <div className="glass-card rounded-2xl p-12 text-center flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 text-[#FF6600] animate-spin mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Building Link Graph</h3>
                    <p className="text-muted-foreground max-w-md mx-auto mb-6">
                        Fetching all posts, parsing content, extracting links, computing metrics, and detecting opportunities...
                    </p>
                    <div className="w-full max-w-xs space-y-2 text-xs text-muted-foreground">
                        {[
                            "Fetching all posts from Blogger API...",
                            "Parsing HTML content and extracting paragraphs...",
                            "Building internal link adjacency graph...",
                            "Computing incoming/outgoing link counts...",
                            "Detecting orphan and under-supported pages...",
                            "Finding relevant source-target pairs...",
                            "Extracting candidate anchor phrases...",
                            "Scoring and ranking opportunities...",
                        ].map((step, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-2 animate-in fade-in"
                                style={{ animationDelay: `${i * 2}s`, animationFillMode: "backwards" }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6600]/50 shrink-0" />
                                <span>{step}</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-6">This typically takes 15-60 seconds depending on blog size.</p>
                </div>
            )}

            {/* Results */}
            {stats && !isScanning && (
                <>
                    {/* Stats Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                        {[
                            { label: "Pages", value: stats.totalPages, icon: BarChart3 },
                            { label: "Internal Links", value: stats.totalInternalLinks, icon: LinkIcon },
                            { label: "Avg Incoming", value: stats.avgIncomingLinks, icon: Target },
                            { label: "Orphan Pages", value: stats.orphanPages, icon: AlertTriangle, highlight: stats.orphanPages > 0 },
                            { label: "Weak Pages", value: stats.weakPages, icon: AlertTriangle, highlight: stats.weakPages > 0 },
                            { label: "Strong Pages", value: stats.strongPages, icon: Shield },
                            { label: "Opportunities", value: opportunities.length, icon: Sparkles, highlight: true },
                        ].map((s, i) => (
                            <div
                                key={i}
                                className={`glass-card rounded-xl p-3 text-center ${s.highlight ? "border border-[#FF6600]/30" : ""}`}
                            >
                                <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.highlight ? "text-[#FF6600]" : "text-muted-foreground"}`} />
                                <p className="text-lg font-bold">{s.value}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Applied Count */}
                    {appliedCount > 0 && (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            {appliedCount} internal link{appliedCount > 1 ? "s" : ""} successfully applied to your Blogger posts.
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-1 border-b border-border/50 pb-0">
                        {(["overview", "opportunities", "pages"] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                                    activeTab === tab
                                        ? "border-[#FF6600] text-[#FF6600]"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {tab}
                                {tab === "opportunities" && opportunities.length > 0 && (
                                    <Badge className="ml-2 bg-[#FF6600]/10 text-[#FF6600] text-[10px] px-1.5 py-0">
                                        {opportunities.length}
                                    </Badge>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab: Overview */}
                    {activeTab === "overview" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="glass-card rounded-2xl p-6">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                    Orphan Pages (0 incoming links)
                                </h3>
                                {pages.filter((p) => p.incomingCount === 0).length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No orphan pages found. Your site has good internal link coverage.</p>
                                ) : (
                                    <div className="space-y-2 max-h-72 overflow-y-auto">
                                        {pages
                                            .filter((p) => p.incomingCount === 0)
                                            .map((p) => (
                                                <div key={p.postId} className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                                                    <span className="truncate font-medium">{p.title}</span>
                                                    <Badge className="bg-red-500/10 text-red-500 text-[10px] shrink-0">0 links</Badge>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>

                            <div className="glass-card rounded-2xl p-6">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-green-500" />
                                    Best Linked Pages
                                </h3>
                                <div className="space-y-2 max-h-72 overflow-y-auto">
                                    {pages
                                        .sort((a, b) => b.incomingCount - a.incomingCount)
                                        .slice(0, 10)
                                        .map((p) => (
                                            <div key={p.postId} className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg bg-muted/30">
                                                <span className="truncate">{p.title}</span>
                                                <Badge variant="outline" className="text-[10px] shrink-0">
                                                    {p.incomingCount} in / {p.outgoingCount} out
                                                </Badge>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            <div className="glass-card rounded-2xl p-6 md:col-span-2">
                                <h3 className="font-semibold mb-3">How This Works</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs text-muted-foreground">
                                    {[
                                        { step: "1", title: "Graph Analysis", desc: "Fetches all posts, parses HTML, maps every internal link between pages" },
                                        { step: "2", title: "Opportunity Detection", desc: "Finds pages with low support, matches relevant source pages by topic overlap" },
                                        { step: "3", title: "AI Suggestion", desc: "AI picks the best anchor text and minimally rewrites one paragraph to insert the link" },
                                        { step: "4", title: "Safe Apply", desc: "Re-fetches latest content, validates the edit, and writes it back via Blogger API" },
                                    ].map((s) => (
                                        <div key={s.step} className="flex gap-2">
                                            <span className="w-6 h-6 rounded-full bg-[#FF6600]/10 text-[#FF6600] flex items-center justify-center shrink-0 text-[10px] font-bold">
                                                {s.step}
                                            </span>
                                            <div>
                                                <p className="font-medium text-foreground">{s.title}</p>
                                                <p>{s.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab: Opportunities */}
                    {activeTab === "opportunities" && (
                        <div className="space-y-3">
                            {opportunities.length === 0 ? (
                                <div className="glass-card rounded-2xl p-12 text-center">
                                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                                    <h3 className="text-lg font-bold mb-1">No Opportunities Found</h3>
                                    <p className="text-sm text-muted-foreground">Your internal linking looks solid! All pages have adequate support.</p>
                                </div>
                            ) : (
                                opportunities.map((opp) => (
                                    <div key={opp.id} className="glass-card rounded-xl border border-border/50 overflow-hidden">
                                        {/* Header */}
                                        <div
                                            className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-muted/20 transition-colors"
                                            onClick={() => toggleExpand(opp.id)}
                                        >
                                            <Badge className={`text-[10px] shrink-0 ${priorityColor(opp.priority)}`}>
                                                {opp.priority}
                                            </Badge>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="font-medium truncate max-w-[200px]">{opp.sourceTitle}</span>
                                                    <ArrowRight className="w-3 h-3 text-[#FF6600] shrink-0" />
                                                    <span className="font-medium truncate max-w-[200px] text-[#FF6600]">{opp.targetTitle}</span>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">{opp.reason}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {opp.applyStatus === "applied" && (
                                                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px]">
                                                        <CheckCircle2 className="w-3 h-3 mr-1" /> Applied
                                                    </Badge>
                                                )}
                                                {opp.expanded ? (
                                                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Expanded Content */}
                                        {opp.expanded && (
                                            <div className="border-t border-border/50 p-4 space-y-4">
                                                {/* Source paragraph */}
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Source Paragraph</p>
                                                    <p className="text-xs text-muted-foreground bg-background rounded-lg p-3 border border-border/50">
                                                        {opp.sourceParagraphText}
                                                    </p>
                                                </div>

                                                {/* Candidate phrases */}
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Candidate Anchor Phrases</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {opp.candidatePhrases.map((phrase, i) => (
                                                            <Badge key={i} variant="outline" className="text-[10px]">
                                                                {phrase}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* AI Suggestion */}
                                                {!opp.suggestion && opp.applyStatus !== "applied" && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-[#FF6600] hover:bg-[#FF8533] text-white border-0"
                                                        onClick={() => handleGetSuggestion(opp.id)}
                                                        disabled={opp.suggestLoading}
                                                    >
                                                        {opp.suggestLoading ? (
                                                            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                                                        ) : (
                                                            <Sparkles className="w-3 h-3 mr-1.5" />
                                                        )}
                                                        {opp.suggestLoading ? "Generating..." : "Get AI Suggestion"}
                                                    </Button>
                                                )}

                                                {opp.suggestion && (
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[10px] uppercase font-bold text-[#FF6600]">AI Suggested Edit</p>
                                                            <Badge className="bg-[#FF6600]/10 text-[#FF6600] text-[10px]">
                                                                {Math.round(opp.suggestion.confidence * 100)}% confidence
                                                            </Badge>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div>
                                                                <p className="text-[10px] text-muted-foreground mb-1 font-medium">Before</p>
                                                                <div className="text-xs bg-background rounded-lg p-3 border border-border/50">
                                                                    <div dangerouslySetInnerHTML={{ __html: opp.sourceParagraphHtml }} />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-[#FF6600] mb-1 font-medium">After</p>
                                                                <div className="text-xs bg-[#FF6600]/5 rounded-lg p-3 border border-[#FF6600]/20 prose prose-a:text-[#FF6600] prose-a:font-semibold prose-a:underline max-w-none">
                                                                    <div dangerouslySetInnerHTML={{ __html: opp.suggestion.newParagraphHtml }} />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <LinkIcon className="w-3 h-3" />
                                                            Anchor: <strong className="text-foreground">&quot;{opp.suggestion.anchorText}&quot;</strong>
                                                            <span className="mx-1">|</span>
                                                            {opp.suggestion.reason}
                                                        </div>

                                                        {/* Apply / Status */}
                                                        {opp.applyStatus === "idle" && (
                                                            <Button
                                                                size="sm"
                                                                className="bg-green-500 hover:bg-green-600 text-white border-0"
                                                                onClick={() => handleApply(opp.id)}
                                                            >
                                                                <CheckCircle2 className="w-3 h-3 mr-1.5" />
                                                                Apply to Blogger Post
                                                            </Button>
                                                        )}
                                                        {opp.applyStatus === "applying" && (
                                                            <Button size="sm" disabled className="bg-green-500/50 text-white border-0">
                                                                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                                                                Applying...
                                                            </Button>
                                                        )}
                                                        {opp.applyStatus === "applied" && (
                                                            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-500/10 px-3 py-2 rounded-lg">
                                                                <CheckCircle2 className="w-4 h-4" />
                                                                Link successfully inserted into the live Blogger post.
                                                            </div>
                                                        )}
                                                        {opp.applyStatus === "error" && (
                                                            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-500/10 px-3 py-2 rounded-lg">
                                                                <XCircle className="w-4 h-4" />
                                                                {opp.applyError || "Failed to apply. Try re-scanning."}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Meta info */}
                                                <div className="flex gap-4 text-[10px] text-muted-foreground pt-2 border-t border-border/30">
                                                    <span>Target incoming: {opp.targetIncomingCount} links</span>
                                                    <span>Source outgoing: {opp.sourceOutgoingCount} links</span>
                                                    <span>Relevance: {Math.round(opp.relevanceScore * 100)}%</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* Tab: Pages */}
                    {activeTab === "pages" && (
                        <div className="glass-card rounded-2xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-muted/40 text-left">
                                            <th className="px-4 py-3 font-semibold">Page</th>
                                            <th className="px-4 py-3 font-semibold text-center">Words</th>
                                            <th className="px-4 py-3 font-semibold text-center">Incoming</th>
                                            <th className="px-4 py-3 font-semibold text-center">Outgoing</th>
                                            <th className="px-4 py-3 font-semibold text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pages
                                            .sort((a, b) => a.incomingCount - b.incomingCount)
                                            .map((p) => (
                                                <tr key={p.postId} className="border-t border-border/30 hover:bg-muted/10">
                                                    <td className="px-4 py-2.5">
                                                        <a
                                                            href={p.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="font-medium hover:text-[#FF6600] transition-colors flex items-center gap-1 max-w-xs truncate"
                                                        >
                                                            {p.title}
                                                            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-40" />
                                                        </a>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center text-muted-foreground">{p.wordCount.toLocaleString()}</td>
                                                    <td className="px-4 py-2.5 text-center">
                                                        <span className={p.incomingCount === 0 ? "text-red-500 font-bold" : p.incomingCount <= 2 ? "text-amber-500" : ""}>
                                                            {p.incomingCount}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center text-muted-foreground">{p.outgoingCount}</td>
                                                    <td className="px-4 py-2.5 text-center">
                                                        {p.incomingCount === 0 ? (
                                                            <Badge className="bg-red-500/10 text-red-500 text-[10px]">Orphan</Badge>
                                                        ) : p.incomingCount <= 2 ? (
                                                            <Badge className="bg-amber-500/10 text-amber-600 text-[10px]">Weak</Badge>
                                                        ) : p.incomingCount >= 5 ? (
                                                            <Badge className="bg-green-500/10 text-green-500 text-[10px]">Strong</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-[10px]">OK</Badge>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Empty state */}
            {!stats && !isScanning && (
                <div className="glass-card rounded-2xl p-12 text-center flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-[#FF6600]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Network className="w-10 h-10 text-[#FF6600] opacity-60" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Internal Link Analysis</h3>
                    <p className="text-muted-foreground max-w-md mx-auto mb-6">
                        Click &quot;Scan Entire Site&quot; to fetch all your Blogger posts, build the internal link graph, and discover opportunities to strengthen your site structure.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg text-xs text-muted-foreground">
                        <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/20">
                            <BarChart3 className="w-5 h-5 text-[#FF6600] mb-1" />
                            <span className="font-medium text-foreground">Link Graph</span>
                            <span>Maps every internal link</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/20">
                            <Target className="w-5 h-5 text-[#FF6600] mb-1" />
                            <span className="font-medium text-foreground">Find Gaps</span>
                            <span>Detect orphan pages</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/20">
                            <Sparkles className="w-5 h-5 text-[#FF6600] mb-1" />
                            <span className="font-medium text-foreground">AI Insert</span>
                            <span>Natural link placement</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
