"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    Search,
    Loader2,
    ExternalLink,
    ChevronRight,
    Play,
    Wand2
} from "lucide-react";

export default function AdvancedAuditPage() {
    const [auditData, setAuditData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(false);
    const [selectedBlog, setSelectedBlog] = useState<{ id: string, url: string } | null>(null);

    // AI Fix Panel State
    const [selectedIssue, setSelectedIssue] = useState<any>(null);
    const [isGeneratingFix, setIsGeneratingFix] = useState(false);
    const [aiFix, setAiFix] = useState<{ suggestion: string, explanation: string } | null>(null);
    const [isApplyingFix, setIsApplyingFix] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            // 1. Get default blog
            const pRes = await fetch("/api/posts/cached"); // Reusing for blog info context
            const pData = await pRes.json();

            // To properly mock this without deep props passing, 
            // Assume we fetch the latest session from the backend
            // In a real flow, you'd select the blog first or pull the user's default blog.
            // For now, we kick off fetching the session right away if a blogId query param existed
            // Let's just fetch all blogs and pick the default.

            // Temporary fetch loop for demo purposes
            const res = await fetch("/api/audit/full?blogId=demo-123");
            // Note: Since I don't have the exact blog ID in the frontend state easily without passing it down,
            // we will need to adjust this to fetch the user's default blog first.
            setIsLoading(false);
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    };

    const handleStartScan = async () => {
        if (!selectedBlog) return;
        setIsScanning(true);
        try {
            const res = await fetch("/api/audit/full/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ blogId: selectedBlog.id })
            });
            // Polling would start here
        } catch (error) {
            console.error(error);
        } finally {
            setIsScanning(false);
        }
    };

    const handleGenerateFix = async (issue: any, page: any) => {
        setSelectedIssue(issue);
        setIsGeneratingFix(true);
        setAiFix(null);

        try {
            const res = await fetch("/api/audit/fix/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    issueId: issue.issueId,
                    description: issue.description,
                    pageUrl: page.url,
                    bloggerPostId: "mock-post-id", // In reality, we extract this from the URL or scanned page
                    blogId: "mock-blog-id"
                })
            });
            const data = await res.json();
            if (data.success) {
                setAiFix({ suggestion: data.suggestion, explanation: data.explanation });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsGeneratingFix(false);
        }
    };

    if (isLoading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" /></div>;
    }

    return (
        <div className="space-y-8 max-w-7xl animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 mb-2 flex items-center gap-2">
                    <Activity className="w-8 h-8 text-[#FF6600]" />
                    Advanced Site Auditor
                </h1>
                <p className="text-muted-foreground">
                    Deep crawl your entire Blogger website to uncover highly technical SEO errors, thin content, and performance bottlenecks.
                </p>
            </div>

            {/* Empty State / Start Scan */}
            {!auditData && !isScanning && (
                <div className="glass-card rounded-2xl p-16 text-center border-dashed">
                    <div className="w-20 h-20 bg-[#FF6600]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Search className="w-10 h-10 text-[#FF6600]" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Ready to Audit Your Site?</h2>
                    <p className="text-muted-foreground max-w-lg mx-auto mb-8">
                        The advanced crawler will read your XML sitemap, fetch every page, evaluate technical limits, and analyze Core Web Vitals.
                    </p>
                    <Button onClick={handleStartScan} className="h-12 px-8 text-base bg-[#FF6600] hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/25">
                        <Play className="w-5 h-5 mr-2 fill-current" /> Initialize Deep Scan (Up to 2,000 pages)
                    </Button>
                </div>
            )}

            {isScanning && (
                <div className="glass-card rounded-2xl p-16 text-center">
                    <div className="w-20 h-20 bg-[#FF6600]/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                        <RefreshCw className="w-10 h-10 text-[#FF6600] animate-spin" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Crawling Website...</h2>
                    <p className="text-muted-foreground">
                        Analyzing HTML structure, extracting headings, checking broken links...
                    </p>
                </div>
            )}

            {/* AI Fix Panel Slide-out Modal Placeholder */}
            {selectedIssue && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
                    <div className="w-[500px] h-full bg-background p-6 shadow-2xl border-l animate-in slide-in-from-right overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Wand2 className="w-5 h-5 text-[#FF6600]" /> AI Auto-Fix
                            </h3>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedIssue(null)}>✕</Button>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-muted/50 p-4 rounded-xl border">
                                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Issue Detected</p>
                                <p className="text-sm font-medium">{selectedIssue.description}</p>
                            </div>

                            {isGeneratingFix ? (
                                <div className="h-32 flex flex-col items-center justify-center text-center p-4">
                                    <Loader2 className="w-8 h-8 text-[#FF6600] animate-spin mb-3" />
                                    <p className="text-sm text-muted-foreground">Engineering customized SEO fix...</p>
                                </div>
                            ) : aiFix ? (
                                <div className="space-y-4">
                                    <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                                        <p className="text-xs text-green-600 uppercase font-semibold mb-2 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> AI SEO Recommendation
                                        </p>
                                        <p className="text-sm">{aiFix.suggestion}</p>
                                        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-green-500/10">
                                            {aiFix.explanation}
                                        </p>
                                    </div>

                                    <Button className="w-full bg-[#FF6600] text-white hover:bg-orange-600">
                                        Apply Fix Live to Blogger
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
