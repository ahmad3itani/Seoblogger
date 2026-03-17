import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getModelForPlan } from "@/lib/ai/client";
import {
  AgentType,
  AgentInput,
  AgentResult,
  AGENT_CATALOG,
  getAgentMeta,
} from "@/lib/agents/types";
import {
  fetchPageContent,
  fetchSitePages,
  detectBusinessType,
  summarizePage,
  callAgent,
  checkAgentUsage,
  createAgentRun,
  completeAgentRun,
  failAgentRun,
  parseScoresFromMarkdown,
  extractQuickWins,
  extractStrategicRecs,
} from "@/lib/agents/engine";
import {
  QUICK_AUDIT_PROMPT,
  COPYWRITING_PROMPT,
  EMAIL_SEQUENCES_PROMPT,
  SOCIAL_CALENDAR_PROMPT,
  AD_CREATIVES_PROMPT,
  FUNNEL_ANALYSIS_PROMPT,
  COMPETITOR_INTEL_PROMPT,
  LANDING_CRO_PROMPT,
  PRODUCT_LAUNCH_PROMPT,
  BRAND_VOICE_PROMPT,
  SEO_AUDIT_PROMPT,
  MARKETING_REPORT_PROMPT,
  CONTENT_ANALYSIS_PROMPT,
  CONVERSION_OPTIMIZATION_PROMPT,
  COMPETITIVE_INTELLIGENCE_PROMPT,
  TECHNICAL_SEO_PROMPT,
  STRATEGY_GROWTH_PROMPT,
  MARKETING_AUDIT_ORCHESTRATOR_PROMPT,
} from "@/lib/agents/prompts";

export async function POST(req: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { user: authUser } = authResult;

    const body = await req.json();
    const { agentType, input } = body as { agentType: AgentType; input: AgentInput };

    if (!agentType) {
      return NextResponse.json({ error: "Agent type is required" }, { status: 400 });
    }

    const agentMeta = getAgentMeta(agentType);
    if (!agentMeta) {
      return NextResponse.json({ error: "Invalid agent type" }, { status: 400 });
    }

    // Get user plan
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { plan: true },
    });
    const planName = user?.plan?.name || "free";

    // Check usage limits
    const usageCheck = await checkAgentUsage(authUser.id, planName, agentType);
    if (!usageCheck.allowed) {
      return NextResponse.json(
        { error: usageCheck.error, remaining: usageCheck.remaining },
        { status: 403 }
      );
    }

    // Create agent run record
    const agentRun = await createAgentRun(authUser.id, agentType, input);
    const startTime = Date.now();

    try {
      const model = getModelForPlan(planName);
      let result: AgentResult;

      switch (agentType) {
        case "marketing-audit":
          result = await runMarketingAudit(input, model);
          break;
        case "quick-audit":
          result = await runQuickAudit(input, model);
          break;
        case "copywriting":
          result = await runCopywriting(input, model);
          break;
        case "email-sequences":
          result = await runEmailSequences(input, model);
          break;
        case "social-calendar":
          result = await runSocialCalendar(input, model);
          break;
        case "ad-creatives":
          result = await runAdCreatives(input, model);
          break;
        case "funnel-analysis":
          result = await runFunnelAnalysis(input, model);
          break;
        case "competitor-intel":
          result = await runCompetitorIntel(input, model);
          break;
        case "landing-cro":
          result = await runLandingCRO(input, model);
          break;
        case "product-launch":
          result = await runProductLaunch(input, model);
          break;
        case "brand-voice":
          result = await runBrandVoice(input, model);
          break;
        case "seo-audit":
          result = await runSeoAudit(input, model);
          break;
        case "marketing-report":
          result = await runMarketingReport(input, model);
          break;
        default:
          throw new Error(`Unknown agent type: ${agentType}`);
      }

      const durationMs = Date.now() - startTime;
      await completeAgentRun(agentRun.id, result, durationMs);

      return NextResponse.json({
        runId: agentRun.id,
        ...result,
        durationMs,
        remaining: (usageCheck.remaining || 1) - 1,
      });
    } catch (agentError: any) {
      console.error(`Agent ${agentType} failed:`, agentError);
      await failAgentRun(agentRun.id, agentError.message);
      return NextResponse.json(
        { error: `Agent failed: ${agentError.message}`, runId: agentRun.id },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Agent API error:", error);
    return NextResponse.json(
      { error: "Agent execution failed: " + error.message },
      { status: 500 }
    );
  }
}

// ─── Individual Agent Implementations ──────────────────────────

