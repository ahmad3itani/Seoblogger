// Feature gating based on subscription plans
// Maps dashboard routes to required plan features

export interface FeatureGate {
  route: string;
  requiredFeature: string | null; // null = available to all plans
  label: string;
  minPlan: "free" | "starter" | "pro" | "enterprise";
}

export const FEATURE_GATES: FeatureGate[] = [
  { route: "/dashboard", requiredFeature: null, label: "Dashboard", minPlan: "free" },
  { route: "/dashboard/new", requiredFeature: null, label: "New Article", minPlan: "free" },
  { route: "/dashboard/keywords", requiredFeature: null, label: "Keyword Research", minPlan: "free" },
  { route: "/dashboard/articles", requiredFeature: null, label: "My Articles", minPlan: "free" },
  { route: "/dashboard/brand-voice", requiredFeature: null, label: "Brand Voices", minPlan: "free" },
  { route: "/dashboard/amazon", requiredFeature: null, label: "Amazon Affiliate", minPlan: "free" },
  { route: "/dashboard/settings", requiredFeature: null, label: "Settings", minPlan: "free" },
  { route: "/dashboard/profile", requiredFeature: null, label: "Profile", minPlan: "free" },
  { route: "/dashboard/analytics", requiredFeature: "hasAnalytics", label: "Analytics", minPlan: "pro" },
  { route: "/dashboard/bulk", requiredFeature: "hasBulkGeneration", label: "Bulk Generator", minPlan: "starter" },
  { route: "/dashboard/ideas", requiredFeature: "hasTrendIdeas", label: "Trend Ideas", minPlan: "starter" },
  { route: "/dashboard/clustering", requiredFeature: "hasAutoClustering", label: "Auto Clustering", minPlan: "pro" },
  { route: "/dashboard/campaigns", requiredFeature: "hasScheduling", label: "Campaigns", minPlan: "starter" },
  { route: "/dashboard/calendar", requiredFeature: "hasScheduling", label: "Calendar", minPlan: "starter" },
  { route: "/dashboard/refresh", requiredFeature: "hasContentRefresh", label: "Content Refresh", minPlan: "pro" },
  { route: "/dashboard/quality-pass", requiredFeature: "hasQualityPass", label: "Human Quality Pass", minPlan: "pro" },
  // Marketing Agents
  { route: "/dashboard/marketing", requiredFeature: null, label: "Marketing Hub", minPlan: "free" },
  { route: "/dashboard/marketing/quick-audit", requiredFeature: null, label: "Quick Audit", minPlan: "free" },
  { route: "/dashboard/marketing/seo-audit", requiredFeature: null, label: "SEO Audit", minPlan: "free" },
  { route: "/dashboard/marketing/copywriting", requiredFeature: "hasMarketingAgents", label: "Copywriting", minPlan: "starter" },
  { route: "/dashboard/marketing/email-sequences", requiredFeature: "hasMarketingAgents", label: "Email Sequences", minPlan: "starter" },
  { route: "/dashboard/marketing/social-calendar", requiredFeature: "hasMarketingAgents", label: "Social Calendar", minPlan: "starter" },
  { route: "/dashboard/marketing/brand-voice", requiredFeature: "hasMarketingAgents", label: "Brand Analyzer", minPlan: "starter" },
  { route: "/dashboard/marketing/marketing-audit", requiredFeature: "hasAdvancedAgents", label: "Marketing Audit", minPlan: "pro" },
  { route: "/dashboard/marketing/ad-creatives", requiredFeature: "hasAdvancedAgents", label: "Ad Creatives", minPlan: "pro" },
  { route: "/dashboard/marketing/funnel-analysis", requiredFeature: "hasAdvancedAgents", label: "Funnel Analysis", minPlan: "pro" },
  { route: "/dashboard/marketing/competitor-intel", requiredFeature: "hasAdvancedAgents", label: "Competitor Intel", minPlan: "pro" },
  { route: "/dashboard/marketing/landing-cro", requiredFeature: "hasAdvancedAgents", label: "Landing CRO", minPlan: "pro" },
  { route: "/dashboard/marketing/product-launch", requiredFeature: "hasAdvancedAgents", label: "Product Launch", minPlan: "pro" },
  { route: "/dashboard/marketing/marketing-report", requiredFeature: "hasAdvancedAgents", label: "Marketing Report", minPlan: "pro" },
];

export function getFeatureGate(pathname: string): FeatureGate | undefined {
  // Find the most specific (longest) matching route to avoid parent routes overriding child gates
  let bestMatch: FeatureGate | undefined;
  for (const gate of FEATURE_GATES) {
    if (pathname === gate.route || pathname.startsWith(gate.route + "/")) {
      if (!bestMatch || gate.route.length > bestMatch.route.length) {
        bestMatch = gate;
      }
    }
  }
  return bestMatch;
}

export function isFeatureAvailable(planName: string | undefined, feature: string | null): boolean {
  if (!feature) return true; // No feature requirement = available to all

  const planFeatures: Record<string, string[]> = {
    free: [],
    starter: [
      "hasAutoPublish",
      "hasScheduling",
      "hasBulkGeneration",
      "hasTrendIdeas",
      "hasMarketingAgents",
    ],
    pro: [
      "hasAutoPublish",
      "hasScheduling",
      "hasAnalytics",
      "hasBulkGeneration",
      "hasTrendIdeas",
      "hasAutoClustering",
      "hasContentRefresh",
      "hasQualityPass",
      "hasPrioritySupport",
      "hasAdvancedAI",
      "hasCompetitorAnalysis",
      "hasCustomPrompts",
      "hasMarketingAgents",
      "hasAdvancedAgents",
    ],
    enterprise: [
      "hasAutoPublish",
      "hasScheduling",
      "hasAnalytics",
      "hasBulkGeneration",
      "hasTrendIdeas",
      "hasAutoClustering",
      "hasContentRefresh",
      "hasQualityPass",
      "hasApiAccess",
      "hasPrioritySupport",
      "hasWhiteLabel",
      "hasTeamAccess",
      "hasAdvancedAI",
      "hasCompetitorAnalysis",
      "hasCustomPrompts",
      "hasMarketingAgents",
      "hasAdvancedAgents",
    ],
  };

  const features = planFeatures[planName || "free"] || [];
  return features.includes(feature);
}

export function getPlanLimits(planName: string | undefined) {
  const limits: Record<string, { articles: number; images: number; blogs: number; projects: number; brandProfiles: number; campaigns: number }> = {
    free: { articles: 10, images: 30, blogs: 1, projects: 1, brandProfiles: 1, campaigns: 0 },
    starter: { articles: 30, images: 10, blogs: 2, projects: 3, brandProfiles: 2, campaigns: 1 },
    pro: { articles: 100, images: 300, blogs: 5, projects: 10, brandProfiles: 5, campaigns: 3 },
    enterprise: { articles: 1000, images: 3000, blogs: 50, projects: 100, brandProfiles: 50, campaigns: 50 },
  };
  return limits[planName || "free"] || limits.free;
}
