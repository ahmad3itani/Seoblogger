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
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Brand Voices</h1>
                    <p className="text-muted-foreground mt-1">
                        Define distinct writing styles, tones, and instructions for your AI content.
                    </p>
                </div>
                <Button onClick={handleOpenCreate} className="bg-[#FF6600] hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20">
                    <Plus className="w-4 h-4 mr-2" />
                    New Brand Voice
                </Button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            ) : profiles.length === 0 ? (
                <div className="glass-card rounded-xl p-12 text-center border-dashed">
                    <div className="mx-auto w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mb-4">
                        <Sparkles className="w-6 h-6 text-[#FF6600]" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No brand voices yet</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                        Create a brand voice to ensure your AI-generated articles perfectly match your blog's unique style and guidelines.
                    </p>
                    <Button onClick={handleOpenCreate} variant="outline" className="border-[#FF6600]/30 text-violet-300">
                        Create your first Brand Voice
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profiles.map((profile) => (
                        <Card key={profile.id} className={`glass-card relative overflow-hidden transition-all duration-300 hover:border-[#FF6600]/50 ${profile.isDefault ? 'border-[#FF6600]/50 ring-1 ring-[#FF6600]/20 shadow-lg shadow-violet-500/10' : ''}`}>
                            {profile.isDefault && (
                                <div className="absolute top-0 right-0">
                                    <div className="bg-[#FF6600] text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center shadow-md">
                                        <CheckCircle2 className="w-3 h-3 mr-1" /> DEFAULT
                                    </div>
                                </div>
                            )}
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start pr-12">
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        {profile.name}
                                    </CardTitle>
                                </div>
                                <CardDescription className="flex items-center gap-2 mt-1">
                                    <span className="capitalize">{profile.tone}</span>
                                    {profile.niche && (
                                        <>
                                            <span>•</span>
                                            <span>{profile.niche}</span>
                                        </>
                                    )}
                                    {profile.language && (
                                        <>
                                            <span>•</span>
                                            <span>{profile.language}</span>
                                        </>
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground h-20 overflow-hidden text-ellipsis">
                                {profile.instructions ? (
                                    <div className="italic break-words">"{profile.instructions.substring(0, 100)}{profile.instructions.length > 100 ? '...' : ''}"</div>
                                ) : (
                                    <div className="flex items-center text-muted-foreground/50 h-full">
                                        <BookOpen className="w-4 h-4 mr-2" /> No custom instructions set
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="pt-3 border-t border-border/40 gap-2 flex-wrap">
                                <Button variant="secondary" size="sm" onClick={() => handleOpenEdit(profile)}>
                                    <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                                </Button>
                                {!profile.isDefault && (
                                    <Button variant="outline" size="sm" onClick={() => handleSetDefault(profile.id)}>
                                        Set as Default
                                    </Button>
                                )}
                                <div className="flex-1" />
                                <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-950/30" onClick={() => handleDelete(profile.id)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </CardFooter>
                        </Card>
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
                                <Sparkles className="w-3.5 h-3.5 text-[#FF6600]" />
                            </Label>
                            <p className="text-[10px] text-muted-foreground">
                                These exact instructions will be injected into the system prompt for AI generation. Use this to enforce specific formatting, banned words, or exact stylistic guidelines.
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
                            className="bg-[#FF6600] hover:bg-violet-700 text-white"
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
