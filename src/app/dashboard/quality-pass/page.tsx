"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Sparkles,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    AlertCircle,
    Info,
    Lightbulb,
    Eye,
    Code,
    ArrowLeft,
    ArrowRight,
    Save,
    Send,
    ChevronDown,
    ChevronRight,
    Shield,
    BookOpen,
    Target,
    Fingerprint,
    Heart,
    Zap,
    FileText,
    BarChart3,
    ExternalLink,
    RefreshCw,
    Check,
    X,
} from "lucide-react";

type Stage = "setup" | "analyzing" | "review" | "rewriting" | "preview" | "applied";

const SCORE_CATEGORIES = [
    { key: "readability", label: "Readability", icon: BookOpen, color: "text-blue-600", bg: "bg-blue-500" },
    { key: "helpfulness", label: "Helpfulness", icon: Heart, color: "text-rose-600", bg: "bg-rose-500" },
    { key: "originality", label: "Originality", icon: Fingerprint, color: "text-purple-600", bg: "bg-purple-500" },
    { key: "naturalness", label: "Naturalness", icon: Zap, color: "text-amber-600", bg: "bg-amber-500" },
    { key: "trust", label: "Trust", icon: Shield, color: "text-emerald-600", bg: "bg-emerald-500" },
    { key: "publishSafety", label: "Publish Safety", icon: CheckCircle2, color: "text-teal-600", bg: "bg-teal-500" },
];

const SEVERITY_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    critical: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-500/10", label: "Critical" },
    warning: { icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-500/10", label: "Warning" },
    info: { icon: Info, color: "text-blue-600", bg: "bg-blue-500/10", label: "Info" },
    suggestion: { icon: Lightbulb, color: "text-purple-600", bg: "bg-purple-500/10", label: "Suggestion" },
};

