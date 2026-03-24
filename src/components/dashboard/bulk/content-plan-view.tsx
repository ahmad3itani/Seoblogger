"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Sparkles, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArticleIdeaCard } from "./article-idea-card";
import type { ContentPlan, ContentPlanSummary, ArticleIdea } from "@/types/autopilot";

interface ContentPlanViewProps {
  summary: ContentPlanSummary;
  contentPlan: ContentPlan;
  onGenerateSelected: (keywords: string[]) => void;
}

export function ContentPlanView({ summary, contentPlan, onGenerateSelected }: ContentPlanViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["high"]) // High priority expanded by default
  );

  // Combine all ideas for easy access
  const allIdeas: ArticleIdea[] = [
    ...contentPlan.highPriority,
    ...contentPlan.mediumPriority,
    ...contentPlan.lowPriority,
  ];

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAllPriority = (priority: "high" | "medium" | "low") => {
    const ideas =
      priority === "high"
        ? contentPlan.highPriority
        : priority === "medium"
        ? contentPlan.mediumPriority
        : contentPlan.lowPriority;

    const newSelected = new Set(selectedIds);
    const allSelected = ideas.every((i) => selectedIds.has(i.id));

    if (allSelected) {
      // Deselect all in this priority
      ideas.forEach((i) => newSelected.delete(i.id));
    } else {
      // Select all in this priority
      ideas.forEach((i) => newSelected.add(i.id));
    }
    setSelectedIds(newSelected);
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleGenerateSelected = () => {
    const selectedIdeas = allIdeas.filter((i) => selectedIds.has(i.id));
    const keywords = selectedIdeas.map((i) => i.keyword);
    onGenerateSelected(keywords);
  };

  const totalIdeas = allIdeas.length;
  const selectedCount = selectedIds.size;

  const prioritySections = [
    {
      key: "high",
      label: "High Priority",
      icon: Zap,
      color: "#EF4444",
      bgColor: "rgba(239, 68, 68, 0.12)",
      borderColor: "rgba(239, 68, 68, 0.25)",
      ideas: contentPlan.highPriority,
    },
    {
      key: "medium",
      label: "Medium Priority",
      icon: Target,
      color: "#EAB308",
      bgColor: "rgba(234, 179, 8, 0.12)",
      borderColor: "rgba(234, 179, 8, 0.25)",
      ideas: contentPlan.mediumPriority,
    },
    {
      key: "low",
      label: "Low Priority",
      icon: Sparkles,
      color: "#22C55E",
      bgColor: "rgba(34, 197, 94, 0.12)",
      borderColor: "rgba(34, 197, 94, 0.25)",
      ideas: contentPlan.lowPriority,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div
        className="rounded-xl p-6 relative overflow-hidden"
        style={{ 
          background: "linear-gradient(135deg, rgba(108, 76, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)",
          border: "1px solid rgba(108, 76, 241, 0.25)",
          boxShadow: "0 4px 20px rgba(108, 76, 241, 0.1)"
        }}
      >
        {/* Decorative gradient orb */}
        <div 
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(108, 76, 241, 0.4) 0%, transparent 70%)" }}
        />
        
        <div className="flex items-start justify-between relative z-10">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
              <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                Content Analysis Summary
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div className="space-y-1">
                <div className="text-2xl font-bold" style={{ color: "var(--brand-primary)" }}>
                  {summary.totalArticlesAnalyzed}
                </div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Posts Analyzed
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold" style={{ color: "var(--brand-primary)" }}>
                  {totalIdeas}
                </div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Ideas Generated
                </div>
              </div>
            </div>

            {summary.mainTopics.length > 0 && (
              <div className="mb-4">
                <span className="text-[10px] uppercase tracking-wider block mb-2 font-semibold" style={{ color: "var(--text-muted)" }}>
                  Main Topics
                </span>
                <div className="flex flex-wrap gap-2">
                  {summary.mainTopics.slice(0, 5).map((topic, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-3 py-1 rounded-full font-medium transition-all hover:scale-105"
                      style={{ 
                        background: "rgba(255, 255, 255, 0.08)", 
                        color: "var(--text-secondary)",
                        border: "1px solid rgba(255, 255, 255, 0.1)"
                      }}
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {summary.weakAreas.length > 0 && (
              <div>
                <span className="text-[10px] uppercase tracking-wider block mb-2 font-semibold" style={{ color: "var(--text-muted)" }}>
                  🎯 Content Gaps Identified
                </span>
                <div className="flex flex-wrap gap-2">
                  {summary.weakAreas.slice(0, 4).map((area, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-3 py-1 rounded-full font-medium transition-all hover:scale-105"
                      style={{ 
                        background: "rgba(239, 68, 68, 0.15)", 
                        color: "#EF4444",
                        border: "1px solid rgba(239, 68, 68, 0.3)"
                      }}
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Selection summary & action button */}
          <div className="text-right relative z-10">
            <div 
              className="text-xs mb-3 font-semibold px-3 py-1 rounded-full inline-block"
              style={{ 
                background: "rgba(108, 76, 241, 0.15)",
                color: "var(--brand-primary)",
                border: "1px solid rgba(108, 76, 241, 0.3)"
              }}
            >
              {selectedCount} of {totalIdeas} selected
            </div>
            <Button
              className="btn-primary h-10 text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
              onClick={handleGenerateSelected}
              disabled={selectedCount === 0}
              style={{
                boxShadow: selectedCount > 0 ? "0 4px 15px rgba(108, 76, 241, 0.3)" : "none"
              }}
            >
              <Check className="w-4 h-4 mr-2" />
              Generate {selectedCount} Article{selectedCount !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      </div>

      {/* Priority Sections */}
      <div className="space-y-4">
        {prioritySections.map((section) => {
          const isExpanded = expandedSections.has(section.key);
          const sectionSelectedCount = section.ideas.filter((i) => selectedIds.has(i.id)).length;
          const allSectionSelected = section.ideas.length > 0 && section.ideas.every((i) => selectedIds.has(i.id));

          return (
            <div
              key={section.key}
              className="rounded-xl overflow-hidden"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
            >
              {/* Section header */}
              <button
                className="w-full flex items-center justify-between px-4 py-3 transition-all hover:bg-white/5"
                onClick={() => toggleSection(section.key)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: section.bgColor, border: `1px solid ${section.borderColor}` }}
                  >
                    <section.icon className="w-4 h-4" style={{ color: section.color }} />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {section.label}
                    </span>
                    <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                      ({section.ideas.length} ideas)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {section.ideas.length > 0 && (
                    <button
                      className="text-[10px] font-medium px-2 py-1 rounded transition-all"
                      style={{
                        background: allSectionSelected ? "rgba(108, 76, 241, 0.15)" : "rgba(255, 255, 255, 0.05)",
                        color: allSectionSelected ? "var(--brand-primary)" : "var(--text-muted)",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectAllPriority(section.key as "high" | "medium" | "low");
                      }}
                    >
                      {allSectionSelected ? "Deselect All" : "Select All"}
                    </button>
                  )}
                  {sectionSelectedCount > 0 && (
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(108, 76, 241, 0.15)", color: "var(--brand-primary)" }}
                    >
                      {sectionSelectedCount} selected
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  ) : (
                    <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  )}
                </div>
              </button>

              {/* Section content */}
              {isExpanded && section.ideas.length > 0 && (
                <div className="px-4 pb-4 space-y-2">
                  {section.ideas.map((idea) => (
                    <ArticleIdeaCard
                      key={idea.id}
                      idea={idea}
                      selected={selectedIds.has(idea.id)}
                      onSelect={() => toggleSelect(idea.id)}
                    />
                  ))}
                </div>
              )}

              {isExpanded && section.ideas.length === 0 && (
                <div className="px-4 pb-4">
                  <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>
                    No {section.label.toLowerCase()} ideas found
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
