"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Eye, Code, Sparkles, Save, RefreshCw } from "lucide-react";
import { SEOScoreCard } from "@/components/seo/SEOScoreCard";
import { analyzeSEO, type SEOScore } from "@/lib/seo/analyzer";
import { generateAllSchemas } from "@/lib/seo/schema";

interface ArticleEditorProps {
    initialTitle?: string;
    initialContent?: string;
    initialMeta?: string;
    keyword: string;
    onSave?: (data: { title: string; content: string; metaDescription: string }) => void;
    autoAnalyze?: boolean;
}

export function ArticleEditor({
    initialTitle = "",
    initialContent = "",
    initialMeta = "",
    keyword,
    onSave,
    autoAnalyze = true,
}: ArticleEditorProps) {
    const [title, setTitle] = useState(initialTitle);
    const [content, setContent] = useState(initialContent);
    const [metaDescription, setMetaDescription] = useState(initialMeta);
    const [seoScore, setSeoScore] = useState<SEOScore | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [schemas, setSchemas] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<string>("edit");

    // Auto-analyze on content change
    useEffect(() => {
        if (autoAnalyze && content && title) {
            const timer = setTimeout(() => {
                analyzeContent();
            }, 1000); // Debounce 1 second

            return () => clearTimeout(timer);
        }
    }, [content, title, metaDescription, autoAnalyze]);

    const analyzeContent = () => {
        if (!content || !title) return;

        setIsAnalyzing(true);

        try {
            const score = analyzeSEO({
                keyword,
                title,
                content,
                metaDescription,
                targetWordCount: 2000,
            });

            setSeoScore(score);

            // Generate schemas
            const generatedSchemas = generateAllSchemas({
                title,
                description: metaDescription,
                content,
                articleType: 'blog-post',
            });

            setSchemas(generatedSchemas);
        } catch (error) {
            console.error("SEO analysis error:", error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSave = () => {
        if (onSave) {
            onSave({ title, content, metaDescription });
        }
    };

    const wordCount = content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
    const charCount = content.length;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Editor Section */}
            <div className="lg:col-span-2 space-y-4">
                {/* Title */}
                <div>
                    <Label htmlFor="article-title">Article Title</Label>
                    <Input
                        id="article-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter article title..."
                        className="mt-1.5 bg-muted/30 border-border/50 text-lg font-semibold"
                    />
                </div>

                {/* Meta Description */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <Label htmlFor="meta-description">Meta Description</Label>
                        <span className="text-xs text-muted-foreground">
                            {metaDescription.length}/160
                        </span>
                    </div>
                    <Textarea
                        id="meta-description"
                        value={metaDescription}
                        onChange={(e) => setMetaDescription(e.target.value)}
                        placeholder="Write a compelling meta description..."
                        className="bg-muted/30 border-border/50 resize-none h-20"
                        maxLength={160}
                    />
                </div>

                {/* Content Editor with Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex items-center justify-between mb-2">
                        <TabsList className="glass-card">
                            <TabsTrigger value="edit" className="gap-2">
                                <Code className="w-3.5 h-3.5" />
                                Edit HTML
                            </TabsTrigger>
                            <TabsTrigger value="preview" className="gap-2">
                                <Eye className="w-3.5 h-3.5" />
                                Preview
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{wordCount.toLocaleString()} words</span>
                            <span>{charCount.toLocaleString()} chars</span>
                        </div>
                    </div>

                    <TabsContent value="edit" className="mt-0">
                        <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Paste or edit your article HTML here..."
                            className="bg-muted/30 border-border/50 font-mono text-sm min-h-[500px] resize-y"
                        />
                    </TabsContent>

                    <TabsContent value="preview" className="mt-0">
                        <div className="glass-card rounded-xl p-6 min-h-[500px] max-h-[600px] overflow-y-auto">
                            {title && (
                                <h1 className="text-3xl font-bold mb-4">{title}</h1>
                            )}
                            {metaDescription && (
                                <p className="text-muted-foreground italic mb-6 pb-6 border-b border-border/50">
                                    {metaDescription}
                                </p>
                            )}
                            <div
                                className="prose prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: content }}
                            />
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Schema Markup */}
                {schemas.length > 0 && (
                    <div className="glass-card rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-violet-400" />
                                <h3 className="text-sm font-semibold">Schema Markup</h3>
                                <Badge variant="secondary" className="text-[10px]">
                                    {schemas.length} schema{schemas.length > 1 ? 's' : ''}
                                </Badge>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    navigator.clipboard.writeText(schemas.join('\n\n'));
                                }}
                            >
                                Copy All
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {schemas.map((schema, i) => (
                                <details key={i} className="group">
                                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
                                        Schema {i + 1} (Click to expand)
                                    </summary>
                                    <pre className="mt-2 p-3 bg-muted/20 rounded-md text-[10px] overflow-x-auto">
                                        <code>{schema}</code>
                                    </pre>
                                </details>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <Button
                        onClick={analyzeContent}
                        disabled={isAnalyzing || !content || !title}
                        variant="outline"
                        className="glass-card"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
                        {isAnalyzing ? 'Analyzing...' : 'Analyze SEO'}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!content || !title}
                        className="glow-button text-white border-0"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Save Article
                    </Button>
                </div>
            </div>

            {/* SEO Score Sidebar */}
            <div className="lg:col-span-1">
                <div className="sticky top-6">
                    {seoScore ? (
                        <SEOScoreCard score={seoScore} />
                    ) : (
                        <div className="glass-card rounded-xl p-8 text-center">
                            <Sparkles className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                            <p className="text-sm text-muted-foreground">
                                {content && title
                                    ? 'Analyzing SEO...'
                                    : 'Add content to see SEO analysis'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
