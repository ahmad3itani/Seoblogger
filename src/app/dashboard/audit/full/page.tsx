"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    const [blogs, setBlogs] = useState<any[]>([]);

    // AI Fix Panel State
    const [selectedIssue, setSelectedIssue] = useState<any>(null);
    const [isGeneratingFix, setIsGeneratingFix] = useState(false);
    const [aiFix, setAiFix] = useState<{ suggestion: string, explanation: string, analyzedKeyword?: string } | null>(null);
    const [isApplyingFix, setIsApplyingFix] = useState(false);

    // Batch Fix State
    const [isFixingAll, setIsFixingAll] = useState(false);
    const [fixProgress, setFixProgress] = useState({ current: 0, total: 0, currentIssue: "" });
    const [fixedIssueIds, setFixedIssueIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            // 1. Get default blog
            const pRes = await fetch("/api/blogs"); 
            const pData = await pRes.json();
            
            if (pData.blogs && pData.blogs.length > 0) {
                setBlogs(pData.blogs);
                // Find default blog or fallback to the first one
                const defaultBlog = pData.blogs.find((b: any) => b.isDefault) || pData.blogs[0];
                setSelectedBlog({ id: defaultBlog.blogId, url: defaultBlog.url });
                
                // Fetch the latest session for this blog
                const res = await fetch(`/api/audit/full?blogId=${defaultBlog.blogId}`); 
                const auditResp = await res.json();
                
                if (auditResp.success && auditResp.session) {
                     setAuditData(auditResp.session);
                }
            }
            setIsLoading(false);
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    };

    const handleBlogChange = async (blogId: string) => {
        const blog = blogs.find(b => b.blogId === blogId);
        if (blog) {
             setSelectedBlog({ id: blog.blogId, url: blog.url });
             setAuditData(null); // Clear old data
             setIsLoading(true);
             try {
                const res = await fetch(`/api/audit/full?blogId=${blog.blogId}`); 
                const auditResp = await res.json();
                if (auditResp.success && auditResp.session) {
                     setAuditData(auditResp.session);
                }
             } finally {
                 setIsLoading(false);
             }
        }
    };

    const handleStartScan = async () => {
        if (!selectedBlog) return;
        setIsScanning(true);
        setAuditData(null);
        try {
            const res = await fetch("/api/audit/full/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ blogId: selectedBlog.id })
            });
            const data = await res.json();
            
            if (data.success && data.sessionId) {
                // Poll for completion
                const interval = setInterval(async () => {
                    try {
                        const checkRes = await fetch(`/api/audit/full?blogId=${selectedBlog.id}`);
                        const checkData = await checkRes.json();
                        
                        if (checkData.success && checkData.session) {
                            if (checkData.session.id === data.sessionId) {
                                if (checkData.session.status === "completed" || checkData.session.status === "failed") {
                                    clearInterval(interval);
                                    setAuditData(checkData.session);
                                    setIsScanning(false);
                                }
                            }
                        }
                    } catch (e) {
                         console.error("Poller Error", e);
                    }
                }, 3000); // Check every 3 seconds
            } else {
                setIsScanning(false);
            }
        } catch (error) {
            console.error(error);
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
                    bloggerPostId: "mock-post-id", // Backend handles resolving this
                    blogId: selectedBlog?.id || "mock-blog-id"
                })
            });
            const data = await res.json();
            if (data.success) {
                setAiFix({ 
                    suggestion: data.suggestion, 
                    explanation: data.explanation,
                    analyzedKeyword: data.analyzedKeyword
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsGeneratingFix(false);
        }
    };

    const handleApplyFix = async () => {
        if (!selectedIssue || !aiFix || !selectedBlog) return;
        setIsApplyingFix(true);

        try {
            const pageUrl = auditData.scannedPages.find(
                (p: any) => p.issues.some((i: any) => i.id === selectedIssue.id)
            )?.url;

            const res = await fetch("/api/audit/fix/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    issueId: selectedIssue.issueId,
                    dbIssueId: selectedIssue.id,
                    suggestedFix: aiFix.suggestion,
                    pageUrl: pageUrl,
                    bloggerPostId: "mock-post-id",
                    blogId: selectedBlog.id
                })
            });
            const data = await res.json();
            
            if (data.success) {
                // Update local list to hide the applied issue or mark it green
                setAuditData((prev: any) => {
                    const newPages = prev.scannedPages.map((p: any) => {
                        return {
                            ...p,
                            issues: p.issues.map((i: any) => 
                                i.id === selectedIssue.id ? { ...i, fixable: false, description: "Fix applied: " + i.description } : i
                            )
                        };
                    });
                    return { ...prev, scannedPages: newPages };
                });
                setSelectedIssue(null);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsApplyingFix(false);
        }
    };

    // Collect all fixable issues with their page context
    const getAllFixableIssues = () => {
        if (!auditData?.scannedPages) return [];
        const issues: { issue: any; page: any }[] = [];
        for (const page of auditData.scannedPages) {
            for (const issue of (page.issues || [])) {
                if (issue.fixable && !fixedIssueIds.has(issue.id)) {
                    issues.push({ issue, page });
                }
            }
        }
        return issues;
    };

    // Get issue counts by category
    const getIssueCounts = () => {
        if (!auditData?.scannedPages) return { total: 0, fixable: 0, fixed: 0, high: 0, medium: 0, low: 0 };
        let total = 0, fixable = 0, high = 0, medium = 0, low = 0;
        for (const page of auditData.scannedPages) {
            for (const issue of (page.issues || [])) {
                total++;
                if (issue.fixable && !fixedIssueIds.has(issue.id)) fixable++;
                if (issue.severity === "high") high++;
                else if (issue.severity === "medium") medium++;
                else low++;
            }
        }
        return { total, fixable, fixed: fixedIssueIds.size, high, medium, low };
    };

    const handleFixAll = async () => {
        const fixableIssues = getAllFixableIssues();
        if (fixableIssues.length === 0) return;

        setIsFixingAll(true);
        setFixProgress({ current: 0, total: fixableIssues.length, currentIssue: "" });

        for (let i = 0; i < fixableIssues.length; i++) {
            const { issue, page } = fixableIssues[i];
            setFixProgress({ current: i + 1, total: fixableIssues.length, currentIssue: issue.description });

            try {
                // 1. Generate fix
                const genRes = await fetch("/api/audit/fix/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        issueId: issue.issueId,
                        description: issue.description,
                        pageUrl: page.url,
                        bloggerPostId: "mock-post-id",
                        blogId: selectedBlog?.id || ""
                    })
                });
                const genData = await genRes.json();

                if (genData.success && genData.suggestion) {
                    // 2. Apply fix
                    const applyRes = await fetch("/api/audit/fix/apply", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            issueId: issue.issueId,
                            dbIssueId: issue.id,
                            suggestedFix: genData.suggestion,
                            pageUrl: page.url,
                            bloggerPostId: "mock-post-id",
                            blogId: selectedBlog?.id || ""
                        })
                    });
                    const applyData = await applyRes.json();

                    if (applyData.success) {
                        setFixedIssueIds(prev => new Set([...prev, issue.id]));
                    }
                }
            } catch (error) {
                console.error(`Failed to fix issue ${issue.issueId}:`, error);
            }

            // Small delay between fixes to avoid rate limits
            await new Promise(r => setTimeout(r, 1500));
        }

        setIsFixingAll(false);
    };

    if (isLoading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" /></div>;
    }

    return (
        <div className="space-y-8 max-w-7xl animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 mb-2 flex items-center gap-2">
                        <Activity className="w-8 h-8 text-[#FF6600]" />
                        Advanced Site Auditor
                    </h1>
                    <p className="text-muted-foreground">
                        Deep crawl your entire Blogger website to uncover highly technical SEO errors, thin content, and performance bottlenecks.
                    </p>
                </div>
                {blogs.length > 0 && (
                    <div className="flex items-center gap-3">
                        <Select value={selectedBlog?.id || ""} onValueChange={(val) => val && handleBlogChange(val)} disabled={isScanning}>
                            <SelectTrigger className="w-[200px] h-11 bg-white">
                                <SelectValue placeholder="Select a blog" />
                            </SelectTrigger>
                            <SelectContent>
                                {blogs.map(b => (
                                    <SelectItem key={b.blogId} value={b.blogId}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {auditData && !isScanning && (
                            <Button onClick={handleStartScan} variant="outline" className="h-11 border-[#FF6600] text-[#FF6600] hover:bg-[#FF6600]/10 shrink-0">
                                <RefreshCw className="w-4 h-4 mr-2" /> Rescan Site
                            </Button>
                        )}
                    </div>
                )}
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

            {auditData && !isScanning && (() => {
                const counts = getIssueCounts();
                return (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-700 delay-150">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-[#FF6600]">
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Health Score</p>
                            <h2 className="text-4xl font-black mt-1 text-[#FF6600]">{auditData?.totalScore || 0}<span className="text-lg text-muted-foreground">/100</span></h2>
                        </div>
                        <div className="glass-card p-5 rounded-2xl">
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Pages Scanned</p>
                            <h2 className="text-2xl font-bold mt-1">{auditData?.pagesScanned}</h2>
                        </div>
                        <div className="glass-card p-5 rounded-2xl">
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> High</p>
                            <h2 className="text-2xl font-bold mt-1 text-red-500">{counts.high}</h2>
                        </div>
                        <div className="glass-card p-5 rounded-2xl">
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block"></span> Medium</p>
                            <h2 className="text-2xl font-bold mt-1 text-orange-400">{counts.medium}</h2>
                        </div>
                        <div className="glass-card p-5 rounded-2xl">
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block"></span> Low</p>
                            <h2 className="text-2xl font-bold mt-1 text-yellow-500">{counts.low}</h2>
                        </div>
                    </div>

                    {/* Fix All Progress Bar */}
                    {isFixingAll && (
                        <div className="glass-card rounded-2xl p-6 border-2 border-[#FF6600]/30">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold flex items-center gap-2">
                                    <Wand2 className="w-5 h-5 text-[#FF6600] animate-pulse" />
                                    Fixing Issues... ({fixProgress.current}/{fixProgress.total})
                                </h3>
                                <Badge className="bg-[#FF6600]/10 text-[#FF6600]">{Math.round((fixProgress.current / fixProgress.total) * 100)}%</Badge>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                                <div
                                    className="bg-gradient-to-r from-[#FF6600] to-orange-400 h-3 rounded-full transition-all duration-500"
                                    style={{ width: `${(fixProgress.current / fixProgress.total) * 100}%` }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                                Currently fixing: {fixProgress.currentIssue}
                            </p>
                        </div>
                    )}

                    {/* Issues List */}
                    <div className="glass-card rounded-2xl overflow-hidden border">
                        <div className="bg-muted px-6 py-4 flex justify-between items-center border-b">
                            <div className="flex items-center gap-3">
                                <h3 className="font-bold">Detected Issues</h3>
                                <Badge variant="secondary">{counts.total} total</Badge>
                                {counts.fixed > 0 && (
                                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">{counts.fixed} fixed</Badge>
                                )}
                            </div>
                            {counts.fixable > 0 && !isFixingAll && (
                                <Button
                                    onClick={handleFixAll}
                                    size="sm"
                                    className="bg-[#FF6600] text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                                >
                                    <Wand2 className="w-4 h-4 mr-2" />
                                    Fix All ({counts.fixable} issues)
                                </Button>
                            )}
                        </div>
                        <div className="divide-y max-h-[600px] overflow-y-auto">
                            {auditData?.scannedPages?.map((page: any) => 
                                page.issues?.map((issue: any) => {
                                    const isFixed = fixedIssueIds.has(issue.id);
                                    return (
                                    <div key={issue.id} className={`p-5 hover:bg-muted/50 transition-colors flex items-start justify-between ${isFixed ? "opacity-60 bg-green-50/50" : ""}`}>
                                        <div className="flex gap-3">
                                            {isFixed ? (
                                                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                            ) : issue.severity === "high" ? (
                                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                            ) : issue.severity === "medium" ? (
                                                <AlertCircle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                                            ) : (
                                                <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                                            )}
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    {isFixed ? (
                                                        <Badge className="bg-green-500/10 text-green-600 border-green-500/30">FIXED</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className={
                                                            issue.severity === 'high' ? 'border-red-500/30 text-red-500 bg-red-500/10' :
                                                            issue.severity === 'medium' ? 'border-orange-500/30 text-orange-500 bg-orange-500/10' :
                                                            'border-yellow-500/30 text-yellow-600 bg-yellow-500/10'
                                                        }>
                                                            {issue.severity.toUpperCase()}
                                                        </Badge>
                                                    )}
                                                    <Badge variant="secondary" className="text-[10px]">{issue.type}</Badge>
                                                </div>
                                                <h4 className={`font-semibold ${isFixed ? "line-through text-muted-foreground" : ""}`}>{issue.description}</h4>
                                                <p className="text-xs text-muted-foreground mt-1 truncate max-w-xl flex items-center gap-1">
                                                    <ExternalLink className="w-3 h-3" /> <a href={page.url} target="_blank" className="hover:underline">{page.url}</a>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex items-center">
                                            {isFixed ? (
                                                <span className="text-xs text-green-600 font-semibold">✓ Applied</span>
                                            ) : issue.fixable ? (
                                                <Button size="sm" onClick={() => handleGenerateFix(issue, page)} disabled={isFixingAll} className="bg-[#FF6600]/10 text-[#FF6600] border border-[#FF6600]/20 hover:bg-[#FF6600] hover:text-white transition-all">
                                                    <Wand2 className="w-4 h-4 mr-1.5" /> Fix
                                                </Button>
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Manual</span>
                                            )}
                                        </div>
                                    </div>
                                    );
                                })
                            )}
                            
                            {(!auditData?.scannedPages || auditData.scannedPages.length === 0 || !auditData.scannedPages.some((p:any) => p.issues?.length > 0)) && (
                                <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                                    <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                                    <p>No critical issues detected. Your site is highly optimized!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                );
            })()}

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
                                    {aiFix.analyzedKeyword && (
                                        <div className="bg-[#FF6600]/5 border border-[#FF6600]/20 p-4 rounded-xl flex items-center gap-3">
                                            <Search className="w-5 h-5 text-[#FF6600]" />
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Analyzed Target Keyword</p>
                                                <p className="text-sm font-bold text-[#FF6600]">"{aiFix.analyzedKeyword}"</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs text-green-600 uppercase font-semibold flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> AI SEO Recommendation
                                            </p>
                                            <span className="text-[10px] text-muted-foreground uppercase">Editable</span>
                                        </div>
                                        <Textarea 
                                            value={aiFix.suggestion} 
                                            onChange={(e) => setAiFix({ ...aiFix, suggestion: e.target.value })}
                                            className="min-h-[120px] bg-white border-green-500/30 focus-visible:ring-green-500 font-medium"
                                        />
                                        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-green-500/10">
                                            {aiFix.explanation}
                                        </p>
                                    </div>

                                    <Button 
                                        disabled={isApplyingFix}
                                        onClick={handleApplyFix} 
                                        className="w-full bg-[#FF6600] text-white hover:bg-orange-600"
                                    >
                                        {isApplyingFix ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                                        {isApplyingFix ? "Pushing Live..." : "Apply Fix Live to Blogger"}
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
