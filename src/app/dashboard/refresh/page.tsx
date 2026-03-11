"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    RefreshCw,
    ArrowRight,
    Search,
    CheckCircle2,
    Loader2,
    Save,
    Eye,
    Code
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
interface CachedPost {
    postId: string;
    title: string;
    url: string;
}

export default function ContentRefreshPage() {
    const searchParams = useSearchParams();
    const initialPostId = searchParams.get('post');

    const [uiError, setUiError] = useState("");
    const [uiSuccess, setUiSuccess] = useState("");

    const [posts, setPosts] = useState<CachedPost[]>([]);
    const [selectedPostId, setSelectedPostId] = useState<string>(initialPostId || "");
    const [isLoadingPosts, setIsLoadingPosts] = useState(false);

    // Refresh Configuration
    const [targetKeywords, setTargetKeywords] = useState("");
    const [instructions, setInstructions] = useState("Expand the content to be more comprehensive, add an FAQ section, and improve overall readability.");

    // Generation State
    const [isGenerating, setIsGenerating] = useState(false);
    const [originalHtml, setOriginalHtml] = useState("");
    const [newHtml, setNewHtml] = useState("");

    // Publishing State
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishSuccess, setPublishSuccess] = useState(false);

    // View Mode
    const [viewMode, setViewMode] = useState<"preview" | "code">("preview");

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        setIsLoadingPosts(true);
        try {
            const res = await fetch("/api/posts/cached"); // We'll need to create this endpoint
            const data = await res.json();
            if (res.ok && data.posts) {
                setPosts(data.posts);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingPosts(false);
        }
    };

    const handleGenerateRefresh = async () => {
        setUiError("");
        setUiSuccess("");

        if (!selectedPostId || !targetKeywords.trim()) {
            setUiError("Please select a post and enter target keywords.");
            return;
        }

        setIsGenerating(true);
        setPublishSuccess(false);

        try {
            const res = await fetch("/api/generate/refresh", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    postId: selectedPostId,
                    keywords: targetKeywords,
                    instructions: instructions
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setOriginalHtml(data.originalContent);
            setNewHtml(data.newContent);
            setUiSuccess("Review the refreshed content below.");
        } catch (error: any) {
            setUiError(error.message || "Failed to generate refreshed content.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUpdateBlogger = async () => {
        if (!selectedPostId || !newHtml) return;

        setIsPublishing(true);
        try {
            const selectedPost = posts.find(p => p.postId === selectedPostId);
            const res = await fetch("/api/posts/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    postId: selectedPostId,
                    title: selectedPost?.title || "Updated Post",
                    content: newHtml
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setPublishSuccess(true);
            setUiSuccess("Post updated successfully on Blogger.");
            setTimeout(() => setUiSuccess(""), 5000);
        } catch (error: any) {
            setUiError(error.message || "Could not push update to Blogger.");
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="space-y-8 max-w-6xl pb-20">
            <div>
                <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
                    <RefreshCw className="w-6 h-6 text-[#FF6600]" />
                    Content Refresh Engine
                </h1>
                <p className="text-sm text-muted-foreground">
                    Select an old, underperforming post. AI will expand the content, inject LSI keywords, and add FAQs. You can then push the update directly to Blogger without changing the URL.
                </p>
            </div>

            {uiError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
                    {uiError}
                </div>
            )}

            {uiSuccess && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    {uiSuccess}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Configuration Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-card rounded-2xl p-6 border border-border/50">
                        <h2 className="font-semibold mb-4 text-[#FF6600] flex items-center gap-2">
                            <Search className="w-4 h-4" />
                            1. Select Post
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <Label>Blogger Post</Label>
                                <Select value={selectedPostId} onValueChange={(v) => setSelectedPostId(v || "")} disabled={isLoadingPosts}>
                                    <SelectTrigger className="w-full mt-1.5 bg-muted/30">
                                        <SelectValue placeholder={isLoadingPosts ? "Loading posts..." : "Select a post to refresh"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {posts.map(post => (
                                            <SelectItem key={post.postId} value={post.postId}>
                                                {post.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Target Keywords</Label>
                                <Input
                                    placeholder="e.g., best running shoes 2024, marathon prep"
                                    className="mt-1.5 bg-muted/30"
                                    value={targetKeywords}
                                    onChange={(e) => setTargetKeywords(e.target.value)}
                                />
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    The AI will naturally inject these into the content.
                                </p>
                            </div>

                            <div>
                                <Label>Custom Instructions (Optional)</Label>
                                <Textarea
                                    placeholder="e.g., Make the tone more professional and add a section about durability."
                                    className="mt-1.5 bg-muted/30 text-xs h-24"
                                    value={instructions}
                                    onChange={(e) => setInstructions(e.target.value)}
                                />
                            </div>

                            <Button
                                className="w-full glow-button text-white border-0 mt-4"
                                onClick={handleGenerateRefresh}
                                disabled={isGenerating || !selectedPostId || !targetKeywords.trim()}
                            >
                                {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                {isGenerating ? "Analyzing & Rewriting... (est. 1-2m)" : "Rewrite Content"}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Editor/Diff Panel */}
                <div className="lg:col-span-2 space-y-4">
                    {!newHtml && !isGenerating ? (
                        <div className="glass-card rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center border-dashed">
                            <div className="w-16 h-16 bg-[#FF6600]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <RefreshCw className="w-8 h-8 text-[#FF6600] opacity-50" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Ready to Refresh</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto">
                                Select a post on the left and enter your primary keywords. The AI will completely revamp the content while keeping the core URL intact.
                            </p>
                        </div>
                    ) : isGenerating ? (
                        <div className="glass-card rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center">
                            <Loader2 className="w-12 h-12 text-[#FF6600] animate-spin mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">AI is Hard at Work</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto">
                                Retrieving the old post, expanding sections, and optimizing for your new keywords...
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-slide-up opacity-0 stagger-1">
                            <div className="flex items-center justify-between">
                                <h2 className="font-semibold text-lg">Review Changes</h2>
                                <div className="flex bg-muted p-1 rounded-lg">
                                    <button
                                        onClick={() => setViewMode("preview")}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${viewMode === "preview" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                                    >
                                        <Eye className="w-3.5 h-3.5" /> Preview
                                    </button>
                                    <button
                                        onClick={() => setViewMode("code")}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${viewMode === "code" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                                    >
                                        <Code className="w-3.5 h-3.5" /> HTML
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Badge variant="outline" className="w-full justify-center bg-muted/50 border-border/50 text-muted-foreground">Original Content</Badge>
                                    <div className="glass-card rounded-xl p-4 h-[500px] overflow-y-auto">
                                        {viewMode === "preview" ? (
                                            <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted/50 max-w-none opacity-70" dangerouslySetInnerHTML={{ __html: originalHtml }} />
                                        ) : (
                                            <pre className="text-xs font-mono whitespace-pre-wrap opacity-70 break-words">{originalHtml}</pre>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Badge variant="outline" className="w-full justify-center bg-[#FF6600]/10 border-[#FF6600]/30 text-[#FF6600]">New Refreshed Content</Badge>
                                    <div className="glass-card border-[#FF6600]/20 rounded-xl p-4 h-[500px] overflow-y-auto relative">
                                        {viewMode === "preview" ? (
                                            <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted/50 max-w-none" dangerouslySetInnerHTML={{ __html: newHtml }} />
                                        ) : (
                                            <Textarea
                                                className="w-full h-full min-h-[450px] font-mono text-xs bg-transparent border-0 focus-visible:ring-0 p-0 resize-none break-words"
                                                value={newHtml}
                                                onChange={(e) => setNewHtml(e.target.value)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card rounded-xl p-6 border border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-semibold text-sm">Push to Blogger</h3>
                                    <p className="text-xs text-muted-foreground mt-1">This will instantly overwrite the existing post on your live blog. The URL will remain identical.</p>
                                </div>
                                <Button
                                    onClick={handleUpdateBlogger}
                                    disabled={isPublishing || publishSuccess}
                                    className={`${publishSuccess ? "bg-green-500 hover:bg-green-600" : "bg-gradient-to-r from-orange-500 to-[#FF6600]"} text-white border-0 shine-effect`}
                                >
                                    {isPublishing ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : publishSuccess ? (
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                    ) : (
                                        <Save className="w-4 h-4 mr-2" />
                                    )}
                                    {isPublishing ? "Updating Live Post..." : publishSuccess ? "Successfully Published!" : "Update Live Post"}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
