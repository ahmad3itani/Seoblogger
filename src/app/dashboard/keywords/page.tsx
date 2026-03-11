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
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Keyword Research</h1>
                    <p className="text-muted-foreground mt-1">
                        Discover high-opportunity keywords for your content strategy
                    </p>
                </div>
                {savedKeywords.length > 0 && (
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExport}
                            className="glass-card"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Export ({savedKeywords.length})
                        </Button>
                    </div>
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
                <Card className="glass-card">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base">Saved Keywords</CardTitle>
                                <CardDescription>
                                    Keywords you've researched in this session
                                </CardDescription>
                            </div>
                            <Badge variant="secondary" className="bg-orange-500/10 text-violet-300">
                                {savedKeywords.length} saved
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {savedKeywords.map((keyword, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                                >
                                    <span className="text-sm font-medium">{keyword}</span>
                                    <Link href={`/dashboard/new?keyword=${encodeURIComponent(keyword)}`}>
                                        <Button size="sm" className="bg-[#FF6600] hover:bg-violet-700">
                                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                                            Create Article
                                        </Button>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Quick Tips */}
            <Card className="glass-card border-blue-500/20">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-400" />
                        <CardTitle className="text-base">Keyword Research Tips</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                            <span className="text-blue-400 shrink-0">•</span>
                            <span>Target long-tail keywords (3-5 words) for easier ranking</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-400 shrink-0">•</span>
                            <span>Look for keywords with high volume and low-medium difficulty</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-400 shrink-0">•</span>
                            <span>Use "People Also Ask" questions to create comprehensive content</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-400 shrink-0">•</span>
                            <span>Include related keywords naturally throughout your article</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-400 shrink-0">•</span>
                            <span>Focus on search intent - what does the user want to accomplish?</span>
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