async function runQuickAudit(input: AgentInput, model: string): Promise<AgentResult> {
  if (!input.url) throw new Error("URL is required for Quick Audit");
  const page = await fetchPageContent(input.url);
  if (!page.statusCode) throw new Error("Could not fetch the provided URL");
  const businessType = detectBusinessType(page);
  const pageData = summarizePage(page);

  const report = await callAgent(
    QUICK_AUDIT_PROMPT,
    `Analyze this website:\n\nBusiness Type: ${businessType}\n\n${pageData}`,
    model,
    3000
  );

  const scores = parseScoresFromMarkdown(report);
  return {
    agentType: "quick-audit",
    status: "completed",
    scores,
    report,
    summary: `Quick audit of ${input.url} — Score: ${scores.overall}/100 (${scores.grade})`,
    quickWins: extractQuickWins(report),
    metadata: { businessType, url: input.url, pagesAnalyzed: 1, model },
  };
}

async function runCopywriting(input: AgentInput, model: string): Promise<AgentResult> {
  if (!input.url) throw new Error("URL is required for Copywriting analysis");
  const page = await fetchPageContent(input.url);
  if (!page.statusCode) throw new Error("Could not fetch the provided URL");
  const businessType = detectBusinessType(page);
  const pageData = summarizePage(page);

  const report = await callAgent(
    COPYWRITING_PROMPT,
    `Analyze and optimize the copy on this website:\n\nBusiness Type: ${businessType}\n\n${pageData}\n\nFull body text:\n${page.bodyText.slice(0, 8000)}`,
    model,
    5000
  );

  const scores = parseScoresFromMarkdown(report);
  return {
    agentType: "copywriting",
    status: "completed",
    scores,
    report,
    summary: `Copywriting analysis of ${input.url} — Score: ${scores.overall}/100`,
    quickWins: extractQuickWins(report),
    metadata: { businessType, url: input.url, pagesAnalyzed: 1, model },
  };
}

async function runEmailSequences(input: AgentInput, model: string): Promise<AgentResult> {
  let context = "";
  let businessType = "Business";

  if (input.url) {
    const page = await fetchPageContent(input.url);
    businessType = detectBusinessType(page);
    context = `Website: ${input.url}\nBusiness Type: ${businessType}\n\n${summarizePage(page)}`;
  }

  const topic = input.topic || input.keyword || "general business";
  const emailType = input.emailType || "welcome";

  const report = await callAgent(
    EMAIL_SEQUENCES_PROMPT,
    `Generate a ${emailType} email sequence for:\n\nTopic/Business: ${topic}\n${context}\n\nEmail Sequence Type: ${emailType}\nLanguage: ${input.language || "English"}`,
    model,
    6000
  );

  return {
    agentType: "email-sequences",
    status: "completed",
    report,
    summary: `${emailType} email sequence generated for ${topic}`,
    metadata: { businessType, url: input.url, model },
  };
}

async function runSocialCalendar(input: AgentInput, model: string): Promise<AgentResult> {
  let context = "";
  let businessType = "Business";

  if (input.url) {
    const page = await fetchPageContent(input.url);
    businessType = detectBusinessType(page);
    context = `Website: ${input.url}\nBusiness Type: ${businessType}\n\n${summarizePage(page)}`;
  }

  const topic = input.topic || input.keyword || "business content";
  const platforms = input.platforms?.join(", ") || "Instagram, LinkedIn, X/Twitter";

  const report = await callAgent(
    SOCIAL_CALENDAR_PROMPT,
    `Create a 30-day social media content calendar:\n\nTopic/Business: ${topic}\nPlatforms: ${platforms}\n${context}\nLanguage: ${input.language || "English"}`,
    model,
    6000
  );

  return {
    agentType: "social-calendar",
    status: "completed",
    report,
    summary: `30-day social media calendar for ${topic} on ${platforms}`,
    metadata: { businessType, url: input.url, model },
  };
}

async function runAdCreatives(input: AgentInput, model: string): Promise<AgentResult> {
  if (!input.url) throw new Error("URL is required for Ad Creative generation");
  const page = await fetchPageContent(input.url);
  if (!page.statusCode) throw new Error("Could not fetch the provided URL");
  const businessType = detectBusinessType(page);
  const pageData = summarizePage(page);

  const platforms = input.adPlatforms?.join(", ") || "Google Ads, Meta Ads, LinkedIn Ads";

  const report = await callAgent(
    AD_CREATIVES_PROMPT,
    `Generate ad creatives for:\n\nURL: ${input.url}\nBusiness Type: ${businessType}\nPlatforms: ${platforms}\nBudget Level: ${input.budget || "moderate"}\n\n${pageData}\n\nFull body text:\n${page.bodyText.slice(0, 5000)}`,
    model,
    6000
  );

  return {
    agentType: "ad-creatives",
    status: "completed",
    report,
    summary: `Ad creatives generated for ${input.url} on ${platforms}`,
    metadata: { businessType, url: input.url, pagesAnalyzed: 1, model },
  };
}

