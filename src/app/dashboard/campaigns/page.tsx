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
            if (Array.isArray(data)) {
                setBlogs(data);
                if (data.length > 0) setBlogId(data[0].id);
            }
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
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Auto-Publishing Campaigns</h1>
                    <p className="text-muted-foreground mt-1">
                        Set up a drip schedule to let the AI write and publish content hands-free.
                    </p>
                </div>
                <Button onClick={() => setShowForm(!showForm)} className="bg-violet-600 hover:bg-violet-700 text-white">
                    {showForm ? "Cancel" : <><Plus className="w-4 h-4 mr-2" /> New Campaign</>}
                </Button>
            </div>

            {showForm && (
                <Card className="glass-card border-violet-500/30 shadow-lg shadow-violet-500/10">
                    <CardHeader>
                        <CardTitle>Create Campaign</CardTitle>
                        <CardDescription>Configure your automation pipeline.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Campaign Name</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Winter SEO Push" />
                            </div>
                            <div className="space-y-2">
                                <Label>Target Blog</Label>
                                <Select value={blogId} onValueChange={(v) => v && setBlogId(v)}>
                                    <SelectTrigger><SelectValue placeholder="Select a blog" /></SelectTrigger>
                                    <SelectContent>
                                        {blogs.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Publish Frequency</Label>
                                <Select value={frequencyDays} onValueChange={(v) => v && setFrequencyDays(v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 article every day</SelectItem>
                                        <SelectItem value="2">1 article every 2 days</SelectItem>
                                        <SelectItem value="3">1 article every 3 days</SelectItem>
                                        <SelectItem value="7">1 article every week</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Article Type</Label>
                                <Input value={articleType} onChange={e => setArticleType(e.target.value)} placeholder="Informational Guide" />
                            </div>
                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <Label>Keywords Queue (One per line)</Label>
                                <Textarea
                                    className="min-h-[150px]"
                                    placeholder="best hiking boots&#10;winter tent review&#10;how to camp in snow"
                                    value={keywords}
                                    onChange={e => setKeywords(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button onClick={handleCreate} disabled={!name || !blogId || !keywords || isCreating} className="w-full bg-violet-600 hover:bg-violet-700">
                            {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarClock className="w-4 h-4 mr-2" />}
                            Schedule Campaign
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {campaigns.length === 0 && !showForm && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border/50 rounded-xl bg-muted/5">
                        <CalendarClock className="w-12 h-12 mb-4 opacity-20" />
                        <p>No active campaigns found.</p>
                        <Button variant="link" onClick={() => setShowForm(true)}>Create your first campaign</Button>
                    </div>
                )}

                {campaigns.map(campaign => (
                    <Card key={campaign.id} className="glass-card flex flex-col">
                        <CardHeader className="pb-3 border-b border-border/50">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg">{campaign.name}</CardTitle>
                                <Badge variant={campaign.status === "active" ? "default" : "secondary"} className={campaign.status === "active" ? "bg-emerald-500/20 text-emerald-400" : ""}>
                                    {campaign.status}
                                </Badge>
                            </div>
                            <CardDescription>
                                Every {campaign.frequencyDays} {campaign.frequencyDays === 1 ? 'day' : 'days'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4 flex-1 space-y-4 text-sm text-muted-foreground">
                            <div className="flex justify-between">
                                <span>Next Run:</span>
                                <span className="text-foreground">{format(new Date(campaign.nextPublishAt), "PP p")}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Keywords Left:</span>
                                <span className="text-foreground">{campaign.keywords.split('\n').filter(Boolean).length}</span>
                            </div>
                            <div className="mt-2 p-3 bg-muted/20 border border-border/50 rounded-md font-mono text-xs max-h-24 overflow-y-auto">
                                {campaign.keywords.split('\n').slice(0, 3).map((k: string, i: number) => <div key={i} className="truncate">{k}</div>)}
                                {campaign.keywords.split('\n').length > 3 && <div className="text-muted-foreground pt-1">...and more</div>}
                            </div>
                        </CardContent>
                        <div className="p-4 border-t border-border/50 flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => toggleStatus(campaign.id, campaign.status)}
                            >
                                {campaign.status === "active" ? <><Pause className="w-4 h-4 mr-2" /> Pause</> : <><Play className="w-4 h-4 mr-2" /> Resume</>}
                            </Button>
                            <Button variant="destructive" size="icon" onClick={() => handleDelete(campaign.id)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