export default function QualityPassPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const articleId = searchParams.get("articleId");

    const [stage, setStage] = useState<Stage>("setup");
    const [article, setArticle] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    // Setup inputs
    const [primaryTopic, setPrimaryTopic] = useState("");
    const [targetAudience, setTargetAudience] = useState("");
    const [brandVoice, setBrandVoice] = useState("");
    const [showUserContext, setShowUserContext] = useState(false);
    const [personalExample, setPersonalExample] = useState("");
    const [lessonLearned, setLessonLearned] = useState("");
    const [tonePreference, setTonePreference] = useState("");

    // Analysis results
    const [passRunId, setPassRunId] = useState("");
    const [scores, setScores] = useState<any>(null);
    const [flags, setFlags] = useState<any[]>([]);
    const [metrics, setMetrics] = useState<any>(null);
    const [summary, setSummary] = useState("");

    // Rewrite results
    const [newHtml, setNewHtml] = useState("");
    const [originalHtml, setOriginalHtml] = useState("");
    const [newTitle, setNewTitle] = useState("");
    const [changeSummary, setChangeSummary] = useState("");
    const [changesApplied, setChangesApplied] = useState<string[]>([]);
    const [scoresBefore, setScoresBefore] = useState<any>(null);
    const [scoresAfter, setScoresAfter] = useState<any>(null);
    const [wordCountBefore, setWordCountBefore] = useState(0);
    const [wordCountAfter, setWordCountAfter] = useState(0);
    const [validation, setValidation] = useState<any>(null);
    const [versionId, setVersionId] = useState("");

    // UI state
    const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
    const [flagFilter, setFlagFilter] = useState<string>("all");
    const [isApplying, setIsApplying] = useState(false);
    const [applyResult, setApplyResult] = useState<any>(null);

    useEffect(() => {
        if (articleId) fetchArticle(articleId);
        else setIsLoading(false);
    }, [articleId]);

    const fetchArticle = async (id: string) => {
        try {
            const res = await fetch(`/api/articles/${id}`);
            if (res.ok) {
                const data = await res.json();
                setArticle(data);
                setPrimaryTopic(data.title);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Stage 1+2: Analyze ──────────────────────────────────────

    const handleAnalyze = async () => {
        if (!article) return;
        setStage("analyzing");
        setError("");

        try {
            const res = await fetch("/api/quality-pass/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    articleId: article.id,
                    primaryTopic,
                    targetAudience,
                    brandVoice,
                }),
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(data.error || "Analysis failed");
                setStage("setup");
                return;
            }

            setPassRunId(data.passRunId);
            setScores(data.scores);
            setFlags(data.flags || []);
            setMetrics(data.metrics);
            setSummary(data.summary);
            setStage("review");
        } catch (err: any) {
            setError(err.message || "Analysis failed");
            setStage("setup");
        }
    };

    // ─── Stage 3: Rewrite ────────────────────────────────────────

    const handleRewrite = async () => {
        if (!passRunId) return;
        setStage("rewriting");
        setError("");

        try {
            const userContext: any = {};
            if (personalExample) userContext.personalExample = personalExample;
            if (lessonLearned) userContext.lessonLearned = lessonLearned;
            if (tonePreference) userContext.tonePreference = tonePreference;

            const res = await fetch("/api/quality-pass/rewrite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    passRunId,
                    brandVoice,
                    targetAudience,
                    userContext: Object.keys(userContext).length > 0 ? userContext : undefined,
                }),
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(data.error || "Rewrite failed");
                setStage("review");
                return;
            }

            setVersionId(data.versionId);
            setNewHtml(data.newHtml);
            setOriginalHtml(data.originalHtml);
            setNewTitle(data.newTitle);
            setChangeSummary(data.changeSummary);
            setChangesApplied(data.changesApplied || []);
            setScoresBefore(data.scoresBefore);
            setScoresAfter(data.scores);
            setWordCountBefore(data.wordCountBefore);
            setWordCountAfter(data.wordCountAfter);
            setValidation(data.validation);
            setStage("preview");
        } catch (err: any) {
            setError(err.message || "Rewrite failed");
            setStage("review");
        }
    };

    // ─── Apply ───────────────────────────────────────────────────

    const handleApply = async (pushToBlogger = false) => {
        if (!versionId) return;
        setIsApplying(true);
        setError("");

        try {
            const res = await fetch("/api/quality-pass/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    versionId,
                    newTitle: newTitle !== article?.title ? newTitle : undefined,
                    pushToBlogger,
                }),
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(data.error || "Apply failed");
                return;
            }

            setApplyResult(data);
            setStage("applied");
        } catch (err: any) {
            setError(err.message || "Apply failed");
        } finally {
            setIsApplying(false);
        }
    };

    const filteredFlags = flagFilter === "all" ? flags : flags.filter((f: any) => f.severity === flagFilter);

    // ─── RENDER ──────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" />
            </div>
        );
    }

    if (!article) {
        return (
            <div className="max-w-3xl mx-auto py-16 text-center">
                <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No article selected</h3>
                <p className="text-sm text-muted-foreground mb-4">Open an article and click &quot;Run Quality Pass&quot; to get started.</p>
                <Button variant="outline" onClick={() => router.push("/dashboard/articles")}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Go to Articles
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl pb-20">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/articles/${article.id}`)}>
                        <ArrowLeft className="w-4 h-4 mr-1" /> Article
                    </Button>
                </div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-[#FF6600]" />
                    Human Quality Pass
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Make &quot;{article.title.length > 60 ? article.title.slice(0, 60) + "..." : article.title}&quot; clearer, more useful, and safer to publish.
                </p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                    <button onClick={() => setError("")} className="ml-auto text-xs underline">Dismiss</button>
                </div>
            )}

            {/* ═══ STAGE: SETUP ═══ */}
            {stage === "setup" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Article preview */}
                        <div className="glass-card rounded-xl p-6">
                            <h2 className="font-semibold mb-1">{article.title}</h2>
                            <div className="flex gap-2 text-xs text-muted-foreground mb-4">
                                <span>{article.wordCount} words</span>
                                <span>•</span>
                                <Badge variant="outline" className="text-[10px]">{article.status}</Badge>
                            </div>
                            <div className="prose prose-sm dark:prose-invert max-w-none max-h-[300px] overflow-y-auto opacity-70" dangerouslySetInnerHTML={{ __html: article.content }} />
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Configuration */}
                        <div className="glass-card rounded-xl p-6 space-y-4">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                                <Target className="w-4 h-4 text-[#FF6600]" /> Quality Pass Settings
                            </h3>
                            <div>
                                <Label className="text-xs">Primary Topic</Label>
                                <Input className="mt-1 bg-muted/30 text-sm" value={primaryTopic} onChange={(e) => setPrimaryTopic(e.target.value)} placeholder="e.g., Blogger SEO optimization" />
                            </div>
                            <div>
                                <Label className="text-xs">Target Audience</Label>
                                <Input className="mt-1 bg-muted/30 text-sm" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="e.g., beginner bloggers" />
                            </div>
                            <div>
                                <Label className="text-xs">Brand Voice</Label>
                                <Input className="mt-1 bg-muted/30 text-sm" value={brandVoice} onChange={(e) => setBrandVoice(e.target.value)} placeholder="e.g., clear, practical, trustworthy" />
                            </div>

                            {/* Optional user context */}
                            <button onClick={() => setShowUserContext(!showUserContext)} className="flex items-center gap-1 text-xs text-[#FF6600] hover:underline">
                                {showUserContext ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                Make it more real (optional)
                            </button>
                            {showUserContext && (
                                <div className="space-y-3 pl-2 border-l-2 border-[#FF6600]/20">
                                    <div>
                                        <Label className="text-[10px]">Personal Example</Label>
                                        <Textarea className="mt-1 bg-muted/30 text-xs h-16" value={personalExample} onChange={(e) => setPersonalExample(e.target.value)} placeholder="Share a real example to include..." />
                                    </div>
                                    <div>
                                        <Label className="text-[10px]">Lesson Learned</Label>
                                        <Input className="mt-1 bg-muted/30 text-xs" value={lessonLearned} onChange={(e) => setLessonLearned(e.target.value)} placeholder="A key insight from your experience..." />
                                    </div>
                                    <div>
                                        <Label className="text-[10px]">Tone Preference</Label>
                                        <Input className="mt-1 bg-muted/30 text-xs" value={tonePreference} onChange={(e) => setTonePreference(e.target.value)} placeholder="e.g., warm and conversational" />
                                    </div>
                                </div>
                            )}

                            <Button onClick={handleAnalyze} className="w-full glow-button text-white border-0 mt-2">
                                <Sparkles className="w-4 h-4 mr-2" /> Run Quality Analysis
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ STAGE: ANALYZING ═══ */}
            {stage === "analyzing" && (
                <div className="glass-card rounded-2xl p-16 text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-[#FF6600] mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Analyzing Your Article</h3>
                    <p className="text-muted-foreground max-w-md mx-auto text-sm">
                        Running readability checks, repetition detection, helpfulness analysis, originality scoring, trust evaluation, and Blogger safety validation...
                    </p>
                </div>
            )}

            {/* ═══ STAGE: REVIEW (scores + flags) ═══ */}
            {stage === "review" && scores && (
                <div className="space-y-6">
                    {/* Overall Score */}
                    <div className="glass-card rounded-xl p-6 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold">Human Quality Score</h2>
                            <p className="text-sm text-muted-foreground mt-1">{summary}</p>
                        </div>
                        <div className="text-right">
                            <div className={`text-4xl font-bold ${scores.overall >= 75 ? "text-emerald-600" : scores.overall >= 50 ? "text-orange-600" : "text-red-600"}`}>
                                {scores.overall}
                            </div>
                            <div className="text-xs text-muted-foreground">out of 100</div>
                        </div>
                    </div>

                    {/* Category Scores */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {SCORE_CATEGORIES.map((cat) => {
                            const score = scores[cat.key] || 0;
                            const CatIcon = cat.icon;
                            return (
                                <div key={cat.key} className="glass-card rounded-xl p-4">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <CatIcon className={`w-3.5 h-3.5 ${cat.color}`} />
                                        <span className="text-[10px] font-medium text-muted-foreground">{cat.label}</span>
                                    </div>
                                    <div className={`text-xl font-bold ${score >= 75 ? "text-emerald-600" : score >= 50 ? "text-orange-600" : "text-red-600"}`}>
                                        {score}
                                    </div>
                                    <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                                        <div className={`h-full rounded-full ${cat.bg}`} style={{ width: `${score}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Metrics */}
                    {metrics && (
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                            <MetricCard label="Words" value={metrics.wordCount} />
                            <MetricCard label="Sentences" value={metrics.sentenceCount} />
                            <MetricCard label="Avg Sentence" value={`${metrics.avgSentenceLength} words`} />
                            <MetricCard label="Headings" value={metrics.h2Count + metrics.h3Count} />
                            <MetricCard label="Images" value={metrics.imageCount} />
                        </div>
                    )}

                    {/* Flags */}
                    {flags.length > 0 && (
                        <div className="glass-card rounded-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-[#FF6600]" />
                                    Issues Found ({flags.length})
                                </h3>
                                <div className="flex gap-1">
                                    {["all", "critical", "warning", "suggestion"].map((sev) => (
                                        <button key={sev} onClick={() => setFlagFilter(sev)} className={`px-2.5 py-1 text-[10px] rounded-md border transition-colors ${flagFilter === sev ? "bg-[#FF6600]/10 border-[#FF6600]/30 text-[#FF6600] font-medium" : "border-border/50 text-muted-foreground"}`}>
                                            {sev === "all" ? "All" : sev.charAt(0).toUpperCase() + sev.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                {filteredFlags.map((flag: any, i: number) => {
                                    const sevCfg = SEVERITY_CONFIG[flag.severity] || SEVERITY_CONFIG.info;
                                    const SevIcon = sevCfg.icon;
                                    return (
                                        <div key={i} className={`rounded-lg p-3 ${sevCfg.bg} border border-transparent`}>
                                            <div className="flex items-start gap-2">
                                                <SevIcon className={`w-4 h-4 shrink-0 mt-0.5 ${sevCfg.color}`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <Badge variant="outline" className="text-[9px] border-0 bg-background/50">{flag.category}</Badge>
                                                        <Badge variant="outline" className={`text-[9px] border-0 ${sevCfg.bg} ${sevCfg.color}`}>{sevCfg.label}</Badge>
                                                    </div>
                                                    <p className="text-sm">{flag.message}</p>
                                                    {flag.suggestedFix && (
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            <strong>Fix:</strong> {flag.suggestedFix}
                                                        </p>
                                                    )}
                                                    {flag.beforeSnippet && (
                                                        <div className="mt-2 text-xs bg-background/50 rounded p-2 font-mono opacity-70">
                                                            {flag.beforeSnippet}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Action: Run Rewrite */}
                    <div className="glass-card rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-[#FF6600]/20">
                        <div>
                            <h3 className="font-semibold">Ready to improve this article?</h3>
                            <p className="text-xs text-muted-foreground mt-1">AI will fix the issues above, improve clarity, specificity, and flow while preserving your content structure.</p>
                        </div>
                        <Button onClick={handleRewrite} className="glow-button text-white border-0 shrink-0">
                            <Sparkles className="w-4 h-4 mr-2" /> Run Quality Rewrite
                        </Button>
                    </div>
                </div>
            )}

            {/* ═══ STAGE: REWRITING ═══ */}
            {stage === "rewriting" && (
                <div className="glass-card rounded-2xl p-16 text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-[#FF6600] mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Improving Your Article</h3>
                    <p className="text-muted-foreground max-w-md mx-auto text-sm">
                        Rewriting for clarity, fixing awkward phrasing, boosting specificity, improving flow, and polishing for Blogger...
                    </p>
                </div>
            )}

            {/* ═══ STAGE: PREVIEW ═══ */}
            {stage === "preview" && (
                <div className="space-y-6">
                    {/* Score Comparison */}
                    {scoresBefore && scoresAfter && (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                            {[...SCORE_CATEGORIES, { key: "overall", label: "Overall", icon: BarChart3, color: "text-[#FF6600]", bg: "bg-[#FF6600]" }].map((cat) => {
                                const before = scoresBefore[cat.key] || 0;
                                const after = scoresAfter[cat.key] || 0;
                                const delta = after - before;
                                return (
                                    <div key={cat.key} className="glass-card rounded-xl p-3 text-center">
                                        <div className="text-[10px] text-muted-foreground mb-1">{cat.label}</div>
                                        <div className="flex items-center justify-center gap-1">
                                            <span className="text-sm opacity-50">{before}</span>
                                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                            <span className={`text-lg font-bold ${after >= 75 ? "text-emerald-600" : after >= 50 ? "text-orange-600" : "text-red-600"}`}>{after}</span>
                                        </div>
                                        {delta !== 0 && (
                                            <div className={`text-[10px] font-medium ${delta > 0 ? "text-emerald-600" : "text-red-500"}`}>
                                                {delta > 0 ? "+" : ""}{delta}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Word count + changes */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <MetricCard label="Words Before" value={wordCountBefore} />
                        <MetricCard label="Words After" value={wordCountAfter} />
                        <MetricCard label="Words Added" value={`+${Math.max(0, wordCountAfter - wordCountBefore)}`} />
                        <MetricCard label="Changes Made" value={changesApplied.length} />
                    </div>

                    {/* Change Summary */}
                    {changeSummary && (
                        <div className="glass-card rounded-xl p-5">
                            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 text-[#FF6600]" /> What Changed
                            </h3>
                            <p className="text-sm text-muted-foreground">{changeSummary}</p>
                            {changesApplied.length > 0 && (
                                <ul className="mt-2 space-y-1">
                                    {changesApplied.map((c, i) => (
                                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                            <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                                            {c}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {/* Title comparison */}
                    {newTitle && newTitle !== article.title && (
                        <div className="glass-card rounded-xl p-5">
                            <h3 className="font-semibold text-sm mb-2">Title Improvement</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div><span className="text-[10px] text-muted-foreground block mb-1">Before:</span><span className="text-sm opacity-60">{article.title}</span></div>
                                <div><span className="text-[10px] text-[#FF6600] block mb-1">After:</span><span className="text-sm font-medium">{newTitle}</span></div>
                            </div>
                        </div>
                    )}

                    {/* View toggle */}
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

                    {/* Side-by-side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Badge variant="outline" className="w-full justify-center bg-muted/50 border-border/50 text-muted-foreground">Original Draft</Badge>
                            <div className="glass-card rounded-xl p-4 h-[500px] overflow-y-auto">
                                {viewMode === "preview" ? (
                                    <div className="prose prose-sm dark:prose-invert max-w-none opacity-60" dangerouslySetInnerHTML={{ __html: originalHtml }} />
                                ) : (
                                    <pre className="text-xs font-mono whitespace-pre-wrap opacity-60 break-words">{originalHtml}</pre>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Badge variant="outline" className="w-full justify-center bg-[#FF6600]/10 border-[#FF6600]/30 text-[#FF6600]">Polished Version</Badge>
                            <div className="glass-card border-[#FF6600]/20 rounded-xl p-4 h-[500px] overflow-y-auto">
                                {viewMode === "preview" ? (
                                    <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: newHtml }} />
                                ) : (
                                    <Textarea
                                        className="w-full h-full min-h-[450px] font-mono text-xs bg-transparent border-0 focus-visible:ring-0 p-0 resize-none"
                                        value={newHtml}
                                        onChange={(e) => setNewHtml(e.target.value)}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Validation */}
                    {validation && !validation.passed && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 px-4 py-3 rounded-xl text-sm">
                            <strong className="flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Validation Notes:</strong>
                            <ul className="mt-1 list-disc list-inside text-xs space-y-0.5">
                                {[...validation.structural.issues, ...validation.safety.issues, ...validation.style.issues].map((issue: string, i: number) => (
                                    <li key={i}>{issue}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Apply bar */}
                    <div className="glass-card rounded-xl p-6 border-[#FF6600]/20">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-emerald-500" /> Apply Changes
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Save the improved version to your article. Optionally push directly to Blogger.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => handleApply(false)} disabled={isApplying} className="glow-button text-white border-0">
                                    {isApplying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    Save to Article
                                </Button>
                                {article.blog && article.bloggerPostId && (
                                    <Button onClick={() => handleApply(true)} disabled={isApplying} variant="outline" className="border-[#FF6600]/30 text-[#FF6600] hover:bg-[#FF6600]/5">
                                        <Send className="w-4 h-4 mr-2" /> Save & Push to Blogger
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ STAGE: APPLIED ═══ */}
            {stage === "applied" && applyResult && (
                <div className="glass-card rounded-2xl p-12 text-center">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Quality Pass Applied!</h2>
                    <p className="text-muted-foreground max-w-md mx-auto mb-2">
                        Your article has been updated with the improved version ({applyResult.wordCount} words).
                    </p>
                    {applyResult.bloggerResult?.success && (
                        <a href={applyResult.bloggerResult.postUrl} target="_blank" rel="noopener noreferrer" className="text-[#FF6600] hover:underline text-sm flex items-center justify-center gap-1 mb-4">
                            View on Blogger <ExternalLink className="w-3 h-3" />
                        </a>
                    )}
                    {applyResult.bloggerResult && !applyResult.bloggerResult.success && (
                        <p className="text-xs text-red-500 mb-4">Blogger push failed: {applyResult.bloggerResult.error}</p>
                    )}
                    <div className="flex gap-3 justify-center mt-4">
                        <Button onClick={() => router.push(`/dashboard/articles/${article.id}`)} variant="outline">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Article
                        </Button>
                        <Button onClick={() => router.push("/dashboard/articles")} className="glow-button text-white border-0">
                            <ArrowRight className="w-4 h-4 mr-2" /> All Articles
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Sub-components ──────────────────────────────────────────────

function MetricCard({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="glass-card rounded-xl p-3 text-center">
            <div className="text-lg font-bold">{value}</div>
            <div className="text-[10px] text-muted-foreground">{label}</div>
        </div>
    );
}