async function runFunnelAnalysis(input: AgentInput, model: string): Promise<AgentResult> {
  if (!input.url) throw new Error("URL is required for Funnel Analysis");
  const pages = await fetchSitePages(input.url);
  const businessType = detectBusinessType(pages[0]);
  const pagesData = pages.map(p => summarizePage(p)).join("\n\n---\n\n");

  const report = await callAgent(
    FUNNEL_ANALYSIS_PROMPT,
    `Analyze the sales funnel for:\n\nURL: ${input.url}\nBusiness Type: ${businessType}\nPages Analyzed: ${pages.length}\n\n${pagesData}`,
    model,
    5000
  );

  const scores = parseScoresFromMarkdown(report);
  return {
    agentType: "funnel-analysis",
    status: "completed",
    scores,
    report,
    summary: `Funnel analysis of ${input.url} — ${pages.length} pages analyzed`,
    quickWins: extractQuickWins(report),
    metadata: { businessType, url: input.url, pagesAnalyzed: pages.length, model },
  };
}

async function runCompetitorIntel(input: AgentInput, model: string): Promise<AgentResult> {
  if (!input.url) throw new Error("URL is required for Competitor Intelligence");
  const page = await fetchPageContent(input.url);
  if (!page.statusCode) throw new Error("Could not fetch the provided URL");
  const businessType = detectBusinessType(page);
  const pageData = summarizePage(page);

  // Also fetch competitor URLs if provided
  let competitorContext = "";
  if (input.competitorUrls && input.competitorUrls.length > 0) {
    const competitorPages = await Promise.all(
      input.competitorUrls.slice(0, 3).map(url => fetchPageContent(url))
    );
    competitorContext = competitorPages
      .filter(p => p.statusCode > 0)
      .map(p => `\n--- Competitor: ${p.url} ---\n${summarizePage(p)}`)
      .join("\n");
  }

  const report = await callAgent(
    COMPETITOR_INTEL_PROMPT,
    `Conduct competitive intelligence analysis:\n\nTarget URL: ${input.url}\nBusiness Type: ${businessType}\nNiche: ${input.niche || "not specified"}\n\nTarget Site:\n${pageData}\n${competitorContext ? `\nCompetitor Data:\n${competitorContext}` : ""}`,
    model,
    6000
  );

  const scores = parseScoresFromMarkdown(report);
  return {
    agentType: "competitor-intel",
    status: "completed",
    scores,
    report,
    summary: `Competitive intelligence report for ${input.url}`,
    quickWins: extractQuickWins(report),
    strategicRecs: extractStrategicRecs(report),
    metadata: { businessType, url: input.url, pagesAnalyzed: 1, model },
  };
}

async function runLandingCRO(input: AgentInput, model: string): Promise<AgentResult> {
  if (!input.url) throw new Error("URL is required for Landing Page CRO");
  const page = await fetchPageContent(input.url);
  if (!page.statusCode) throw new Error("Could not fetch the provided URL");
  const businessType = detectBusinessType(page);
  const pageData = summarizePage(page);

  const report = await callAgent(
    LANDING_CRO_PROMPT,
    `Perform a CRO analysis on this landing page:\n\nURL: ${input.url}\nBusiness Type: ${businessType}\n\n${pageData}\n\nFull body text:\n${page.bodyText.slice(0, 8000)}`,
    model,
    5000
  );

  const scores = parseScoresFromMarkdown(report);
  return {
    agentType: "landing-cro",
    status: "completed",
    scores,
    report,
    summary: `Landing page CRO analysis of ${input.url} — Score: ${scores.overall}/100`,
    quickWins: extractQuickWins(report),
    metadata: { businessType, url: input.url, pagesAnalyzed: 1, model },
  };
}

