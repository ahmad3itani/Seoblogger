// Feature gating based on subscription plans
// Maps dashboard routes to required plan features

export interface FeatureGate {
  route: string;
  requiredFeature: string | null; // null = available to all plans
  label: string;
  minPlan: "free" | "pro" | "enterprise";
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
  { route: "/dashboard/bulk", requiredFeature: "hasBulkGeneration", label: "Bulk Generator", minPlan: "pro" },
  { route: "/dashboard/ideas", requiredFeature: "hasTrendIdeas", label: "Trend Ideas", minPlan: "pro" },
  { route: "/dashboard/clustering", requiredFeature: "hasAutoClustering", label: "Auto Clustering", minPlan: "pro" },
  { route: "/dashboard/campaigns", requiredFeature: "hasScheduling", label: "Campaigns", minPlan: "pro" },
  { route: "/dashboard/calendar", requiredFeature: "hasScheduling", label: "Calendar", minPlan: "pro" },
  { route: "/dashboard/refresh", requiredFeature: "hasContentRefresh", label: "Content Refresh", minPlan: "pro" },
];

export function getFeatureGate(pathname: string): FeatureGate | undefined {
  return FEATURE_GATES.find(
    (gate) => pathname === gate.route || pathname.startsWith(gate.route + "/")
  );
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
    ],
    pro: [
      "hasAutoPublish",
      "hasScheduling",
      "hasAnalytics",
      "hasBulkGeneration",
      "hasTrendIdeas",
      "hasAutoClustering",
      "hasContentRefresh",
      "hasPrioritySupport",
      "hasAdvancedAI",
      "hasCompetitorAnalysis",
      "hasCustomPrompts",
    ],
    enterprise: [
      "hasAutoPublish",
      "hasScheduling",
      "hasAnalytics",
      "hasBulkGeneration",
      "hasTrendIdeas",
      "hasAutoClustering",
      "hasContentRefresh",
      "hasApiAccess",
      "hasPrioritySupport",
      "hasWhiteLabel",
      "hasTeamAccess",
      "hasAdvancedAI",
      "hasCompetitorAnalysis",
      "hasCustomPrompts",
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
