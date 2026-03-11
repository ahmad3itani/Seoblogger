"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Loader2, CheckCircle2, Circle, Clock, Check, Megaphone, Upload, Download, X, Calendar, ExternalLink, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BrandProfile {
    id: string;
    name: string;
    tone: string;
    language: string;
    niche?: string;
    instructions?: string;
    isDefault: boolean;
}

interface BulkJob {
    keyword: string;
    status: "pending" | "processing" | "done" | "error";
    progress: string;
    articleId?: string;
}

export default function BulkGeneratePage() {
    const [keywordsInput, setKeywordsInput] = useState("");

    // Global Options
    const [language, setLanguage] = useState("en");
    const [tone, setTone] = useState("professional");
    const [articleType, setArticleType] = useState("informational");
    const [wordCount, setWordCount] = useState("2000");
    const [niche, setNiche] = useState("");
    const [includeImages, setIncludeImages] = useState(true);
    const [autoInterlink, setAutoInterlink] = useState(true);
    const [includeFaq, setIncludeFaq] = useState(true);
    const [includeToc, setIncludeToc] = useState(true);
    const [includeSchema, setIncludeSchema] = useState(true);
    const [publishAction, setPublishAction] = useState<"draft" | "publish" | "schedule">("draft");
    const [scheduleDate, setScheduleDate] = useState("");
    const [scheduleTime, setScheduleTime] = useState("");

    const [brandProfiles, setBrandProfiles] = useState<BrandProfile[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<string>("none");

    const [jobs, setJobs] = useState<BulkJob[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [totalProgress, setTotalProgress] = useState(0);

    useEffect(() => {
        fetch("/api/brand-voices")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setBrandProfiles(data);
                    const defaultProfile = data.find((p) => p.isDefault);
                    if (defaultProfile) {
                        setSelectedProfileId(defaultProfile.id);
                        setTone(defaultProfile.tone);
                        if (defaultProfile.language) setLanguage(defaultProfile.language);
                        if (defaultProfile.niche) setNiche(defaultProfile.niche);
                    }
                }
            })
            .catch(err => console.error(err));

        // Load passed clusters from sessionStorage
        const passedKeywords = sessionStorage.getItem("bulkKeywords");
        if (passedKeywords) {
            setKeywordsInput(passedKeywords);
            sessionStorage.removeItem("bulkKeywords");
        }
    }, []);

    const handleProfileSelect = (id: string) => {
        setSelectedProfileId(id);
        const profile = brandProfiles.find(p => p.id === id);
        if (profile) {
            setTone(profile.tone);
            if (profile.language) setLanguage(profile.language);
            if (profile.niche) setNiche(profile.niche);
        }
    };

    const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
            setKeywordsInput(lines.join('\n'));
        };
        reader.readAsText(file);
    };

    const handleExportResults = () => {
        const csv = jobs.map(j => `${j.keyword},${j.status},${j.articleId || ''}`).join('\n');
        const blob = new Blob([`Keyword,Status,Article ID\n${csv}`], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bulk-generation-results.csv';
        a.click();
    };

    const startBulkJob = async () => {
        const lines = keywordsInput.split("\n").map(k => k.trim()).filter(Boolean);
        if (lines.length === 0) return;

        const initialJobs: BulkJob[] = lines.map(k => ({ keyword: k, status: "pending", progress: "Waiting" }));
        setJobs(initialJobs);
        setIsGenerating(true);
        setTotalProgress(0);

        const profileInstructions = selectedProfileId !== "none"
            ? brandProfiles.find(p => p.id === selectedProfileId)?.instructions
            : undefined;

        let activeJobs = [...initialJobs];

        for (let i = 0; i < lines.length; i++) {
            const keyword = lines[i];

            const updateJob = (status: BulkJob["status"], progress: string) => {
                activeJobs[i] = { ...activeJobs[i], status, progress };
                setJobs([...activeJobs]);
            };

            updateJob("processing", "Generating titles...");

            try {
                // 1. Titles
                let res = await fetch("/api/generate", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ keyword, language, tone, articleType, wordCount: parseInt(wordCount), niche, brandVoice: profileInstructions, step: "titles" })
                });
                let data = await res.json();
                const selectedTitle = data.titles?.[0] || keyword;

                updateJob("processing", "Generating outline...");
                // 2. Outline
                res = await fetch("/api/generate", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ keyword, language, tone, articleType, wordCount: parseInt(wordCount), niche, brandVoice: profileInstructions, selectedTitle, step: "outline" })
                });
                data = await res.json();
                const outline = data.outline;
                const labels = outline?.suggestedLabels || [];

                updateJob("processing", "Writing article...");
                // 3. Article
                res = await fetch("/api/generate", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ keyword, language, tone, articleType, wordCount: parseInt(wordCount), niche, brandVoice: profileInstructions, selectedTitle, outline, includeFaq, includeImages, includeToc, autoInterlink, includeSchema, labels, publishAction, scheduleDate: publishAction === "schedule" ? `${scheduleDate} ${scheduleTime}` : undefined, step: "article" })
                });
                data = await res.json();

                if (data.savedArticle) {
                    activeJobs[i].articleId = data.savedArticle.id;
                    updateJob("done", "Saved as draft");
                } else {
                    updateJob("error", "Failed to save to database");
                }

                // Update total progress
                const completed = activeJobs.filter(j => j.status === 'done' || j.status === 'error').length;
                setTotalProgress(Math.round((completed / lines.length) * 100));

            } catch (error) {
                console.error("Bulk generation error for keyword:", keyword, error);
                updateJob("error", "Generation failed");
            }
        }

        setIsGenerating(false);
        setTotalProgress(100);
    };

    return (
        <div className="space-y-6 max-w-5xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Bulk Generator</h1>
                <p className="text-muted-foreground mt-1">
                    Paste a list of keywords to automatically generate and save multiple articles as drafts.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card className="glass-card">
                        <CardHeader>
                            <CardTitle>Global Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="flex items-center gap-1.5 mb-1.5">
                                    Brand Voice
                                    <Megaphone className="w-3.5 h-3.5 text-violet-400" />
                                </Label>
                                <Select value={selectedProfileId} onValueChange={(v) => v && handleProfileSelect(v)}>
                                    <SelectTrigger className="bg-violet-500/5 border-violet-500/20 text-violet-100">
                                        <SelectValue placeholder="Select a voice..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None (Default AI)</SelectItem>
                                        {brandProfiles.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="mb-1.5 block">Language</Label>
                                    <Select value={language} onValueChange={(v) => v && setLanguage(v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="en">English</SelectItem>
                                            <SelectItem value="es">Spanish</SelectItem>
                                            <SelectItem value="fr">French</SelectItem>
                                            <SelectItem value="de">German</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">Tone</Label>
                                    <Select value={tone} onValueChange={(v) => v && setTone(v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="professional">Professional</SelectItem>
                                            <SelectItem value="casual">Casual</SelectItem>
                                            <SelectItem value="friendly">Friendly</SelectItem>
                                            <SelectItem value="expert">Expert</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Label className="mb-1.5 block">Article Type</Label>
                                <Select value={articleType} onValueChange={(v) => v && setArticleType(v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="informational">🎓 Informational</SelectItem>
                                        <SelectItem value="how-to">📝 How-To Guide</SelectItem>
                                        <SelectItem value="listicle">📋 Listicle</SelectItem>
                                        <SelectItem value="comparison">⚖️ Comparison</SelectItem>
                                        <SelectItem value="review">⭐ Product Review</SelectItem>
                                        <SelectItem value="recipe">🍳 Recipe Post</SelectItem>
                                        <SelectItem value="local-seo">📍 Local Service</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="mb-1.5 block">Word Count</Label>
                                <Select value={wordCount} onValueChange={(v) => v && setWordCount(v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1000">1000 words</SelectItem>
                                        <SelectItem value="1500">1500 words</SelectItem>
                                        <SelectItem value="2000">2000 words</SelectItem>
                                        <SelectItem value="3000">3000 words</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="mb-1.5 block">Niche / Topic Area</Label>
                                <Input value={niche} onChange={e => setNiche(e.target.value)} placeholder="e.g. Technology" />
                            </div>

                            <div className="flex flex-col gap-2 relative">
                                <button
                                    onClick={() => setIncludeImages(!includeImages)}
                                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all ${includeImages ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "bg-muted/20 text-muted-foreground border border-border/50"
                                        }`}
                                >
                                    <Check className={`w-4 h-4 ${includeImages ? "opacity-100" : "opacity-0"}`} />
                                    Generate AI Images
                                </button>

                                <button
                                    onClick={() => setAutoInterlink(!autoInterlink)}
                                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all ${autoInterlink ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "bg-muted/20 text-muted-foreground border border-border/50"
                                        }`}
                                >
                                    <Check className={`w-4 h-4 ${autoInterlink ? "opacity-100" : "opacity-0"}`} />
                                    Auto Internal Links
                                </button>

                                <button
                                    onClick={() => setIncludeFaq(!includeFaq)}
                                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all ${includeFaq ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "bg-muted/20 text-muted-foreground border border-border/50"
                                        }`}
                                >
                                    <Check className={`w-4 h-4 ${includeFaq ? "opacity-100" : "opacity-0"}`} />
                                    Include FAQ Section
                                </button>

                                <button
                                    onClick={() => setIncludeToc(!includeToc)}
                                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all ${includeToc ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "bg-muted/20 text-muted-foreground border border-border/50"
                                        }`}
                                >
                                    <Check className={`w-4 h-4 ${includeToc ? "opacity-100" : "opacity-0"}`} />
                                    Table of Contents
                                </button>

                                <button
                                    onClick={() => setIncludeSchema(!includeSchema)}
                                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all ${includeSchema ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "bg-muted/20 text-muted-foreground border border-border/50"
                                        }`}
                                >
                                    <Check className={`w-4 h-4 ${includeSchema ? "opacity-100" : "opacity-0"}`} />
                                    Schema Markup (SEO)
                                </button>
                            </div>

                            <div>
                                <Label className="mb-1.5 block">Publish Action</Label>
                                <Select value={publishAction} onValueChange={(v: any) => v && setPublishAction(v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">💾 Save as Draft</SelectItem>
                                        <SelectItem value="publish">🚀 Publish Immediately</SelectItem>
                                        <SelectItem value="schedule">📅 Schedule for Later</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {publishAction === "schedule" && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="mb-1.5 block text-xs">Date</Label>
                                        <Input 
                                            type="date" 
                                            value={scheduleDate} 
                                            onChange={e => setScheduleDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="text-sm"
                                        />
                                    </div>
                                    <div>
                                        <Label className="mb-1.5 block text-xs">Time</Label>
                                        <Input 
                                            type="time" 
                                            value={scheduleTime} 
                                            onChange={e => setScheduleTime(e.target.value)}
                                            className="text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <Card className="glass-card h-full flex flex-col">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Keywords</CardTitle>
                                    <CardDescription>Enter one keyword per line or import CSV</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="glass-card cursor-pointer"
                                        onClick={() => document.getElementById('csv-upload')?.click()}
                                    >
                                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                                        Import CSV
                                    </Button>
                                    <input
                                        id="csv-upload"
                                        type="file"
                                        accept=".csv,.txt"
                                        className="hidden"
                                        onChange={handleCSVImport}
                                    />
                                    {keywordsInput && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setKeywordsInput('')}
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col min-h-[400px]">
                            <Textarea
                                placeholder="best coffee machines 2025&#10;how to clean a coffee maker&#10;breville vs delonghi"
                                className="flex-1 min-h-[200px] mb-4 font-mono text-sm leading-relaxed whitespace-pre"
                                value={keywordsInput}
                                onChange={(e) => setKeywordsInput(e.target.value)}
                                disabled={isGenerating}
                            />
                            <Button
                                size="lg"
                                className="w-full glow-button shadow-lg text-white border-0"
                                onClick={startBulkJob}
                                disabled={isGenerating || !keywordsInput.trim()}
                            >
                                {isGenerating ? (
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                ) : (
                                    <Play className="w-5 h-5 mr-2" />
                                )}
                                {isGenerating ? "Processing Queue..." : "Start Bulk Generation"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {jobs.length > 0 && (
                <Card className="glass-card mt-8 animate-slide-up">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Generation Queue</CardTitle>
                                <CardDescription>
                                    {jobs.filter(j => j.status === "done").length} of {jobs.length} completed
                                    {isGenerating && ` • ${totalProgress}% complete`}
                                </CardDescription>
                            </div>
                            {!isGenerating && jobs.some(j => j.status === 'done') && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleExportResults}
                                    className="glass-card"
                                >
                                    <Download className="w-3.5 h-3.5 mr-1.5" />
                                    Export Results
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {jobs.map((job, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/50 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-4 flex-1">
                                        {job.status === "pending" && <Circle className="w-5 h-5 text-muted-foreground" />}
                                        {job.status === "processing" && <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />}
                                        {job.status === "done" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                                        {job.status === "error" && <div className="w-5 h-5 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center font-bold text-xs">!</div>}

                                        <div className="flex-1">
                                            <p className="font-medium">{job.keyword}</p>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                {job.status === "processing" && <Clock className="w-3 h-3" />}
                                                {job.progress}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-xs font-mono px-2 py-1 rounded bg-background/50 border border-border/50 uppercase">
                                            {job.status}
                                        </div>
                                        {job.status === "done" && job.articleId && (
                                            <div className="flex gap-1">
                                                <Link href={`/dashboard/articles?id=${job.articleId}`}>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit Article">
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </Button>
                                                </Link>
                                                <Link href={`/dashboard/articles?id=${job.articleId}`} target="_blank">
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Open in New Tab">
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
