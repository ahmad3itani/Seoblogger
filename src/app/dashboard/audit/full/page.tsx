"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    Search,
    Loader2,
    ExternalLink,
    ChevronRight,
    Play,
    Wand2,
    Shield,
    TrendingUp,
    TrendingDown,
    Zap,
    Target,
    Eye,
    Link2,
    Image as ImageIcon,
    Gauge,
    Globe,
    Code2,
    FileText,
    ArrowUpRight,
    Info,
    History,
    RotateCcw,
    ChevronDown,
} from "lucide-react";

type TabId = "overview" | "issues" | "pages" | "quick_wins" | "history";

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
    technical: { label: "Technical SEO", icon: Code2, color: "text-blue-500" },
    content: { label: "Content Quality", icon: FileText, color: "text-purple-500" },
    ctr: { label: "CTR & Rankings", icon: Target, color: "text-emerald-500" },
    internal_linking: { label: "Internal Linking", icon: Link2, color: "text-indigo-500" },
    image: { label: "Images", icon: ImageIcon, color: "text-pink-500" },
    performance: { label: "Performance", icon: Gauge, color: "text-orange-500" },
    indexing: { label: "Indexing", icon: Globe, color: "text-cyan-500" },
    schema: { label: "Schema & Data", icon: Code2, color: "text-amber-500" },
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    critical: { label: "CRITICAL", color: "text-red-600", bg: "bg-red-500/10", border: "border-red-500/30" },
    high: { label: "HIGH", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30" },
    medium: { label: "MEDIUM", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30" },
    low: { label: "LOW", color: "text-yellow-600", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
    info: { label: "INFO", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30" },
};

export default function AdvancedAuditPage() {
    const [scanData, setScanData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState("");
    const [selectedBlog, setSelectedBlog] = useState<{ id: string, url: string } | null>(null);
    const [blogs, setBlogs] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<TabId>("overview");
    const [expandedIssue, setExpandedIssue] = useState<string | null>(null);

    // Legacy audit data (fallback for existing /api/audit/full)
    const [legacyData, setLegacyData] = useState<any>(null);

    // AI Fix Panel State
    const [selectedIssue, setSelectedIssue] = useState<any>(null);
    const [isGeneratingFix, setIsGeneratingFix] = useState(false);
    const [aiFix, setAiFix] = useState<{ suggestion: string, explanation: string, analyzedKeyword?: string } | null>(null);
    const [isApplyingFix, setIsApplyingFix] = useState(false);

    // Batch Fix State
    const [isFixingAll, setIsFixingAll] = useState(false);
    const [fixProgress, setFixProgress] = useState({ current: 0, total: 0, currentIssue: "" });
    const [fixedIssueIds, setFixedIssueIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const pRes = await fetch("/api/blogs");
            const pData = await pRes.json();

            if (pData.blogs && pData.blogs.length > 0) {
                setBlogs(pData.blogs);
                const defaultBlog = pData.blogs.find((b: any) => b.isDefault) || pData.blogs[0];
                setSelectedBlog({ id: defaultBlog.id, url: defaultBlog.url });

                // Try to fetch legacy data
                try {
                    const res = await fetch(`/api/audit/full?blogId=${defaultBlog.id}`);
                    const auditResp = await res.json();
                    if (auditResp.success && auditResp.session) {
                        setLegacyData(auditResp.session);
                    }
                } catch (e) {
                    console.error("Legacy audit fetch:", e);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBlogChange = async (blogId: string) => {
        const blog = blogs.find((b: any) => b.id === blogId);
        if (blog) {
            setSelectedBlog({ id: blog.id, url: blog.url });
            setScanData(null);
            setLegacyData(null);
            setIsLoading(true);
            try {
                const res = await fetch(`/api/audit/full?blogId=${blog.id}`);
                const auditResp = await res.json();
                if (auditResp.success && auditResp.session) {
                    setLegacyData(auditResp.session);
                }
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleProScan = async () => {
        if (!selectedBlog) {
            alert("Please connect a blog first");
            return;
        }
        setIsScanning(true);
        setScanData(null);
        setScanProgress("Discovering pages from sitemap...");

        try {
            const res = await fetch("/api/audit/pro-scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ blogId: selectedBlog.id }),
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                setIsScanning(false);
                setScanProgress("");
                alert(data.error || "Scan failed");
                return;
            }

            setScanData(data);
            setActiveTab("overview");
        } catch (error) {
            console.error(error);
            alert("Scan failed. Please try again.");
        } finally {
            setIsScanning(false);
            setScanProgress("");
        }
    };

    // Also keep legacy scan for backward compat
    const handleLegacyScan = async () => {
        if (!selectedBlog) return;
        setIsScanning(true);
        setLegacyData(null);
        try {
            const res = await fetch("/api/audit/full/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ blogId: selectedBlog.id }),
            });
            const data = await res.json();

            if (data.success && data.sessionId) {
                const interval = setInterval(async () => {
                    try {
                        const checkRes = await fetch(`/api/audit/full?blogId=${selectedBlog.id}`);
                        const checkData = await checkRes.json();
                        if (checkData.success && checkData.session) {
                            if (checkData.session.id === data.sessionId) {
                                if (checkData.session.status === "completed" || checkData.session.status === "failed") {
                                    clearInterval(interval);
                                    setLegacyData(checkData.session);
                                    setIsScanning(false);
                                }
                            }
                        }
                    } catch (e) {
                        console.error("Poller Error", e);
                    }
                }, 3000);
            } else {
                setIsScanning(false);
            }
        } catch (error) {
            console.error(error);
            setIsScanning(false);
        }
    };

    const handleGenerateFix = async (issue: any, pageUrl?: string) => {
        setSelectedIssue(issue);
        setIsGeneratingFix(true);
        setAiFix(null);
        try {
            const res = await fetch("/api/audit/fix/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    issueId: issue.definitionId || issue.issueId,
                    description: issue.description || issue.title,
                    pageUrl: pageUrl || issue.pageUrl,
                    bloggerPostId: "mock-post-id",
                    blogId: selectedBlog?.id || "",
                }),
            });
            const data = await res.json();
            if (data.success) {
                setAiFix({
                    suggestion: data.suggestion,
                    explanation: data.explanation,
                    analyzedKeyword: data.analyzedKeyword,
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsGeneratingFix(false);
        }
    };

    const handleApplyFix = async () => {
        if (!selectedIssue || !aiFix || !selectedBlog) return;
        setIsApplyingFix(true);
        try {
            const res = await fetch("/api/audit/fix/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    issueId: selectedIssue.definitionId || selectedIssue.issueId,
                    dbIssueId: selectedIssue.id,
                    suggestedFix: aiFix.suggestion,
                    pageUrl: selectedIssue.pageUrl,
                    bloggerPostId: "mock-post-id",
                    blogId: selectedBlog.id,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setFixedIssueIds((prev) => new Set([...prev, selectedIssue.definitionId + ":" + selectedIssue.pageUrl]));
                setSelectedIssue(null);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsApplyingFix(false);
        }
    };

    // ─── Helpers ─────────────────────────────────────────────────

    const getGradeColor = (grade: string) => {
        if (grade.startsWith("A")) return "text-green-500";
        if (grade.startsWith("B")) return "text-blue-500";
        if (grade.startsWith("C")) return "text-yellow-500";
        if (grade.startsWith("D")) return "text-orange-500";
        return "text-red-500";
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return "bg-green-500";
        if (score >= 60) return "bg-blue-500";
        if (score >= 40) return "bg-yellow-500";
        if (score >= 20) return "bg-orange-500";
        return "bg-red-500";
    };

    const getConfidenceBadge = (confidence: string, score: number) => {
        const colors: Record<string, string> = {
            high: "bg-green-500/10 text-green-600 border-green-500/20",
            medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
            low: "bg-red-500/10 text-red-600 border-red-500/20",
        };
        return (
            <Badge variant="outline" className={`text-[10px] ${colors[confidence] || colors.medium}`}>
                {score}% confidence
            </Badge>
        );
    };

    // ─── Render ──────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" />
            </div>
        );
    }

    const hasScanData = scanData?.success;

    return (
        <div className="space-y-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 mb-2 flex items-center gap-2">
                        <Activity className="w-8 h-8 text-[#FF6600]" />
                        SEO Auditor
                    </h1>
                    <p className="text-muted-foreground">
                        Systematic site analysis with confidence scoring, prioritization, and safe fix management.
                    </p>
                </div>
                {blogs.length > 0 && (
                    <div className="flex items-center gap-3">
                        <Select value={selectedBlog?.id || ""} onValueChange={(val) => val && handleBlogChange(val)} disabled={isScanning}>
                            <SelectTrigger className="w-[200px] h-11 bg-white">
                                <SelectValue placeholder="Select a blog" />
                            </SelectTrigger>
                            <SelectContent>
                                {blogs.map((b: any) => (
                                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {hasScanData && !isScanning && (
                            <Button onClick={handleProScan} variant="outline" className="h-11 border-[#FF6600] text-[#FF6600] hover:bg-[#FF6600]/10 shrink-0">
                                <RefreshCw className="w-4 h-4 mr-2" /> Rescan
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Empty State */}
            {!hasScanData && !isScanning && (
                <div className="glass-card rounded-2xl p-16 text-center border-dashed">
                    <div className="w-20 h-20 bg-[#FF6600]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Search className="w-10 h-10 text-[#FF6600]" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Ready to Audit Your Site?</h2>
                    <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                        Our pro scanner crawls every page, detects issues across 8 categories, scores each finding with confidence levels, and prioritizes by impact.
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center mb-8">
                        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                            <Badge key={key} variant="secondary" className="text-xs px-3 py-1">
                                <cfg.icon className={`w-3 h-3 mr-1.5 ${cfg.color}`} />
                                {cfg.label}
                            </Badge>
                        ))}
                    </div>
                    <Button onClick={handleProScan} className="h-12 px-8 text-base bg-[#FF6600] hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/25">
                        <Play className="w-5 h-5 mr-2 fill-current" /> Start Pro Scan
                    </Button>
                </div>
            )}

            {/* Scanning State */}
            {isScanning && (
                <div className="glass-card rounded-2xl p-16 text-center">
                    <div className="w-20 h-20 bg-[#FF6600]/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                        <RefreshCw className="w-10 h-10 text-[#FF6600] animate-spin" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Scanning Your Site...</h2>
                    <p className="text-muted-foreground">{scanProgress || "Crawling pages, detecting issues, computing scores..."}</p>
                </div>
            )}

            {/* ═══ SCAN RESULTS ═══ */}
            {hasScanData && !isScanning && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-700">

                    {/* ─── Score Overview Bar ─── */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Overall Score */}
                        <div className="glass-card p-6 rounded-2xl border-l-4 border-l-[#FF6600] md:col-span-1">
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Overall Score</p>
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-5xl font-black text-[#FF6600]">{scanData.score.overall}</h2>
                                <span className="text-lg text-muted-foreground">/100</span>
                                <span className={`text-2xl font-black ${getGradeColor(scanData.score.grade)}`}>{scanData.score.grade}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">{scanData.score.summary}</p>

                            {/* Trend comparison */}
                            {scanData.comparison && (
                                <div className={`mt-3 pt-3 border-t flex items-center gap-2 text-sm ${scanData.comparison.scoreDelta >= 0 ? "text-green-600" : "text-red-500"}`}>
                                    {scanData.comparison.scoreDelta >= 0 ? (
                                        <TrendingUp className="w-4 h-4" />
                                    ) : (
                                        <TrendingDown className="w-4 h-4" />
                                    )}
                                    <span className="font-semibold">
                                        {scanData.comparison.scoreDelta >= 0 ? "+" : ""}{scanData.comparison.scoreDelta} points
                                    </span>
                                    <span className="text-muted-foreground text-xs">since last scan</span>
                                </div>
                            )}
                        </div>

                        {/* Key Stats */}
                        <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="glass-card p-5 rounded-2xl text-center">
                                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Pages Scanned</p>
                                <h2 className="text-3xl font-bold mt-1">{scanData.meta.pagesScanned}</h2>
                            </div>
                            <div className="glass-card p-5 rounded-2xl text-center">
                                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Issues</p>
                                <h2 className="text-3xl font-bold mt-1">{scanData.score.totalIssues}</h2>
                            </div>
                            <div className="glass-card p-5 rounded-2xl text-center">
                                <p className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center justify-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> Critical
                                </p>
                                <h2 className="text-3xl font-bold mt-1 text-red-500">{scanData.score.criticalIssues}</h2>
                            </div>
                            <div className="glass-card p-5 rounded-2xl text-center">
                                <p className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center justify-center gap-1">
                                    <Wand2 className="w-3 h-3 text-[#FF6600]" /> Fixable
                                </p>
                                <h2 className="text-3xl font-bold mt-1 text-[#FF6600]">{scanData.score.fixableIssues}</h2>
                            </div>
                        </div>
                    </div>

                    {/* ─── Category Score Breakdown ─── */}
                    <div className="glass-card rounded-2xl p-6 border">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-[#FF6600]" />
                            Score by Category
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {scanData.score.categories.map((cat: any) => {
                                const cfg = CATEGORY_CONFIG[cat.category] || { label: cat.label, icon: Code2, color: "text-gray-500" };
                                const IconComp = cfg.icon;
                                return (
                                    <div key={cat.category} className="bg-muted/30 rounded-xl p-4 border border-border/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <IconComp className={`w-4 h-4 ${cfg.color}`} />
                                                <span className="text-sm font-semibold">{cfg.label}</span>
                                            </div>
                                            <span className="text-lg font-black">{cat.score}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`${getScoreColor(cat.score)} h-2 rounded-full transition-all duration-700`}
                                                style={{ width: `${cat.score}%` }}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                                            {cat.criticalCount > 0 && <span className="text-red-500">{cat.criticalCount} critical</span>}
                                            {cat.highCount > 0 && <span className="text-red-400">{cat.highCount} high</span>}
                                            {cat.mediumCount > 0 && <span className="text-orange-400">{cat.mediumCount} med</span>}
                                            {cat.lowCount > 0 && <span className="text-yellow-500">{cat.lowCount} low</span>}
                                            {cat.issueCount === 0 && <span className="text-green-500">No issues</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ─── Tab Navigation ─── */}
                    <div className="flex gap-1 bg-muted/50 p-1 rounded-xl border border-border/50">
                        {([
                            { id: "overview" as TabId, label: "Prioritized Issues", icon: Target },
                            { id: "quick_wins" as TabId, label: "Quick Wins", icon: Zap },
                            { id: "pages" as TabId, label: "Page Scores", icon: FileText },
                        ]).map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                    activeTab === tab.id
                                        ? "bg-white shadow-sm text-[#FF6600] border border-[#FF6600]/20"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* ─── Tab Content: Prioritized Issues ─── */}
                    {activeTab === "overview" && (
                        <div className="glass-card rounded-2xl overflow-hidden border">
                            <div className="bg-muted px-6 py-4 flex justify-between items-center border-b">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-bold">All Issues — Sorted by Priority</h3>
                                    <Badge variant="secondary">{scanData.issues.length}</Badge>
                                </div>
                            </div>
                            <div className="divide-y max-h-[700px] overflow-y-auto">
                                {scanData.issues.map((issue: any, idx: number) => {
                                    const sevCfg = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.medium;
                                    const catCfg = CATEGORY_CONFIG[issue.category] || { label: issue.category, icon: Code2, color: "text-gray-500" };
                                    const CatIcon = catCfg.icon;
                                    const isExpanded = expandedIssue === `${issue.definitionId}:${issue.pageUrl}:${idx}`;
                                    const isFixed = fixedIssueIds.has(issue.definitionId + ":" + issue.pageUrl);

                                    return (
                                        <div key={`${issue.definitionId}:${issue.pageUrl}:${idx}`} className={`transition-colors ${isFixed ? "opacity-50 bg-green-50/30" : "hover:bg-muted/30"}`}>
                                            <div
                                                className="p-5 flex items-start justify-between cursor-pointer"
                                                onClick={() => setExpandedIssue(isExpanded ? null : `${issue.definitionId}:${issue.pageUrl}:${idx}`)}
                                            >
                                                <div className="flex gap-3 flex-1 min-w-0">
                                                    <div className="flex flex-col items-center gap-1 shrink-0 w-8">
                                                        <span className="text-[10px] font-bold text-muted-foreground">#{issue.priorityRank}</span>
                                                        {isFixed ? (
                                                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                        ) : issue.severity === "critical" || issue.severity === "high" ? (
                                                            <AlertCircle className="w-5 h-5 text-red-500" />
                                                        ) : issue.severity === "medium" ? (
                                                            <AlertCircle className="w-5 h-5 text-orange-400" />
                                                        ) : (
                                                            <AlertCircle className="w-5 h-5 text-yellow-400" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                            <Badge variant="outline" className={`text-[10px] ${sevCfg.color} ${sevCfg.bg} ${sevCfg.border}`}>
                                                                {sevCfg.label}
                                                            </Badge>
                                                            <Badge variant="secondary" className="text-[10px]">
                                                                <CatIcon className={`w-2.5 h-2.5 mr-1 ${catCfg.color}`} />
                                                                {catCfg.label}
                                                            </Badge>
                                                            {getConfidenceBadge(issue.confidence, issue.confidenceScore)}
                                                            {issue.fixable && (
                                                                <Badge variant="outline" className="text-[10px] bg-[#FF6600]/5 text-[#FF6600] border-[#FF6600]/20">
                                                                    <Wand2 className="w-2.5 h-2.5 mr-1" /> Fixable
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <h4 className={`font-semibold text-sm ${isFixed ? "line-through text-muted-foreground" : ""}`}>
                                                            {issue.title}
                                                        </h4>
                                                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-lg">
                                                            {issue.pageUrl}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="shrink-0 flex items-center gap-2">
                                                    {isFixed ? (
                                                        <span className="text-xs text-green-600 font-semibold">Applied</span>
                                                    ) : issue.fixable ? (
                                                        <Button
                                                            size="sm"
                                                            onClick={(e) => { e.stopPropagation(); handleGenerateFix(issue); }}
                                                            className="bg-[#FF6600]/10 text-[#FF6600] border border-[#FF6600]/20 hover:bg-[#FF6600] hover:text-white transition-all"
                                                        >
                                                            <Wand2 className="w-4 h-4 mr-1.5" /> Fix
                                                        </Button>
                                                    ) : (
                                                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">{issue.fixability}</span>
                                                    )}
                                                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                                </div>
                                            </div>

                                            {/* Expanded Trust Details */}
                                            {isExpanded && (
                                                <div className="px-5 pb-5 pt-0 ml-11 space-y-3 animate-in slide-in-from-top-1 duration-200">
                                                    <div className="bg-muted/50 rounded-xl p-4 space-y-3 border border-border/50">
                                                        {/* Why it matters */}
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 flex items-center gap-1">
                                                                <Info className="w-3 h-3" /> Why This Matters
                                                            </p>
                                                            <p className="text-sm">{issue.whyItMatters}</p>
                                                        </div>

                                                        {/* Trust signals */}
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                            <div className="bg-background rounded-lg p-2.5 border">
                                                                <p className="text-[9px] uppercase font-bold text-muted-foreground">Detected By</p>
                                                                <p className="text-xs font-semibold mt-0.5 capitalize">{issue.detectedBy}</p>
                                                            </div>
                                                            <div className="bg-background rounded-lg p-2.5 border">
                                                                <p className="text-[9px] uppercase font-bold text-muted-foreground">Impact</p>
                                                                <p className="text-xs font-semibold mt-0.5">{issue.impactScore}/100</p>
                                                            </div>
                                                            <div className="bg-background rounded-lg p-2.5 border">
                                                                <p className="text-[9px] uppercase font-bold text-muted-foreground">Effort</p>
                                                                <p className="text-xs font-semibold mt-0.5">{issue.effortScore <= 25 ? "Easy" : issue.effortScore <= 50 ? "Moderate" : "High"}</p>
                                                            </div>
                                                            <div className="bg-background rounded-lg p-2.5 border">
                                                                <p className="text-[9px] uppercase font-bold text-muted-foreground">Safety</p>
                                                                <p className="text-xs font-semibold mt-0.5 capitalize">{issue.safety?.replace(/_/g, " ")}</p>
                                                            </div>
                                                        </div>

                                                        {/* Confidence reason */}
                                                        <div className="bg-background rounded-lg p-2.5 border">
                                                            <p className="text-[9px] uppercase font-bold text-muted-foreground">Confidence Reason</p>
                                                            <p className="text-xs mt-0.5">{issue.confidenceReason}</p>
                                                        </div>

                                                        {/* Current vs suggested */}
                                                        {(issue.currentValue || issue.suggestedValue) && (
                                                            <div className="flex gap-3">
                                                                {issue.currentValue && (
                                                                    <div className="flex-1 bg-red-50 rounded-lg p-2.5 border border-red-200">
                                                                        <p className="text-[9px] uppercase font-bold text-red-500">Current</p>
                                                                        <p className="text-xs mt-0.5 break-all">{issue.currentValue}</p>
                                                                    </div>
                                                                )}
                                                                {issue.suggestedValue && (
                                                                    <div className="flex-1 bg-green-50 rounded-lg p-2.5 border border-green-200">
                                                                        <p className="text-[9px] uppercase font-bold text-green-600">Suggested</p>
                                                                        <p className="text-xs mt-0.5 break-all">{issue.suggestedValue}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Blogger-specific note */}
                                                        {issue.bloggerNote && (
                                                            <div className="bg-[#FF6600]/5 rounded-lg p-2.5 border border-[#FF6600]/20">
                                                                <p className="text-[9px] uppercase font-bold text-[#FF6600]">Blogger Note</p>
                                                                <p className="text-xs mt-0.5">{issue.bloggerNote}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {scanData.issues.length === 0 && (
                                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                                        <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                                        <p className="font-semibold">No issues detected. Your site is in great shape!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ─── Tab Content: Quick Wins ─── */}
                    {activeTab === "quick_wins" && (
                        <div className="space-y-4">
                            <div className="glass-card rounded-2xl p-6 border bg-gradient-to-r from-[#FF6600]/5 to-transparent">
                                <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-[#FF6600]" />
                                    Quick Wins
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    High-impact issues that are easy to fix. Start here for the fastest SEO improvements.
                                </p>
                            </div>

                            {scanData.quickWins?.length > 0 ? (
                                <div className="space-y-3">
                                    {scanData.quickWins.map((issue: any, idx: number) => {
                                        const sevCfg = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.medium;
                                        return (
                                            <div key={idx} className="glass-card rounded-xl p-5 border flex items-start justify-between hover:border-[#FF6600]/30 transition-colors">
                                                <div className="flex gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-[#FF6600]/10 flex items-center justify-center shrink-0">
                                                        <Zap className="w-5 h-5 text-[#FF6600]" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <Badge variant="outline" className={`text-[10px] ${sevCfg.color} ${sevCfg.bg} ${sevCfg.border}`}>{sevCfg.label}</Badge>
                                                            {getConfidenceBadge(issue.confidence, issue.confidenceScore)}
                                                        </div>
                                                        <h4 className="font-semibold text-sm">{issue.title}</h4>
                                                        <p className="text-xs text-muted-foreground mt-0.5">{issue.description}</p>
                                                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                            <ExternalLink className="w-3 h-3" /> {issue.pageUrl}
                                                        </p>
                                                    </div>
                                                </div>
                                                {issue.fixable && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleGenerateFix(issue)}
                                                        className="bg-[#FF6600] text-white hover:bg-orange-600 shrink-0"
                                                    >
                                                        <Wand2 className="w-4 h-4 mr-1.5" /> Fix Now
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="glass-card rounded-2xl p-12 text-center border">
                                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                                    <p className="font-semibold">No quick wins available — your low-hanging fruit is already picked!</p>
                                </div>
                            )}

                            {/* Highest Impact */}
                            {scanData.highestImpact?.length > 0 && (
                                <>
                                    <div className="glass-card rounded-2xl p-6 border bg-gradient-to-r from-purple-500/5 to-transparent mt-6">
                                        <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                                            <ArrowUpRight className="w-5 h-5 text-purple-500" />
                                            Highest Impact
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            These fixes will have the biggest impact on your SEO performance.
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        {scanData.highestImpact.map((issue: any, idx: number) => {
                                            const sevCfg = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.medium;
                                            return (
                                                <div key={idx} className="glass-card rounded-xl p-5 border flex items-start justify-between hover:border-purple-500/30 transition-colors">
                                                    <div className="flex gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                                                            <ArrowUpRight className="w-5 h-5 text-purple-500" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                <Badge variant="outline" className={`text-[10px] ${sevCfg.color} ${sevCfg.bg} ${sevCfg.border}`}>{sevCfg.label}</Badge>
                                                                <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/20">
                                                                    Impact: {issue.impactScore}/100
                                                                </Badge>
                                                            </div>
                                                            <h4 className="font-semibold text-sm">{issue.title}</h4>
                                                            <p className="text-xs text-muted-foreground mt-0.5">{issue.description}</p>
                                                        </div>
                                                    </div>
                                                    {issue.fixable && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleGenerateFix(issue)}
                                                            className="bg-purple-500/10 text-purple-600 border border-purple-500/20 hover:bg-purple-500 hover:text-white transition-all shrink-0"
                                                        >
                                                            <Wand2 className="w-4 h-4 mr-1.5" /> Fix
                                                        </Button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ─── Tab Content: Page Scores ─── */}
                    {activeTab === "pages" && (
                        <div className="glass-card rounded-2xl overflow-hidden border">
                            <div className="bg-muted px-6 py-4 border-b">
                                <h3 className="font-bold flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-[#FF6600]" />
                                    Page-Level Scores
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">Pages sorted by score — worst first.</p>
                            </div>
                            <div className="divide-y max-h-[600px] overflow-y-auto">
                                {scanData.pageScores?.map((page: any, idx: number) => (
                                    <div key={idx} className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                                            style={{
                                                background: page.score >= 80 ? "rgba(34, 197, 94, 0.1)" :
                                                    page.score >= 60 ? "rgba(59, 130, 246, 0.1)" :
                                                    page.score >= 40 ? "rgba(234, 179, 8, 0.1)" :
                                                    "rgba(239, 68, 68, 0.1)",
                                            }}
                                        >
                                            <span className={`text-lg font-black ${
                                                page.score >= 80 ? "text-green-500" :
                                                page.score >= 60 ? "text-blue-500" :
                                                page.score >= 40 ? "text-yellow-500" :
                                                "text-red-500"
                                            }`}>{page.score}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-semibold text-sm truncate">{page.title || page.url}</h4>
                                            <p className="text-xs text-muted-foreground truncate">{page.url}</p>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-3">
                                            <Badge variant="secondary" className="text-[10px]">
                                                {page.issueCount} issue{page.issueCount !== 1 ? "s" : ""}
                                            </Badge>
                                            {page.criticalCount > 0 && (
                                                <Badge variant="outline" className="text-[10px] text-red-500 border-red-500/30 bg-red-500/10">
                                                    {page.criticalCount} critical
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Scan comparison (if exists) */}
                    {scanData.comparison && (
                        <div className="glass-card rounded-2xl p-6 border">
                            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                                <History className="w-4 h-4 text-[#FF6600]" />
                                Since Last Scan
                            </h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Score Change</p>
                                    <p className={`text-xl font-bold ${scanData.comparison.scoreDelta >= 0 ? "text-green-500" : "text-red-500"}`}>
                                        {scanData.comparison.scoreDelta >= 0 ? "+" : ""}{scanData.comparison.scoreDelta}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">New Issues</p>
                                    <p className="text-xl font-bold text-red-500">{scanData.comparison.newIssues}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Issues Fixed</p>
                                    <p className="text-xl font-bold text-green-500">{scanData.comparison.fixedIssues}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ AI Fix Panel (Slide-out) ═══ */}
            {selectedIssue && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
                    <div className="w-[520px] h-full bg-background p-6 shadow-2xl border-l animate-in slide-in-from-right overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Wand2 className="w-5 h-5 text-[#FF6600]" /> AI Auto-Fix
                            </h3>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedIssue(null)}>✕</Button>
                        </div>

                        <div className="space-y-5">
                            {/* Issue info */}
                            <div className="bg-muted/50 p-4 rounded-xl border space-y-2">
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Issue Detected</p>
                                <p className="text-sm font-semibold">{selectedIssue.title}</p>
                                <p className="text-xs text-muted-foreground">{selectedIssue.description}</p>
                            </div>

                            {/* Trust signals */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-muted/30 rounded-lg p-2.5 border text-center">
                                    <p className="text-[9px] uppercase font-bold text-muted-foreground">Confidence</p>
                                    <p className="text-sm font-bold mt-0.5">{selectedIssue.confidenceScore || 85}%</p>
                                </div>
                                <div className="bg-muted/30 rounded-lg p-2.5 border text-center">
                                    <p className="text-[9px] uppercase font-bold text-muted-foreground">Safety</p>
                                    <p className="text-sm font-bold mt-0.5 capitalize">{(selectedIssue.safety || "safe_with_review").replace(/_/g, " ")}</p>
                                </div>
                                <div className="bg-muted/30 rounded-lg p-2.5 border text-center">
                                    <p className="text-[9px] uppercase font-bold text-muted-foreground">Impact</p>
                                    <p className="text-sm font-bold mt-0.5">{selectedIssue.impactScore || 70}/100</p>
                                </div>
                            </div>

                            {isGeneratingFix ? (
                                <div className="h-32 flex flex-col items-center justify-center text-center p-4">
                                    <Loader2 className="w-8 h-8 text-[#FF6600] animate-spin mb-3" />
                                    <p className="text-sm text-muted-foreground">Engineering customized SEO fix...</p>
                                </div>
                            ) : aiFix ? (
                                <div className="space-y-4">
                                    {aiFix.analyzedKeyword && (
                                        <div className="bg-[#FF6600]/5 border border-[#FF6600]/20 p-4 rounded-xl flex items-center gap-3">
                                            <Search className="w-5 h-5 text-[#FF6600]" />
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Analyzed Target Keyword</p>
                                                <p className="text-sm font-bold text-[#FF6600]">"{aiFix.analyzedKeyword}"</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs text-green-600 uppercase font-semibold flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> AI SEO Recommendation
                                            </p>
                                            <span className="text-[10px] text-muted-foreground uppercase">Editable</span>
                                        </div>
                                        <Textarea
                                            value={aiFix.suggestion}
                                            onChange={(e) => setAiFix({ ...aiFix, suggestion: e.target.value })}
                                            className="min-h-[120px] bg-white border-green-500/30 focus-visible:ring-green-500 font-medium"
                                        />
                                        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-green-500/10">
                                            {aiFix.explanation}
                                        </p>
                                    </div>

                                    <div className="bg-yellow-500/10 p-3 rounded-xl border border-yellow-500/20 flex items-start gap-2">
                                        <Eye className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                                        <p className="text-xs text-yellow-700">
                                            <strong>Human review recommended.</strong> Review the suggestion above before applying. You can edit it to match your style.
                                        </p>
                                    </div>

                                    <Button
                                        disabled={isApplyingFix}
                                        onClick={handleApplyFix}
                                        className="w-full bg-[#FF6600] text-white hover:bg-orange-600"
                                    >
                                        {isApplyingFix ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                                        {isApplyingFix ? "Applying Safely..." : "Apply Fix to Blogger"}
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
