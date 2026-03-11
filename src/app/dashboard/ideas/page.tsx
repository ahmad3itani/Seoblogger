"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lightbulb, TrendingUp, Send, Check, ArrowUp, ArrowDown, Minus, Target, BarChart3 } from "lucide-react";

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
                setSelected(new Set(data.ideas.map((i: Idea) => i.keyword))); // Auto-select all
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
        // The bulk generator can read from sessionStorage
        const keywordsToPass = Array.from(selected).join("\n");
        sessionStorage.setItem("bulkKeywords", keywordsToPass);
        router.push("/dashboard/bulk");
    };

    return (
        <div className="space-y-6 max-w-6xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Trend-Driven Ideas</h1>
                <p className="text-muted-foreground mt-1">
                    Brainstorm highly relevant, emerging topics for your niche and instantly add them to your content pipeline.
                </p>
            </div>

            <Card className="glass-card border-amber-500/20 shadow-lg shadow-amber-500/5">
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2 lg:col-span-2">
                        <Label>Niche / Core Topic (e.g. AI SaaS, Vegan Baking, Ultralight Backpacking)</Label>
                        <Input
                            value={niche}
                            onChange={(e) => setNiche(e.target.value)}
                            placeholder="Enter your broad niche..."
                            onKeyDown={(e) => e.key === "Enter" && generateIdeas()}
                        />
                    </div>
                    <div className="space-y-2 lg:col-span-1">
                        <Label>Target Audience (Optional)</Label>
                        <Input
                            value={audience}
                            onChange={(e) => setAudience(e.target.value)}
                            placeholder="e.g. Beginners, Tech Leads"
                            onKeyDown={(e) => e.key === "Enter" && generateIdeas()}
                        />
                    </div>
                    <div className="lg:col-span-1">
                        <Button
                            onClick={generateIdeas}
                            disabled={!niche || isLoading}
                            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-orange-500/20"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lightbulb className="w-4 h-4 mr-2" />}
                            Brainstorm
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {isLoading && (
                <div className="py-24 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
                    <p className="text-muted-foreground animate-pulse delay-100">Analyzing search trends and emerging queries...</p>
                </div>
            )}

            {!isLoading && ideas.length > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                            <span className="font-semibold">{ideas.length} Ideas Found</span>
                        </div>
                        <Button onClick={sendToBulk} disabled={selected.size === 0} className="bg-emerald-600 hover:bg-emerald-700">
                            <Send className="w-4 h-4 mr-2" />
                            Send {selected.size} to Bulk Engine
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {ideas.map((idea, i) => {
                            const isSelected = selected.has(idea.keyword);
                            return (
                                <Card
                                    key={i}
                                    className={`cursor-pointer transition-all duration-200 ${isSelected ? 'ring-2 ring-emerald-500 bg-emerald-500/5' : 'hover:border-foreground/30'}`}
                                    onClick={() => toggleSelection(idea.keyword)}
                                >
                                    <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                                        <div className="space-y-1 pr-4 flex-1">
                                            <div className="flex items-start gap-2">
                                                <CardTitle className="text-lg leading-snug flex-1">{idea.title}</CardTitle>
                                                {idea.trendDirection && (
                                                    <div className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        idea.trendDirection === 'rising' ? 'bg-green-500/20 text-green-400' :
                                                        idea.trendDirection === 'declining' ? 'bg-red-500/20 text-red-400' :
                                                        'bg-blue-500/20 text-blue-400'
                                                    }`}>
                                                        {idea.trendDirection === 'rising' && <ArrowUp className="w-3 h-3" />}
                                                        {idea.trendDirection === 'declining' && <ArrowDown className="w-3 h-3" />}
                                                        {idea.trendDirection === 'stable' && <Minus className="w-3 h-3" />}
                                                        {idea.trendDirection}
                                                    </div>
                                                )}
                                            </div>
                                            <CardDescription className="font-mono text-xs max-w-full truncate text-emerald-600 dark:text-emerald-400">
                                                🎯 {idea.keyword}
                                            </CardDescription>
                                        </div>
                                        <div className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-muted-foreground/30 text-transparent'}`}>
                                            <Check className="w-4 h-4 stroke-[3]" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="text-sm text-muted-foreground pb-3">
                                        <p>{idea.reasoning}</p>
                                    </CardContent>
                                    <CardFooter className="pt-0 flex flex-wrap gap-2">
                                        <Badge variant="outline" className="capitalize text-xs bg-card/50">
                                            {idea.intent === 'informational' && '📚'}
                                            {idea.intent === 'commercial' && '💰'}
                                            {idea.intent === 'transactional' && '🛒'}
                                            {' '}{idea.intent}
                                        </Badge>
                                        {idea.searchVolume && (
                                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                                                <BarChart3 className="w-3 h-3 mr-1" />
                                                {idea.searchVolume}/mo
                                            </Badge>
                                        )}
                                        {idea.difficulty && (
                                            <Badge variant="outline" className={`text-xs ${
                                                idea.difficulty === 'easy' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                                                idea.difficulty === 'hard' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                                                'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                                            }`}>
                                                <Target className="w-3 h-3 mr-1" />
                                                {idea.difficulty}
                                            </Badge>
                                        )}
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {!isLoading && ideas.length === 0 && (
                <div className="border border-dashed border-border/50 rounded-xl p-12 flex flex-col items-center justify-center text-center opacity-50">
                    <TrendingUp className="w-16 h-16 text-muted-foreground/30 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Discover Untapped Keywords</h3>
                    <p className="max-w-md text-muted-foreground">
                        Enter your niche above to find emerging search trends and low-competition topics that your audience is searching for right now.
                    </p>
                </div>
            )}
        </div>
    );
}
