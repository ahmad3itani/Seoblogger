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
    Search,
    Loader2,
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
        <div className="space-y-6 max-w-5xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(108,76,241,0.12)", border: "1px solid rgba(108,76,241,0.25)" }}>
                        <Activity className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>Content SEO Auditor</h1>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Scan posts for SEO issues and missing optimizations</p>
                    </div>
                </div>
                <Button onClick={runAudit} disabled={isRunning} className="btn-primary h-9 text-xs px-4">
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRunning ? "animate-spin" : ""}`} />
                    {isRunning ? "Scanning..." : "Run Audit"}
                </Button>
            </div>

            {error && (
                <div className="rounded-xl px-4 py-3 flex items-start gap-2 text-xs" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}>
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div><span className="font-semibold">Audit Failed:</span> {error}</div>
                </div>
            )}

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--brand-primary)" }} />
                </div>
            ) : !audit ? (
                <div className="rounded-2xl p-16 text-center" style={{ background: "var(--bg-card)", border: "1px dashed var(--border-glass)" }}>
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(108,76,241,0.08)", border: "1px solid rgba(108,76,241,0.20)" }}>
                        <Search className="w-7 h-7" style={{ color: "var(--brand-primary)" }} />
                    </div>
                    <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>No Audits Run Yet</h3>
                    <p className="text-sm max-w-md mx-auto mb-5" style={{ color: "var(--text-secondary)" }}>
                        Run your first SEO audit to discover issues holding back your rankings.
                    </p>
                    <Button onClick={runAudit} disabled={isRunning} className="btn-primary h-9 text-xs px-4">
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRunning ? "animate-spin" : ""}`} /> Start Deep Scan
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Score Card */}
                    <div className="rounded-2xl p-6 text-center flex flex-col items-center justify-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                        <h3 className="text-xs font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>Content Health</h3>
                        <div className="relative w-32 h-32 flex items-center justify-center mb-3">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="64" cy="64" r="56" strokeWidth="10" fill="none" style={{ stroke: "rgba(255,255,255,0.06)" }} />
                                <circle cx="64" cy="64" r="56" className={`stroke-current ${getScoreColor(audit.score)}`} strokeWidth="10" fill="none" strokeDasharray="352" strokeDashoffset={352 - (352 * Math.max(0, audit.score)) / 100} strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-4xl font-bold ${getScoreColor(audit.score)}`}>{audit.score}</span>
                                <span className="text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>/ 100</span>
                            </div>
                        </div>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            Scanned {new Date(audit.runAt).toLocaleDateString()}
                        </p>
                    </div>

                    {/* Quick Stats */}
                    <div className="md:col-span-2 grid grid-cols-2 gap-3">
                        {[
                            { label: "Critical Issues", value: audit.issues.filter(i => i.severity === "high").length, icon: AlertTriangle, color: "#ef4444" },
                            { label: "Warnings", value: audit.issues.filter(i => i.severity === "medium").length, icon: Info, color: "#F59E0B" },
                            { label: "Posts Scanned", value: new Set(audit.issues.map(i => i.postId)).size || "10", icon: FileText, color: "var(--brand-primary)" },
                            { label: "Opportunities", value: "Ready", icon: CheckCircle2, color: "#22C55E" },
                        ].map((s, i) => (
                            <div key={i} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                                <div className="flex items-center gap-1.5 mb-2">
                                    <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                                </div>
                                <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Issues List */}
                    <div className="md:col-span-3">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Action Items</h2>
                            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }}>
                                {audit.issues.length} to fix
                            </span>
                        </div>

                        {audit.issues.length === 0 ? (
                            <div className="rounded-2xl p-12 text-center" style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.15)" }}>
                                <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: "#22C55E" }} />
                                <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>Perfect Score!</h3>
                                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No major SEO issues found.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {[...audit.issues]
                                    .sort((a, b) => ({ high: 3, medium: 2, low: 1 }[b.severity] || 0) - ({ high: 3, medium: 2, low: 1 }[a.severity] || 0))
                                    .map((issue, idx) => (
                                        <div key={idx} className="rounded-xl p-4 transition-all" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                                            onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(108,76,241,0.20)"}
                                            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-subtle)"}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                                                <div className="pt-0.5">{getSeverityBadge(issue.severity)}</div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>{issue.type}</h4>
                                                    <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>{issue.message}</p>
                                                    <div className="rounded-lg px-3 py-2 text-xs flex items-center justify-between" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)" }}>
                                                        <span style={{ color: "var(--text-secondary)" }}><strong style={{ color: "var(--text-primary)" }}>Post:</strong> {issue.postTitle}</span>
                                                        <a href={issue.postUrl} target="_blank" rel="noreferrer" className="shrink-0 ml-2 text-[10px]" style={{ color: "var(--brand-primary)" }}>View ↗</a>
                                                    </div>
                                                </div>
                                                <div className="sm:self-center shrink-0">
                                                    <Link href={`/dashboard/refresh?post=${issue.postId}`}>
                                                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium btn-primary">
                                                            <TrendingUp className="w-3 h-3" /> Fix
                                                        </button>
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
