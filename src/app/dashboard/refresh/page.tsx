"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
    RefreshCw,
    Search,
    CheckCircle2,
    Loader2,
    Save,
    Eye,
    Code,
    TrendingDown,
    TrendingUp,
    AlertCircle,
    Clock,
    FileText,
    Zap,
    Target,
    ChevronDown,
    ChevronRight,
    ArrowRight,
    RotateCcw,
    Shield,
    ExternalLink,
    Sparkles,
    ListChecks,
    BookOpen,
    HelpCircle,
    Link2,
    ImageIcon,
    BarChart3,
    ArrowLeft,
} from "lucide-react";

type Stage = "candidates" | "diagnosis" | "plan" | "preview" | "apply";

const TIER_CONFIG: Record<number, { label: string; color: string; bg: string; icon: any }> = {
    1: { label: "Best Opportunity", color: "text-emerald-600", bg: "bg-emerald-500/10", icon: Target },
    2: { label: "Declining Asset", color: "text-orange-600", bg: "bg-orange-500/10", icon: TrendingDown },
    3: { label: "Weak Legacy", color: "text-yellow-600", bg: "bg-yellow-500/10", icon: Clock },
};

export default function ContentRefreshPage() {
    const [stage, setStage] = useState<Stage>("candidates");
    const [blogs, setBlogs] = useState<any[]>([]);
    const [selectedBlog, setSelectedBlog] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Candidates
    const [candidates, setCandidates] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState("");
    const [filterTier, setFilterTier] = useState<string>("all");

    // Selected candidate
    const [selectedCandidate, setSelectedCandidate] = useState<any>(null);

    // Plan
    const [plan, setPlan] = useState<any>(null);
    const [diagnosis, setDiagnosis] = useState<any>(null);
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

    // Preview
    const [version, setVersion] = useState<any>(null);
    const [isGeneratingContent, setIsGeneratingContent] = useState(false);
    const [viewMode, setViewMode] = useState<"preview" | "code">("preview");

    // Apply
    const [isApplying, setIsApplying] = useState(false);
    const [applyResult, setApplyResult] = useState<any>(null);

    const [error, setError] = useState("");

    useEffect(() => {
        fetchBlogs();
    }, []);

    const fetchBlogs = async () => {
        try {
            const res = await fetch("/api/blogs");
            const data = await res.json();
            if (data.blogs?.length > 0) {
                setBlogs(data.blogs);
                const defaultBlog = data.blogs.find((b: any) => b.isDefault) || data.blogs[0];
                setSelectedBlog(defaultBlog);
                await fetchCandidates(defaultBlog.id);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCandidates = async (blogId: string) => {
        try {
            const res = await fetch(`/api/refresh/candidates?blogId=${blogId}`);
            const data = await res.json();
            if (data.success) {
                setCandidates(data.candidates || []);
                setStats(data.stats || null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleRunPipeline = async () => {
        if (!selectedBlog) return;
        setIsScanning(true);
        setError("");
        setScanProgress("Fetching posts from Blogger...");

        try {
            const res = await fetch("/api/refresh/candidates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ blogId: selectedBlog.id }),
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(data.error || "Pipeline failed");
                setIsScanning(false);
                setScanProgress("");
                return;
            }

            setScanProgress(`Found ${data.candidatesFound} candidates (${data.tier1Count} best opportunities)`);
            await fetchCandidates(selectedBlog.id);
        } catch (err: any) {
            setError(err.message || "Pipeline failed");
        } finally {
            setIsScanning(false);
            setScanProgress("");
        }
    };

    const handleSelectCandidate = (candidate: any) => {
        setSelectedCandidate(candidate);
        setPlan(null);
        setDiagnosis(null);
        setVersion(null);
        setApplyResult(null);
        setStage("diagnosis");
    };

    const handleGeneratePlan = async () => {
        if (!selectedCandidate) return;
        setIsGeneratingPlan(true);
        setError("");

        try {
            const res = await fetch("/api/refresh/plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ candidateId: selectedCandidate.id, mode: "section" }),
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(data.error || "Failed to generate plan");
                return;
            }

            setPlan(data.plan);
            setDiagnosis(data.diagnosis);
            setStage("plan");
        } catch (err: any) {
            setError(err.message || "Failed to generate plan");
        } finally {
            setIsGeneratingPlan(false);
        }
    };

    const handleGenerateContent = async (mode: "section" | "full") => {
        if (!plan) return;
        setIsGeneratingContent(true);
        setError("");

        try {
            const res = await fetch("/api/refresh/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId: plan.id, mode }),
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(data.error || "Failed to generate content");
                return;
            }

            setVersion(data.version);
            setStage("preview");
        } catch (err: any) {
            setError(err.message || "Failed to generate content");
        } finally {
            setIsGeneratingContent(false);
        }
    };

    const handleApply = async (rollback = false) => {
        if (!version) return;
        setIsApplying(true);
        setError("");

        try {
            const res = await fetch("/api/refresh/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ versionId: version.id, rollback }),
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(data.error || "Failed to apply");
                return;
            }

            setApplyResult(data);
            setStage("apply");
        } catch (err: any) {
            setError(err.message || "Failed to apply");
        } finally {
            setIsApplying(false);
        }
    };

    const goBack = () => {
        if (stage === "diagnosis") { setStage("candidates"); setSelectedCandidate(null); }
        else if (stage === "plan") setStage("diagnosis");
        else if (stage === "preview") setStage("plan");
        else if (stage === "apply") setStage("preview");
    };

    const filtered = filterTier === "all" ? candidates : candidates.filter((c: any) => c.tier === parseInt(filterTier));

    // ─── RENDER ──────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl pb-20">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <RefreshCw className="w-6 h-6 text-[#FF6600]" />
                        Content Refresh Engine
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Find underperforming posts, diagnose why they&apos;re slipping, generate a stronger version, and update Blogger without changing the URL.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {blogs.length > 1 && (
                        <Select value={selectedBlog?.id || ""} onValueChange={(val) => {
                            const blog = blogs.find((b: any) => b.id === val);
                            if (blog) { setSelectedBlog(blog); fetchCandidates(blog.id); }
                        }}>
                            <SelectTrigger className="w-[200px] h-10 bg-white">
                                <SelectValue placeholder="Select blog" />
                            </SelectTrigger>
                            <SelectContent>
                                {blogs.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>

            {/* Breadcrumb / Stage Indicator */}
            {stage !== "candidates" && (
                <div className="flex items-center gap-2 text-sm">
                    <button onClick={() => { setStage("candidates"); setSelectedCandidate(null); }} className="text-muted-foreground hover:text-foreground">
                        Candidates
                    </button>
                    {selectedCandidate && (
                        <>
                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            <button onClick={() => setStage("diagnosis")} className={stage === "diagnosis" ? "font-medium text-[#FF6600]" : "text-muted-foreground hover:text-foreground"}>
                                Diagnosis
                            </button>
                        </>
                    )}
                    {(stage === "plan" || stage === "preview" || stage === "apply") && (
                        <>
                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            <button onClick={() => setStage("plan")} className={stage === "plan" ? "font-medium text-[#FF6600]" : "text-muted-foreground hover:text-foreground"}>
                                Plan
                            </button>
                        </>
                    )}
                    {(stage === "preview" || stage === "apply") && (
                        <>
                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            <button onClick={() => setStage("preview")} className={stage === "preview" ? "font-medium text-[#FF6600]" : "text-muted-foreground hover:text-foreground"}>
                                Preview
                            </button>
                        </>
                    )}
                    {stage === "apply" && (
                        <>
                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            <span className="font-medium text-emerald-600">Applied</span>
                        </>
                    )}
                </div>
            )}

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                    <button onClick={() => setError("")} className="ml-auto text-xs underline">Dismiss</button>
                </div>
            )}

            {/* ═══ STAGE: CANDIDATES LIST ═══ */}
            {stage === "candidates" && (
                <div className="space-y-6">
                    {/* Stats Bar */}
                    {stats && stats.total > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="glass-card rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold">{stats.total}</div>
                                <div className="text-xs text-muted-foreground">Total Candidates</div>
                            </div>
                            <div className="glass-card rounded-xl p-4 text-center border-emerald-500/20">
                                <div className="text-2xl font-bold text-emerald-600">{stats.tier1}</div>
                                <div className="text-xs text-muted-foreground">Best Opportunities</div>
                            </div>
                            <div className="glass-card rounded-xl p-4 text-center border-orange-500/20">
                                <div className="text-2xl font-bold text-orange-600">{stats.tier2}</div>
                                <div className="text-xs text-muted-foreground">Declining Assets</div>
                            </div>
                            <div className="glass-card rounded-xl p-4 text-center border-yellow-500/20">
                                <div className="text-2xl font-bold text-yellow-600">{stats.tier3}</div>
                                <div className="text-xs text-muted-foreground">Weak Legacy</div>
                            </div>
                            <div className="glass-card rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-[#FF6600]">{stats.avgScore}</div>
                                <div className="text-xs text-muted-foreground">Avg Score</div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Filter:</span>
                            {["all", "1", "2", "3"].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setFilterTier(t)}
                                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                                        filterTier === t ? "bg-[#FF6600]/10 border-[#FF6600]/30 text-[#FF6600] font-medium" : "border-border/50 text-muted-foreground hover:border-border"
                                    }`}
                                >
                                    {t === "all" ? "All" : t === "1" ? "Best" : t === "2" ? "Declining" : "Legacy"}
                                </button>
                            ))}
                        </div>
                        <Button onClick={handleRunPipeline} disabled={isScanning} className="glow-button text-white border-0">
                            {isScanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                            {isScanning ? "Scanning..." : candidates.length > 0 ? "Rescan Posts" : "Find Refresh Candidates"}
                        </Button>
                    </div>

                    {isScanning && scanProgress && (
                        <div className="glass-card rounded-xl p-6 text-center">
                            <Loader2 className="w-8 h-8 animate-spin text-[#FF6600] mx-auto mb-3" />
                            <p className="font-medium">{scanProgress}</p>
                            <p className="text-xs text-muted-foreground mt-1">Fetching posts, crawling pages, analyzing content...</p>
                        </div>
                    )}

                    {/* Empty State */}
                    {!isScanning && candidates.length === 0 && (
                        <div className="glass-card rounded-2xl p-16 text-center border-dashed">
                            <div className="w-20 h-20 bg-[#FF6600]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <RefreshCw className="w-10 h-10 text-[#FF6600] opacity-50" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">No Refresh Candidates Yet</h3>
                            <p className="text-muted-foreground max-w-md mx-auto mb-6">
                                Click &quot;Find Refresh Candidates&quot; to scan your Blogger posts and identify which ones need updating.
                            </p>
                            <Button onClick={handleRunPipeline} disabled={isScanning} className="glow-button text-white border-0">
                                <Search className="w-4 h-4 mr-2" /> Scan My Blog
                            </Button>
                        </div>
                    )}

                    {/* Candidates Table */}
                    {filtered.length > 0 && (
                        <div className="space-y-3">
                            {filtered.map((c: any) => {
                                const tierCfg = TIER_CONFIG[c.tier] || TIER_CONFIG[3];
                                const TierIcon = tierCfg.icon;
                                return (
                                    <div key={c.id} className="glass-card rounded-xl p-4 hover:border-[#FF6600]/30 transition-colors cursor-pointer group" onClick={() => handleSelectCandidate(c)}>
                                        <div className="flex items-start gap-4">
                                            <div className={`w-12 h-12 rounded-xl ${tierCfg.bg} flex items-center justify-center shrink-0`}>
                                                <TierIcon className={`w-5 h-5 ${tierCfg.color}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <h3 className="font-semibold text-sm truncate group-hover:text-[#FF6600] transition-colors">{c.title}</h3>
                                                        <p className="text-xs text-muted-foreground truncate mt-0.5">{c.url}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <div className={`text-lg font-bold ${c.refreshScore >= 60 ? "text-emerald-600" : c.refreshScore >= 35 ? "text-orange-600" : "text-yellow-600"}`}>
                                                            {c.refreshScore}
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-[#FF6600] transition-colors" />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                    <Badge variant="outline" className={`${tierCfg.bg} ${tierCfg.color} border-0 text-[10px]`}>
                                                        {tierCfg.label}
                                                    </Badge>
                                                    {c.wordCount > 0 && (
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <FileText className="w-3 h-3" /> {c.wordCount} words
                                                        </span>
                                                    )}
                                                    {c.impressionsLast28 != null && (
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <Eye className="w-3 h-3" /> {c.impressionsLast28} imp
                                                        </span>
                                                    )}
                                                    {c.avgPositionLast28 != null && (
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <BarChart3 className="w-3 h-3" /> pos {c.avgPositionLast28.toFixed(1)}
                                                        </span>
                                                    )}
                                                    {c.publishedAt && (
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> {new Date(c.publishedAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                                {c.reasonSummary && (
                                                    <p className="text-[11px] text-muted-foreground mt-2 line-clamp-1">{c.reasonSummary}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ STAGE: DIAGNOSIS ═══ */}
            {stage === "diagnosis" && selectedCandidate && (
                <div className="space-y-6">
                    <button onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="w-4 h-4" /> Back to Candidates
                    </button>

                    {/* Candidate Header */}
                    <div className="glass-card rounded-xl p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold">{selectedCandidate.title}</h2>
                                <a href={selectedCandidate.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#FF6600] hover:underline flex items-center gap-1 mt-1">
                                    {selectedCandidate.url} <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-3xl font-bold text-[#FF6600]">{selectedCandidate.refreshScore}</div>
                                <div className="text-xs text-muted-foreground">Refresh Score</div>
                            </div>
                        </div>
                    </div>

                    {/* Diagnostic Cards */}
                    {selectedCandidate.diagnostic && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <DiagCard title="Performance Opportunity" score={selectedCandidate.diagnostic.performanceOpportunity} icon={Target} />
                            <DiagCard title="Decline Signal" score={selectedCandidate.diagnostic.declineSignal} icon={TrendingDown} />
                            <DiagCard title="Content Weakness" score={selectedCandidate.diagnostic.contentWeakness} icon={FileText} />
                            <DiagCard title="Freshness / Age" score={selectedCandidate.diagnostic.freshnessAge} icon={Clock} />
                            <DiagCard title="Index Confidence" score={selectedCandidate.diagnostic.indexConfidence} icon={Shield} />
                        </div>
                    )}

                    {/* Content Signals */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <SignalCard label="Word Count" value={selectedCandidate.wordCount} icon={FileText} />
                        <SignalCard label="H2 Headings" value={selectedCandidate.h2Count} icon={ListChecks} />
                        <SignalCard label="Internal Links" value={selectedCandidate.internalLinks} icon={Link2} />
                        <SignalCard label="Images" value={selectedCandidate.imagesCount} icon={ImageIcon} />
                    </div>

                    {/* Reason Summary */}
                    {selectedCandidate.reasonSummary && (
                        <div className="glass-card rounded-xl p-5">
                            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                <HelpCircle className="w-4 h-4 text-[#FF6600]" /> Why Refresh This Post?
                            </h3>
                            <p className="text-sm text-muted-foreground">{selectedCandidate.reasonSummary}</p>
                        </div>
                    )}

                    {/* Action: Generate Plan */}
                    <div className="glass-card rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-[#FF6600]/20">
                        <div>
                            <h3 className="font-semibold">Ready to create a refresh plan?</h3>
                            <p className="text-xs text-muted-foreground mt-1">AI will analyze the full content and propose what to add, expand, and rewrite.</p>
                        </div>
                        <Button onClick={handleGeneratePlan} disabled={isGeneratingPlan} className="glow-button text-white border-0 shrink-0">
                            {isGeneratingPlan ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                            {isGeneratingPlan ? "Generating Plan..." : "Generate Refresh Plan"}
                        </Button>
                    </div>
                </div>
            )}

            {/* ═══ STAGE: PLAN ═══ */}
            {stage === "plan" && plan && (
                <div className="space-y-6">
                    <button onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="w-4 h-4" /> Back to Diagnosis
                    </button>

                    {/* Plan Summary */}
                    <div className="glass-card rounded-xl p-6">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-[#FF6600]" /> Refresh Plan
                            </h2>
                            <Badge variant="outline" className={`${plan.expectedImpact === "high" ? "bg-emerald-500/10 text-emerald-600" : plan.expectedImpact === "medium" ? "bg-orange-500/10 text-orange-600" : "bg-yellow-500/10 text-yellow-600"} border-0`}>
                                {plan.expectedImpact} impact
                            </Badge>
                        </div>

                        <div className="space-y-3">
                            <PlanSection title="Why Refresh" content={plan.whyRefresh} />
                            <PlanSection title="What to Add" content={plan.whatToAdd} />
                            <PlanSection title="What to Keep" content={plan.whatToKeep} />
                            {plan.whatToRemove && <PlanSection title="What to Remove" content={plan.whatToRemove} />}
                        </div>
                    </div>

                    {/* Proposed Outline */}
                    {plan.proposedOutline?.length > 0 && (
                        <div className="glass-card rounded-xl p-6">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <ListChecks className="w-4 h-4 text-[#FF6600]" /> Proposed Outline
                            </h3>
                            <div className="space-y-2">
                                {plan.proposedOutline.map((o: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3 text-sm">
                                        <Badge variant="outline" className={`text-[10px] w-16 justify-center ${
                                            o.action === "add" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                            o.action === "expand" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                                            o.action === "rewrite" ? "bg-orange-500/10 text-orange-600 border-orange-500/20" :
                                            "bg-muted/50 text-muted-foreground border-border/50"
                                        }`}>
                                            {o.action}
                                        </Badge>
                                        <span>{o.heading}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Proposed FAQs */}
                    {plan.proposedFaqs?.length > 0 && (
                        <div className="glass-card rounded-xl p-6">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <HelpCircle className="w-4 h-4 text-[#FF6600]" /> Proposed FAQs ({plan.proposedFaqs.length})
                            </h3>
                            <div className="space-y-3">
                                {plan.proposedFaqs.map((f: any, i: number) => (
                                    <div key={i} className="border border-border/50 rounded-lg p-3">
                                        <p className="font-medium text-sm">Q: {f.question}</p>
                                        <p className="text-xs text-muted-foreground mt-1">A: {f.answer}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Suggested Title */}
                    {plan.suggestedTitle && plan.suggestedTitle !== selectedCandidate?.title && (
                        <div className="glass-card rounded-xl p-5">
                            <h3 className="font-semibold text-sm mb-2">Suggested Title</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="text-sm"><span className="text-muted-foreground text-xs block mb-1">Current:</span> {selectedCandidate?.title}</div>
                                <div className="text-sm"><span className="text-[#FF6600] text-xs block mb-1">Suggested:</span> {plan.suggestedTitle}</div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="glass-card rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-[#FF6600]/20">
                        <div>
                            <h3 className="font-semibold">Generate Refreshed Content</h3>
                            <p className="text-xs text-muted-foreground mt-1">Choose section-level (safer) or full rewrite mode.</p>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => handleGenerateContent("section")} disabled={isGeneratingContent} className="glow-button text-white border-0">
                                {isGeneratingContent ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                                Section Refresh
                            </Button>
                            <Button onClick={() => handleGenerateContent("full")} disabled={isGeneratingContent} variant="outline" className="border-[#FF6600]/30 text-[#FF6600] hover:bg-[#FF6600]/5">
                                Full Rewrite
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ STAGE: PREVIEW ═══ */}
            {stage === "preview" && version && (
                <div className="space-y-6">
                    <button onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="w-4 h-4" /> Back to Plan
                    </button>

                    {/* Change Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="glass-card rounded-xl p-4 text-center">
                            <div className="text-lg font-bold">{version.changeSummary?.wordCountBefore || 0}</div>
                            <div className="text-[10px] text-muted-foreground">Words Before</div>
                        </div>
                        <div className="glass-card rounded-xl p-4 text-center border-[#FF6600]/20">
                            <div className="text-lg font-bold text-[#FF6600]">{version.changeSummary?.wordCountAfter || 0}</div>
                            <div className="text-[10px] text-muted-foreground">Words After</div>
                        </div>
                        <div className="glass-card rounded-xl p-4 text-center">
                            <div className="text-lg font-bold text-emerald-600">+{(version.changeSummary?.wordCountAfter || 0) - (version.changeSummary?.wordCountBefore || 0)}</div>
                            <div className="text-[10px] text-muted-foreground">Words Added</div>
                        </div>
                        <div className="glass-card rounded-xl p-4 text-center">
                            <div className="text-lg font-bold text-blue-600">{version.changeSummary?.sectionsAdded?.length || 0}</div>
                            <div className="text-[10px] text-muted-foreground">Sections Added</div>
                        </div>
                        <div className="glass-card rounded-xl p-4 text-center">
                            <div className="text-lg font-bold text-purple-600">{version.changeSummary?.faqsAdded || 0}</div>
                            <div className="text-[10px] text-muted-foreground">FAQs Added</div>
                        </div>
                    </div>

                    {/* Title Comparison */}
                    {version.oldTitle !== version.newTitle && (
                        <div className="glass-card rounded-xl p-5">
                            <h3 className="font-semibold text-sm mb-2">Title Change</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div><span className="text-[10px] text-muted-foreground block mb-1">Before:</span><span className="text-sm opacity-70">{version.oldTitle}</span></div>
                                <div><span className="text-[10px] text-[#FF6600] block mb-1">After:</span><span className="text-sm font-medium">{version.newTitle}</span></div>
                            </div>
                        </div>
                    )}

                    {/* View Toggle */}
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-lg">Content Preview</h2>
                        <div className="flex bg-muted p-1 rounded-lg">
                            <button onClick={() => setViewMode("preview")} className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${viewMode === "preview" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                                <Eye className="w-3.5 h-3.5" /> Preview
                            </button>
                            <button onClick={() => setViewMode("code")} className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${viewMode === "code" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                                <Code className="w-3.5 h-3.5" /> HTML
                            </button>
                        </div>
                    </div>

                    {/* Side-by-Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Badge variant="outline" className="w-full justify-center bg-muted/50 border-border/50 text-muted-foreground">Original</Badge>
                            <div className="glass-card rounded-xl p-4 h-[500px] overflow-y-auto">
                                {viewMode === "preview" ? (
                                    <div className="prose prose-sm dark:prose-invert max-w-none opacity-60" dangerouslySetInnerHTML={{ __html: version.oldHtml }} />
                                ) : (
                                    <pre className="text-xs font-mono whitespace-pre-wrap opacity-60 break-words">{version.oldHtml}</pre>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Badge variant="outline" className="w-full justify-center bg-[#FF6600]/10 border-[#FF6600]/30 text-[#FF6600]">Refreshed</Badge>
                            <div className="glass-card border-[#FF6600]/20 rounded-xl p-4 h-[500px] overflow-y-auto">
                                {viewMode === "preview" ? (
                                    <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: version.newHtml }} />
                                ) : (
                                    <Textarea
                                        className="w-full h-full min-h-[450px] font-mono text-xs bg-transparent border-0 focus-visible:ring-0 p-0 resize-none"
                                        value={version.newHtml}
                                        onChange={(e) => setVersion({ ...version, newHtml: e.target.value })}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Validation Warnings */}
                    {version.validation && !version.validation.valid && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 px-4 py-3 rounded-xl text-sm">
                            <strong className="flex items-center gap-1"><AlertCircle className="w-4 h-4" /> HTML Validation Warnings:</strong>
                            <ul className="mt-1 list-disc list-inside text-xs">
                                {version.validation.issues.map((issue: string, i: number) => <li key={i}>{issue}</li>)}
                            </ul>
                        </div>
                    )}

                    {/* Apply Bar */}
                    <div className="glass-card rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-[#FF6600]/20">
                        <div>
                            <h3 className="font-semibold flex items-center gap-2">
                                <Shield className="w-4 h-4 text-emerald-500" /> Push to Blogger
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                This will update the existing post. The URL stays the same. You can rollback anytime.
                            </p>
                        </div>
                        <Button onClick={() => handleApply(false)} disabled={isApplying} className="bg-gradient-to-r from-orange-500 to-[#FF6600] text-white border-0 shrink-0">
                            {isApplying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            {isApplying ? "Applying..." : "Update Live Post"}
                        </Button>
                    </div>
                </div>
            )}

            {/* ═══ STAGE: APPLIED ═══ */}
            {stage === "apply" && applyResult && (
                <div className="space-y-6">
                    <div className="glass-card rounded-2xl p-12 text-center">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">
                            {applyResult.action === "rolled_back" ? "Rollback Complete" : "Post Updated Successfully!"}
                        </h2>
                        <p className="text-muted-foreground max-w-md mx-auto mb-2">
                            {applyResult.verified
                                ? "The content has been updated and verified on Blogger. The URL remains unchanged."
                                : "The content update was sent to Blogger. Verification is pending."}
                        </p>
                        <a href={applyResult.postUrl} target="_blank" rel="noopener noreferrer" className="text-[#FF6600] hover:underline text-sm flex items-center justify-center gap-1 mb-6">
                            View Live Post <ExternalLink className="w-3 h-3" />
                        </a>
                        <div className="flex gap-3 justify-center">
                            <Button onClick={() => handleApply(true)} variant="outline" className="text-sm">
                                <RotateCcw className="w-4 h-4 mr-2" /> Rollback to Original
                            </Button>
                            <Button onClick={() => { setStage("candidates"); setSelectedCandidate(null); }} className="glow-button text-white border-0">
                                <ArrowRight className="w-4 h-4 mr-2" /> Refresh Another Post
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Sub-components ──────────────────────────────────────────────

function DiagCard({ title, score, icon: Icon }: { title: string; score: number; icon: any }) {
    const color = score >= 60 ? "text-red-500" : score >= 30 ? "text-orange-500" : "text-emerald-500";
    const bg = score >= 60 ? "bg-red-500" : score >= 30 ? "bg-orange-500" : "bg-emerald-500";
    return (
        <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" /> {title}
                </span>
                <span className={`text-sm font-bold ${color}`}>{score}</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${bg} rounded-full transition-all`} style={{ width: `${score}%` }} />
            </div>
        </div>
    );
}

function SignalCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
    return (
        <div className="glass-card rounded-xl p-3 text-center">
            <Icon className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
            <div className="text-lg font-bold">{value}</div>
            <div className="text-[10px] text-muted-foreground">{label}</div>
        </div>
    );
}

function PlanSection({ title, content }: { title: string; content: string }) {
    if (!content) return null;
    return (
        <div>
            <h4 className="text-xs font-medium text-[#FF6600] mb-1">{title}</h4>
            <p className="text-sm text-muted-foreground">{content}</p>
        </div>
    );
}
