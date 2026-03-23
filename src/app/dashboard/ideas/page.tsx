"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lightbulb, TrendingUp, Send, Check, ArrowUp, ArrowDown, Minus, Target, BarChart3, Sparkles, Search } from "lucide-react";

interface Idea {
    keyword: string;
    title: string;
    intent: string;
    reasoning: string;
    searchVolume?: string;
    difficulty?: "easy" | "medium" | "hard";
    trendDirection?: "rising" | "stable" | "declining";
}

export default function IdeasPage() {
    const router = useRouter();
    const [niche, setNiche] = useState("");
    const [audience, setAudience] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const generateIdeas = async () => {
        if (!niche) return;
        setIsLoading(true);
        setIdeas([]);

        try {
            const res = await fetch("/api/ideas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ niche, audience })
            });
            const data = await res.json();
            if (data.ideas) {
                setIdeas(data.ideas);
                setSelected(new Set(data.ideas.map((i: Idea) => i.keyword)));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSelection = (keyword: string) => {
        const newSelected = new Set(selected);
        if (newSelected.has(keyword)) {
            newSelected.delete(keyword);
        } else {
            newSelected.add(keyword);
        }
        setSelected(newSelected);
    };

    const sendToBulk = () => {
        if (selected.size === 0) return;
        const keywordsToPass = Array.from(selected).join("\n");
        sessionStorage.setItem("bulkKeywords", keywordsToPass);
        router.push("/dashboard/bulk");
    };

    return (
        <div className="space-y-6 max-w-6xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(108,76,241,0.12)", border: "1px solid rgba(108,76,241,0.25)" }}
                >
                    <Lightbulb className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
                </div>
                <div>
                    <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                        Trend-Driven Ideas
                    </h1>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        Discover emerging topics and low-competition keywords for your niche
                    </p>
                </div>
            </div>

            {/* Search Bar */}
            <div
                className="rounded-2xl p-5"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div className="space-y-1.5 lg:col-span-2">
                        <Label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Niche / Core Topic</Label>
                        <Input
                            value={niche}
                            onChange={(e) => setNiche(e.target.value)}
                            placeholder="e.g., Tech SaaS, Vegan Baking, Ultralight Backpacking"
                            className="h-10"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}
                            onKeyDown={(e) => e.key === "Enter" && generateIdeas()}
                        />
                    </div>
                    <div className="space-y-1.5 lg:col-span-1">
                        <Label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Target Audience (Optional)</Label>
                        <Input
                            value={audience}
                            onChange={(e) => setAudience(e.target.value)}
                            placeholder="e.g., Beginners, Tech Leads"
                            className="h-10"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)" }}
                            onKeyDown={(e) => e.key === "Enter" && generateIdeas()}
                        />
                    </div>
                    <div className="lg:col-span-1">
                        <Button
                            onClick={generateIdeas}
                            disabled={!niche || isLoading}
                            className="w-full h-10 btn-primary text-sm"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                            Brainstorm
                        </Button>
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div
                    className="rounded-2xl p-16 flex flex-col items-center justify-center"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                >
                    <div
                        className="w-16 h-16 rounded-full animate-glow-pulse flex items-center justify-center mb-6"
                        style={{ background: "rgba(108,76,241,0.10)", border: "1px solid rgba(108,76,241,0.25)" }}
                    >
                        <Sparkles className="w-7 h-7" style={{ color: "var(--brand-primary)" }} />
                    </div>
                    <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Analyzing search trends...</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Discovering emerging queries and low-competition opportunities</p>
                </div>
            )}

            {/* Results */}
            {!isLoading && ideas.length > 0 && (
                <div className="space-y-4 animate-slide-up">
                    {/* Stats bar */}
                    <div
                        className="flex justify-between items-center rounded-2xl p-4"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)" }}
                            >
                                <TrendingUp className="w-4 h-4 text-green-400" />
                            </div>
                            <div>
                                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{ideas.length} Ideas Found</span>
                                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{selected.size} selected</p>
                            </div>
                        </div>
                        <Button onClick={sendToBulk} disabled={selected.size === 0} className="btn-primary h-9 text-xs px-4">
                            <Send className="w-3.5 h-3.5 mr-1.5" />
                            Send {selected.size} to Bulk Engine
                        </Button>
                    </div>

                    {/* Idea Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {ideas.map((idea, i) => {
                            const isSelected = selected.has(idea.keyword);
                            return (
                                <div
                                    key={i}
                                    className="rounded-2xl p-4 cursor-pointer transition-all duration-200"
                                    onClick={() => toggleSelection(idea.keyword)}
                                    style={{
                                        background: "var(--bg-card)",
                                        border: isSelected ? "1px solid rgba(108,76,241,0.40)" : "1px solid var(--border-subtle)",
                                        boxShadow: isSelected ? "0 0 20px rgba(108,76,241,0.08)" : "none",
                                    }}
                                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
                                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
                                >
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-semibold leading-snug mb-1" style={{ color: "var(--text-primary)" }}>{idea.title}</h3>
                                            <p className="font-mono text-[11px] truncate" style={{ color: "var(--brand-primary)" }}>
                                                {idea.keyword}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {idea.trendDirection && (
                                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{
                                                    background: idea.trendDirection === 'rising' ? 'rgba(34,197,94,0.12)' : idea.trendDirection === 'declining' ? 'rgba(239,68,68,0.12)' : 'rgba(0,194,255,0.12)',
                                                    color: idea.trendDirection === 'rising' ? '#22C55E' : idea.trendDirection === 'declining' ? '#ef4444' : '#00C2FF',
                                                }}>
                                                    {idea.trendDirection === 'rising' && <ArrowUp className="w-2.5 h-2.5" />}
                                                    {idea.trendDirection === 'declining' && <ArrowDown className="w-2.5 h-2.5" />}
                                                    {idea.trendDirection === 'stable' && <Minus className="w-2.5 h-2.5" />}
                                                    {idea.trendDirection}
                                                </div>
                                            )}
                                            <div
                                                className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
                                                style={isSelected ? {
                                                    background: "var(--brand-primary)",
                                                    border: "1px solid var(--brand-primary)",
                                                } : {
                                                    background: "transparent",
                                                    border: "1.5px solid rgba(255,255,255,0.15)",
                                                }}
                                            >
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{idea.reasoning}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className="text-[10px] px-2 py-0.5 rounded-full capitalize" style={{ background: "rgba(108,76,241,0.08)", color: "var(--brand-primary)", border: "1px solid rgba(108,76,241,0.20)" }}>
                                            {idea.intent}
                                        </span>
                                        {idea.searchVolume && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "rgba(0,194,255,0.08)", color: "#00C2FF", border: "1px solid rgba(0,194,255,0.20)" }}>
                                                <BarChart3 className="w-2.5 h-2.5" />
                                                {idea.searchVolume}/mo
                                            </span>
                                        )}
                                        {idea.difficulty && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{
                                                background: idea.difficulty === 'easy' ? 'rgba(34,197,94,0.08)' : idea.difficulty === 'hard' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                                                color: idea.difficulty === 'easy' ? '#22C55E' : idea.difficulty === 'hard' ? '#ef4444' : '#F59E0B',
                                                border: `1px solid ${idea.difficulty === 'easy' ? 'rgba(34,197,94,0.20)' : idea.difficulty === 'hard' ? 'rgba(239,68,68,0.20)' : 'rgba(245,158,11,0.20)'}`,
                                            }}>
                                                <Target className="w-2.5 h-2.5" />
                                                {idea.difficulty}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && ideas.length === 0 && (
                <div
                    className="rounded-2xl p-16 flex flex-col items-center justify-center text-center"
                    style={{ background: "var(--bg-card)", border: "1px dashed var(--border-glass)" }}
                >
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                        style={{ background: "rgba(108,76,241,0.08)", border: "1px solid rgba(108,76,241,0.20)" }}
                    >
                        <Search className="w-7 h-7" style={{ color: "var(--brand-primary)" }} />
                    </div>
                    <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                        Discover Untapped Keywords
                    </h3>
                    <p className="max-w-md text-sm" style={{ color: "var(--text-secondary)" }}>
                        Enter your niche above to find emerging search trends and low-competition topics your audience is searching for right now.
                    </p>
                </div>
            )}
        </div>
    );
}
