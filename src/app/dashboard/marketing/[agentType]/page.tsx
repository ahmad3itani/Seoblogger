"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/supabase/auth-context";
import { AGENT_CATALOG, AGENT_PLAN_LIMITS, type AgentMeta, type AgentType } from "@/lib/agents/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot, Loader2, ArrowLeft, Clock, CheckCircle2,
  XCircle, Copy, Download, RotateCcw, Crown, Lock,
  Zap, Search, MousePointerClick, PenLine, Mail,
  CalendarDays, Fingerprint, Megaphone, Radar, Filter,
  Rocket, FileBarChart, ClipboardCheck,
} from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

const ICON_MAP: Record<string, any> = {
  ClipboardCheck, Zap, Search, MousePointerClick,
  PenLine, Mail, CalendarDays, Fingerprint,
  Megaphone, Radar, Filter, Rocket, FileBarChart,
};

export default function AgentRunPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const agentType = params.agentType as AgentType;
  const existingRunId = searchParams.get("runId");

  const [url, setUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [keyword, setKeyword] = useState("");
  const [niche, setNiche] = useState("");
  const [emailType, setEmailType] = useState("welcome");
  const [productName, setProductName] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);

  const agentMeta = AGENT_CATALOG.find(a => a.type === agentType);
  const currentPlan = profile?.plan?.name || "free";
  const planLimits = AGENT_PLAN_LIMITS[currentPlan] || AGENT_PLAN_LIMITS.free;
  const isAvailable = planLimits.availableAgents.includes(agentType);
  const IconComponent = agentMeta ? (ICON_MAP[agentMeta.icon] || Bot) : Bot;

  // Load existing run if runId provided
  useEffect(() => {
    if (existingRunId) {
      loadExistingRun(existingRunId);
    }
  }, [existingRunId]);

  const loadExistingRun = async (runId: string) => {
    try {
      const res = await fetch(`/api/agents/history?limit=50`);
      if (res.ok) {
        const data = await res.json();
        const run = data.runs?.find((r: any) => r.id === runId);
        if (run) {
          // Load the full report for this run
          const fullRes = await fetch(`/api/agents/run/${runId}`);
          if (fullRes.ok) {
            const fullData = await fullRes.json();
            setResult(fullData);
          } else {
            // Use summary data
            setResult({
              status: run.status,
              scores: run.scores ? (typeof run.scores === "string" ? JSON.parse(run.scores) : run.scores) : null,
              summary: run.summary,
              durationMs: run.durationMs,
            });
          }
        }
      }
    } catch (e) {
      console.error("Failed to load run:", e);
    }
  };

  const runAgent = async () => {
    if (!agentMeta) return;

    // Validate required inputs
    if (agentMeta.inputType === "url" && !url.trim()) {
      setError("Please enter a URL to analyze");
      return;
    }
    if (agentMeta.inputType === "url+topic" && !url.trim() && !topic.trim()) {
      setError("Please enter a URL or topic");
      return;
    }
    if (agentMeta.inputType === "custom" && !topic.trim() && !productName.trim()) {
      setError("Please provide product/topic details");
      return;
    }

    setRunning(true);
    setError(null);
    setResult(null);
    const startTime = Date.now();

    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType,
          input: {
            url: url.trim() || undefined,
            topic: topic.trim() || undefined,
            keyword: keyword.trim() || undefined,
            niche: niche.trim() || undefined,
            emailType: agentType === "email-sequences" ? emailType : undefined,
            productName: productName.trim() || undefined,
            additionalContext: additionalContext.trim() || undefined,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Agent execution failed");
        return;
      }

      setResult(data);
      setDurationMs(data.durationMs || (Date.now() - startTime));
    } catch (e: any) {
      setError(e.message || "Network error — please try again");
    } finally {
      setRunning(false);
    }
  };

  const copyReport = () => {
    if (result?.report) {
      navigator.clipboard.writeText(result.report);
    }
  };

  const downloadReport = () => {
    if (result?.report) {
      const blob = new Blob([result.report], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${agentType}-report-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (!agentMeta) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <h1 className="text-xl font-bold">Agent not found</h1>
        <p className="text-muted-foreground mt-2">The agent type "{agentType}" doesn't exist.</p>
        <Link href="/dashboard/marketing">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Hub
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/marketing">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className={`p-2.5 rounded-lg bg-primary/10 text-primary`}>
          <IconComponent className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{agentMeta.name}</h1>
          <p className="text-sm text-muted-foreground">{agentMeta.description}</p>
        </div>
      </div>

      {/* Locked State */}
      {!isAvailable && (
        <div className="rounded-xl border-2 border-dashed border-amber-500/30 bg-amber-500/5 p-8 text-center">
          <Lock className="h-8 w-8 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold">Upgrade to {agentMeta.minPlan} Plan</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            The {agentMeta.name} agent requires a {agentMeta.minPlan} plan or higher.
          </p>
          <Link href="/pricing">
            <Button className="gap-2">
              <Crown className="h-4 w-4" /> View Plans
            </Button>
          </Link>
        </div>
      )}

      {/* Input Form */}
      {isAvailable && !result && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Configure Agent</h2>

          {/* URL Input */}
          {(agentMeta.inputType === "url" || agentMeta.inputType === "url+topic") && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Website URL</label>
              <Input
                placeholder="https://example.com"
                value={url}
                onChange={e => setUrl(e.target.value)}
                disabled={running}
              />
            </div>
          )}

          {/* Topic Input */}
          {(agentMeta.inputType === "url+topic" || agentMeta.inputType === "topic" || agentMeta.inputType === "custom") && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                {agentType === "product-launch" ? "Product/Service Name" : "Topic / Subject"}
              </label>
              <Input
                placeholder={agentType === "product-launch" ? "e.g. New AI Writing Tool" : "e.g. Content Marketing for SaaS"}
                value={agentType === "product-launch" ? productName : topic}
                onChange={e => agentType === "product-launch" ? setProductName(e.target.value) : setTopic(e.target.value)}
                disabled={running}
              />
            </div>
          )}

          {/* Email Type Selector */}
          {agentType === "email-sequences" && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Sequence Type</label>
              <Select value={emailType} onValueChange={(val) => { if (val) setEmailType(val); }} disabled={running}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="welcome">Welcome Sequence</SelectItem>
                  <SelectItem value="cart-abandonment">Cart Abandonment</SelectItem>
                  <SelectItem value="nurture">Nurture Sequence</SelectItem>
                  <SelectItem value="re-engagement">Re-engagement</SelectItem>
                  <SelectItem value="product-launch">Product Launch</SelectItem>
                  <SelectItem value="post-purchase">Post-Purchase</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Optional fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Niche (optional)</label>
              <Input
                placeholder="e.g. Health & Fitness"
                value={niche}
                onChange={e => setNiche(e.target.value)}
                disabled={running}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Keyword (optional)</label>
              <Input
                placeholder="e.g. best AI writing tool"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                disabled={running}
              />
            </div>
          </div>

          {/* Additional Context */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Additional Context (optional)</label>
            <Textarea
              placeholder="Any extra details the agent should know..."
              value={additionalContext}
              onChange={e => setAdditionalContext(e.target.value)}
              disabled={running}
              rows={2}
            />
          </div>

          {/* Run Button */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Estimated time: {agentMeta.estimatedTime}
            </div>
            <Button onClick={runAgent} disabled={running} size="lg" className="gap-2">
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running Agent...
                </>
              ) : (
                <>
                  <Bot className="h-4 w-4" />
                  Run {agentMeta.name}
                </>
              )}
            </Button>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
              <XCircle className="h-4 w-4 text-destructive mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Running State */}
      {running && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-lg font-semibold">Agent is analyzing...</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {agentType === "marketing-audit" ? "Running 5 parallel sub-agents. This may take 3-5 minutes." : `This usually takes ${agentMeta.estimatedTime}.`}
          </p>
          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Processing...
          </div>
        </div>
      )}

      {/* Results */}
      {result && !running && (
        <div className="space-y-4">
          {/* Status Bar */}
          <div className="flex items-center justify-between rounded-lg border bg-card p-3">
            <div className="flex items-center gap-3">
              <Badge variant={result.status === "completed" ? "default" : "destructive"} className="gap-1">
                {result.status === "completed" ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {result.status}
              </Badge>
              {result.scores?.overall != null && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{result.scores.overall}</span>
                  <span className="text-sm text-muted-foreground">/100</span>
                  <Badge variant="outline" className={`text-xs ${
                    result.scores.grade === "A" ? "bg-emerald-500/10 text-emerald-500" :
                    result.scores.grade === "B" ? "bg-blue-500/10 text-blue-500" :
                    result.scores.grade === "C" ? "bg-amber-500/10 text-amber-500" :
                    "bg-red-500/10 text-red-500"
                  }`}>
                    Grade: {result.scores.grade}
                  </Badge>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {result.durationMs && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {(result.durationMs / 1000).toFixed(1)}s
                </span>
              )}
              <Button variant="outline" size="sm" onClick={copyReport} className="gap-1">
                <Copy className="h-3 w-3" /> Copy
              </Button>
              <Button variant="outline" size="sm" onClick={downloadReport} className="gap-1">
                <Download className="h-3 w-3" /> Download
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setResult(null); setError(null); }} className="gap-1">
                <RotateCcw className="h-3 w-3" /> New Run
              </Button>
            </div>
          </div>

          {/* Score Dimensions */}
          {result.scores?.dimensions?.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold text-sm mb-3">Score Breakdown</h3>
              <div className="space-y-2">
                {result.scores.dimensions.map((dim: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-40 text-xs font-medium truncate">{dim.name}</div>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (dim.score / dim.maxScore) >= 0.7 ? "bg-emerald-500" :
                          (dim.score / dim.maxScore) >= 0.5 ? "bg-amber-500" : "bg-red-500"
                        }`}
                        style={{ width: `${(dim.score / dim.maxScore) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs font-mono w-10 text-right">{dim.score}/{dim.maxScore}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Wins */}
          {result.quickWins?.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" /> Quick Wins
              </h3>
              <ul className="space-y-1">
                {result.quickWins.map((win: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary font-bold">{i + 1}.</span>
                    {win}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Full Report */}
          {result.report && (
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold text-sm mb-4">Full Report</h3>
              <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-table:text-sm">
                <ReactMarkdown>{result.report}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
