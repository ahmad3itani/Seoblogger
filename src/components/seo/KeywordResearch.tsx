"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, TrendingUp, TrendingDown, Minus, Lightbulb, HelpCircle, FileText } from "lucide-react";
import Link from "next/link";
import {
    analyzeKeyword,
    generateKeywordVariations,
    getDifficultyLabel,
    calculateKeywordOpportunity,
    type KeywordData,
} from "@/lib/seo/keywords";

interface KeywordResearchProps {
    onSelectKeyword?: (keyword: string) => void;
    initialKeyword?: string;
}

export function KeywordResearch({ onSelectKeyword, initialKeyword = "" }: KeywordResearchProps) {
    const [keyword, setKeyword] = useState(initialKeyword);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<KeywordData | null>(null);
    const [variations, setVariations] = useState<string[]>([]);

    const handleAnalyze = async () => {
        if (!keyword.trim()) return;

        setIsAnalyzing(true);
        
        try {
            const res = await fetch("/api/keywords/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ keyword: keyword.trim() }),
            });

            if (!res.ok) {
                throw new Error("Failed to analyze keyword");
            }

            const data = await res.json();
            
            // Transform API response to match KeywordData interface
            const result: KeywordData = {
                keyword: data.keyword,
                searchVolume: data.searchVolume,
                difficulty: data.difficulty,
                cpc: data.cpc || 0,
                competition: data.competition || "medium",
                trend: data.trend || "stable",
                intent: data.intent,
                intentConfidence: data.intentConfidence,
                relatedKeywords: data.relatedKeywords || [],
                questions: data.questions || [],
                topQueries: data.topQueries || [],
                serpFeatures: data.serpFeatures || [],
                competitorDomains: data.competitorDomains || [],
                organicResults: data.organicResults || [],
                knowledgeGraph: data.knowledgeGraph,
                answerBox: data.answerBox,
                shopping: data.shopping || [],
                localResults: data.localResults || [],
                images: data.images || [],
                videos: data.videos || [],
                news: data.news || [],
                tweets: data.tweets || [],
                topStories: data.topStories || [],
                inlineVideos: data.inlineVideos || [],
                faqs: data.faqs || [],
                searchMetadata: data.searchMetadata,
            };
            
            setAnalysis(result);
            setVariations(data.variations || []);
        } catch (error) {
            console.error("Keyword analysis error:", error);
            // Fallback to client-side analysis if API fails
            const result = analyzeKeyword(keyword.trim());
            const vars = generateKeywordVariations(keyword.trim());
            setAnalysis(result);
            setVariations(vars);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSelectVariation = (selectedKeyword: string) => {
        setKeyword(selectedKeyword);
        if (onSelectKeyword) {
            onSelectKeyword(selectedKeyword);
        }
    };

    const getDifficultyColor = (difficulty: number) => {
        if (difficulty >= 80) return "text-red-400 bg-red-500/10 border-red-500/20";
        if (difficulty >= 60) return "text-orange-400 bg-orange-500/10 border-orange-500/20";
        if (difficulty >= 40) return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
        if (difficulty >= 20) return "text-green-400 bg-green-500/10 border-green-500/20";
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    };

    const getTrendIcon = (trend: string) => {
        if (trend === 'rising') return <TrendingUp className="w-3 h-3" />;
        if (trend === 'declining') return <TrendingDown className="w-3 h-3" />;
        return <Minus className="w-3 h-3" />;
    };

    return (
        <div className="space-y-4">
            {/* Search Input */}
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle className="text-base">Keyword Research</CardTitle>
                    <CardDescription>
                        Analyze search volume, difficulty, and find related keywords
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Enter keyword to analyze..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                            className="bg-muted/30 border-border/50"
                        />
                        <Button
                            onClick={handleAnalyze}
                            disabled={!keyword.trim() || isAnalyzing}
                            className="bg-violet-600 hover:bg-violet-700"
                        >
                            <Search className="w-4 h-4 mr-2" />
                            {isAnalyzing ? "Analyzing..." : "Analyze"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Analysis Results */}
            {analysis && (
                <>
                    {/* Search Metadata */}
                    {analysis.searchMetadata && (
                        <Card className="glass-card mb-4">
                            <CardContent className="pt-4">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>📊 {analysis.searchMetadata.totalResults} total results</span>
                                    <span>⚡ {analysis.searchMetadata.timeTaken}s search time</span>
                                    <span>📍 {analysis.searchMetadata.location}</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Main Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="glass-card">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardDescription className="text-xs">Search Volume</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-violet-400">
                                    {analysis.searchVolume.toLocaleString()}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Monthly searches (est.)
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="glass-card">
                            <CardHeader className="pb-3">
                                <CardDescription className="text-xs">Difficulty</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="text-2xl font-bold">
                                        {analysis.difficulty}
                                    </div>
                                    <Badge className={getDifficultyColor(analysis.difficulty)}>
                                        {getDifficultyLabel(analysis.difficulty).label}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Ranking difficulty score
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="glass-card">
                            <CardHeader className="pb-3">
                                <CardDescription className="text-xs">Opportunity</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="text-2xl font-bold">
                                        {calculateKeywordOpportunity(
                                            analysis.searchVolume,
                                            analysis.difficulty
                                        ).score.toFixed(0)}
                                    </div>
                                    <Badge className={
                                        getDifficultyColor(
                                            100 - calculateKeywordOpportunity(
                                                analysis.searchVolume,
                                                analysis.difficulty
                                            ).score
                                        )
                                    }>
                                        {calculateKeywordOpportunity(
                                            analysis.searchVolume,
                                            analysis.difficulty
                                        ).label}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    {getTrendIcon(analysis.trend)}
                                    <span className="capitalize">{analysis.trend}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Search Intent */}
                    {analysis.intent && (
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="text-base">Search Intent</CardTitle>
                                <CardDescription>
                                    What users are looking for with this keyword
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3">
                                    <Badge className={`text-sm px-3 py-1 ${
                                        analysis.intent === 'transactional' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                        analysis.intent === 'commercial' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                        analysis.intent === 'navigational' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                        'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                    }`}>
                                        {analysis.intent.charAt(0).toUpperCase() + analysis.intent.slice(1)}
                                    </Badge>
                                    {analysis.intentConfidence && (
                                        <span className="text-xs text-muted-foreground">
                                            {analysis.intentConfidence}% confidence
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-3">
                                    {analysis.intent === 'transactional' && '💳 Users want to buy or take action'}
                                    {analysis.intent === 'commercial' && '🔍 Users are researching before buying'}
                                    {analysis.intent === 'informational' && '📚 Users want to learn something'}
                                    {analysis.intent === 'navigational' && '🎯 Users are looking for a specific site'}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Top Queries from Keyword Analysis */}
                    {(variations.length > 0 || analysis.questions.length > 0) && (
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="text-base">Top Queries for This Keyword</CardTitle>
                                <CardDescription>
                                    Variations and questions to target with content
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {[...variations.slice(0, 5), ...analysis.questions.slice(0, 5)].slice(0, 10).map((query, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                                        >
                                            <div className="flex items-center gap-2.5 flex-1">
                                                <span className="text-violet-400 font-bold text-xs">#{i + 1}</span>
                                                <span className="text-sm">{query}</span>
                                            </div>
                                            <Link href={`/dashboard/new?keyword=${encodeURIComponent(query)}&autoGenerate=true`}>
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost"
                                                    className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                                                >
                                                    Generate an article using this query
                                                </Button>
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* SERP Features */}
                    {analysis.serpFeatures && analysis.serpFeatures.length > 0 && (
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="text-base">SERP Features Present</CardTitle>
                                <CardDescription>
                                    Special features in Google search results
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.serpFeatures.map((feature, i) => (
                                        <Badge
                                            key={i}
                                            variant="secondary"
                                            className="bg-blue-500/10 text-blue-300 border-blue-500/20"
                                        >
                                            {feature}
                                        </Badge>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground mt-3">
                                    💡 Target these features in your content for better visibility
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Competitor Domains */}
                    {analysis.competitorDomains && analysis.competitorDomains.length > 0 && (
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="text-base">Top Ranking Domains</CardTitle>
                                <CardDescription>
                                    Who's ranking in the top 5 positions
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {analysis.competitorDomains.map((competitor, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between p-3 rounded-lg bg-muted/20"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-violet-400 font-bold text-sm">
                                                    #{competitor.position}
                                                </span>
                                                <span className="text-sm font-medium">{competitor.domain}</span>
                                            </div>
                                            <Badge className={
                                                competitor.authority === 'high' 
                                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                    : competitor.authority === 'medium'
                                                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                    : 'bg-green-500/10 text-green-400 border-green-500/20'
                                            }>
                                                {competitor.authority.toUpperCase()} DA
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Keyword Variations */}
                    {variations.length > 0 && (
                        <Card className="glass-card">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4 text-violet-400" />
                                    <CardTitle className="text-base">Keyword Variations</CardTitle>
                                </div>
                                <CardDescription>
                                    Related keywords and alternative phrasings
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {variations.slice(0, 15).map((variation, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSelectVariation(variation)}
                                            className="text-xs px-3 py-1.5 rounded-md bg-muted/20 hover:bg-violet-500/20 border border-border/50 hover:border-violet-500/30 transition-colors"
                                        >
                                            {variation}
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Related Questions */}
                    {analysis.questions.length > 0 && (
                        <Card className="glass-card">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <HelpCircle className="w-4 h-4 text-blue-400" />
                                    <CardTitle className="text-base">People Also Ask</CardTitle>
                                </div>
                                <CardDescription>
                                    Common questions to address in your content
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {analysis.questions.slice(0, 8).map((question, i) => (
                                        <li
                                            key={i}
                                            className="text-sm text-muted-foreground flex items-start gap-2 p-2 rounded-md hover:bg-muted/20 transition-colors"
                                        >
                                            <span className="text-blue-400 shrink-0">Q:</span>
                                            <span>{question}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    {/* Related Keywords */}
                    {analysis.relatedKeywords.length > 0 && (
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="text-base">Related Keywords</CardTitle>
                                <CardDescription>
                                    Semantically related terms to include
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.relatedKeywords.map((related, i) => (
                                        <Badge
                                            key={i}
                                            variant="secondary"
                                            className="bg-violet-500/10 text-violet-300 border-violet-500/20 cursor-pointer hover:bg-violet-500/20"
                                            onClick={() => handleSelectVariation(related)}
                                        >
                                            {related}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Knowledge Graph */}
                    {analysis.knowledgeGraph && (
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="text-base">Knowledge Graph</CardTitle>
                                <CardDescription>Featured information from Google</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-4">
                                    {analysis.knowledgeGraph.imageUrl && (
                                        <img src={analysis.knowledgeGraph.imageUrl} alt={analysis.knowledgeGraph.title} className="w-24 h-24 rounded-lg object-cover" />
                                    )}
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg mb-1">{analysis.knowledgeGraph.title}</h3>
                                        <p className="text-xs text-violet-400 mb-2">{analysis.knowledgeGraph.type}</p>
                                        <p className="text-sm text-muted-foreground">{analysis.knowledgeGraph.description}</p>
                                        {analysis.knowledgeGraph.attributes && Object.keys(analysis.knowledgeGraph.attributes).length > 0 && (
                                            <div className="mt-3 space-y-1">
                                                {Object.entries(analysis.knowledgeGraph.attributes).slice(0, 5).map(([key, value]) => (
                                                    <div key={key} className="text-xs">
                                                        <span className="text-muted-foreground">{key}:</span> <span>{value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Answer Box */}
                    {analysis.answerBox && (
                        <Card className="glass-card border-green-500/20">
                            <CardHeader>
                                <CardTitle className="text-base text-green-400">Answer Box</CardTitle>
                                <CardDescription>Featured snippet from Google</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {analysis.answerBox.title && <h4 className="font-semibold mb-2">{analysis.answerBox.title}</h4>}
                                <p className="text-sm text-muted-foreground mb-2">{analysis.answerBox.snippet}</p>
                                {analysis.answerBox.link && (
                                    <a href={analysis.answerBox.link} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-400 hover:underline">
                                        View source →
                                    </a>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Top Stories */}
                    {analysis.topStories && analysis.topStories.length > 0 && (
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="text-base">📰 Top Stories</CardTitle>
                                <CardDescription>Latest news articles for this keyword</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {analysis.topStories.map((story, i) => (
                                        <a key={i} href={story.link} target="_blank" rel="noopener noreferrer" className="flex gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                                            {story.imageUrl && <img src={story.imageUrl} alt={story.title} className="w-20 h-20 object-cover rounded-md" />}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-sm line-clamp-2">{story.title}</h4>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                    <span>{story.source}</span>
                                                    <span>•</span>
                                                    <span>{story.date}</span>
                                                </div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Inline Videos */}
                    {analysis.inlineVideos && analysis.inlineVideos.length > 0 && (
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="text-base">🎥 Featured Videos</CardTitle>
                                <CardDescription>Videos shown in search results</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {analysis.inlineVideos.map((video, i) => (
                                        <a key={i} href={video.link} target="_blank" rel="noopener noreferrer" className="flex gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                                            {video.imageUrl && <img src={video.imageUrl} alt={video.title} className="w-32 h-20 object-cover rounded-md" />}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium line-clamp-2">{video.title}</p>
                                                <p className="text-xs text-muted-foreground mt-1">{video.channel}</p>
                                                {video.duration && <p className="text-xs text-muted-foreground">{video.duration}</p>}
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* FAQs with Answers */}
                    {analysis.faqs && analysis.faqs.length > 0 && (
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="text-base">❓ Frequently Asked Questions</CardTitle>
                                <CardDescription>Questions with full answers from Google</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {analysis.faqs.map((faq, i) => (
                                        <div key={i} className="p-3 rounded-lg bg-muted/20">
                                            <h4 className="font-semibold text-sm mb-2 text-blue-400">{faq.question}</h4>
                                            <p className="text-xs text-muted-foreground">{faq.answer}</p>
                                            {faq.source && (
                                                <a href={faq.source} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-400 hover:underline mt-1 inline-block">
                                                    View source →
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Organic Results with Enhanced Data */}
                    {analysis.organicResults && analysis.organicResults.length > 0 && (
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="text-base">Top 10 Organic Results</CardTitle>
                                <CardDescription>Current ranking pages with sitelinks and ratings</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {analysis.organicResults.map((result, i) => (
                                        <div key={i} className="p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                                            <div className="flex items-start gap-3">
                                                <span className="text-violet-400 font-bold text-sm shrink-0">#{result.position}</span>
                                                <div className="flex-1 min-w-0">
                                                    <a href={result.link} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:text-violet-400 transition-colors line-clamp-1">
                                                        {result.title}
                                                    </a>
                                                    <p className="text-xs text-green-400 mt-0.5">{result.domain}</p>
                                                    {result.richSnippet && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {result.richSnippet.rating && (
                                                                <span className="text-xs text-yellow-400">★ {result.richSnippet.rating}</span>
                                                            )}
                                                            {result.richSnippet.ratingCount && (
                                                                <span className="text-xs text-muted-foreground">({result.richSnippet.ratingCount} reviews)</span>
                                                            )}
                                                            {result.richSnippet.price && (
                                                                <span className="text-xs text-green-400 font-semibold">{result.richSnippet.price}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{result.snippet}</p>
                                                    {result.sitelinks && result.sitelinks.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            {result.sitelinks.slice(0, 4).map((sl, idx) => (
                                                                <a key={idx} href={sl.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">
                                                                    → {sl.title}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {result.date && <p className="text-xs text-muted-foreground/60 mt-1">{result.date}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Shopping Results */}
                    {analysis.shopping && analysis.shopping.length > 0 && (
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="text-base">Shopping Results</CardTitle>
                                <CardDescription>Products found for this keyword</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {analysis.shopping.map((item, i) => (
                                        <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" className="p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                                            {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="w-full h-32 object-cover rounded-md mb-2" />}
                                            <p className="text-sm font-medium line-clamp-2 mb-1">{item.title}</p>
                                            <p className="text-lg font-bold text-green-400">{item.price}</p>
                                            <p className="text-xs text-muted-foreground">{item.source}</p>
                                            {item.rating && <p className="text-xs text-yellow-400 mt-1">★ {item.rating}</p>}
                                        </a>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Local Results */}
                    {analysis.localResults && analysis.localResults.length > 0 && (
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="text-base">Local Results</CardTitle>
                                <CardDescription>Nearby businesses for this search</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {analysis.localResults.map((place, i) => (
                                        <div key={i} className="p-3 rounded-lg bg-muted/20">
                                            <h4 className="font-semibold text-sm">{place.title}</h4>
                                            <p className="text-xs text-muted-foreground mt-1">{place.address}</p>
                                            <div className="flex items-center gap-3 mt-2 text-xs">
                                                {place.rating && <span className="text-yellow-400">★ {place.rating}</span>}
                                                {place.reviews && <span className="text-muted-foreground">({place.reviews} reviews)</span>}
                                                {place.phone && <span className="text-green-400">{place.phone}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Images */}
                    {analysis.images && analysis.images.length > 0 && (
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="text-base">Image Results</CardTitle>
                                <CardDescription>Visual content for this keyword</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                    {analysis.images.map((img, i) => (
                                        <a key={i} href={img.link} target="_blank" rel="noopener noreferrer" className="group">
                                            <img src={img.imageUrl} alt={img.title} className="w-full h-24 object-cover rounded-md group-hover:opacity-80 transition-opacity" />
                                        </a>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Videos */}
                    {analysis.videos && analysis.videos.length > 0 && (
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="text-base">Video Results</CardTitle>
                                <CardDescription>Video content for this keyword</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {analysis.videos.map((video, i) => (
                                        <a key={i} href={video.link} target="_blank" rel="noopener noreferrer" className="flex gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                                            {video.imageUrl && <img src={video.imageUrl} alt={video.title} className="w-32 h-20 object-cover rounded-md" />}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium line-clamp-2">{video.title}</p>
                                                <p className="text-xs text-muted-foreground mt-1">{video.channel}</p>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                                    {video.duration && <span>{video.duration}</span>}
                                                    {video.date && <span>{video.date}</span>}
                                                </div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* News */}
                    {analysis.news && analysis.news.length > 0 && (
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="text-base">News Results</CardTitle>
                                <CardDescription>Recent news articles</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {analysis.news.map((article, i) => (
                                        <a key={i} href={article.link} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                                            <h4 className="font-semibold text-sm mb-1">{article.title}</h4>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                                <span>{article.source}</span>
                                                <span>•</span>
                                                <span>{article.date}</span>
                                            </div>
                                            {article.snippet && <p className="text-xs text-muted-foreground line-clamp-2">{article.snippet}</p>}
                                        </a>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Tweets */}
                    {analysis.tweets && analysis.tweets.length > 0 && (
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="text-base">Twitter Results</CardTitle>
                                <CardDescription>Recent tweets about this keyword</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {analysis.tweets.map((tweet, i) => (
                                        <a key={i} href={tweet.link} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                                            <p className="text-sm mb-2">{tweet.text}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span className="font-semibold">{tweet.author}</span>
                                                <span>•</span>
                                                <span>{tweet.date}</span>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
