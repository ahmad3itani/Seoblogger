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
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
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

    return (
        <div className="space-y-6 max-w-7xl">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                    Track your content performance and productivity metrics
                </p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="glass-card">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardDescription className="text-xs">Total Articles</CardDescription>
                            <FileText className="w-4 h-4 text-violet-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{analytics.totalArticles}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {analytics.publishedArticles} published, {analytics.draftArticles} drafts
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardDescription className="text-xs">Total Words</CardDescription>
                            <BarChart3 className="w-4 h-4 text-blue-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {(analytics.totalWordCount / 1000).toFixed(1)}K
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Avg. {analytics.avgWordCount} per article
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardDescription className="text-xs">This Month</CardDescription>
                            <Calendar className="w-4 h-4 text-emerald-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{analytics.articlesThisMonth}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {analytics.articlesLastMonth} last month
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardDescription className="text-xs">Growth Rate</CardDescription>
                            <Target className="w-4 h-4 text-orange-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <div className="text-3xl font-bold">
                                {Math.abs(analytics.growthPercentage)}%
                            </div>
                            {analytics.growthPercentage > 0 ? (
                                <TrendingUp className="w-5 h-5 text-emerald-400" />
                            ) : analytics.growthPercentage < 0 ? (
                                <TrendingDown className="w-5 h-5 text-red-400" />
                            ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Month-over-month
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Top Performers */}
            {analytics.topPerformers.length > 0 && (
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Articles</CardTitle>
                        <CardDescription>Your latest content performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {analytics.topPerformers.map((article, index) => (
                                <div
                                    key={article.id}
                                    className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-500/10 text-violet-400 font-bold text-sm shrink-0">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium truncate">{article.title}</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {new Date(article.createdAt).toLocaleDateString()} • {article.wordCount} words
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="bg-violet-500/10 text-violet-300 shrink-0">
                                        {article.wordCount >= 2000 ? 'Long-form' : 'Standard'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Productivity Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="text-lg">Content Quality</CardTitle>
                        <CardDescription>Average metrics across all articles</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Average Word Count</span>
                            <span className="font-semibold">{analytics.avgWordCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Total Content</span>
                            <span className="font-semibold">{analytics.totalWordCount.toLocaleString()} words</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Completion Rate</span>
                            <span className="font-semibold">
                                {analytics.totalArticles > 0
                                    ? Math.round((analytics.publishedArticles / analytics.totalArticles) * 100)
                                    : 0}%
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="text-lg">Productivity</CardTitle>
                        <CardDescription>Your content creation velocity</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">This Month</span>
                            <span className="font-semibold">{analytics.articlesThisMonth} articles</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Last Month</span>
                            <span className="font-semibold">{analytics.articlesLastMonth} articles</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Growth</span>
                            <Badge className={analytics.growthPercentage >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}>
                                {analytics.growthPercentage > 0 ? '+' : ''}{analytics.growthPercentage}%
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tips */}
            <Card className="glass-card border-blue-500/20">
                <CardHeader>
                    <CardTitle className="text-base">💡 Productivity Tips</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                            <span className="text-blue-400 shrink-0">•</span>
                            <span>Aim for 2000+ words per article for better SEO performance</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-400 shrink-0">•</span>
                            <span>Publish consistently - try to maintain or increase your monthly output</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-400 shrink-0">•</span>
                            <span>Use bulk generation for high-volume content creation</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-400 shrink-0">•</span>
                            <span>Set up campaigns to automate your publishing schedule</span>
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
