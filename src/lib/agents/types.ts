// ─── Marketing Agent Types ─────────────────────────────────────

export type AgentType =
  | "marketing-audit"
  | "quick-audit"
  | "copywriting"
  | "email-sequences"
  | "social-calendar"
  | "ad-creatives"
  | "funnel-analysis"
  | "competitor-intel"
  | "landing-cro"
  | "product-launch"
  | "brand-voice"
  | "seo-audit"
  | "marketing-report";

export type AgentStatus = "pending" | "running" | "completed" | "failed";

export type SubAgentType =
  | "content-analysis"
  | "conversion-optimization"
  | "competitive-intelligence"
  | "technical-seo"
  | "strategy-growth";

// ─── Score Types ───────────────────────────────────────────────

export interface ScoreDimension {
  name: string;
  score: number;
  maxScore: number;
  finding: string;
}

export interface AgentScores {
  overall: number;
  grade: string; // A, B, C, D, F
  dimensions: ScoreDimension[];
}

// ─── Agent Input/Output ────────────────────────────────────────

export interface AgentInput {
  url?: string;
  topic?: string;
  keyword?: string;
  niche?: string;
  language?: string;
  businessType?: string;
  additionalContext?: string;
  // For email sequences
  emailType?: string;
  // For social calendar
  platforms?: string[];
  // For ad creatives
  adPlatforms?: string[];
  budget?: string;
  // For product launch
  productName?: string;
  launchDate?: string;
  // For brand voice
  brandName?: string;
  // For competitor analysis
  competitorUrls?: string[];
}

export interface SubAgentResult {
  agentType: SubAgentType;
  status: AgentStatus;
  scores: AgentScores;
  analysis: string; // Markdown content
  quickWins: string[];
  strategicRecs: string[];
  error?: string;
}

export interface AgentResult {
  agentType: AgentType;
  status: AgentStatus;
  scores?: AgentScores;
  report: string; // Full markdown report
  summary: string; // Executive summary
  quickWins?: string[];
  strategicRecs?: string[];
  longTermInitiatives?: string[];
  subAgentResults?: SubAgentResult[];
  metadata?: {
    businessType?: string;
    url?: string;
    pagesAnalyzed?: number;
    processingTimeMs?: number;
    model?: string;
  };
}

// ─── Plan Limits for Agents ────────────────────────────────────

export interface AgentPlanLimits {
  agentRunsPerMonth: number;
  availableAgents: AgentType[];
}

export const AGENT_PLAN_LIMITS: Record<string, AgentPlanLimits> = {
  free: {
    agentRunsPerMonth: 3,
    availableAgents: [
      "quick-audit",
      "seo-audit",
    ],
  },
  starter: {
    agentRunsPerMonth: 15,
    availableAgents: [
      "quick-audit",
      "seo-audit",
      "copywriting",
      "email-sequences",
      "social-calendar",
      "brand-voice",
    ],
  },
  pro: {
    agentRunsPerMonth: 50,
    availableAgents: [
      "marketing-audit",
      "quick-audit",
      "copywriting",
      "email-sequences",
      "social-calendar",
      "ad-creatives",
      "funnel-analysis",
      "competitor-intel",
      "landing-cro",
      "product-launch",
      "brand-voice",
      "seo-audit",
      "marketing-report",
    ],
  },
  enterprise: {
    agentRunsPerMonth: 500,
    availableAgents: [
      "marketing-audit",
      "quick-audit",
      "copywriting",
      "email-sequences",
      "social-calendar",
      "ad-creatives",
      "funnel-analysis",
      "competitor-intel",
      "landing-cro",
      "product-launch",
      "brand-voice",
      "seo-audit",
      "marketing-report",
    ],
  },
};

// ─── Agent Metadata (for UI) ───────────────────────────────────

export interface AgentMeta {
  type: AgentType;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  category: "audit" | "content" | "acquisition" | "strategy";
  minPlan: "free" | "starter" | "pro" | "enterprise";
  inputType: "url" | "topic" | "url+topic" | "custom";
  estimatedTime: string; // e.g. "2-3 min"
}

