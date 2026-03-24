"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, CheckCircle2, Loader2, Sparkles, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface BrandProfile {
    id: string;
    name: string;
    tone: string;
    style?: string;
    niche?: string;
    language: string;
    targetAudience?: string;
    instructions?: string;
    isDefault: boolean;
}

export default function BrandVoicePage() {
    const [profiles, setProfiles] = useState<BrandProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState<Partial<BrandProfile>>({
        name: "",
        tone: "professional",
        style: "",
        niche: "",
        language: "English",
        targetAudience: "",
        instructions: "",
        isDefault: false,
    });

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        try {
            const res = await fetch("/api/brand-voices");
            if (res.ok) {
                const data = await res.json();
                setProfiles(data);
            }
        } catch (error) {
            console.error("Failed to fetch profiles:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({
            name: "",
            tone: "professional",
            style: "",
            niche: "",
            language: "English",
            targetAudience: "",
            instructions: "",
            isDefault: profiles.length === 0, // auto default if first one
        });
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (profile: BrandProfile) => {
        setEditingId(profile.id);
        setFormData({ ...profile });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this brand voice?")) return;

        try {
            const res = await fetch(`/api/brand-voices/${id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setProfiles(profiles.filter(p => p.id !== id));
            }
        } catch (error) {
            console.error("Failed to delete:", error);
        }
    };

    const handleSave = async () => {
        if (!formData.name) return;

        setIsSaving(true);
        try {
            const method = editingId ? "PUT" : "POST";
            const url = editingId ? `/api/brand-voices/${editingId}` : "/api/brand-voices";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                await fetchProfiles();
                setIsDialogOpen(false);
            }
        } catch (error) {
            console.error("Failed to save profile:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSetDefault = async (id: string) => {
        try {
            const res = await fetch(`/api/brand-voices/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isDefault: true }),
            });
            if (res.ok) {
                await fetchProfiles();
            }
        } catch (error) {
            console.error("Failed to set default:", error);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(108,76,241,0.12)", border: "1px solid rgba(108,76,241,0.25)" }}>
                        <Sparkles className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>Brand Voices</h1>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Define writing styles, tones, and instructions</p>
                    </div>
                </div>
                <button onClick={handleOpenCreate} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold btn-primary">
                    <Plus className="w-3.5 h-3.5" /> New Brand Voice
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--brand-primary)" }} />
                </div>
            ) : profiles.length === 0 ? (
                <div className="rounded-2xl p-16 text-center" style={{ background: "var(--bg-card)", border: "1px dashed var(--border-glass)" }}>
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(108,76,241,0.08)", border: "1px solid rgba(108,76,241,0.20)" }}>
                        <Sparkles className="w-7 h-7" style={{ color: "var(--brand-primary)" }} />
                    </div>
                    <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>No brand voices yet</h3>
                    <p className="text-sm max-w-sm mx-auto mb-5" style={{ color: "var(--text-secondary)" }}>
                        Create a brand voice to ensure your articles match your blog&apos;s unique style.
                    </p>
                    <button onClick={handleOpenCreate} className="text-xs font-medium px-4 py-2 rounded-lg" style={{ background: "rgba(108,76,241,0.08)", color: "var(--brand-primary)", border: "1px solid rgba(108,76,241,0.20)" }}>
                        Create your first Brand Voice
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {profiles.map((profile) => (
                        <div key={profile.id} className="rounded-2xl relative overflow-hidden transition-all duration-300" style={{
                            background: "var(--bg-card)",
                            border: profile.isDefault ? "1px solid rgba(108,76,241,0.30)" : "1px solid var(--border-subtle)",
                        }}
                            onMouseEnter={e => { if (!profile.isDefault) e.currentTarget.style.borderColor = "rgba(108,76,241,0.20)"; }}
                            onMouseLeave={e => { if (!profile.isDefault) e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
                        >
                            {profile.isDefault && (
                                <div className="absolute top-0 right-0">
                                    <div className="text-[9px] font-bold px-2.5 py-1 rounded-bl-lg flex items-center" style={{ background: "var(--brand-primary)", color: "#fff" }}>
                                        <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> DEFAULT
                                    </div>
                                </div>
                            )}
                            <div className="px-5 pt-4 pb-3">
                                <h3 className="text-sm font-semibold pr-16" style={{ color: "var(--text-primary)" }}>{profile.name}</h3>
                                <div className="flex items-center gap-1.5 mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                                    <span className="capitalize">{profile.tone}</span>
                                    {profile.niche && <><span>·</span><span>{profile.niche}</span></>}
                                    {profile.language && <><span>·</span><span>{profile.language}</span></>}
                                </div>
                            </div>
                            <div className="px-5 pb-3 h-16 overflow-hidden">
                                {profile.instructions ? (
                                    <p className="text-xs italic break-words" style={{ color: "var(--text-secondary)" }}>
                                        &ldquo;{profile.instructions.substring(0, 100)}{profile.instructions.length > 100 ? '...' : ''}&rdquo;
                                    </p>
                                ) : (
                                    <div className="flex items-center h-full text-xs" style={{ color: "var(--text-muted)" }}>
                                        <BookOpen className="w-3 h-3 mr-1.5" /> No custom instructions
                                    </div>
                                )}
                            </div>
                            <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                                <button onClick={() => handleOpenEdit(profile)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)", color: "var(--text-secondary)" }}>
                                    <Pencil className="w-2.5 h-2.5" /> Edit
                                </button>
                                {!profile.isDefault && (
                                    <button onClick={() => handleSetDefault(profile.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)", color: "var(--text-secondary)" }}>
                                        Set Default
                                    </button>
                                )}
                                <div className="flex-1" />
                                <button onClick={() => handleDelete(profile.id)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "rgba(239,68,68,0.7)" }}>
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px] glass-card border-border/50">
                    <DialogHeader>
                        <DialogTitle>{editingId ? "Edit Brand Voice" : "Create Brand Voice"}</DialogTitle>
                        <DialogDescription>
                            Define the personality and rules for this specific brand or website.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Profile Name <span className="text-red-400">*</span></Label>
                            <Input
                                id="name"
                                placeholder="e.g. Modern Tech Blog, Pirate Persona"
                                value={formData.name || ""}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="bg-muted/30"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Primary Tone</Label>
                                <Select
                                    value={formData.tone || "professional"}
                                    onValueChange={(v) => v && setFormData({ ...formData, tone: v })}
                                >
                                    <SelectTrigger className="bg-muted/30">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="professional">Professional</SelectItem>
                                        <SelectItem value="casual">Casual & Friendly</SelectItem>
                                        <SelectItem value="authoritative">Authoritative</SelectItem>
                                        <SelectItem value="humorous">Humorous</SelectItem>
                                        <SelectItem value="academic">Academic</SelectItem>
                                        <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="language">Output Language</Label>
                                <Input
                                    id="language"
                                    placeholder="e.g. English (UK), Spanish"
                                    value={formData.language || ""}
                                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                                    className="bg-muted/30"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="niche">Niche / Industry</Label>
                                <Input
                                    id="niche"
                                    placeholder="e.g. SaaS, Dog Training"
                                    value={formData.niche || ""}
                                    onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                                    className="bg-muted/30"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="audience">Target Audience</Label>
                                <Input
                                    id="audience"
                                    placeholder="e.g. Beginners, C-Suite Execs"
                                    value={formData.targetAudience || ""}
                                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                                    className="bg-muted/30"
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="instructions" className="flex items-center gap-2">
                                Custom Prompt Instructions
                                <Sparkles className="w-3.5 h-3.5 text-[#6C4CF1]" />
                            </Label>
                            <p className="text-[10px] text-muted-foreground">
                                These exact instructions will be used during content generation. Use this to enforce specific formatting, banned words, or exact stylistic guidelines.
                            </p>
                            <Textarea
                                id="instructions"
                                rows={5}
                                placeholder="e.g. Never use the word 'utilize'. Always write in the first person singular (I, me). Keep paragraphs under 3 sentences. Avoid generic conclusions like 'In conclusion'."
                                value={formData.instructions || ""}
                                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                                className="bg-muted/30 resize-y"
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 border border-border/40 rounded-lg bg-muted/10 mt-2">
                            <div className="space-y-0.5">
                                <Label htmlFor="default-toggle">Set as Default Profile</Label>
                                <p className="text-xs text-muted-foreground">
                                    Automatically select this voice for new articles.
                                </p>
                            </div>
                            <Switch
                                id="default-toggle"
                                checked={formData.isDefault || false}
                                onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!formData.name || isSaving}
                            className="bg-[#6C4CF1] hover:bg-violet-700 text-white"
                        >
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {editingId ? "Save Changes" : "Create Profile"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
