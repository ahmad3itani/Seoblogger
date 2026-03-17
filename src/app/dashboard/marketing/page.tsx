"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/supabase/auth-context";
import { isFeatureAvailable } from "@/lib/supabase/plan-gates";
import { AGENT_CATALOG, AGENT_PLAN_LIMITS, type AgentMeta } from "@/lib/agents/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardCheck, Zap, Search, MousePointerClick,
  PenLine, Mail, CalendarDays, Fingerprint,
  Megaphone, Radar, Filter,
  Rocket, FileBarChart, Lock, Crown, Bot, Clock, ArrowRight,
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  ClipboardCheck, Zap, Search, MousePointerClick,
  PenLine, Mail, CalendarDays, Fingerprint,
  Megaphone, Radar, Filter, Rocket, FileBarChart,
};

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  audit: { label: "Audit", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  content: { label: "Content", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  acquisition: { label: "Acquisition", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  strategy: { label: "Strategy", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
};

export default function MarketingHubPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [usedThisMonth, setUsedThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);

  const currentPlan = profile?.plan?.name || "free";
  const planLimits = AGENT_PLAN_LIMITS[currentPlan] || AGENT_PLAN_LIMITS.free;

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/agents/history?limit=5");
      if (res.ok) {
        const data = await res.json();
        setRecentRuns(data.runs || []);
        setUsedThisMonth(data.usedThisMonth || 0);
      }
    } catch (e) {
      console.error("Failed to fetch agent history:", e);
    } finally {
      setLoading(false);
    }
  };

  const isAgentAvailable = (agent: AgentMeta) => {
    return planLimits.availableAgents.includes(agent.type);
  };

  const handleAgentClick = (agent: AgentMeta) => {
    if (!isAgentAvailable(agent)) return;
    router.push(`/dashboard/marketing/${agent.type}`);
  };

  const categories = ["audit", "content", "acquisition", "strategy"];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-7 w-7 text-primary" />
            Marketing Agents
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered marketing analysis and content generation — 13 specialized agents at your service.
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Usage this month</div>
          <div className="text-2xl font-bold">
            {usedThisMonth} <span className="text-sm font-normal text-muted-foreground">/ {planLimits.agentRunsPerMonth}</span>
          </div>
        </div>
      </div>

      {/* Agent Categories */}
      {categories.map(category => {
        const agents = AGENT_CATALOG.filter(a => a.category === category);
        const categoryInfo = CATEGORY_LABELS[category];

        return (
          <div key={category}>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Badge variant="outline" className={categoryInfo.color}>
                {categoryInfo.label}
              </Badge>
              <span className="text-muted-foreground text-sm font-normal">
                {agents.length} agent{agents.length > 1 ? "s" : ""}
              </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map(agent => {
                const available = isAgentAvailable(agent);
                const IconComponent = ICON_MAP[agent.icon] || Bot;

                return (
                  <button
                    key={agent.type}
                    onClick={() => handleAgentClick(agent)}
                    disabled={!available}
                    className={`relative group text-left p-5 rounded-xl border transition-all duration-200 ${
                      available
                        ? "bg-card hover:bg-accent/50 hover:border-primary/30 hover:shadow-md cursor-pointer"
                        : "bg-muted/30 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    {!available && (
                      <div className="absolute top-3 right-3">
                        <Badge variant="outline" className="text-xs gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                          <Crown className="h-3 w-3" />
                          {agent.minPlan}
                        </Badge>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-lg ${available ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm flex items-center gap-2">
                          {agent.name}
                          {!available && <Lock className="h-3 w-3 text-muted-foreground" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {agent.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {agent.estimatedTime}
                          </span>
                          {available && (
                            <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              Run <ArrowRight className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Recent Runs */}
      {recentRuns.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Agent Runs</h2>
          <div className="space-y-2">
            {recentRuns.map((run: any) => {
              const agentMeta = AGENT_CATALOG.find(a => a.type === run.agentType);
              const scores = run.scores ? (typeof run.scores === "string" ? JSON.parse(run.scores) : run.scores) : null;

              return (
                <button
                  key={run.id}
                  onClick={() => router.push(`/dashboard/marketing/${run.agentType}?runId=${run.id}`)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={run.status === "completed" ? "default" : run.status === "failed" ? "destructive" : "secondary"} className="text-xs">
                      {run.status}
                    </Badge>
                    <div>
                      <div className="text-sm font-medium">{agentMeta?.name || run.agentType}</div>
                      <div className="text-xs text-muted-foreground">{run.summary?.slice(0, 80)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {scores?.overall != null && (
                      <Badge variant="outline" className="text-xs">
                        {scores.overall}/100
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(run.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
