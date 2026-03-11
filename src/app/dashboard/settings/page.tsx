"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/supabase/auth-context";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Globe,
    Save,
    Link2,
    Shield,
    Palette,
    Type,
    Check,
    User,
    Languages,
    Target,
    FileText,
    Tag,
    Image,
    MessageSquare,
} from "lucide-react";

export default function SettingsPage() {
    const { user, profile } = useAuth();
    const supabase = createClient();
    const [blogs, setBlogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saved, setSaved] = useState(false);
    const [profileName, setProfileName] = useState("");
    const [profileTone, setProfileTone] = useState("professional");
    const [profileInstructions, setProfileInstructions] = useState("");
    const [profileId, setProfileId] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [hasConnection, setHasConnection] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (user) {
            fetchBlogs();
            fetchBrandProfile();
        }
    }, [user]);

    const fetchBrandProfile = async () => {
        try {
            const res = await fetch("/api/brand-voices");
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                const profile = data[0]; // For now, just handle the first one
                setProfileId(profile.id);
                setProfileName(profile.name);
                setProfileTone(profile.tone);
                setProfileInstructions(profile.instructions || "");
            }
        } catch (error) {
            console.error("Failed to fetch brand profile:", error);
        }
    };

    const fetchBlogs = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/blogs");
            const data = await res.json();

            if (data.error) {
                setHasConnection(false);
                setBlogs([]);
            } else if (data.blogs) {
                setHasConnection(true);
                setBlogs(data.blogs);
            }
        } catch (error) {
            console.error("Failed to fetch blogs:", error);
            setHasConnection(false);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const res = await fetch("/api/brand-voices", {
                method: profileId ? "PUT" : "POST", // Needs a PUT if ID exists
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: profileId,
                    name: profileName || "Default Voice",
                    tone: profileTone,
                    instructions: profileInstructions,
                    isDefault: true,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                if (!profileId) setProfileId(data.id);
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            }
        } catch (error) {
            console.error("Failed to save brand profile:", error);
        }
    };

    const handleConnectGoogle = async () => {
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback?redirect=/dashboard/settings`,
                scopes: "openid email profile https://www.googleapis.com/auth/blogger",
                queryParams: {
                    access_type: "offline",
                    prompt: "consent",
                },
            },
        });
    };

    const handleSetDefault = async (blogId: string) => {
        try {
            const res = await fetch("/api/blogs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ blogId }),
            });
            if (res.ok) {
                fetchBlogs();
            }
        } catch (error) {
            console.error("Failed to set default blog:", error);
        }
    };

    // Removed unused isConnected constant

    if (!isMounted) {
        return null;
    }

    return (
        <div className="max-w-3xl space-y-8">
            <div>
                <h1 className="text-xl font-bold">Settings</h1>
                <p className="text-sm text-muted-foreground">
                    Configure your blog connection, brand voice, and default preferences.
                </p>
            </div>

            {/* Blog Connection */}
            <section className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="font-semibold">Blogger Connection</h2>
                        <p className="text-xs text-muted-foreground">
                            Connect your Google account to publish to Blogger
                        </p>
                    </div>
                    <Badge
                        variant="secondary"
                        className={`ml-auto text-[10px] ${hasConnection
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                            }`}
                    >
                        {hasConnection ? "Connected" : "Not Connected"}
                    </Badge>
                </div>

                {!hasConnection ? (
                    <Button
                        onClick={handleConnectGoogle}
                        className="glow-button text-white border-0"
                        disabled={loading && !!user}
                    >
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        {loading ? "Checking..." : "Connect Google Account"}
                    </Button>
                ) : blogs.length === 0 ? (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-600 dark:text-yellow-400">
                        <p className="font-semibold mb-1">Google Account Connected!</p>
                        <p>However, no blogs were found on your Blogger account. Please go to <a href="https://www.blogger.com" target="_blank" rel="noreferrer" className="underline font-medium hover:text-yellow-500">Blogger.com</a> to create a blog first, then refresh this page.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {blogs.map((blog) => (
                            <div key={blog.id} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-border/50">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${blog.isDefault ? "bg-green-500/20" : "bg-muted"}`}>
                                    {blog.isDefault ? (
                                        <Check className="w-4 h-4 text-green-400" />
                                    ) : (
                                        <Globe className="w-4 h-4 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{blog.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {blog.url}
                                    </p>
                                </div>
                                {blog.isDefault ? (
                                    <Badge
                                        variant="secondary"
                                        className="text-[10px] bg-violet-500/10 text-violet-300"
                                    >
                                        Default
                                    </Badge>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs hover:bg-violet-500/10 hover:text-violet-400"
                                        onClick={() => handleSetDefault(blog.id)}
                                    >
                                        Set Default
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <Separator className="bg-border/30" />

            {/* Brand Voice */}
            <section className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="font-semibold">Brand Voice</h2>
                        <p className="text-xs text-muted-foreground">
                            Define your writing style and brand personality
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="brand-name">Brand Name</Label>
                        <Input
                            id="brand-name"
                            placeholder="My Blog"
                            className="mt-1.5 bg-muted/30 border-border/50"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>Default Tone</Label>
                        <Select value={profileTone} onValueChange={(v) => v && setProfileTone(v)}>
                            <SelectTrigger className="mt-1.5 bg-muted/30 border-border/50">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[
                                    "professional",
                                    "casual",
                                    "expert",
                                    "friendly",
                                    "authoritative",
                                    "conversational",
                                ].map((t) => (
                                    <SelectItem key={t} value={t}>
                                        {t.charAt(0).toUpperCase() + t.slice(1)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-2">
                        <Label htmlFor="brand-instructions">Custom Instructions</Label>
                        <Textarea
                            id="brand-instructions"
                            placeholder="e.g., Always include personal anecdotes. Use data and statistics. Write for beginners..."
                            className="mt-1.5 bg-muted/30 border-border/50 min-h-[80px]"
                            value={profileInstructions}
                            onChange={(e) => setProfileInstructions(e.target.value)}
                        />
                    </div>
                </div>
            </section>

            <Separator className="bg-border/30" />

            {/* Default Article Settings */}
            <section className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="font-semibold">Default Article Settings</h2>
                        <p className="text-xs text-muted-foreground">
                            Set defaults for new articles
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label>Default Language</Label>
                        <Select defaultValue="en">
                            <SelectTrigger className="mt-1.5 bg-muted/30 border-border/50">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[
                                    { value: "en", label: "English" },
                                    { value: "ar", label: "Arabic" },
                                    { value: "es", label: "Spanish" },
                                    { value: "fr", label: "French" },
                                    { value: "de", label: "German" },
                                ].map((lang) => (
                                    <SelectItem key={lang.value} value={lang.value}>
                                        {lang.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Default Word Count</Label>
                        <Select defaultValue="2000">
                            <SelectTrigger className="mt-1.5 bg-muted/30 border-border/50">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {["1000", "1500", "2000", "2500", "3000", "4000"].map(
                                    (wc) => (
                                        <SelectItem key={wc} value={wc}>
                                            {wc} words
                                        </SelectItem>
                                    )
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Default Article Type</Label>
                        <Select defaultValue="informational">
                            <SelectTrigger className="mt-1.5 bg-muted/30 border-border/50">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="informational">Informational</SelectItem>
                                <SelectItem value="how-to">How-To Guide</SelectItem>
                                <SelectItem value="listicle">Listicle</SelectItem>
                                <SelectItem value="review">Product Review</SelectItem>
                                <SelectItem value="comparison">Comparison</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Image Style</Label>
                        <Select defaultValue="modern">
                            <SelectTrigger className="mt-1.5 bg-muted/30 border-border/50">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="modern">Modern & Clean</SelectItem>
                                <SelectItem value="minimal">Minimalist</SelectItem>
                                <SelectItem value="vibrant">Vibrant & Colorful</SelectItem>
                                <SelectItem value="professional">Professional</SelectItem>
                                <SelectItem value="artistic">Artistic</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-2">
                        <Label htmlFor="default-labels">Default Labels</Label>
                        <Input
                            id="default-labels"
                            placeholder="e.g., blog, seo, tips (comma-separated)"
                            className="mt-1.5 bg-muted/30 border-border/50"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <Label htmlFor="affiliate-disclosure">
                            Affiliate Disclosure (optional)
                        </Label>
                        <Textarea
                            id="affiliate-disclosure"
                            placeholder="e.g., This post may contain affiliate links. We earn a commission at no extra cost to you."
                            className="mt-1.5 bg-muted/30 border-border/50 min-h-[60px]"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <Label htmlFor="default-cta">Default CTA Text (optional)</Label>
                        <Input
                            id="default-cta"
                            placeholder="e.g., Subscribe for more content!"
                            className="mt-1.5 bg-muted/30 border-border/50"
                        />
                    </div>
                </div>
            </section>

            {/* Save */}
            <div className="flex justify-end">
                <Button
                    className="glow-button text-white border-0 px-8"
                    onClick={handleSave}
                >
                    {saved ? (
                        <>
                            <Check className="w-4 h-4 mr-2" />
                            Saved!
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Settings
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
