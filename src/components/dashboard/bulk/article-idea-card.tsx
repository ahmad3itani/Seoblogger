"use client";

import { Check, ExternalLink, Link2, Target, TrendingUp } from "lucide-react";
import type { ArticleIdea } from "@/types/autopilot";

interface ArticleIdeaCardProps {
  idea: ArticleIdea;
  selected: boolean;
  onSelect: () => void;
}

export function ArticleIdeaCard({ idea, selected, onSelect }: ArticleIdeaCardProps) {
  const intentColors = {
    informational: { bg: "rgba(59, 130, 246, 0.12)", border: "rgba(59, 130, 246, 0.25)", text: "#3B82F6" },
    commercial: { bg: "rgba(34, 197, 94, 0.12)", border: "rgba(34, 197, 94, 0.25)", text: "#22C55E" },
    transactional: { bg: "rgba(249, 115, 22, 0.12)", border: "rgba(249, 115, 22, 0.25)", text: "#F97316" },
    navigational: { bg: "rgba(168, 85, 247, 0.12)", border: "rgba(168, 85, 247, 0.25)", text: "#A855F7" },
  };

  const difficultyColors = {
    easy: { bg: "rgba(34, 197, 94, 0.12)", text: "#22C55E" },
    medium: { bg: "rgba(234, 179, 8, 0.12)", text: "#EAB308" },
    hard: { bg: "rgba(239, 68, 68, 0.12)", text: "#EF4444" },
  };

  const intent = intentColors[idea.intent] || intentColors.informational;
  const difficulty = difficultyColors[idea.estimatedDifficulty] || difficultyColors.medium;

  return (
    <div
      className="rounded-xl p-4 transition-all duration-300 cursor-pointer group hover:scale-[1.01] hover:shadow-lg"
      style={{
        background: selected 
          ? "linear-gradient(135deg, rgba(108, 76, 241, 0.12) 0%, rgba(108, 76, 241, 0.06) 100%)"
          : "rgba(255, 255, 255, 0.02)",
        border: selected ? "1px solid rgba(108, 76, 241, 0.40)" : "1px solid var(--border-subtle)",
        boxShadow: selected ? "0 0 20px rgba(108, 76, 241, 0.15)" : "none",
      }}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        {/* Selection checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:scale-110"
          style={
            selected
              ? { background: "var(--brand-primary)", boxShadow: "0 0 10px rgba(108, 76, 241, 0.5)" }
              : { background: "transparent", border: "2px solid rgba(255, 255, 255, 0.15)" }
          }
        >
          {selected && <Check className="w-3 h-3 text-white animate-in fade-in duration-200" />}
        </button>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4
            className="text-sm font-semibold mb-1 group-hover:text-purple-400 transition-colors duration-200 leading-snug"
            style={{ color: "var(--text-primary)" }}
          >
            {idea.title}
          </h4>

          {/* Keyword */}
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1 rounded" style={{ background: "rgba(108, 76, 241, 0.1)" }}>
              <Target className="w-3 h-3" style={{ color: "var(--brand-primary)" }} />
            </div>
            <span className="text-xs font-semibold" style={{ color: "var(--brand-primary)" }}>
              {idea.keyword}
            </span>
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {/* Intent badge */}
            <span
              className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full"
              style={{ background: intent.bg, border: `1px solid ${intent.border}`, color: intent.text }}
            >
              {idea.intent}
            </span>

            {/* Difficulty badge */}
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: difficulty.bg, color: difficulty.text }}
            >
              {idea.estimatedDifficulty}
            </span>

            {/* Category */}
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255, 255, 255, 0.05)", color: "var(--text-muted)" }}
            >
              {idea.category}
            </span>
          </div>

          {/* Reason */}
          <p className="text-[11px] mb-3" style={{ color: "var(--text-secondary)" }}>
            <TrendingUp className="w-3 h-3 inline mr-1" style={{ color: "var(--text-muted)" }} />
            {idea.reason}
          </p>

          {/* Secondary keywords */}
          {idea.secondaryKeywords.length > 0 && (
            <div className="mb-3">
              <span className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>
                Related Keywords
              </span>
              <div className="flex flex-wrap gap-1">
                {idea.secondaryKeywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(255, 255, 255, 0.04)", color: "var(--text-secondary)" }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Internal links */}
          {idea.internalLinks.length > 0 && (
            <div>
              <span className="text-[10px] uppercase tracking-wider mb-1.5 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                <Link2 className="w-3 h-3" />
                Internal Link Opportunities
              </span>
              <div className="space-y-1">
                {idea.internalLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[11px] px-2 py-1.5 rounded-lg transition-all hover:bg-white/5"
                    style={{ color: "var(--text-secondary)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                    <span className="truncate">{link.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}>
                      {link.anchorText}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {idea.internalLinks.length === 0 && (
            <p className="text-[10px] italic" style={{ color: "var(--text-muted)" }}>
              No relevant internal links found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
