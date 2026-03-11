-- Update Plan limits based on pricing analysis
-- Free: 5 articles, 0 images, 10 keywords
-- Starter: 30 articles, 10 images, 50 keywords
-- Pro: 100 articles, 50 images, 200 keywords
-- Enterprise: 300 articles, 200 images, unlimited keywords

-- Update Free Plan
UPDATE "Plan" SET
  "displayName" = 'Free',
  "description" = 'Perfect for testing and getting started',
  "price" = 0,
  "yearlyPrice" = 0,
  "articlesPerMonth" = 5,
  "imagesPerMonth" = 0,
  "blogsLimit" = 1,
  "projectsLimit" = 1,
  "brandProfilesLimit" = 1,
  "campaignsLimit" = 0,
  "wordsPerArticle" = 2000,
  "hasAutoPublish" = false,
  "hasScheduling" = false,
  "hasAnalytics" = false,
  "hasBulkGeneration" = false,
  "hasTrendIdeas" = false,
  "hasAutoClustering" = false,
  "hasContentRefresh" = false,
  "hasApiAccess" = false,
  "hasPrioritySupport" = false,
  "hasWhiteLabel" = false,
  "hasTeamAccess" = false,
  "teamMembersLimit" = 1,
  "hasAdvancedAI" = false,
  "hasCompetitorAnalysis" = false,
  "hasCustomPrompts" = false,
  "sortOrder" = 0
WHERE "name" = 'free';

-- Insert or Update Starter Plan
INSERT INTO "Plan" (
  "id", "name", "displayName", "description", "price", "yearlyPrice",
  "articlesPerMonth", "imagesPerMonth", "blogsLimit", "projectsLimit",
  "brandProfilesLimit", "campaignsLimit", "wordsPerArticle",
  "hasAutoPublish", "hasScheduling", "hasAnalytics", "hasBulkGeneration",
  "hasTrendIdeas", "hasAutoClustering", "hasContentRefresh", "hasApiAccess",
  "hasPrioritySupport", "hasWhiteLabel", "hasTeamAccess", "teamMembersLimit",
  "hasAdvancedAI", "hasCompetitorAnalysis", "hasCustomPrompts",
  "isActive", "sortOrder", "createdAt", "updatedAt"
) VALUES (
  'starter_plan_id', 'starter', 'Starter', 
  'Perfect for budget-conscious bloggers', 12, 120,
  30, 10, 2, 2, 2, 1, 2000,
  true, true, false, true,
  true, false, false, false,
  false, false, false, 1,
  false, false, false,
  true, 1, NOW(), NOW()
)
ON CONFLICT ("name") DO UPDATE SET
  "displayName" = 'Starter',
  "description" = 'Perfect for budget-conscious bloggers',
  "price" = 12,
  "yearlyPrice" = 120,
  "articlesPerMonth" = 30,
  "imagesPerMonth" = 10,
  "blogsLimit" = 2,
  "projectsLimit" = 2,
  "brandProfilesLimit" = 2,
  "campaignsLimit" = 1,
  "wordsPerArticle" = 2000,
  "hasAutoPublish" = true,
  "hasScheduling" = true,
  "hasAnalytics" = false,
  "hasBulkGeneration" = true,
  "hasTrendIdeas" = true,
  "hasAutoClustering" = false,
  "hasContentRefresh" = false,
  "hasApiAccess" = false,
  "hasPrioritySupport" = false,
  "hasWhiteLabel" = false,
  "hasTeamAccess" = false,
  "teamMembersLimit" = 1,
  "hasAdvancedAI" = false,
  "hasCompetitorAnalysis" = false,
  "hasCustomPrompts" = false,
  "sortOrder" = 1,
  "updatedAt" = NOW();

-- Update Pro Plan
UPDATE "Plan" SET
  "displayName" = 'Pro',
  "description" = 'Best value for full-time content creators',
  "price" = 39,
  "yearlyPrice" = 390,
  "articlesPerMonth" = 100,
  "imagesPerMonth" = 50,
  "blogsLimit" = 5,
  "projectsLimit" = 5,
  "brandProfilesLimit" = 5,
  "campaignsLimit" = 5,
  "wordsPerArticle" = 3000,
  "hasAutoPublish" = true,
  "hasScheduling" = true,
  "hasAnalytics" = true,
  "hasBulkGeneration" = true,
  "hasTrendIdeas" = true,
  "hasAutoClustering" = true,
  "hasContentRefresh" = true,
  "hasApiAccess" = false,
  "hasPrioritySupport" = true,
  "hasWhiteLabel" = false,
  "hasTeamAccess" = false,
  "teamMembersLimit" = 1,
  "hasAdvancedAI" = true,
  "hasCompetitorAnalysis" = true,
  "hasCustomPrompts" = true,
  "sortOrder" = 2
WHERE "name" = 'pro';

-- Update Enterprise Plan
UPDATE "Plan" SET
  "displayName" = 'Enterprise',
  "description" = 'For agencies and teams with high volume needs',
  "price" = 99,
  "yearlyPrice" = 990,
  "articlesPerMonth" = 300,
  "imagesPerMonth" = 200,
  "blogsLimit" = 999,
  "projectsLimit" = 999,
  "brandProfilesLimit" = 999,
  "campaignsLimit" = 999,
  "wordsPerArticle" = 5000,
  "hasAutoPublish" = true,
  "hasScheduling" = true,
  "hasAnalytics" = true,
  "hasBulkGeneration" = true,
  "hasTrendIdeas" = true,
  "hasAutoClustering" = true,
  "hasContentRefresh" = true,
  "hasApiAccess" = true,
  "hasPrioritySupport" = true,
  "hasWhiteLabel" = true,
  "hasTeamAccess" = true,
  "teamMembersLimit" = 3,
  "hasAdvancedAI" = true,
  "hasCompetitorAnalysis" = true,
  "hasCustomPrompts" = true,
  "sortOrder" = 3
WHERE "name" = 'enterprise';
