"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    FileText,
    Eye,
    Send,
    Trash2,
    Clock,
    CheckCircle2,
    Search,
    PenTool,
    MoreVertical,
    ExternalLink,
    Loader2,
    Filter,
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Article {
    id: string;
    title: string;
    excerpt: string | null;
    status: string;
    wordCount: number;
    labels: string | null;
    tone: string | null;
    articleType: string | null;
    createdAt: string;
    updatedAt: string;
    scheduledFor?: string | null;
    bloggerPostId: string | null;
    blog: {
        id: string;
        name: string;
        url: string;
    } | null;
}

export default function ArticlesPage() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        fetchArticles();
    }, [statusFilter]);

    const fetchArticles = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== "all") params.append("status", statusFilter);
            if (searchQuery) params.append("search", searchQuery);

            const res = await fetch(`/api/articles?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setArticles(data.articles);
                setTotalCount(data.pagination.totalCount);
            }
        } catch (error) {
            console.error("Failed to fetch articles:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = () => {
        fetchArticles();
    };

    const handleDelete = async (articleId: string) => {
        if (!confirm("Are you sure you want to delete this article?")) return;

        try {
            const res = await fetch(`/api/articles?id=${articleId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setArticles(articles.filter((a) => a.id !== articleId));
                setTotalCount(totalCount - 1);
            }
        } catch (error) {
            console.error("Failed to delete article:", error);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });
    };

    const getRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return formatDate(dateString);
    };

    return (
        <div className="max-w-5xl space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(108,76,241,0.12)", border: "1px solid rgba(108,76,241,0.25)" }}>
                        <FileText className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>My Articles</h1>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            {totalCount} {totalCount === 1 ? "article" : "articles"} generated
                        </p>
                    </div>
                </div>
                <Link href="/dashboard/new">
                    <Button className="btn-primary h-9 text-xs px-4">
                        <PenTool className="w-3.5 h-3.5 mr-1.5" /> New Article
                    </Button>
                </Link>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                    <Input
                        placeholder="Search articles..."
                        className="pl-10 h-9 text-xs"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                </div>
                <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
                    <SelectTrigger className="w-40 h-9 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}>
                        <Filter className="w-3 h-3 mr-1.5" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                    </SelectContent>
                </Select>
                <button onClick={handleSearch} className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)", color: "var(--text-muted)" }}>
                    <Search className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Articles list */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--brand-primary)" }} />
                </div>
            ) : (
                <div className="space-y-2">
                    {articles.map((article) => (
                    <div
                        key={article.id}
                        className="rounded-xl p-4 transition-all duration-200"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(108,76,241,0.20)"}
                        onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-subtle)"}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1" style={{
                                        background: article.status === "published" ? "rgba(34,197,94,0.08)" : article.status === "scheduled" ? "rgba(0,194,255,0.08)" : "rgba(245,158,11,0.08)",
                                        color: article.status === "published" ? "#22C55E" : article.status === "scheduled" ? "#00C2FF" : "#F59E0B",
                                        border: `1px solid ${article.status === "published" ? "rgba(34,197,94,0.20)" : article.status === "scheduled" ? "rgba(0,194,255,0.20)" : "rgba(245,158,11,0.20)"}`,
                                    }}>
                                        {article.status === "published" ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                                        {article.status}
                                    </span>
                                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{article.wordCount.toLocaleString()} words</span>
                                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>·</span>
                                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }} title={formatDateTime(article.createdAt)}>
                                        {getRelativeTime(article.createdAt)}
                                    </span>
                                </div>

                                <h3 className="text-sm font-semibold mb-2 truncate" style={{ color: "var(--text-primary)" }}>
                                    {article.title}
                                </h3>

                                <div className="flex items-center gap-2 flex-wrap">
                                    {article.labels && article.labels.split(",").slice(0, 3).map((label) => (
                                        <span key={label} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(108,76,241,0.08)", color: "var(--brand-primary)", border: "1px solid rgba(108,76,241,0.20)" }}>
                                            {label.trim()}
                                        </span>
                                    ))}
                                    {article.status === "scheduled" && article.scheduledFor && (
                                        <span className="text-[10px] font-medium" style={{ color: "#00C2FF" }} title={formatDateTime(article.scheduledFor)}>
                                            Scheduled {formatDate(article.scheduledFor)}
                                        </span>
                                    )}
                                    {article.blog && (
                                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>→ {article.blog.name}</span>
                                    )}
                                </div>
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger className="h-7 w-7 rounded-lg inline-flex items-center justify-center transition-colors outline-none" style={{ color: "var(--text-muted)" }}>
                                    <MoreVertical className="w-3.5 h-3.5" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => window.location.href = `/dashboard/articles/${article.id}`}>
                                        <Eye className="w-4 h-4 mr-2" /> View Details
                                    </DropdownMenuItem>
                                    {article.status === "draft" && (
                                        <DropdownMenuItem>
                                            <Send className="w-4 h-4 mr-2" /> Publish to Blogger
                                        </DropdownMenuItem>
                                    )}
                                    {article.bloggerPostId && (
                                        <DropdownMenuItem onClick={() => window.open(article.blog?.url || "#", "_blank")}>
                                            <ExternalLink className="w-4 h-4 mr-2" /> View on Blogger
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-red-400 focus:text-red-400" onClick={() => handleDelete(article.id)}>
                                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                ))}

                    {/* Empty state */}
                    {articles.length === 0 && (
                    <div className="rounded-2xl p-16 flex flex-col items-center justify-center text-center" style={{ background: "var(--bg-card)", border: "1px dashed var(--border-glass)" }}>
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(108,76,241,0.08)", border: "1px solid rgba(108,76,241,0.20)" }}>
                            <FileText className="w-7 h-7" style={{ color: "var(--brand-primary)" }} />
                        </div>
                        <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>No articles yet</h3>
                        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Create your first article to get started.</p>
                        <Link href="/dashboard/new">
                            <Button className="btn-primary h-9 text-xs px-4">
                                <PenTool className="w-3.5 h-3.5 mr-1.5" /> Write First Article
                            </Button>
                        </Link>
                    </div>
                    )}
                </div>
            )}
        </div>
    );
}
