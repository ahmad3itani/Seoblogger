"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, BarChart3, FileText, Calendar, Target } from "lucide-react";

interface AnalyticsData {
    totalArticles: number;
    publishedArticles: number;
    draftArticles: number;
    totalWordCount: number;
    avgWordCount: number;
    articlesThisMonth: number;
    articlesLastMonth: number;
    growthPercentage: number;
    topPerformers: Array<{
        id: string;
        title: string;
        wordCount: number;
        createdAt: string;
    }>;
    articlesByType: Record<string, number>;
    articlesByTone: Record<string, number>;
    recentActivity: Array<{
        date: string;
        count: number;
    }>;
}

export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await fetch("/api/dashboard/stats");
            if (res.ok) {
                const data = await res.json();
                
                // Transform data for analytics
                const analyticsData: AnalyticsData = {
                    totalArticles: data.totalArticles || 0,
                    publishedArticles: data.publishedArticles || 0,
                    draftArticles: data.draftArticles || 0,
                    totalWordCount: data.totalWordCount || 0,
                    avgWordCount: data.avgWordCount || 0,
                    articlesThisMonth: data.articlesThisMonth || 0,
                    articlesLastMonth: data.articlesLastMonth || 0,
                    growthPercentage: data.growthPercentage || 0,
                    topPerformers: data.recentArticles || [],
                    articlesByType: {},
                    articlesByTone: {},
                    recentActivity: [],
                };
                
                setAnalytics(analyticsData);
            }
        } catch (error) {
            console.error("Failed to fetch analytics:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-[#6C4CF1]" />
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Failed to load analytics data</p>
            </div>
        );
    }

    const metrics = [
        { label: "Total Articles", value: analytics.totalArticles, sub: `${analytics.publishedArticles} published, ${analytics.draftArticles} drafts`, icon: FileText, color: "var(--brand-primary)" },
        { label: "Total Words", value: `${(analytics.totalWordCount / 1000).toFixed(1)}K`, sub: `Avg. ${analytics.avgWordCount} per article`, icon: BarChart3, color: "#00C2FF" },
        { label: "This Month", value: analytics.articlesThisMonth, sub: `${analytics.articlesLastMonth} last month`, icon: Calendar, color: "#22C55E" },
        { label: "Growth", value: `${Math.abs(analytics.growthPercentage)}%`, sub: "Month-over-month", icon: analytics.growthPercentage >= 0 ? TrendingUp : TrendingDown, color: analytics.growthPercentage >= 0 ? "#22C55E" : "#ef4444" },
    ];

    return (
        <div className="space-y-6 max-w-7xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(108,76,241,0.12)", border: "1px solid rgba(108,76,241,0.25)" }}>
                    <BarChart3 className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
                </div>
                <div>
                    <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>Analytics</h1>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Track your content performance and productivity</p>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {metrics.map((m, i) => (
                    <div key={i} className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--text-muted)" }}>{m.label}</span>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${m.color}15` }}>
                                <m.icon className="w-3.5 h-3.5" style={{ color: m.color }} />
                            </div>
                        </div>
                        <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{m.value}</div>
                        <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{m.sub}</p>
                    </div>
                ))}
            </div>

            {/* Recent Articles */}
            {analytics.topPerformers.length > 0 && (
                <div className="rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                    <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Recent Articles</h3>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Your latest content</p>
                    </div>
                    <div className="p-3 space-y-1.5">
                        {analytics.topPerformers.map((article, index) => (
                            <div key={article.id} className="flex items-center justify-between px-4 py-3 rounded-xl transition-all" style={{ background: "rgba(255,255,255,0.02)" }}
                                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{ background: "rgba(108,76,241,0.10)", color: "var(--brand-primary)" }}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{article.title}</h4>
                                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                            {new Date(article.createdAt).toLocaleDateString()} · {article.wordCount} words
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0" style={{ background: "rgba(108,76,241,0.08)", color: "var(--brand-primary)", border: "1px solid rgba(108,76,241,0.20)" }}>
                                    {article.wordCount >= 2000 ? 'Long-form' : 'Standard'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                    <h3 className="text-xs font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Content Quality</h3>
                    <div className="space-y-3">
                        {[
                            { label: "Average Word Count", value: String(analytics.avgWordCount) },
                            { label: "Total Content", value: `${analytics.totalWordCount.toLocaleString()} words` },
                            { label: "Completion Rate", value: `${analytics.totalArticles > 0 ? Math.round((analytics.publishedArticles / analytics.totalArticles) * 100) : 0}%` },
                        ].map((row, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{row.label}</span>
                                <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{row.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                    <h3 className="text-xs font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Productivity</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>This Month</span>
                            <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{analytics.articlesThisMonth} articles</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Last Month</span>
                            <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{analytics.articlesLastMonth} articles</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Growth</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{
                                background: analytics.growthPercentage >= 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                                color: analytics.growthPercentage >= 0 ? "#22C55E" : "#ef4444",
                            }}>
                                {analytics.growthPercentage > 0 ? '+' : ''}{analytics.growthPercentage}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
