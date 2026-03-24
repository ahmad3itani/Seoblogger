"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KeywordResearch } from "@/components/seo/KeywordResearch";
import { Search, Download, Plus, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function KeywordsPage() {
    const [savedKeywords, setSavedKeywords] = useState<string[]>([]);
    const [selectedKeyword, setSelectedKeyword] = useState("");

    const handleSaveKeyword = (keyword: string) => {
        if (!savedKeywords.includes(keyword)) {
            setSavedKeywords([...savedKeywords, keyword]);
        }
    };

    const handleExport = () => {
        const csv = savedKeywords.join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'keywords.csv';
        a.click();
    };

    return (
        <div className="space-y-6 max-w-6xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(108,76,241,0.12)", border: "1px solid rgba(108,76,241,0.25)" }}>
                        <Search className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>Keyword Research</h1>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Discover high-opportunity keywords for your content strategy</p>
                    </div>
                </div>
                {savedKeywords.length > 0 && (
                    <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)", color: "var(--text-secondary)" }}>
                        <Download className="w-3 h-3" /> Export ({savedKeywords.length})
                    </button>
                )}
            </div>

            {/* Keyword Research Component */}
            <KeywordResearch
                onSelectKeyword={(keyword) => {
                    setSelectedKeyword(keyword);
                    handleSaveKeyword(keyword);
                }}
            />

            {/* Saved Keywords */}
            {savedKeywords.length > 0 && (
                <div className="rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                    <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <div>
                            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Saved Keywords</h3>
                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Keywords researched in this session</p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(108,76,241,0.08)", color: "var(--brand-primary)", border: "1px solid rgba(108,76,241,0.20)" }}>
                            {savedKeywords.length} saved
                        </span>
                    </div>
                    <div className="p-3 space-y-1.5">
                        {savedKeywords.map((keyword, i) => (
                            <div key={i} className="flex items-center justify-between px-4 py-2.5 rounded-xl transition-all" style={{ background: "rgba(255,255,255,0.02)" }}
                                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                            >
                                <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{keyword}</span>
                                <Link href={`/dashboard/new?keyword=${encodeURIComponent(keyword)}`}>
                                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold btn-primary">
                                        <Plus className="w-3 h-3" /> Create Article
                                    </button>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Tips */}
            <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4" style={{ color: "var(--brand-accent)" }} />
                    <h3 className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Research Tips</h3>
                </div>
                <div className="space-y-2">
                    {[
                        "Target long-tail keywords (3-5 words) for easier ranking",
                        "Look for keywords with high volume and low-medium difficulty",
                        "Use \"People Also Ask\" questions to create comprehensive content",
                        "Include related keywords naturally throughout your article",
                        "Focus on search intent — what does the user want to accomplish?",
                    ].map((tip, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                            <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: "var(--brand-accent)" }} />
                            <span>{tip}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
