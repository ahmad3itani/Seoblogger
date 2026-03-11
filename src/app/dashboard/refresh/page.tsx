"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Sparkles, Send, Loader2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RefreshArticlePage() {
    const [blogs, setBlogs] = useState<any[]>([]);
    const [selectedBlogId, setSelectedBlogId] = useState("");

    const [posts, setPosts] = useState<any[]>([]);
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [isLoadingPosts, setIsLoadingPosts] = useState(false);

    const [instructions, setInstructions] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [newContent, setNewContent] = useState("");

    const [isPublishing, setIsPublishing] = useState(false);

    useEffect(() => {
        // Fetch connected blogs
        fetch("/api/blogs")
            .then(res => res.json())
            .then(data => {
                if (data.blogs && data.blogs.length > 0) {
                    setBlogs(data.blogs);
                    setSelectedBlogId(data.blogs[0].blogId);
                }
            })
            .catch(err => console.error("Error fetching blogs:", err));
    }, []);

    useEffect(() => {
        if (!selectedBlogId) return;

        setIsLoadingPosts(true);
        fetch(`/api/blogger/posts?blogId=${selectedBlogId}`)
            .then(res => res.json())
            .then(data => {
                setPosts(Array.isArray(data) ? data : []);
                setSelectedPost(null);
                setNewContent("");
            })
            .catch(err => console.error("Error fetching posts:", err))
            .finally(() => setIsLoadingPosts(false));
    }, [selectedBlogId]);

    const handleRefresh = async () => {
        if (!selectedPost || !instructions.trim()) return;

        setIsRefreshing(true);
        try {
            const res = await fetch("/api/refresh-generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: selectedPost.title,
                    content: selectedPost.content,
                    instructions
                }),
            });
            const data = await res.json();
            if (data.content) {
                setNewContent(data.content);
            }
        } catch (error) {
            console.error("Error refreshing article:", error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleUpdate = async () => {
        if (!selectedPost || !newContent) return;

        setIsPublishing(true);
        try {
            const res = await fetch("/api/publish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "update",
                    blogId: selectedBlogId,
                    postId: selectedPost.id,
                    post: {
                        title: selectedPost.title,
                        content: newContent,
                    }
                }),
            });

            if (res.ok) {
                alert("Successfully updated on Blogger!");
            }
        } catch (error) {
            console.error("Error updating article:", error);
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Content Refresher</h1>
                <p className="text-muted-foreground mt-1">
                    Select an existing published post and give the AI instructions to rewrite, update, or expand it.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle>1. Select Post</CardTitle>
                        <CardDescription>Choose the article to update</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Select Blog</Label>
                            <Select value={selectedBlogId} onValueChange={(v) => v && setSelectedBlogId(v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select blog..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {blogs.map(b => (
                                        <SelectItem key={b.blogId} value={b.blogId}>
                                            {b.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Select Post</Label>
                            <Select
                                disabled={isLoadingPosts || posts.length === 0}
                                value={selectedPost?.id || ""}
                                onValueChange={(id) => setSelectedPost(posts.find(p => p.id === id))}
                            >
                                <SelectTrigger>
                                    {isLoadingPosts ? (
                                        <div className="flex items-center text-muted-foreground">
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Fetching...
                                        </div>
                                    ) : (
                                        <SelectValue placeholder="Choose a published post..." />
                                    )}
                                </SelectTrigger>
                                <SelectContent>
                                    {posts.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle>2. Update Instructions</CardTitle>
                        <CardDescription>Tell the AI how to improve this post</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            placeholder="e.g. Add a section about 2025 trends. Fix grammar issues. Add a FAQ section at the end..."
                            rows={5}
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            disabled={!selectedPost}
                        />
                        <Button
                            className="w-full bg-[#FF6600] hover:bg-violet-700 text-white"
                            disabled={!selectedPost || !instructions.trim() || isRefreshing}
                            onClick={handleRefresh}
                        >
                            {isRefreshing ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Sparkles className="w-4 h-4 mr-2" />
                            )}
                            {isRefreshing ? "Rewriting Content..." : "Rewrite Content"}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {newContent && (
                <Card className="glass-card border-[#FF6600]/30">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>3. Review & Update</CardTitle>
                            <CardDescription>Review the drafted changes before pushing to Blogger</CardDescription>
                        </div>
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20"
                            onClick={handleUpdate}
                            disabled={isPublishing}
                        >
                            {isPublishing ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4 mr-2" />
                            )}
                            {isPublishing ? "Updating..." : "Update Live on Blogger"}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-muted/30 p-6 rounded-xl border border-border/50 max-h-[600px] overflow-y-auto custom-scrollbar prose prose-invert max-w-none">
                            <div dangerouslySetInnerHTML={{ __html: newContent }} />
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
