"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarClock, Play, Pause, Trash2, Plus } from "lucide-react";

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [blogs, setBlogs] = useState<any[]>([]);
    const [brandProfiles, setBrandProfiles] = useState<any[]>([]);

    const [name, setName] = useState("");
    const [blogId, setBlogId] = useState("");
    const [keywords, setKeywords] = useState("");
    const [frequencyDays, setFrequencyDays] = useState("1");
    const [language, setLanguage] = useState("English");
    const [tone, setTone] = useState("Professional");
    const [articleType, setArticleType] = useState("Informational Guide");
    const [wordCount, setWordCount] = useState("2000");

    const fetchCampaigns = async () => {
        try {
            const res = await fetch("/api/campaigns");
            const data = await res.json();
            if (Array.isArray(data)) setCampaigns(data);
        } catch (error) {
            console.error("Failed to fetch campaigns", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();

        // Load dependencies for form
        fetch("/api/blogs").then(r => r.json()).then(data => {
            const blogList = data.blogs || (Array.isArray(data) ? data : []);
            setBlogs(blogList);
            if (blogList.length > 0) setBlogId(blogList[0].id);
        });
        fetch("/api/brand-voices").then(r => r.json()).then(data => {
            if (Array.isArray(data)) setBrandProfiles(data);
        });
    }, []);

    const handleCreate = async () => {
        if (!name || !blogId || !keywords) return;
        setIsCreating(true);

        try {
            const res = await fetch("/api/campaigns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    blogId,
                    keywords,
                    frequencyDays: parseInt(frequencyDays),
                    language,
                    tone,
                    articleType,
                    wordCount: parseInt(wordCount)
                })
            });

            if (res.ok) {
                setShowForm(false);
                setName("");
                setKeywords("");
                fetchCampaigns();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsCreating(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === "active" ? "paused" : "active";
        try {
            await fetch(`/api/campaigns/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });
            fetchCampaigns();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this campaign forever?")) return;
        try {
            await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
            fetchCampaigns();
        } catch (error) {
            console.error(error);
        }
    };

    if (isLoading) return <div className="p-8 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6 max-w-6xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(108,76,241,0.12)", border: "1px solid rgba(108,76,241,0.25)" }}>
                        <CalendarClock className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>Campaigns</h1>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Auto-publish content on a drip schedule</p>
                    </div>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold btn-primary">
                    {showForm ? "Cancel" : <><Plus className="w-3.5 h-3.5" /> New Campaign</>}
                </button>
            </div>

            {showForm && (
                <div className="rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid rgba(108,76,241,0.25)" }}>
                    <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Create Campaign</h3>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Configure your automation pipeline</p>
                    </div>
                    <div className="p-5 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--text-muted)" }}>Campaign Name</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Winter SEO Push" className="h-9 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--text-muted)" }}>Target Blog</Label>
                                <Select value={blogId} onValueChange={(v) => v && setBlogId(v)}>
                                    <SelectTrigger className="h-9 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}><SelectValue placeholder="Select a blog" /></SelectTrigger>
                                    <SelectContent>
                                        {blogs.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--text-muted)" }}>Frequency</Label>
                                <Select value={frequencyDays} onValueChange={(v) => v && setFrequencyDays(v)}>
                                    <SelectTrigger className="h-9 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Every day</SelectItem>
                                        <SelectItem value="2">Every 2 days</SelectItem>
                                        <SelectItem value="3">Every 3 days</SelectItem>
                                        <SelectItem value="7">Every week</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--text-muted)" }}>Article Type</Label>
                                <Input value={articleType} onChange={e => setArticleType(e.target.value)} placeholder="Informational Guide" className="h-9 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }} />
                            </div>
                            <div className="col-span-1 md:col-span-2 space-y-1.5">
                                <Label className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--text-muted)" }}>Keywords Queue (one per line)</Label>
                                <Textarea className="min-h-[120px] font-mono text-xs" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-glass)" }} placeholder="best hiking boots&#10;winter tent review&#10;how to camp in snow" value={keywords} onChange={e => setKeywords(e.target.value)} />
                            </div>
                        </div>
                        <Button onClick={handleCreate} disabled={!name || !blogId || !keywords || isCreating} className="w-full h-10 text-sm font-semibold btn-primary">
                            {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarClock className="w-4 h-4 mr-2" />}
                            Schedule Campaign
                        </Button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaigns.length === 0 && !showForm && (
                    <div className="col-span-full rounded-2xl p-16 flex flex-col items-center justify-center text-center" style={{ background: "var(--bg-card)", border: "1px dashed var(--border-glass)" }}>
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(108,76,241,0.08)", border: "1px solid rgba(108,76,241,0.20)" }}>
                            <CalendarClock className="w-7 h-7" style={{ color: "var(--brand-primary)" }} />
                        </div>
                        <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>No campaigns yet</h3>
                        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Create a campaign to auto-publish content</p>
                        <button onClick={() => setShowForm(true)} className="text-xs font-medium" style={{ color: "var(--brand-primary)" }}>Create your first campaign</button>
                    </div>
                )}

                {campaigns.map(campaign => (
                    <div key={campaign.id} className="rounded-2xl flex flex-col" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                        <div className="px-4 py-3 flex justify-between items-start" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                            <div>
                                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{campaign.name}</h3>
                                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Every {campaign.frequencyDays} {campaign.frequencyDays === 1 ? 'day' : 'days'}</p>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{
                                background: campaign.status === "active" ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.04)",
                                color: campaign.status === "active" ? "#22C55E" : "var(--text-muted)",
                                border: `1px solid ${campaign.status === "active" ? "rgba(34,197,94,0.20)" : "var(--border-subtle)"}`,
                            }}>
                                {campaign.status}
                            </span>
                        </div>
                        <div className="p-4 flex-1 space-y-3 text-xs">
                            <div className="flex justify-between">
                                <span style={{ color: "var(--text-muted)" }}>Next Run</span>
                                <span style={{ color: "var(--text-primary)" }}>{format(new Date(campaign.nextPublishAt), "PP p")}</span>
                            </div>
                            <div className="flex justify-between">
                                <span style={{ color: "var(--text-muted)" }}>Keywords Left</span>
                                <span style={{ color: "var(--text-primary)" }}>{campaign.keywords.split('\n').filter(Boolean).length}</span>
                            </div>
                            <div className="p-2.5 rounded-lg font-mono text-[10px] max-h-20 overflow-y-auto" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)" }}>
                                {campaign.keywords.split('\n').slice(0, 3).map((k: string, i: number) => <div key={i} className="truncate" style={{ color: "var(--text-secondary)" }}>{k}</div>)}
                                {campaign.keywords.split('\n').length > 3 && <div className="pt-1" style={{ color: "var(--text-muted)" }}>...and more</div>}
                            </div>
                        </div>
                        <div className="p-3 flex gap-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                            <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)", color: "var(--text-secondary)" }} onClick={() => toggleStatus(campaign.id, campaign.status)}>
                                {campaign.status === "active" ? <><Pause className="w-3 h-3" /> Pause</> : <><Play className="w-3 h-3" /> Resume</>}
                            </button>
                            <button className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444" }} onClick={() => handleDelete(campaign.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
