"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    PenTool,
    FileText,
    Globe,
    BarChart3,
    ArrowRight,
    TrendingUp,
    Clock,
    CheckCircle2,
    Sparkles,
    Image,
    Tag,
    Loader2,
    TrendingDown,
} from "lucide-react";

interface DashboardStats {
    plan: string;
    articleLimit: number;
    totalArticles: number;
    publishedArticles: number;
    draftArticles: number;
    connectedBlogs: number;
    totalWordCount: number;
    avgWordCount: number;
    recentArticles: any[];
    activeCampaigns: number;
    totalPublishLogs: number;
    articlesThisMonth: number;
    articlesLastMonth: number;
    growthPercentage: number;
}

const QUICK_ACTIONS = [
    {
        title: "Write New Article",
        description: "Generate a complete SEO article from a keyword",
        icon: PenTool,
        href: "/dashboard/new",
        primary: true,
    },
    {
        title: "Connect Blog",
        description: "Link your Blogger account to start publishing",
        icon: Globe,
        href: "/dashboard/settings",
        primary: false,
    },
    {
        title: "Browse Templates",
        description: "Choose from 7 article templates for any niche",
        icon: FileText,
        href: "/dashboard/new",
        primary: false,
    },
];

const RECENT_FEATURES = [
    {
        icon: Sparkles,
        title: "AI Article Writer",
        description: "Full articles from a single keyword",
    },
    {
        icon: Image,
        title: "Image Generation",
        description: "AI-powered featured images",
    },
    {
        icon: Tag,
        title: "Auto Labels",
        description: "Smart label suggestions",
    },
    {
        icon: TrendingUp,
        title: "SEO Optimization",
        description: "Titles, meta, and headings",
    },
];

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/dashboard/stats");
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (error) {
                console.error("Failed to fetch dashboard stats:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" />
            </div>
        );
    }

    const quickStats = [
        {
            label: "Total Articles",
            value: stats?.totalArticles.toString() || "0",
            change: stats?.totalArticles ? `${stats.articlesThisMonth} this month` : "Start creating!",
            icon: FileText,
            color: "from-[#FF6600] to-amber-500",
            trend: stats?.growthPercentage || 0,
        },
        {
            label: "Published",
            value: stats?.publishedArticles.toString() || "0",
            change: stats?.publishedArticles ? `${stats.totalPublishLogs} total publishes` : "Connect Blogger",
            icon: CheckCircle2,
            color: "from-emerald-500 to-green-500",
        },
        {
            label: "Drafts",
            value: stats?.draftArticles.toString() || "0",
            change: stats?.draftArticles ? "Ready to publish" : "Write your first post",
            icon: Clock,
            color: "from-amber-500 to-yellow-500",
        },
        {
            label: "Connected Blogs",
            value: stats?.connectedBlogs.toString() || "0",
            change: stats?.connectedBlogs ? `${stats.activeCampaigns} active campaigns` : "Set up your blog",
            icon: Globe,
            color: "from-blue-500 to-cyan-500",
        },
    ];

    return (
        <div className="space-y-8 max-w-6xl">
            {/* Welcome */}
            <div>
                <h1 className="text-2xl font-bold mb-1">
                    Welcome to <span className="gradient-text">BloggerSEO</span>
                </h1>
                <p className="text-muted-foreground text-sm">
                    Generate, format, and publish SEO-optimized blog posts to Blogger.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickStats.map((stat) => (
                    <div
                        key={stat.label}
                        className="glass-card rounded-xl p-5 hover:scale-[1.02] transition-all duration-300"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div
                                className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}
                            >
                                <stat.icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                {stat.trend !== undefined && stat.trend !== 0 && (
                                    <Badge
                                        variant="secondary"
                                        className={`text-[10px] ${stat.trend > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}
                                    >
                                        {stat.trend > 0 ? (
                                            <TrendingUp className="w-3 h-3 mr-1 inline" />
                                        ) : (
                                            <TrendingDown className="w-3 h-3 mr-1 inline" />
                                        )}
                                        {Math.abs(stat.trend)}%
                                    </Badge>
                                )}
                                <Badge
                                    variant="secondary"
                                    className="text-[10px] bg-muted/50 text-muted-foreground"
                                >
                                    {stat.change}
                                </Badge>
                            </div>
                        </div>
                        <div className="text-2xl font-bold">{stat.value}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {stat.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* Onboarding & Usage */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Usage Meter */}
                {stats && (
                    <div className="glass-card rounded-xl p-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">Article Usage</h3>
                            <Badge variant="outline" className="capitalize bg-orange-500/10 text-[#FF6600] border-[#FF6600]/20">{stats.plan} Plan</Badge>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5 mb-2 mt-4 overflow-hidden">
                            <div
                                className="bg-[#FF6600] h-2.5 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, (stats.articlesThisMonth / stats.articleLimit) * 100)}%` }}
                            />
                        </div>
                        <p className="text-sm text-muted-foreground flex justify-between">
                            <span>{stats.articlesThisMonth} used this month</span>
                            <span>{stats.articleLimit} limit</span>
                        </p>
                    </div>
                )}

                {/* Connect Blogger Banner */}
                {stats && stats.connectedBlogs === 0 && (
                    <div className="glass-card rounded-xl p-6 border-[#FF6600]/30 bg-orange-500/5">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-[#FF6600]/20 flex items-center justify-center shrink-0">
                                <Globe className="w-5 h-5 text-[#FF6600]" />
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1 text-foreground">Connect Your Blog</h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    You need to connect a Blogger account to start publishing articles automatically.
                                </p>
                                <Link href="/dashboard/settings">
                                    <Button size="sm" className="bg-[#FF6600] hover:bg-orange-600 text-white border-0">
                                        Connect Blogger
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {QUICK_ACTIONS.map((action) => (
                        <Link key={action.title} href={action.href}>
                            <div
                                className={`rounded-xl p-6 hover:scale-[1.02] transition-all duration-300 cursor-pointer group ${action.primary
                                    ? "glow-button text-white"
                                    : "glass-card"
                                    }`}
                            >
                                <action.icon
                                    className={`w-8 h-8 mb-3 ${action.primary
                                        ? "text-white"
                                        : "text-[#FF6600]"
                                        }`}
                                />
                                <h3
                                    className={`font-semibold mb-1 ${action.primary ? "text-white" : ""
                                        }`}
                                >
                                    {action.title}
                                </h3>
                                <p
                                    className={`text-sm ${action.primary
                                        ? "text-white/70"
                                        : "text-muted-foreground"
                                        }`}
                                >
                                    {action.description}
                                </p>
                                <div className="flex items-center gap-1 mt-3 text-sm font-medium">
                                    <span className={action.primary ? "text-white/90" : "text-[#FF6600]"}>
                                        Get Started
                                    </span>
                                    <ArrowRight
                                        className={`w-4 h-4 group-hover:translate-x-1 transition-transform ${action.primary ? "text-white/90" : "text-[#FF6600]"
                                            }`}
                                    />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Recent Activity */}
            {stats && stats.recentArticles.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-4">Recent Articles</h2>
                    <div className="glass-card rounded-xl divide-y divide-border/50">
                        {stats.recentArticles.map((article) => (
                            <Link
                                key={article.id}
                                href={`/dashboard/articles?id=${article.id}`}
                                className="block p-4 hover:bg-muted/20 transition-colors cursor-pointer"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium truncate hover:text-[#FF6600] transition-colors">{article.title}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-muted-foreground">
                                                {article.blog?.name || "Unknown Blog"}
                                            </span>
                                            <span className="text-xs text-muted-foreground">•</span>
                                            <span className="text-xs text-muted-foreground">
                                                {article.wordCount} words
                                            </span>
                                            <span className="text-xs text-muted-foreground">•</span>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(article.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <Badge
                                        variant={article.status === "published" ? "default" : "secondary"}
                                        className={article.status === "published" ? "bg-emerald-500/20 text-emerald-400" : ""}
                                    >
                                        {article.status}
                                    </Badge>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Additional Stats */}
            {stats && stats.totalWordCount > 0 && (
                <div className="glass-card rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Content Statistics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                            <div className="text-2xl font-bold text-[#FF6600]">
                                {stats.totalWordCount.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Total Words Generated
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-[#FF6600]">
                                {stats.avgWordCount.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Avg. Words per Article
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-[#FF6600]">
                                {stats.articlesThisMonth}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Articles This Month
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-[#FF6600]">
                                {stats.activeCampaigns}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Active Campaigns
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Features preview */}
            <div>
                <h2 className="text-lg font-semibold mb-4">What You Can Do</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {RECENT_FEATURES.map((feature) => (
                        <div
                            key={feature.title}
                            className="glass-card rounded-xl p-5 text-center hover:scale-[1.03] transition-all duration-300"
                        >
                            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-3">
                                <feature.icon className="w-5 h-5 text-[#FF6600]" />
                            </div>
                            <h4 className="text-sm font-medium mb-1">{feature.title}</h4>
                            <p className="text-xs text-muted-foreground">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Getting Started Guide */}
            {(!stats || stats.totalArticles === 0) && (
                <div className="gradient-border rounded-xl">
                    <div className="bg-card rounded-xl p-8">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold mb-2">
                                    🚀 Getting Started
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Follow these 3 steps to publish your first AI-generated article:
                                </p>
                                <ol className="space-y-2">
                                    {[
                                        "Connect your Google / Blogger account in Settings",
                                        "Create a new article with any keyword",
                                        "Review, add labels, and publish!",
                                    ].map((step, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm">
                                            <span className="w-5 h-5 rounded-full bg-orange-500/20 text-[#FF6600] flex items-center justify-center text-xs font-bold shrink-0">
                                                {i + 1}
                                            </span>
                                            {step}
                                        </li>
                                    ))}
                                </ol>
                            </div>
                            <Link href="/dashboard/new">
                                <Button className="glow-button text-white border-0 px-6">
                                    <PenTool className="w-4 h-4 mr-2" />
                                    Write Your First Article
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
