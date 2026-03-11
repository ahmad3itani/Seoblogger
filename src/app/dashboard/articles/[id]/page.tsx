"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    ArrowLeft,
    Loader2,
    Send,
    Clock,
    CheckCircle2,
    FileText,
    Copy,
    Check,
    ExternalLink,
    Trash2,
    Edit3,
    Save,
    Tag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";

interface ArticleDetail {
    id: string;
    title: string;
    content: string;
    outline: string | null;
    metaDescription: string | null;
    excerpt: string | null;
    labels: string | null;
    tone: string | null;
    articleType: string | null;
    wordCount: number;
    status: string;
    bloggerPostId: string | null;
    createdAt: string;
    updatedAt: string;
    blog: {
        id: string;
        name: string;
        url: string;
        blogId: string;
    } | null;
    images: Array<{
        id: string;
        url: string;
        altText: string | null;
    }>;
}

export default function ArticleDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [article, setArticle] = useState<ArticleDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editLabels, setEditLabels] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (params.id) {
            fetchArticle();
        }
    }, [params.id]);

    const fetchArticle = async () => {
        try {
            const res = await fetch(`/api/articles/${params.id}`);
            if (res.ok) {
                const data = await res.json();
                setArticle(data);
                setEditTitle(data.title);
                setEditLabels(data.labels || "");
            }
        } catch (error) {
            console.error("Failed to fetch article:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyContent = () => {
        if (article) {
            navigator.clipboard.writeText(article.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleSave = async () => {
        if (!article) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/articles/${article.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: editTitle,
                    labels: editLabels,
                }),
            });
            if (res.ok) {
                const updated = await res.json();
                setArticle({ ...article, title: updated.title, labels: updated.labels });
                setIsEditing(false);
            }
        } catch (error) {
            console.error("Failed to save:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePublish = async (action: "draft" | "publish") => {
        if (!article || !article.blog) return;
        setIsPublishing(true);
        try {
            const res = await fetch("/api/publish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    articleId: article.id,
                    blogId: article.blog.id,
                    action,
                }),
            });
            if (res.ok) {
                await fetchArticle();
            } else {
                const err = await res.json();
                alert(err.error || "Publishing failed");
            }
        } catch (error) {
            console.error("Failed to publish:", error);
        } finally {
            setIsPublishing(false);
        }
    };

    const handleDelete = async () => {
        if (!article || !confirm("Are you sure you want to delete this article?")) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/articles?id=${article.id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                router.push("/dashboard/articles");
            }
        } catch (error) {
            console.error("Failed to delete:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" />
            </div>
        );
    }

    if (!article) {
        return (
            <div className="text-center py-16">
                <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Article not found</h3>
                <Link href="/dashboard/articles">
                    <Button variant="outline">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Articles
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-5xl space-y-6">
            {/* Back button and actions */}
            <div className="flex items-center justify-between">
                <Link href="/dashboard/articles">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Articles
                    </Button>
                </Link>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyContent}
                        className="glass-card"
                    >
                        {copied ? (
                            <Check className="w-4 h-4 mr-2 text-green-500" />
                        ) : (
                            <Copy className="w-4 h-4 mr-2" />
                        )}
                        {copied ? "Copied!" : "Copy HTML"}
                    </Button>
                    {!isEditing ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditing(true)}
                            className="glass-card"
                        >
                            <Edit3 className="w-4 h-4 mr-2" /> Edit
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-[#FF6600] hover:bg-[#FF6600]/90 text-white"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Save
                        </Button>
                    )}
                    {article.blog && article.status === "draft" && (
                        <Button
                            size="sm"
                            onClick={() => handlePublish("publish")}
                            disabled={isPublishing}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {isPublishing ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4 mr-2" />
                            )}
                            Publish
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Article header */}
            <Card className="glass-card">
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <Badge
                            className={`text-xs ${
                                article.status === "published"
                                    ? "bg-green-500/10 text-green-400 border-green-500/20"
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
                        <span className="text-xs text-muted-foreground">
                            {article.wordCount.toLocaleString()} words
                        </span>
                        {article.tone && (
                            <Badge variant="outline" className="text-xs capitalize">
                                {article.tone}
                            </Badge>
                        )}
                        {article.articleType && (
                            <Badge variant="outline" className="text-xs capitalize">
                                {article.articleType}
                            </Badge>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="space-y-3">
                            <div>
                                <Label className="text-xs mb-1 block">Title</Label>
                                <Input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="bg-muted/30"
                                />
                            </div>
                            <div>
                                <Label className="text-xs mb-1 block">Labels (comma-separated)</Label>
                                <Input
                                    value={editLabels}
                                    onChange={(e) => setEditLabels(e.target.value)}
                                    className="bg-muted/30"
                                    placeholder="label1, label2, label3"
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            <CardTitle className="text-xl">{article.title}</CardTitle>
                            {article.metaDescription && (
                                <CardDescription className="mt-2">
                                    {article.metaDescription}
                                </CardDescription>
                            )}
                        </>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>Created: {formatDate(article.createdAt)}</span>
                        {article.blog && (
                            <span className="flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" />
                                {article.blog.name}
                            </span>
                        )}
                        {article.labels && (
                            <div className="flex gap-1.5">
                                <Tag className="w-3 h-3" />
                                {article.labels.split(",").map((label) => (
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
                    </div>
                </CardContent>
            </Card>

            {/* Article content */}
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle className="text-base">Article Content</CardTitle>
                </CardHeader>
                <CardContent>
                    <div
                        className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-[#FF6600] prose-strong:text-foreground"
                        dangerouslySetInnerHTML={{ __html: article.content }}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