export const AGENT_CATALOG: AgentMeta[] = [
  // ── Audit Agents ──
  {
    type: "marketing-audit",
    name: "Marketing Audit",
    description: "Comprehensive 5-agent parallel audit: content, conversion, competitors, technical SEO, and strategy.",
    icon: "ClipboardCheck",
    category: "audit",
    minPlan: "pro",
    inputType: "url",
    estimatedTime: "3-5 min",
  },
  {
    type: "quick-audit",
    name: "Quick Audit",
    description: "60-second marketing snapshot of any website — scores, quick wins, and top priorities.",
    icon: "Zap",
    category: "audit",
    minPlan: "free",
    inputType: "url",
    estimatedTime: "1 min",
  },
  {
    type: "seo-audit",
    name: "SEO Content Audit",
    description: "Deep on-page SEO analysis: keywords, E-E-A-T, schema, internal links, and content gaps.",
    icon: "Search",
    category: "audit",
    minPlan: "free",
    inputType: "url",
    estimatedTime: "2-3 min",
  },
  {
    type: "landing-cro",
    name: "Landing Page CRO",
    description: "Conversion rate optimization audit with 7-point CRO framework, A/B test ideas, and heatmap analysis.",
    icon: "MousePointerClick",
    category: "audit",
    minPlan: "pro",
    inputType: "url",
    estimatedTime: "2-3 min",
  },

  // ── Content Agents ──
  {
    type: "copywriting",
    name: "Copywriting Optimizer",
    description: "Analyze and rewrite page copy for maximum persuasion — headlines, CTAs, value props, before/after examples.",
    icon: "PenLine",
    category: "content",
    minPlan: "starter",
    inputType: "url",
    estimatedTime: "2-3 min",
  },
  {
    type: "email-sequences",
    name: "Email Sequence Generator",
    description: "Generate complete email sequences: welcome, cart abandonment, nurture, re-engagement, and launch.",
    icon: "Mail",
    category: "content",
    minPlan: "starter",
    inputType: "url+topic",
    estimatedTime: "2-3 min",
  },
  {
    type: "social-calendar",
    name: "Social Media Calendar",
    description: "30-day content calendar across platforms with hooks, hashtags, and content pillars.",
    icon: "CalendarDays",
    category: "content",
    minPlan: "starter",
    inputType: "url+topic",
    estimatedTime: "2-3 min",
  },
  {
    type: "brand-voice",
    name: "Brand Voice Analyzer",
    description: "Analyze your brand's voice dimensions, tone spectrum, vocabulary, and generate brand guidelines.",
    icon: "Fingerprint",
    category: "content",
    minPlan: "starter",
    inputType: "url",
    estimatedTime: "2-3 min",
  },

  // ── Acquisition Agents ──
  {
    type: "ad-creatives",
    name: "Ad Creative Generator",
    description: "Generate ad copy and creatives for Google, Meta, LinkedIn, TikTok — with remarketing sequences and budget recs.",
    icon: "Megaphone",
    category: "acquisition",
    minPlan: "pro",
    inputType: "url",
    estimatedTime: "2-3 min",
  },
  {
    type: "competitor-intel",
    name: "Competitor Intelligence",
    description: "Deep competitive analysis: positioning, pricing, features, SWOT, and differentiation strategy.",
    icon: "Radar",
    category: "acquisition",
    minPlan: "pro",
    inputType: "url",
    estimatedTime: "3-4 min",
  },
  {
    type: "funnel-analysis",
    name: "Funnel Analysis",
    description: "Map and optimize your sales funnel — identify leaks, friction points, and revenue opportunities.",
    icon: "Filter",
    category: "acquisition",
    minPlan: "pro",
    inputType: "url",
    estimatedTime: "2-3 min",
  },

  // ── Strategy Agents ──
  {
    type: "product-launch",
    name: "Product Launch Planner",
    description: "Complete 8-week launch plan with email sequences, social posts, PR outreach, and metrics dashboard.",
    icon: "Rocket",
    category: "strategy",
    minPlan: "pro",
    inputType: "custom",
    estimatedTime: "3-4 min",
  },
  {
    type: "marketing-report",
    name: "Marketing Report",
    description: "Generate a comprehensive marketing report combining all audit dimensions into one executive document.",
    icon: "FileBarChart",
    category: "strategy",
    minPlan: "pro",
    inputType: "url",
    estimatedTime: "4-6 min",
  },
];

export function getAgentMeta(type: AgentType): AgentMeta | undefined {
  return AGENT_CATALOG.find(a => a.type === type);
}

export function getAvailableAgents(planName: string): AgentMeta[] {
  const limits = AGENT_PLAN_LIMITS[planName] || AGENT_PLAN_LIMITS.free;
  return AGENT_CATALOG.filter(a => limits.availableAgents.includes(a.type));
}

export function canRunAgent(planName: string, agentType: AgentType): boolean {
  const limits = AGENT_PLAN_LIMITS[planName] || AGENT_PLAN_LIMITS.free;
  return limits.availableAgents.includes(agentType);
}

export function computeGrade(score: number): string {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}
