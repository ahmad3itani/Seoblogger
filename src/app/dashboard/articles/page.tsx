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
                <div>
                    <h1 className="text-xl font-bold">My Articles</h1>
                    <p className="text-sm text-muted-foreground">
                        {totalCount} {totalCount === 1 ? "article" : "articles"} generated
                    </p>
                </div>
                <Link href="/dashboard/new">
                    <Button className="glow-button text-white border-0" size="sm">
                        <PenTool className="w-3.5 h-3.5 mr-1.5" />
                        New Article
                    </Button>
                </Link>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search articles..."
                        className="pl-10 bg-muted/30 border-border/50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                </div>
                <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
                    <SelectTrigger className="w-40 bg-muted/30 border-border/50">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                    </SelectContent>
                </Select>
                <Button onClick={handleSearch} variant="outline" className="bg-muted/30">
                    <Search className="w-4 h-4" />
                </Button>
            </div>

            {/* Articles list */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" />
                </div>
            ) : (
                <div className="space-y-3">
                    {articles.map((article) => (
                    <div
                        key={article.id}
                        className="glass-card rounded-xl p-5 hover:scale-[1.005] transition-all duration-200"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    <Badge
                                        variant="secondary"
                                        className={`text-[10px] ${
                                            article.status === "published"
                                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                                : article.status === "scheduled"
                                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                                : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                        }`}
                                    >
                                        {article.status === "published" ? (
                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                        ) : (
                                            <Clock className="w-3 h-3 mr-1" />
                                        )}
                                        {article.status}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground">
                                        {article.wordCount.toLocaleString()} words
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">•</span>
                                    <span className="text-[10px] text-muted-foreground" title={formatDateTime(article.createdAt)}>
                                        Created {getRelativeTime(article.createdAt)}
                                    </span>
                                </div>

                                <h3 className="text-sm font-semibold mb-2 truncate">
                                    {article.title}
                                </h3>

                                <div className="flex items-center gap-3 flex-wrap">
                                    {article.labels && (
                                        <div className="flex gap-1.5">
                                            {article.labels.split(",").slice(0, 3).map((label) => (
                                                <Badge
                                                    key={label}
                                                    variant="secondary"
                                                    className="text-[10px] bg-[#FF6600]/10 text-[#FF6600] border-[#FF6600]/20"
                                                >
                                                    {label.trim()}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                    {article.status === "scheduled" && article.scheduledFor && (
                                        <span className="text-[10px] text-blue-400 font-medium" title={formatDateTime(article.scheduledFor)}>
                                            📅 Scheduled for {formatDate(article.scheduledFor)}
                                        </span>
                                    )}
                                    {article.status === "published" && article.updatedAt && (
                                        <span className="text-[10px] text-green-400 font-medium" title={formatDateTime(article.updatedAt)}>
                                            ✅ Published {getRelativeTime(article.updatedAt)}
                                        </span>
                                    )}
                                    {article.blog && (
                                        <span className="text-[10px] text-muted-foreground">
                                            → {article.blog.name}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors outline-none"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white border-gray-200">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel className="text-xs text-gray-500">Actions</DropdownMenuLabel>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator className="bg-gray-200" />
                                    <DropdownMenuItem onClick={() => window.location.href = `/dashboard/articles/${article.id}`}>
                                        <Eye className="w-4 h-4 mr-2" />
                                        View Details
                                    </DropdownMenuItem>
                                    {article.status === "draft" && (
                                        <DropdownMenuItem>
                                            <Send className="w-4 h-4 mr-2" />
                                            Publish to Blogger
                                        </DropdownMenuItem>
                                    )}
                                    {article.bloggerPostId && (
                                        <DropdownMenuItem onClick={() => window.open(article.blog?.url || "#", "_blank")}>
                                            <ExternalLink className="w-4 h-4 mr-2" />
                                            View on Blogger
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator className="bg-gray-200" />
                                    <DropdownMenuItem
                                        className="text-red-600 focus:text-red-600"
                                        onClick={() => handleDelete(article.id)}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                ))}

                    {/* Empty state */}
                    {articles.length === 0 && (
                    <div className="text-center py-16 glass-card rounded-xl">
                        <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">No articles yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Create your first AI-generated article to get started.
                        </p>
                        <Link href="/dashboard/new">
                            <Button className="glow-button text-white border-0">
                                <PenTool className="w-4 h-4 mr-2" />
                                Write First Article
                            </Button>
                        </Link>
                    </div>
                    )}
                </div>
            )}
        </div>
    );
}
