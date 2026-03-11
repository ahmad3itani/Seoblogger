"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Link as LinkIcon,
    Search,
    RefreshCw,
    Network,
    ArrowRight,
    CheckCircle2,
    Loader2,
    Eye
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

interface LinkOpportunity {
    postId: string;
    postTitle: string;
    postUrl: string;
    originalContext: string;
    newContextHtml: string;
    fullNewHtml: string;
    status: "pending" | "success" | "error";
}

export default function LinkerPage() {
    const [uiError, setUiError] = useState("");
    const [uiSuccess, setUiSuccess] = useState("");

    const [posts, setPosts] = useState<CachedPost[]>([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(false);

    // Config
    const [targetPostId, setTargetPostId] = useState<string>("");
    const [targetKeyword, setTargetKeyword] = useState("");

    // Processing
    const [isScanning, setIsScanning] = useState(false);
    const [opportunities, setOpportunities] = useState<LinkOpportunity[]>([]);
    const [isApplying, setIsApplying] = useState(false);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        setIsLoadingPosts(true);
        try {
            const res = await fetch("/api/posts/cached");
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

    const handleScanForLinks = async () => {
        setUiError("");
        setUiSuccess("");

        if (!targetPostId || !targetKeyword.trim()) {
            setUiError("Select a target post and enter the keyword you want to rank for.");
            return;
        }

        setIsScanning(true);
        setOpportunities([]);

        try {
            const targetPost = posts.find(p => p.postId === targetPostId);

            const res = await fetch("/api/generate/linker/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    targetUrl: targetPost?.url,
                    targetTitle: targetPost?.title,
                    targetKeyword,
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setOpportunities(data.opportunities || []);

            if (data.opportunities?.length === 0) {
                setUiSuccess("No Opportunities Found: AI couldn't find natural insertion points in your recent posts.");
            } else {
                setUiSuccess(`Scan Complete: Found ${data.opportunities.length} potential linking opportunities!`);
            }

        } catch (error: any) {
            setUiError(error.message || "Could not analyze posts for backlink opportunities.");
        } finally {
            setIsScanning(false);
        }
    };

    const handleApplyLinks = async () => {
        setIsApplying(true);

        let successCount = 0;
        let pendingOpps = [...opportunities];

        // Process one by one sequentially
        for (let i = 0; i < pendingOpps.length; i++) {
            const opp = pendingOpps[i];
            if (opp.status === "success") continue;

            try {
                const res = await fetch("/api/posts/update", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        postId: opp.postId,
                        title: opp.postTitle,
                        content: opp.fullNewHtml
                    })
                });

                if (res.ok) {
                    pendingOpps[i].status = "success";
                    successCount++;
                } else {
                    pendingOpps[i].status = "error";
                }
            } catch (err) {
                pendingOpps[i].status = "error";
            }

            // Update state so UI reflects progress
            setOpportunities([...pendingOpps]);
        }

        setIsApplying(false);

        setUiSuccess(`Linking Complete: Successfully inserted internal links in ${successCount} out of ${pendingOpps.length} posts.`);
        setTimeout(() => setUiSuccess(""), 8000);
    };

    return (
        <div className="space-y-8 max-w-6xl">
            <div>
                <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
                    <Network className="w-6 h-6 text-[#FF6600]" />
                    Auto Internal Linker
                </h1>
                <p className="text-sm text-muted-foreground">
                    Boost a specific article's SEO by automatically finding relevant spots in your OLDER posts to inject a backlink to it.
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
                            Target Article
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <Label>Select the "Money Post" to Boost</Label>
                                <Select value={targetPostId} onValueChange={(v) => setTargetPostId(v || "")} disabled={isLoadingPosts}>
                                    <SelectTrigger className="w-full mt-1.5 bg-muted/30">
                                        <SelectValue placeholder={isLoadingPosts ? "Loading posts..." : "Select Target Post"} />
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
                                <Label>Target Anchor Text / Keyword</Label>
                                <Input
                                    placeholder="e.g., best SEO tools"
                                    className="mt-1.5 bg-muted/30"
                                    value={targetKeyword}
                                    onChange={(e) => setTargetKeyword(e.target.value)}
                                />
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    The AI will look for (or naturally add) context in older posts to use this as anchor text.
                                </p>
                            </div>

                            <Button
                                className="w-full glow-button text-white border-0 mt-4"
                                onClick={handleScanForLinks}
                                disabled={isScanning || !targetPostId || !targetKeyword.trim()}
                            >
                                {isScanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Network className="w-4 h-4 mr-2" />}
                                {isScanning ? "Scanning Entire Blog..." : "Find Link Opportunities"}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Results Panel */}
                <div className="lg:col-span-2 space-y-4">
                    {opportunities.length === 0 && !isScanning ? (
                        <div className="glass-card rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center border-dashed">
                            <div className="w-16 h-16 bg-[#FF6600]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <LinkIcon className="w-8 h-8 text-[#FF6600] opacity-50" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">No Active Links</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto">
                                Select a target post on the left. The AI will scan your other posts and propose exact paragraphs where a link can be naturally injected.
                            </p>
                        </div>
                    ) : isScanning ? (
                        <div className="glass-card rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center">
                            <Loader2 className="w-12 h-12 text-[#FF6600] animate-spin mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">Analyzing Content Graph</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto">
                                Fetching older posts and using AI to find semantically relevant insertion points for your link...
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-slide-up opacity-0 stagger-1">
                            <div className="flex items-center justify-between">
                                <h2 className="font-semibold text-lg flex items-center gap-2">
                                    <Badge className="bg-[#FF6600] text-white hover:bg-orange-600">{opportunities.length}</Badge> Opportunities Found
                                </h2>

                                <Button
                                    onClick={handleApplyLinks}
                                    disabled={isApplying || opportunities.every(o => o.status === "success")}
                                    className="bg-green-500 hover:bg-green-600 text-white border-0 shine-effect"
                                >
                                    {isApplying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                    {isApplying ? "Injecting Links..." : "Apply All Links to Live Blog"}
                                </Button>
                            </div>

                            <div className="space-y-4 mt-4">
                                {opportunities.map((opp, idx) => (
                                    <div key={idx} className="glass-card rounded-xl border border-border/50 overflow-hidden">
                                        <div className="bg-muted/40 px-4 py-3 flex items-center justify-between border-b border-border/50">
                                            <h3 className="font-semibold text-sm truncate flex-1 pr-4">{opp.postTitle}</h3>

                                            {opp.status === "success" ? (
                                                <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="w-3 h-3 justify-center mr-1" /> Applied</Badge>
                                            ) : opp.status === "error" ? (
                                                <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Failed</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
                                            )}
                                        </div>
                                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Original Paragraph</p>
                                                <p className="text-xs text-muted-foreground bg-background rounded-lg p-3 border border-border/50 line-clamp-4">
                                                    {opp.originalContext}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-[#FF6600] mb-2">New Proposed Insertion</p>
                                                <div
                                                    className="text-xs bg-[#FF6600]/5 rounded-lg p-3 border border-[#FF6600]/20 prose prose-a:text-[#FF6600] prose-a:font-semibold max-w-none"
                                                    dangerouslySetInnerHTML={{ __html: opp.newContextHtml }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
