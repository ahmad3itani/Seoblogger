"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    RefreshCw,
    ArrowRight,
    FileText,
    TrendingUp,
    Info,
    Search
} from "lucide-react";
import Link from "next/link";

interface AuditIssue {
    type: string;
    severity: "high" | "medium" | "low";
    message: string;
    postId: string;
    postTitle: string;
    postUrl: string;
}

interface SiteAudit {
    score: number;
    issues: AuditIssue[];
    runAt: string;
}

export default function AuditPage() {
    const [audit, setAudit] = useState<SiteAudit | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAudit = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/audit");
            const data = await res.json();
            if (res.ok && data.audit) {
                setAudit(data.audit);
            }
        } catch (err) {
            console.error("Failed to fetch audit", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAudit();
    }, []);

    const runAudit = async () => {
        setIsRunning(true);
        setError(null);
        try {
            const res = await fetch("/api/audit/run", { method: "POST" });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to run audit");
            }

            if (data.audit) {
                setAudit(data.audit);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsRunning(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return "text-green-500";
        if (score >= 70) return "text-yellow-500";
        return "text-red-500";
    };

    const getScoreBg = (score: number) => {
        if (score >= 90) return "bg-green-500/10 border-green-500/20";
        if (score >= 70) return "bg-yellow-500/10 border-yellow-500/20";
        return "bg-red-500/10 border-red-500/20";
    };

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case "high": return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Critical</Badge>;
            case "medium": return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Warning</Badge>;
            default: return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Notice</Badge>;
        }
    };

    return (
        <div className="space-y-8 max-w-5xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-[#FF6600]" />
                        Content SEO Auditor
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Scan your published Blogger posts for SEO issues, thin content, and missing optimizations.
                    </p>
                </div>

                <Button
                    onClick={runAudit}
                    disabled={isRunning}
                    className="glow-button text-white border-0"
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isRunning ? "animate-spin" : ""}`} />
                    {isRunning ? "Scanning Blog..." : "Run New Audit"}
                </Button>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold">Audit Failed</p>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <RefreshCw className="w-8 h-8 text-[#FF6600] animate-spin" />
                </div>
            ) : !audit ? (
                <div className="glass-card rounded-2xl p-12 text-center border-dashed">
                    <div className="w-16 h-16 bg-[#FF6600]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-[#FF6600]" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">No Audits Run Yet</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        Run your first SEO content audit to discover issues holding back your search rankings.
                    </p>
                    <Button onClick={runAudit} disabled={isRunning} className="bg-[#FF6600] hover:bg-orange-600 text-white border-0">
                        <RefreshCw className={`w-4 h-4 mr-2 ${isRunning ? "animate-spin" : ""}`} />
                        Start Deep Scan
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Score Card */}
                    <div className={`glass-card rounded-2xl p-8 border text-center flex flex-col items-center justify-center ${getScoreBg(audit.score)}`}>
                        <h3 className="font-semibold text-lg mb-4">Overall Content Health</h3>

                        <div className="relative w-40 h-40 flex items-center justify-center mb-4">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="80" cy="80" r="70"
                                    className="stroke-muted opacity-20"
                                    strokeWidth="12" fill="none"
                                />
                                <circle
                                    cx="80" cy="80" r="70"
                                    className={`stroke-current ${getScoreColor(audit.score)}`}
                                    strokeWidth="12" fill="none"
                                    strokeDasharray="440"
                                    strokeDashoffset={440 - (440 * Math.max(0, audit.score)) / 100}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-5xl font-bold ${getScoreColor(audit.score)}`}>{audit.score}</span>
                                <span className="text-xs font-medium uppercase tracking-widest mt-1 opacity-70">/ 100</span>
                            </div>
                        </div>

                        <p className="text-sm opacity-80 mt-2">
                            Last scanned: {new Date(audit.runAt).toLocaleDateString()} at {new Date(audit.runAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>

                    {/* Quick Stats Summary */}
                    <div className="glass-card rounded-2xl p-6 md:col-span-2 grid grid-cols-2 gap-4">
                        <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <AlertTriangle className="w-4 h-4 text-red-500" /> Critical Issues
                            </div>
                            <div className="text-3xl font-bold">
                                {audit.issues.filter(i => i.severity === "high").length}
                            </div>
                        </div>
                        <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <Info className="w-4 h-4 text-yellow-500" /> Warnings
                            </div>
                            <div className="text-3xl font-bold">
                                {audit.issues.filter(i => i.severity === "medium").length}
                            </div>
                        </div>
                        <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <FileText className="w-4 h-4 text-[#FF6600]" /> Total Posts Scanned
                            </div>
                            <div className="text-3xl font-bold">
                                {new Set(audit.issues.map(i => i.postId)).size || "10"}
                            </div>
                        </div>
                        <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500" /> Opportunities
                            </div>
                            <div className="text-xl font-bold mt-1">
                                Ready for Refresh
                            </div>
                        </div>
                    </div>

                    {/* Issues List */}
                    <div className="md:col-span-3">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold">Action Items</h2>
                            <Badge variant="outline">{audit.issues.length} items to fix</Badge>
                        </div>

                        {audit.issues.length === 0 ? (
                            <div className="glass-card rounded-2xl p-8 text-center border-green-500/20 bg-green-500/5">
                                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                                <h3 className="text-xl font-bold mb-2">Perfect Score!</h3>
                                <p className="text-muted-foreground">We couldn&apos;t find any major SEO issues in your recent posts.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Sort issues: High > Medium > Low */}
                                {[...audit.issues]
                                    .sort((a, b) => {
                                        const weight = { high: 3, medium: 2, low: 1 };
                                        return weight[b.severity] - weight[a.severity];
                                    })
                                    .map((issue, idx) => (
                                        <div key={idx} className="glass-card rounded-xl p-5 border border-border/50 hover:border-[#FF6600]/30 transition-colors">
                                            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                                                <div className="pt-1">{getSeverityBadge(issue.severity)}</div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-foreground mb-1">
                                                        {issue.type}
                                                    </h4>
                                                    <p className="text-sm text-muted-foreground mb-3">
                                                        {issue.message}
                                                    </p>
                                                    <div className="bg-muted/30 rounded-lg p-3 text-sm truncate flex items-center justify-between">
                                                        <span>
                                                            <span className="font-medium">Post:</span> {issue.postTitle}
                                                        </span>
                                                        <a href={issue.postUrl} target="_blank" rel="noreferrer" className="text-[#FF6600] hover:underline shrink-0 ml-2">
                                                            View Live ↗
                                                        </a>
                                                    </div>
                                                </div>
                                                <div className="sm:self-center shrink-0 mt-4 sm:mt-0">
                                                    <Link href={`/dashboard/refresh?post=${issue.postId}`}>
                                                        <Button variant="outline" size="sm" className="bg-[#FF6600]/10 text-[#FF6600] hover:bg-[#FF6600] border-0 hover:text-white transition-colors w-full sm:w-auto">
                                                            <TrendingUp className="w-4 h-4 mr-2" />
                                                            Fix with AI
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