async function runProductLaunch(input: AgentInput, model: string): Promise<AgentResult> {
  const productName = input.productName || input.topic || "New Product";
  let context = "";
  let businessType = "Business";

  if (input.url) {
    const page = await fetchPageContent(input.url);
    businessType = detectBusinessType(page);
    context = `\nWebsite: ${input.url}\nBusiness Type: ${businessType}\n\n${summarizePage(page)}`;
  }

  const report = await callAgent(
    PRODUCT_LAUNCH_PROMPT,
    `Create a product launch plan:\n\nProduct/Service: ${productName}\nLaunch Date: ${input.launchDate || "4 weeks from now"}\nNiche: ${input.niche || "not specified"}\n${input.additionalContext || ""}${context}\nLanguage: ${input.language || "English"}`,
    model,
    7000
  );

  return {
    agentType: "product-launch",
    status: "completed",
    report,
    summary: `8-week launch plan for "${productName}"`,
    metadata: { businessType, url: input.url, model },
  };
}

async function runBrandVoice(input: AgentInput, model: string): Promise<AgentResult> {
  if (!input.url) throw new Error("URL is required for Brand Voice analysis");
  const pages = await fetchSitePages(input.url);
  const businessType = detectBusinessType(pages[0]);
  const pagesData = pages.map(p => summarizePage(p)).join("\n\n---\n\n");

  const report = await callAgent(
    BRAND_VOICE_PROMPT,
    `Analyze the brand voice for:\n\nURL: ${input.url}\nBrand Name: ${input.brandName || pages[0].title || input.url}\nBusiness Type: ${businessType}\nPages Analyzed: ${pages.length}\n\n${pagesData}`,
    model,
    5000
  );

  const scores = parseScoresFromMarkdown(report);
  return {
    agentType: "brand-voice",
    status: "completed",
    scores,
    report,
    summary: `Brand voice analysis of ${input.url} — ${pages.length} pages analyzed`,
    metadata: { businessType, url: input.url, pagesAnalyzed: pages.length, model },
  };
}

async function runSeoAudit(input: AgentInput, model: string): Promise<AgentResult> {
  if (!input.url) throw new Error("URL is required for SEO Audit");
  const pages = await fetchSitePages(input.url);
  const businessType = detectBusinessType(pages[0]);
  const pagesData = pages.map(p => summarizePage(p)).join("\n\n---\n\n");

  const report = await callAgent(
    SEO_AUDIT_PROMPT,
    `Conduct a comprehensive SEO content audit:\n\nURL: ${input.url}\nBusiness Type: ${businessType}\nKeyword Focus: ${input.keyword || "not specified"}\nNiche: ${input.niche || "not specified"}\nPages Analyzed: ${pages.length}\n\n${pagesData}`,
    model,
    6000
  );

  const scores = parseScoresFromMarkdown(report);
  return {
    agentType: "seo-audit",
    status: "completed",
    scores,
    report,
    summary: `SEO audit of ${input.url} — Score: ${scores.overall}/100 (${scores.grade})`,
    quickWins: extractQuickWins(report),
    metadata: { businessType, url: input.url, pagesAnalyzed: pages.length, model },
  };
}

async function runMarketingReport(input: AgentInput, model: string): Promise<AgentResult> {
  if (!input.url) throw new Error("URL is required for Marketing Report");
  const pages = await fetchSitePages(input.url);
  const businessType = detectBusinessType(pages[0]);
  const pagesData = pages.map(p => summarizePage(p)).join("\n\n---\n\n");

  const report = await callAgent(
    MARKETING_REPORT_PROMPT,
    `Generate a comprehensive marketing report:\n\nURL: ${input.url}\nBusiness Type: ${businessType}\nNiche: ${input.niche || "not specified"}\nPages Analyzed: ${pages.length}\n\nAnalyze ALL dimensions: Content & Messages, Conversion Optimization, SEO & Visibility, Competitive Position, Brand & Trust, Growth & Strategy.\n\n${pagesData}`,
    model,
    8000
  );

  const scores = parseScoresFromMarkdown(report);
  return {
    agentType: "marketing-report",
    status: "completed",
    scores,
    report,
    summary: `Comprehensive marketing report for ${input.url}`,
    quickWins: extractQuickWins(report),
    strategicRecs: extractStrategicRecs(report),
    metadata: { businessType, url: input.url, pagesAnalyzed: pages.length, model },
  };
}

// ─── Marketing Audit (5 Parallel Sub-Agents) ───────────────────

