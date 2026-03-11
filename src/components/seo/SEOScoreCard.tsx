"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import { SEOScore, getScoreGrade } from "@/lib/seo/analyzer";

interface SEOScoreCardProps {
    score: SEOScore;
    className?: string;
}

export function SEOScoreCard({ score, className = "" }: SEOScoreCardProps) {
    const grade = getScoreGrade(score.overall);
    
    const getColorClass = (color: string) => {
        const colors: Record<string, string> = {
            emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
            green: "text-green-400 bg-green-500/10 border-green-500/20",
            blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
            yellow: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
            orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
            red: "text-red-400 bg-red-500/10 border-red-500/20",
        };
        return colors[color] || colors.blue;
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Overall Score */}
            <Card className="glass-card border-violet-500/30">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">SEO Score</CardTitle>
                            <CardDescription>Overall content optimization</CardDescription>
                        </div>
                        <div className="text-right">
                            <div className={`text-4xl font-bold ${getColorClass(grade.color).split(' ')[0]}`}>
                                {score.overall}
                            </div>
                            <Badge className={getColorClass(grade.color)}>
                                {grade.grade} - {grade.label}
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Progress value={score.overall} className="h-2" />
                </CardContent>
            </Card>

            {/* Score Breakdown */}
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle className="text-base">Score Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {[
                        { label: "Keyword Optimization", value: score.breakdown.keyword, max: 25 },
                        { label: "Readability", value: score.breakdown.readability, max: 20 },
                        { label: "Content Structure", value: score.breakdown.structure, max: 25 },
                        { label: "Meta Information", value: score.breakdown.meta, max: 15 },
                        { label: "Links & References", value: score.breakdown.links, max: 15 },
                    ].map((item) => (
                        <div key={item.label}>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-sm text-muted-foreground">{item.label}</span>
                                <span className="text-sm font-medium">
                                    {item.value}/{item.max}
                                </span>
                            </div>
                            <Progress value={(item.value / item.max) * 100} className="h-1.5" />
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Passed Checks */}
            {score.passed.length > 0 && (
                <Card className="glass-card border-emerald-500/20">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <CardTitle className="text-sm">Passed ({score.passed.length})</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-1.5">
                            {score.passed.map((item, i) => (
                                <li key={i} className="text-xs text-emerald-400/80 flex items-start gap-2">
                                    <span className="shrink-0 mt-0.5">•</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* Warnings */}
            {score.warnings.length > 0 && (
                <Card className="glass-card border-yellow-500/20">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                            <CardTitle className="text-sm">Warnings ({score.warnings.length})</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-1.5">
                            {score.warnings.map((item, i) => (
                                <li key={i} className="text-xs text-yellow-400/80 flex items-start gap-2">
                                    <span className="shrink-0 mt-0.5">•</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* Recommendations */}
            {score.recommendations.length > 0 && (
                <Card className="glass-card border-blue-500/20">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-400" />
                            <CardTitle className="text-sm">
                                Recommendations ({score.recommendations.length})
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-1.5">
                            {score.recommendations.map((item, i) => (
                                <li key={i} className="text-xs text-blue-400/80 flex items-start gap-2">
                                    <span className="shrink-0 mt-0.5">•</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
