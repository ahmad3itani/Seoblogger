"use client";

import { useState, useEffect } from "react";
import { Loader2, Play, RefreshCw, AlertCircle, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContentPlanView } from "./content-plan-view";
import type {
  AnalyzeResponse,
  AnalyzeErrorResponse,
  ContentPlan,
  ContentPlanSummary,
  DepthLevel,
} from "@/types/autopilot";

interface Blog {
  id: string;
  blogId: string;
  name: string;
  url: string;
}

interface AutopilotPanelProps {
  onGenerateSelected: (keywords: string[]) => void;
}

export function AutopilotPanel({ onGenerateSelected }: AutopilotPanelProps) {
  // Blog selection
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState<string>("");
  const [loadingBlogs, setLoadingBlogs] = useState(true);

  // Analysis options
  const [niche, setNiche] = useState("");
  const [language, setLanguage] = useState("en");
  const [depthLevel, setDepthLevel] = useState<DepthLevel>("standard");

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");

  // Results
  const [summary, setSummary] = useState<ContentPlanSummary | null>(null);
  const [contentPlan, setContentPlan] = useState<ContentPlan | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);

  // Fetch blogs on mount
  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await fetch("/api/blogs");
        const data = await res.json();
        // API returns { blogs: [...] } not an array directly
        const blogsList = data.blogs || data;
        if (Array.isArray(blogsList)) {
          setBlogs(blogsList);
          if (blogsList.length > 0) {
            setSelectedBlogId(blogsList[0].blogId);
          }
        }
      } catch (err) {
        console.error("Failed to fetch blogs:", err);
        setError("Failed to load blogs. Please refresh the page.");
      } finally {
        setLoadingBlogs(false);
      }
    };
    fetchBlogs();
  }, []);

  const runAnalysis = async () => {
    if (!selectedBlogId) {
      setError("Please select a blog to analyze");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setSummary(null);
    setContentPlan(null);
    setSessionId(null);
    setDurationMs(null);
    setProgress("Starting analysis...");

    try {
      setProgress("Analyzing existing content...");

      const res = await fetch("/api/autopilot/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blogId: selectedBlogId,
          language,
          niche: niche || undefined,
          depthLevel,
        }),
      });

      const data: AnalyzeResponse | AnalyzeErrorResponse = await res.json();

      if (!data.success) {
        const errorData = data as AnalyzeErrorResponse;
        setError(errorData.error || "Analysis failed. Please try again.");
        return;
      }

      const successData = data as AnalyzeResponse;
      setSummary(successData.summary);
      setContentPlan(successData.contentPlan);
      setSessionId(successData.sessionId);
      setDurationMs(successData.durationMs);
      setProgress("");
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setSummary(null);
    setContentPlan(null);
    setSessionId(null);
    setDurationMs(null);
    setError(null);
  };

  // Show results if we have them
  if (contentPlan && summary) {
    return (
      <div className="space-y-4">
        {/* Results header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(34, 197, 94, 0.12)", border: "1px solid rgba(34, 197, 94, 0.25)" }}
            >
              <Sparkles className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Content Plan Ready
              </h3>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Generated in {((durationMs || 0) / 1000).toFixed(1)}s • Session: {sessionId?.slice(0, 8)}...
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetAnalysis}
            className="h-8 text-xs"
            style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid var(--border-glass)" }}
          >
            <RefreshCw className="w-3 h-3 mr-1.5" />
            New Analysis
          </Button>
        </div>

        {/* Content plan view */}
        <ContentPlanView
          summary={summary}
          contentPlan={contentPlan}
          onGenerateSelected={onGenerateSelected}
        />
      </div>
    );
  }

  // Show analysis form
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(108, 76, 241, 0.12)", border: "1px solid rgba(108, 76, 241, 0.25)" }}
        >
          <Sparkles className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
        </div>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            SEO Autopilot
          </h3>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Analyze your blog and get AI-powered content recommendations
          </p>
        </div>
      </div>

      {/* Analysis form */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
      >
        {/* Blog selector */}
        <div>
          <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
            Select Blog to Analyze
          </Label>
          {loadingBlogs ? (
            <div className="h-9 flex items-center justify-center" style={{ background: "rgba(255, 255, 255, 0.04)", borderRadius: "0.5rem" }}>
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--text-muted)" }} />
            </div>
          ) : blogs.length === 0 ? (
            <div
              className="h-9 flex items-center justify-center text-xs rounded-lg"
              style={{ background: "rgba(239, 68, 68, 0.08)", color: "#EF4444" }}
            >
              No blogs connected. Please add a blog first.
            </div>
          ) : (
            <Select value={selectedBlogId} onValueChange={(v) => v && setSelectedBlogId(v)}>
              <SelectTrigger
                className="h-9 text-xs"
                style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid var(--border-glass)" }}
              >
                <SelectValue placeholder="Select a blog..." />
              </SelectTrigger>
              <SelectContent>
                {blogs.map((blog) => (
                  <SelectItem key={blog.blogId} value={blog.blogId}>
                    {blog.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Options row */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
              Language
            </Label>
            <Select value={language} onValueChange={(v) => v && setLanguage(v)}>
              <SelectTrigger
                className="h-9 text-xs"
                style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid var(--border-glass)" }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
              Depth Level
            </Label>
            <Select value={depthLevel} onValueChange={(v) => setDepthLevel(v as DepthLevel)}>
              <SelectTrigger
                className="h-9 text-xs"
                style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid var(--border-glass)" }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (20-30 ideas)</SelectItem>
                <SelectItem value="aggressive">Aggressive (40-50 ideas)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
              Niche (Optional)
            </Label>
            <Input
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g. Technology"
              className="h-9 text-xs"
              style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid var(--border-glass)" }}
            />
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-lg text-xs"
            style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.20)" }}
          >
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span style={{ color: "#EF4444" }}>{error}</span>
          </div>
        )}

        {/* Progress display */}
        {isAnalyzing && progress && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-lg text-xs"
            style={{ background: "rgba(108, 76, 241, 0.08)", border: "1px solid rgba(108, 76, 241, 0.20)" }}
          >
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--brand-primary)" }} />
            <span style={{ color: "var(--brand-primary)" }}>{progress}</span>
          </div>
        )}

        {/* Run button */}
        <Button
          className="w-full h-11 text-sm font-semibold btn-primary"
          onClick={runAnalysis}
          disabled={isAnalyzing || blogs.length === 0 || !selectedBlogId}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Run Autopilot Analysis
            </>
          )}
        </Button>

        {/* Info text */}
        <p className="text-[10px] text-center" style={{ color: "var(--text-muted)" }}>
          Analysis uses 1 article credit from your monthly quota
        </p>
      </div>

      {/* How it works */}
      <div
        className="rounded-xl p-4"
        style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-subtle)" }}
      >
        <h4 className="text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
          How SEO Autopilot Works
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-start gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
              style={{ background: "rgba(108, 76, 241, 0.12)", color: "var(--brand-primary)" }}
            >
              1
            </div>
            <div>
              <p className="text-[11px] font-medium" style={{ color: "var(--text-primary)" }}>
                Analyze
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Scans your existing blog content
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
              style={{ background: "rgba(108, 76, 241, 0.12)", color: "var(--brand-primary)" }}
            >
              2
            </div>
            <div>
              <p className="text-[11px] font-medium" style={{ color: "var(--text-primary)" }}>
                Identify Gaps
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Finds missing topics & keywords
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
              style={{ background: "rgba(108, 76, 241, 0.12)", color: "var(--brand-primary)" }}
            >
              3
            </div>
            <div>
              <p className="text-[11px] font-medium" style={{ color: "var(--text-primary)" }}>
                Generate Plan
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Creates prioritized article ideas
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
