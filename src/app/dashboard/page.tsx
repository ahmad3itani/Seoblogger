"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/supabase/auth-context";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    PenTool, FileText, Globe, ArrowRight, TrendingUp,
    Clock, CheckCircle2, Loader2, TrendingDown, Search, Activity,
    RefreshCw, Link as LinkIcon, ShoppingCart, Lightbulb, Network,
    Rocket,
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
    { title: "Write New Article", desc: "Generate a complete SEO article from a keyword", icon: PenTool,  href: "/dashboard/new",      primary: true  },
    { title: "Connect Blog",      desc: "Link your Blogger account to start publishing",  icon: Globe,    href: "/dashboard/settings", primary: false },
    { title: "Browse Templates",  desc: "Choose from 7 article templates for any niche",  icon: FileText, href: "/dashboard/new",      primary: false },
];

const TOOL_SHORTCUTS = [
    { icon: PenTool,    title: "Write Article",   desc: "Article from keyword",    href: "/dashboard/new",       color: "var(--brand-primary)" },
    { icon: Search,     title: "Keywords",         desc: "Research & analyze",      href: "/dashboard/keywords",  color: "var(--brand-accent)" },
    { icon: Activity,   title: "AdSense & Site Audit", desc: "SEO & AdSense checks",     href: "/dashboard/audit/full",     color: "var(--brand-success)" },
    { icon: Lightbulb,  title: "Trend Ideas",      desc: "Topic discovery",         href: "/dashboard/ideas",     color: "var(--brand-warning)" },
    { icon: ShoppingCart,title:"Amazon Writer",    desc: "Affiliate reviews",       href: "/dashboard/amazon",    color: "var(--brand-primary)" },
    { icon: LinkIcon,   title: "Internal Linker",  desc: "Smart link suggestions",  href: "/dashboard/linker",    color: "var(--brand-accent)" },
    { icon: Network,    title: "Clustering",       desc: "Topic clusters",          href: "/dashboard/clustering",color: "var(--brand-primary)" },
    { icon: RefreshCw,  title: "Content Refresh",  desc: "Update old posts",        href: "/dashboard/refresh",   color: "var(--brand-accent)" },
];

