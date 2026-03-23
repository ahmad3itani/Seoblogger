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

    const featureToggles = [
        { label: "AI Images", value: includeImages, setter: setIncludeImages },
        { label: "Internal Links", value: autoInterlink, setter: setAutoInterlink },
        { label: "FAQ Section", value: includeFaq, setter: setIncludeFaq },
        { label: "TOC", value: includeToc, setter: setIncludeToc },
        { label: "Schema (SEO)", value: includeSchema, setter: setIncludeSchema },
    ];

    return (
        <div className="space-y-6 max-w-6xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(108,76,241,0.12)", border: "1px solid rgba(108,76,241,0.25)" }}
                >
                    <Play className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
                </div>
                <div>
                    <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                        Bulk Generator
                    </h1>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        Generate multiple articles from a list of keywords
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Settings */}
                <div className="lg:col-span-1 space-y-5">
                    <div
                        className="rounded-2xl p-5 space-y-4"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                    >
                        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                            Global Settings
                        </h2>

                        <div>
                            <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                                Brand Voice
                            </Label>
                            <Select value={selectedProfileId} onValueChange={(v) => v && handleProfileSelect(v)}>
                                <SelectTrigger className="h-9 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}>
                                    <SelectValue placeholder="Select a voice..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None (Default Style)</SelectItem>
                                    {brandProfiles.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Language</Label>
                                <Select value={language} onValueChange={(v) => v && setLanguage(v)}>
                                    <SelectTrigger className="h-9 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="en">English</SelectItem>
                                        <SelectItem value="es">Spanish</SelectItem>
                                        <SelectItem value="fr">French</SelectItem>
                                        <SelectItem value="de">German</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Tone</Label>
                                <Select value={tone} onValueChange={(v) => v && setTone(v)}>
                                    <SelectTrigger className="h-9 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}>
                                        <SelectValue />
                                    </SelectTrigger>
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
                            <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Article Type</Label>
                            <Select value={articleType} onValueChange={(v) => v && setArticleType(v)}>
                                <SelectTrigger className="h-9 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="informational">Informational</SelectItem>
                                    <SelectItem value="how-to">How-To Guide</SelectItem>
                                    <SelectItem value="listicle">Listicle</SelectItem>
                                    <SelectItem value="comparison">Comparison</SelectItem>
                                    <SelectItem value="review">Product Review</SelectItem>
                                    <SelectItem value="recipe">Recipe Post</SelectItem>
                                    <SelectItem value="local-seo">Local Service</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Word Count</Label>
                            <Select value={wordCount} onValueChange={(v) => v && setWordCount(v)}>
                                <SelectTrigger className="h-9 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1000">1,000 words</SelectItem>
                                    <SelectItem value="1500">1,500 words</SelectItem>
                                    <SelectItem value="2000">2,000 words</SelectItem>
                                    <SelectItem value="3000">3,000 words</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Niche / Topic</Label>
                            <Input
                                value={niche}
                                onChange={e => setNiche(e.target.value)}
                                placeholder="e.g. Technology"
                                className="h-9 text-xs"
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}
                            />
                        </div>

                        {/* Feature Toggles */}
                        <div className="space-y-1.5">
                            {featureToggles.map((opt) => (
                                <button
                                    key={opt.label}
                                    onClick={() => opt.setter(!opt.value)}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                                    style={opt.value ? {
                                        background: "rgba(108,76,241,0.12)",
                                        color: "#A78BFA",
                                        border: "1px solid rgba(108,76,241,0.30)",
                                    } : {
                                        background: "rgba(255,255,255,0.03)",
                                        color: "var(--text-muted)",
                                        border: "1px solid var(--border-subtle)",
                                    }}
                                >
                                    <div
                                        className="w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0"
                                        style={opt.value ? {
                                            background: "var(--brand-primary)",
                                        } : {
                                            background: "transparent",
                                            border: "1.5px solid rgba(255,255,255,0.15)",
                                        }}
                                    >
                                        {opt.value && <Check className="w-2.5 h-2.5 text-white" />}
                                    </div>
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        <div>
                            <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Publish Action</Label>
                            <Select value={publishAction} onValueChange={(v: any) => v && setPublishAction(v)}>
                                <SelectTrigger className="h-9 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">Save as Draft</SelectItem>
                                    <SelectItem value="publish">Publish Immediately</SelectItem>
                                    <SelectItem value="schedule">Schedule for Later</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {publishAction === "schedule" && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Date</Label>
                                    <Input 
                                        type="date" 
                                        value={scheduleDate} 
                                        onChange={e => setScheduleDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="h-9 text-xs"
                                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Time</Label>
                                    <Input 
                                        type="time" 
                                        value={scheduleTime} 
                                        onChange={e => setScheduleTime(e.target.value)}
                                        className="h-9 text-xs"
                                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Keywords Input */}
                <div className="lg:col-span-2 space-y-6">
                    <div
                        className="rounded-2xl h-full flex flex-col"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                    >
                        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                            <div>
                                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Keywords</h3>
                                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>One keyword per line or import CSV</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)", color: "var(--text-secondary)" }}
                                    onClick={() => document.getElementById('csv-upload')?.click()}
                                >
                                    <Upload className="w-3 h-3" />
                                    Import CSV
                                </button>
                                <input
                                    id="csv-upload"
                                    type="file"
                                    accept=".csv,.txt"
                                    className="hidden"
                                    onChange={handleCSVImport}
                                />
                                {keywordsInput && (
                                    <button
                                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all"
                                        style={{ color: "var(--text-muted)" }}
                                        onClick={() => setKeywordsInput('')}
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col p-5 min-h-[400px]">
                            <Textarea
                                placeholder="best coffee machines 2025&#10;how to clean a coffee maker&#10;breville vs delonghi"
                                className="flex-1 min-h-[200px] mb-4 font-mono text-xs leading-relaxed whitespace-pre"
                                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)" }}
                                value={keywordsInput}
                                onChange={(e) => setKeywordsInput(e.target.value)}
                                disabled={isGenerating}
                            />
                            <Button
                                className="w-full h-11 text-sm font-semibold btn-primary"
                                onClick={startBulkJob}
                                disabled={isGenerating || !keywordsInput.trim()}
                            >
                                {isGenerating ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Play className="w-4 h-4 mr-2" />
                                )}
                                {isGenerating ? "Processing Queue..." : "Start Bulk Generation"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Generation Queue */}
            {jobs.length > 0 && (
                <div
                    className="rounded-2xl animate-slide-up"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                >
                    <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <div className="flex items-center gap-3">
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={isGenerating ? {
                                    background: "rgba(108,76,241,0.12)", border: "1px solid rgba(108,76,241,0.25)"
                                } : {
                                    background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)"
                                }}
                            >
                                {isGenerating ? (
                                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--brand-primary)" }} />
                                ) : (
                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                )}
                            </div>
                            <div>
                                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Generation Queue</span>
                                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                    {jobs.filter(j => j.status === "done").length} of {jobs.length} completed
                                    {isGenerating && ` \u2022 ${totalProgress}%`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isGenerating && (
                                <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${totalProgress}%`, background: "var(--brand-primary)" }}
                                    />
                                </div>
                            )}
                            {!isGenerating && jobs.some(j => j.status === 'done') && (
                                <button
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)", color: "var(--text-secondary)" }}
                                    onClick={handleExportResults}
                                >
                                    <Download className="w-3 h-3" />
                                    Export
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="p-3 space-y-1.5">
                        {jobs.map((job, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                                style={{ background: job.status === "processing" ? "rgba(108,76,241,0.06)" : "rgba(255,255,255,0.02)", border: job.status === "processing" ? "1px solid rgba(108,76,241,0.15)" : "1px solid transparent" }}
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                                        background: job.status === "done" ? "rgba(34,197,94,0.12)" : job.status === "processing" ? "rgba(108,76,241,0.12)" : job.status === "error" ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.04)",
                                    }}>
                                        {job.status === "pending" && <Circle className="w-3 h-3" style={{ color: "var(--text-muted)" }} />}
                                        {job.status === "processing" && <Loader2 className="w-3 h-3 animate-spin" style={{ color: "var(--brand-primary)" }} />}
                                        {job.status === "done" && <CheckCircle2 className="w-3 h-3 text-green-400" />}
                                        {job.status === "error" && <span className="text-[9px] font-bold text-red-400">!</span>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{job.keyword}</p>
                                        <p className="text-[10px] flex items-center gap-1 mt-0.5" style={{ color: "var(--text-muted)" }}>
                                            {job.status === "processing" && <Clock className="w-2.5 h-2.5" />}
                                            {job.progress}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full uppercase" style={{
                                        background: job.status === "done" ? "rgba(34,197,94,0.08)" : job.status === "processing" ? "rgba(108,76,241,0.08)" : job.status === "error" ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)",
                                        color: job.status === "done" ? "#22C55E" : job.status === "processing" ? "var(--brand-primary)" : job.status === "error" ? "#ef4444" : "var(--text-muted)",
                                    }}>
                                        {job.status}
                                    </span>
                                    {job.status === "done" && job.articleId && (
                                        <div className="flex gap-1">
                                            <Link href={`/dashboard/articles?id=${job.articleId}`}>
                                                <button className="w-7 h-7 rounded-lg flex items-center justify-center transition-all" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }} title="Edit Article">
                                                    <Edit className="w-3 h-3" />
                                                </button>
                                            </Link>
                                            <Link href={`/dashboard/articles?id=${job.articleId}`} target="_blank">
                                                <button className="w-7 h-7 rounded-lg flex items-center justify-center transition-all" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }} title="Open in New Tab">
                                                    <ExternalLink className="w-3 h-3" />
                                                </button>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
