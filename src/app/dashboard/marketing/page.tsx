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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(108,76,241,0.12)", border: "1px solid rgba(108,76,241,0.25)" }}>
            <Bot className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>Marketing Agents</h1>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>13 specialized AI agents at your service</p>
          </div>
        </div>
        <div className="rounded-xl px-4 py-2 text-right" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
          <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Usage this month</div>
          <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {usedThisMonth} <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>/ {planLimits.agentRunsPerMonth}</span>
          </div>
        </div>
      </div>

      {/* Agent Categories */}
      {categories.map(category => {
        const agents = AGENT_CATALOG.filter(a => a.category === category);
        const categoryInfo = CATEGORY_LABELS[category];

        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${categoryInfo.color.includes("blue") ? "rgba(0,194,255,0.08)" : categoryInfo.color.includes("emerald") ? "rgba(34,197,94,0.08)" : categoryInfo.color.includes("purple") ? "rgba(108,76,241,0.08)" : "rgba(245,158,11,0.08)"}`, color: categoryInfo.color.includes("blue") ? "#00C2FF" : categoryInfo.color.includes("emerald") ? "#22C55E" : categoryInfo.color.includes("purple") ? "var(--brand-primary)" : "#F59E0B" }}>
                {categoryInfo.label}
              </span>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{agents.length} agents</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {agents.map(agent => {
                const available = isAgentAvailable(agent);
                const IconComponent = ICON_MAP[agent.icon] || Bot;

                return (
                  <button
                    key={agent.type}
                    onClick={() => handleAgentClick(agent)}
                    disabled={!available}
                    className="relative group text-left p-4 rounded-xl transition-all duration-200"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      opacity: available ? 1 : 0.5,
                      cursor: available ? "pointer" : "not-allowed",
                    }}
                    onMouseEnter={e => { if (available) e.currentTarget.style.borderColor = "rgba(108,76,241,0.20)"; }}
                    onMouseLeave={e => { if (available) e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
                  >
                    {!available && (
                      <div className="absolute top-3 right-3">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5" style={{ background: "rgba(245,158,11,0.08)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.20)" }}>
                          <Crown className="h-2.5 w-2.5" /> {agent.minPlan}
                        </span>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: available ? "rgba(108,76,241,0.10)" : "rgba(255,255,255,0.04)" }}>
                        <IconComponent className="h-4 w-4" style={{ color: available ? "var(--brand-primary)" : "var(--text-muted)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                          {agent.name}
                          {!available && <Lock className="h-2.5 w-2.5" style={{ color: "var(--text-muted)" }} />}
                        </div>
                        <p className="text-[10px] mt-0.5 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{agent.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] flex items-center gap-0.5" style={{ color: "var(--text-muted)" }}>
                            <Clock className="h-2.5 w-2.5" /> {agent.estimatedTime}
                          </span>
                          {available && (
                            <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5" style={{ color: "var(--brand-primary)" }}>
                              Run <ArrowRight className="h-2.5 w-2.5" />
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
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Recent Runs</h2>
          <div className="space-y-1.5">
            {recentRuns.map((run: any) => {
              const agentMeta = AGENT_CATALOG.find(a => a.type === run.agentType);
              const scores = run.scores ? (typeof run.scores === "string" ? JSON.parse(run.scores) : run.scores) : null;

              return (
                <button
                  key={run.id}
                  onClick={() => router.push(`/dashboard/marketing/${run.agentType}?runId=${run.id}`)}
                  className="w-full flex items-center justify-between p-3 rounded-xl text-left transition-all"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(108,76,241,0.20)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-subtle)"}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{
                      background: run.status === "completed" ? "rgba(34,197,94,0.08)" : run.status === "failed" ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)",
                      color: run.status === "completed" ? "#22C55E" : run.status === "failed" ? "#ef4444" : "var(--text-muted)",
                    }}>
                      {run.status}
                    </span>
                    <div>
                      <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{agentMeta?.name || run.agentType}</div>
                      <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{run.summary?.slice(0, 80)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {scores?.overall != null && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(108,76,241,0.08)", color: "var(--brand-primary)" }}>
                        {scores.overall}/100
                      </span>
                    )}
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
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
