"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    Search,
    Loader2,
    ExternalLink,
    Play,
    Sparkles,
    ArrowRight,
    Lock,
    Wand2
} from "lucide-react";

export default function FreeAuditPage() {
    const [url, setUrl] = useState("");
    const [auditData, setAuditData] = useState<any>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState("");

    const handleStartScan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;
        
        setError("");
        setIsScanning(true);
        setAuditData(null);
        
        try {
            // Basic validation
            let parsedUrl;
            try {
                parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
            } catch (e) {
                setError("Please enter a valid URL (e.g., example.blogspot.com)");
                setIsScanning(false);
                return;
            }

            const res = await fetch("/api/audit/public/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ blogUrl: parsedUrl.origin })
            });
            const data = await res.json();
            
            if (data.success && data.session) {
                setAuditData(data.session);
            } else {
                setError(data.error || "Failed to scan website. Please verify it is accessible.");
            }
        } catch (err) {
            console.error(err);
            setError("Network error occurred. Please try again.");
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Simple Nav */}
            <nav className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg glow-button flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-lg font-bold gradient-text">BloggerSEO</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground font-medium">
                            Sign In
                        </Link>
                        <Link href="/auth/login">
                            <Button size="sm" className="glow-button text-white border-0">
                                Get Started Free
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-in fade-in duration-500">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm glass-card border-[#FF6600]/20">
                        <span className="w-2 h-2 rounded-full bg-green-400 inline-block mr-2 animate-pulse-dot" />
                        Free Blogger Deep Scan
                    </Badge>
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
                        Audit Your Blogger Site <br/>
                        <span className="gradient-text">Fix SEO with AI</span>
                    </h1>
                    <p className="text-lg text-muted-foreground mb-8">
                        Enter your Blogspot URL below. We'll instantly crawl your site, detect technical SEO errors, and show you exactly what needs fixing.
                    </p>

                    <form onSubmit={handleStartScan} className="flex flex-col sm:flex-row items-center gap-3 max-w-xl mx-auto">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input 
                                type="text"
                                placeholder="https://yourblog.blogspot.com"
                                className="w-full pl-10 h-14 rounded-xl border-border bg-white text-base shadow-sm focus-visible:ring-[#FF6600]"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                disabled={isScanning}
                            />
                        </div>
                        <Button 
                            type="submit" 
                            disabled={isScanning || !url}
                            className="w-full sm:w-auto h-14 px-8 text-base bg-[#FF6600] hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/25 shrink-0"
                        >
                            {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 mr-2 fill-current" />}
                            {isScanning ? "Scanning..." : "Audit My Site"}
                        </Button>
                    </form>
                    {error && (
                        <p className="text-red-500 text-sm font-medium mt-4 bg-red-500/10 py-2 px-4 rounded-lg inline-block">
                            {error}
                        </p>
                    )}
                </div>

                {isScanning && (
                    <div className="glass-card rounded-2xl p-16 text-center max-w-4xl mx-auto shadow-2xl">
                        <div className="w-20 h-20 bg-[#FF6600]/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                            <Activity className="w-10 h-10 text-[#FF6600]" />
                        </div>
                        <h2 className="text-2xl font-bold mb-4">Crawling Your Blogger Site...</h2>
                        <p className="text-muted-foreground">
                            Analyzing HTML structure, extracting headings, checking broken links... <br/>
                            This usually takes about 10-15 seconds.
                        </p>
                    </div>
                )}

                {auditData && !isScanning && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
                        {/* Results Header */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="glass-card p-8 rounded-2xl border-l-4 border-l-[#FF6600] shadow-xl relative overflow-hidden">
                                <Activity className="absolute right-[-20px] bottom-[-20px] w-32 h-32 text-[#FF6600]/5" />
                                <p className="text-sm text-muted-foreground uppercase font-semibold">Global Health Score</p>
                                <h2 className="text-6xl font-black mt-2 text-[#FF6600]">{auditData?.totalScore || 0}<span className="text-2xl text-muted-foreground font-bold">/100</span></h2>
                                <p className="text-sm mt-4 font-medium text-foreground/80">
                                    {auditData?.totalScore > 80 ? "Great job! Your site is highly optimized." : auditData?.totalScore > 50 ? "Your site is doing okay, but needs work." : "Critical SEO fixes required."}
                                </p>
                            </div>
                            <div className="glass-card p-8 rounded-2xl shadow-xl flex flex-col justify-center">
                                <p className="text-sm text-muted-foreground uppercase font-semibold">Pages Scanned</p>
                                <h2 className="text-4xl font-bold mt-2">{auditData?.pagesScanned} <span className="text-lg text-muted-foreground font-normal">(Free Limit)</span></h2>
                            </div>
                            <div className="glass-card p-8 rounded-2xl shadow-xl flex flex-col justify-center bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border-indigo-500/20">
                                <p className="text-sm text-indigo-500 uppercase font-semibold mb-2">Want to fix these automatically?</p>
                                <h3 className="text-xl font-bold mb-4 text-foreground/90">Connect Blogger</h3>
                                <Link href="/auth/register">
                                    <Button className="w-full glow-button text-white border-0 shadow-indigo-500/25">
                                        <Wand2 className="w-4 h-4 mr-2" />
                                        Unlock AI Auto-Fix
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        {/* Issues List */}
                        <div className="glass-card rounded-2xl overflow-hidden border shadow-xl">
                            <div className="bg-muted px-8 py-5 flex justify-between items-center border-b">
                                <h3 className="font-bold text-lg">Detected SEO Issues</h3>
                                <Badge variant="outline" className="bg-white">First {auditData?.scannedPages?.length} pages</Badge>
                            </div>
                            <div className="divide-y max-h-[800px] overflow-y-auto bg-white/50">
                                {auditData?.scannedPages?.map((page: any) => 
                                    page.issues?.map((issue: any) => (
                                        <div key={issue.id} className="p-8 hover:bg-muted/30 transition-colors flex flex-col md:flex-row items-start justify-between gap-6">
                                            <div className="flex gap-4">
                                                {issue.severity === "high" ? <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-1" /> : <AlertCircle className="w-6 h-6 text-orange-400 shrink-0 mt-1" />}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Badge variant="outline" className={issue.severity === 'high' ? 'border-red-500/30 text-red-500 bg-red-500/10' : 'border-orange-500/30 text-orange-500 bg-orange-500/10'}>
                                                            {issue.severity.toUpperCase()}
                                                        </Badge>
                                                        <Badge variant="secondary" className="bg-white">{issue.type}</Badge>
                                                    </div>
                                                    <h4 className="font-semibold text-xl mb-2">{issue.description}</h4>
                                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                        <ExternalLink className="w-3.5 h-3.5" /> <a href={page.url} target="_blank" className="hover:underline text-blue-600 truncate max-w-[300px] sm:max-w-xl block">{page.url}</a>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="shrink-0 flex items-center self-start md:self-center mt-4 md:mt-0 w-full md:w-auto">
                                                {issue.fixable ? (
                                                    <Link href="/auth/register" className="w-full">
                                                        <Button className="w-full bg-[#FF6600]/10 text-[#FF6600] border border-[#FF6600]/20 hover:bg-[#FF6600] hover:text-white transition-all group">
                                                            <Lock className="w-4 h-4 mr-2 opacity-50 group-hover:opacity-100" /> Unlock AI Fix
                                                        </Button>
                                                    </Link>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground uppercase font-semibold underline underline-offset-4 decoration-muted-foreground/30">Manual Action Required</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                                
                                {(!auditData?.scannedPages || auditData.scannedPages.length === 0 || !auditData.scannedPages.some((p:any) => p.issues?.length > 0)) && (
                                    <div className="p-16 text-center text-muted-foreground flex flex-col items-center">
                                        <CheckCircle2 className="w-16 h-16 text-green-500 mb-6" />
                                        <h3 className="text-2xl font-bold text-foreground mb-2">Incredible!</h3>
                                        <p className="text-lg">No critical issues detected on these pages. Your Blogger site is highly optimized.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