async function runMarketingAudit(input: AgentInput, model: string): Promise<AgentResult> {
  if (!input.url) throw new Error("URL is required for Marketing Audit");

  // Phase 1: Discovery
  const pages = await fetchSitePages(input.url);
  const businessType = detectBusinessType(pages[0]);
  const pagesData = pages.map(p => summarizePage(p)).join("\n\n---\n\n");

  const sharedContext = `URL: ${input.url}\nBusiness Type: ${businessType}\nPages Analyzed: ${pages.length}\n\n${pagesData}`;

  // Phase 2: Run 5 sub-agents in parallel
  console.log(`🚀 Marketing Audit: Running 5 sub-agents in parallel for ${input.url}`);

  const [contentResult, conversionResult, competitiveResult, technicalResult, strategyResult] = await Promise.all([
    callAgent(CONTENT_ANALYSIS_PROMPT, `Analyze this website's content and messaging:\n\n${sharedContext}`, model, 4000)
      .catch(e => `## Content Analysis\n\nError: ${e.message}`),
    callAgent(CONVERSION_OPTIMIZATION_PROMPT, `Analyze this website's conversion optimization:\n\n${sharedContext}`, model, 4000)
      .catch(e => `## Conversion Analysis\n\nError: ${e.message}`),
    callAgent(COMPETITIVE_INTELLIGENCE_PROMPT, `Analyze the competitive positioning:\n\n${sharedContext}`, model, 4000)
      .catch(e => `## Competitive Analysis\n\nError: ${e.message}`),
    callAgent(TECHNICAL_SEO_PROMPT, `Analyze the technical SEO and marketing infrastructure:\n\n${sharedContext}`, model, 4000)
      .catch(e => `## Technical Analysis\n\nError: ${e.message}`),
    callAgent(STRATEGY_GROWTH_PROMPT, `Analyze the brand, trust, and growth strategy:\n\n${sharedContext}`, model, 4000)
      .catch(e => `## Strategy Analysis\n\nError: ${e.message}`),
  ]);

  console.log(`✅ Marketing Audit: All 5 sub-agents completed for ${input.url}`);

  // Phase 3: Synthesize with orchestrator
  const synthesisInput = `
# Sub-Agent Results for ${input.url}
Business Type: ${businessType}

## 1. Content & Messages Analysis
${contentResult}

## 2. Conversion Optimization Analysis
${conversionResult}

## 3. Competitive Intelligence Analysis
${competitiveResult}

## 4. Technical SEO Analysis
${technicalResult}

## 5. Brand & Growth Strategy Analysis
${strategyResult}
  `.trim();

  const report = await callAgent(
    MARKETING_AUDIT_ORCHESTRATOR_PROMPT,
    `Synthesize these 5 sub-agent analyses into a comprehensive marketing audit report:\n\n${synthesisInput}`,
    model,
    6000
  );

  const scores = parseScoresFromMarkdown(report);

  // Parse sub-agent scores
  const contentScores = parseScoresFromMarkdown(contentResult);
  const conversionScores = parseScoresFromMarkdown(conversionResult);
  const competitiveScores = parseScoresFromMarkdown(competitiveResult);
  const technicalScores = parseScoresFromMarkdown(technicalResult);
  const strategyScores = parseScoresFromMarkdown(strategyResult);

  // Build full report with all sub-agent details
  const fullReport = `${report}\n\n---\n\n# Detailed Sub-Agent Analyses\n\n${contentResult}\n\n---\n\n${conversionResult}\n\n---\n\n${competitiveResult}\n\n---\n\n${technicalResult}\n\n---\n\n${strategyResult}`;

  return {
    agentType: "marketing-audit",
    status: "completed",
    scores,
    report: fullReport,
    summary: `Full marketing audit of ${input.url} — Score: ${scores.overall}/100 (${scores.grade})`,
    quickWins: extractQuickWins(report),
    strategicRecs: extractStrategicRecs(report),
    subAgentResults: [
      { agentType: "content-analysis" as any, status: "completed", scores: contentScores, analysis: contentResult, quickWins: extractQuickWins(contentResult), strategicRecs: [] },
      { agentType: "conversion-optimization" as any, status: "completed", scores: conversionScores, analysis: conversionResult, quickWins: extractQuickWins(conversionResult), strategicRecs: [] },
      { agentType: "competitive-intelligence" as any, status: "completed", scores: competitiveScores, analysis: competitiveResult, quickWins: extractQuickWins(competitiveResult), strategicRecs: [] },
      { agentType: "technical-seo" as any, status: "completed", scores: technicalScores, analysis: technicalResult, quickWins: extractQuickWins(technicalResult), strategicRecs: [] },
      { agentType: "strategy-growth" as any, status: "completed", scores: strategyScores, analysis: strategyResult, quickWins: extractQuickWins(strategyResult), strategicRecs: [] },
    ],
    metadata: { businessType, url: input.url, pagesAnalyzed: pages.length, model },
  };
}