function StatCard({ icon: Icon, label, value, sub, trend, iconColor }: {
    icon: any; label: string; value: string; sub: string; trend?: number; iconColor: string;
}) {
    return (
        <div
            className="rounded-lg p-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
        >
            <div className="flex items-start justify-between mb-4">
                <div
                    className="w-10 h-10 rounded-md flex items-center justify-center"
                    style={{ background: iconColor, color: "white" }}
                >
                    <Icon className="w-5 h-5" />
                </div>
                {trend !== undefined && trend !== 0 && (
                    <div
                        className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md"
                        style={
                            trend > 0
                                ? { background: "var(--brand-success)", color: "white" }
                                : { background: "var(--brand-error)", color: "white" }
                        }
                    >
                        {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <div className="text-2xl font-semibold mb-1" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                {value}
            </div>
            <div className="text-sm font-medium mb-0.5" style={{ color: "var(--text-secondary)" }}>{label}</div>
            <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>{sub}</div>
        </div>
    );
}

export default function DashboardPage() {
    const { profile } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch("/api/dashboard/stats")
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setStats(data); })
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-7 h-7 animate-spin" style={{ color: "var(--brand-primary)" }} />
            </div>
        );
    }

    const usagePct = stats ? Math.min(100, (stats.articlesThisMonth / stats.articleLimit) * 100) : 0;

    return (
        <div className="space-y-7 max-w-6xl">

            {/* ── Welcome ── */}
            <div className="border-b pb-6 mb-6" style={{ borderColor: "var(--border-subtle)" }}>
                <h1
                    className="text-3xl font-semibold mb-2"
                    style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)", letterSpacing: "-0.02em" }}
                >
                    {profile?.name
                        ? <>Welcome back, <span style={{ color: "var(--brand-primary)" }}>{profile.name.split(" ")[0]}</span></>
                        : <>Welcome to <span style={{ color: "var(--brand-primary)" }}>BloggerSEO</span></>
                    }
                </h1>
                <p className="text-base" style={{ color: "var(--text-secondary)" }}>
                    Generate, optimize, and publish SEO articles to Blogger — all in one place.
                </p>
            </div>

            {/* ── Stats Grid ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={FileText} label="Total Articles"
                    value={stats?.totalArticles.toString() || "0"}
                    sub={stats?.totalArticles ? `${stats.articlesThisMonth} this month` : "Start creating!"}
                    trend={stats?.growthPercentage} iconColor="var(--brand-primary)"
                />
                <StatCard
                    icon={CheckCircle2} label="Published"
                    value={stats?.publishedArticles.toString() || "0"}
                    sub={stats?.publishedArticles ? `${stats.totalPublishLogs} total publishes` : "Connect Blogger"}
                    iconColor="var(--brand-success)"
                />
                <StatCard
                    icon={Clock} label="Drafts"
                    value={stats?.draftArticles.toString() || "0"}
                    sub={stats?.draftArticles ? "Ready to publish" : "Write your first post"}
                    iconColor="var(--brand-warning)"
                />
                <StatCard
                    icon={Globe} label="Connected Blogs"
                    value={stats?.connectedBlogs.toString() || "0"}
                    sub={stats?.connectedBlogs ? `${stats.activeCampaigns} active campaigns` : "Set up your blog"}
                    iconColor="var(--brand-accent)"
                />
            </div>

            {/* ── Usage + Connect Banner ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Usage meter */}
                {stats && (
                    <div
                        className="rounded-2xl p-5"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                                Article Usage
                            </h3>
                            <span
                                className="text-xs font-medium px-2.5 py-1 rounded-md capitalize"
                                style={{ background: "var(--brand-primary)", color: "white" }}
                            >
                                {stats.plan} Plan
                            </span>
                        </div>
                        <div className="progress-bar mb-3">
                            <div
                                className="progress-bar-fill transition-all duration-700"
                                style={{
                                    width: `${usagePct}%`,
                                    background: usagePct > 80 ? "var(--brand-error)" : usagePct > 60 ? "var(--brand-warning)" : "var(--brand-primary)",
                                }}
                            />
                        </div>
                        <div className="flex justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
                            <span>{stats.articlesThisMonth} used this month</span>
                            <span>{stats.articleLimit} limit</span>
                        </div>
                    </div>
                )}

                {/* Connect blog banner */}
                {stats && stats.connectedBlogs === 0 ? (
                    <div
                        className="rounded-lg p-5 flex items-start gap-4"
                        style={{ background: "var(--bg-surface)", borderLeft: "3px solid var(--brand-primary)" }}
                    >
                        <div
                            className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
                            style={{ background: "var(--brand-primary)", color: "white" }}
                        >
                            <Globe className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium mb-1" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                                Connect Your Blog
                            </h3>
                            <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
                                Link your Blogger account to start publishing articles automatically.
                            </p>
                            <Link href="/dashboard/settings">
                                <Button size="sm" className="text-sm h-9 px-4" style={{ background: "var(--brand-primary)", color: "white" }}>
                                    Connect Blogger
                                </Button>
                            </Link>
                        </div>
                    </div>
                ) : stats && (
                    /* Content stats filler when blog is connected */
                    <div
                        className="rounded-lg p-5 grid grid-cols-2 gap-4"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                    >
                        {[
                            { label: "Total Words", value: stats.totalWordCount.toLocaleString(), color: "var(--brand-primary)" },
                            { label: "Avg. Words",  value: stats.avgWordCount.toLocaleString(),   color: "var(--brand-accent)" },
                            { label: "This Month",  value: stats.articlesThisMonth.toString(),    color: "var(--brand-success)" },
                            { label: "Campaigns",   value: stats.activeCampaigns.toString(),      color: "var(--brand-primary)" },
                        ].map(s => (
                            <div key={s.label}>
                                <div className="text-xl font-semibold" style={{ fontFamily: "var(--font-display)", color: s.color }}>
                                    {s.value}
                                </div>
                                <div className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Quick Actions ── */}
            <div>
                <h2 className="text-sm font-medium mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Quick Actions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {QUICK_ACTIONS.map((a) => (
                        <Link key={a.title} href={a.href}>
                            <div
                                className="rounded-lg p-6 cursor-pointer group"
                                style={
                                    a.primary
                                        ? { background: "var(--brand-primary)", color: "white" }
                                        : { background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }
                                }
                            >
                                <a.icon
                                    className="w-8 h-8 mb-4"
                                    style={{ color: a.primary ? "white" : "var(--brand-primary)" }}
                                />
                                <h3
                                    className="text-base font-medium mb-2"
                                    style={{ fontFamily: "var(--font-display)", color: a.primary ? "white" : "var(--text-primary)" }}
                                >
                                    {a.title}
                                </h3>
                                <p className="text-sm mb-4" style={{ color: a.primary ? "rgba(255,255,255,0.9)" : "var(--text-secondary)" }}>
                                    {a.desc}
                                </p>
                                <div className="flex items-center gap-1 text-sm font-medium" style={{ color: a.primary ? "white" : "var(--brand-primary)" }}>
                                    Get Started
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── Recent Articles ── */}
            {stats && stats.recentArticles.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            Recent Articles
                        </h2>
                        <Link href="/dashboard/articles" className="text-xs font-medium transition-colors" style={{ color: "var(--brand-orange)" }}>
                            View all →
                        </Link>
                    </div>
                    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                        {stats.recentArticles.map((article, i) => (
                            <Link key={article.id} href={`/dashboard/articles/${article.id}`}>
                                <div
                                    className="flex items-start justify-between gap-4 px-5 py-3.5 transition-colors group"
                                    style={{
                                        borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none",
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                >
                                    <div className="flex-1 min-w-0">
                                        <h3
                                            className="text-sm font-medium truncate mb-1 transition-colors group-hover:text-[#6C4CF1]"
                                            style={{ color: "var(--text-primary)" }}
                                        >
                                            {article.title}
                                        </h3>
                                        <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
                                            <span>{article.blog?.name || "Unknown Blog"}</span>
                                            <span>·</span>
                                            <span>{article.wordCount?.toLocaleString() || 0} words</span>
                                            <span>·</span>
                                            <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <span
                                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                                        style={
                                            article.status === "published"
                                                ? { background: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.22)" }
                                                : { background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }
                                        }
                                    >
                                        {article.status}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Tool Shortcuts ── */}
            <div>
                <h2 className="text-sm font-semibold mb-3" style={{ fontFamily: "var(--font-display)", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Your Tools
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {TOOL_SHORTCUTS.map((tool) => (
                        <Link key={tool.title} href={tool.href}>
                            <div
                                className="rounded-2xl p-4 text-center cursor-pointer group transition-all hover:translate-y-[-2px]"
                                style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                            >
                                <div
                                    className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2.5 transition-transform group-hover:scale-110"
                                    style={{ background: `${tool.color}18`, border: `1px solid ${tool.color}30` }}
                                >
                                    <tool.icon className="w-4 h-4" style={{ color: tool.color }} />
                                </div>
                                <h4 className="text-xs font-semibold mb-0.5" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                                    {tool.title}
                                </h4>
                                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{tool.desc}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── Getting Started (no articles yet) ── */}
            {(!stats || stats.totalArticles === 0) && (
                <div
                    className="rounded-2xl p-6"
                    style={{ background: "rgba(108,76,241,0.06)", border: "1px solid rgba(108,76,241,0.20)" }}
                >
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Rocket className="w-4 h-4" style={{ color: "var(--brand-orange)" }} />
                                <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                                    Getting Started
                                </h3>
                            </div>
                            <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
                                Follow these 3 steps to publish your first article:
                            </p>
                            <ol className="space-y-1.5">
                                {[
                                    "Connect your Google / Blogger account in Settings",
                                    "Create a new article with any keyword",
                                    "Review, add labels, and publish!",
                                ].map((step, i) => (
                                    <li key={i} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                                        <span
                                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                                            style={{ background: "rgba(108,76,241,0.15)", color: "var(--brand-orange)", fontFamily: "var(--font-display)" }}
                                        >
                                            {i + 1}
                                        </span>
                                        {step}
                                    </li>
                                ))}
                            </ol>
                        </div>
                        <Link href="/dashboard/new">
                            <Button className="btn-primary gap-2">
                                <PenTool className="w-4 h-4" /> Write First Article
                            </Button>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
