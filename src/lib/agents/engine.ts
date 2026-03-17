import { openai, getModelForPlan } from "@/lib/ai/client";
import { prisma } from "@/lib/prisma";
import {
  AgentType,
  AgentInput,
  AgentResult,
  AgentScores,
  SubAgentResult,
  SubAgentType,
  AGENT_PLAN_LIMITS,
  canRunAgent,
  computeGrade,
} from "./types";

// ─── URL Content Fetcher ───────────────────────────────────────

export interface FetchedPage {
  url: string;
  title: string;
  metaDescription: string;
  h1: string;
  headings: { level: number; text: string }[];
  bodyText: string; // Stripped HTML text
  html: string; // Raw HTML (truncated)
  links: { href: string; text: string; isInternal: boolean }[];
  images: { src: string; alt: string }[];
  scripts: string[]; // Script sources detected
  hasAnalytics: boolean;
  hasTagManager: boolean;
  hasMetaPixel: boolean;
  schemaTypes: string[];
  wordCount: number;
  statusCode: number;
}

export async function fetchPageContent(url: string): Promise<FetchedPage> {
  try {
    // Normalize URL
    if (!url.startsWith("http")) url = "https://" + url;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "BloggerSEO-Agent/1.0 (Marketing Audit Bot)",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    const html = await response.text();
    const truncatedHtml = html.slice(0, 50000); // Cap at 50KB for AI context

    // Parse HTML content
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i);
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);

    // Extract headings
    const headingRegex = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
    const headings: { level: number; text: string }[] = [];
    let hMatch;
    while ((hMatch = headingRegex.exec(html)) !== null) {
      headings.push({
        level: parseInt(hMatch[1].charAt(1)),
        text: hMatch[2].replace(/<[^>]+>/g, "").trim(),
      });
    }

    // Extract body text
    const bodyText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 30000);

    // Extract links
    const linkRegex = /<a[^>]*href=["'](.*?)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const links: { href: string; text: string; isInternal: boolean }[] = [];
    let lMatch;
    const baseHost = new URL(url).hostname;
    while ((lMatch = linkRegex.exec(html)) !== null && links.length < 100) {
      const href = lMatch[1];
      const text = lMatch[2].replace(/<[^>]+>/g, "").trim();
      const isInternal = href.startsWith("/") || href.includes(baseHost);
      if (text && href && !href.startsWith("#") && !href.startsWith("javascript:")) {
        links.push({ href, text, isInternal });
      }
    }

    // Extract images
    const imgRegex = /<img[^>]*src=["'](.*?)["'][^>]*(?:alt=["'](.*?)["'])?/gi;
    const images: { src: string; alt: string }[] = [];
    let iMatch;
    while ((iMatch = imgRegex.exec(html)) !== null && images.length < 50) {
      images.push({ src: iMatch[1], alt: iMatch[2] || "" });
    }

    // Detect tracking scripts
    const scripts: string[] = [];
    const scriptRegex = /<script[^>]*src=["'](.*?)["']/gi;
    let sMatch;
    while ((sMatch = scriptRegex.exec(html)) !== null) {
      scripts.push(sMatch[1]);
    }

    const hasAnalytics = html.includes("gtag") || html.includes("google-analytics") || html.includes("ga.js") || html.includes("analytics.js");
    const hasTagManager = html.includes("googletagmanager") || html.includes("gtm.js");
    const hasMetaPixel = html.includes("fbevents.js") || html.includes("facebook") || html.includes("meta-pixel");

    // Detect schema types
    const schemaRegex = /"@type"\s*:\s*"([^"]+)"/gi;
    const schemaTypes: string[] = [];
    let schMatch;
    while ((schMatch = schemaRegex.exec(html)) !== null) {
      if (!schemaTypes.includes(schMatch[1])) schemaTypes.push(schMatch[1]);
    }

    const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

    return {
      url,
      title: titleMatch?.[1]?.trim() || "",
      metaDescription: metaDescMatch?.[1]?.trim() || "",
      h1: h1Match?.[1]?.replace(/<[^>]+>/g, "").trim() || "",
      headings,
      bodyText,
      html: truncatedHtml,
      links,
      images,
      scripts,
      hasAnalytics,
      hasTagManager,
      hasMetaPixel,
      schemaTypes,
      wordCount,
      statusCode: response.status,
    };
  } catch (error: any) {
    console.error(`Failed to fetch ${url}:`, error.message);
    return {
      url,
      title: "",
      metaDescription: "",
      h1: "",
      headings: [],
      bodyText: "",
      html: "",
      links: [],
      images: [],
      scripts: [],
      hasAnalytics: false,
      hasTagManager: false,
      hasMetaPixel: false,
      schemaTypes: [],
      wordCount: 0,
      statusCode: 0,
    };
  }
}

// Fetch multiple pages from a site
export async function fetchSitePages(baseUrl: string): Promise<FetchedPage[]> {
  const homepage = await fetchPageContent(baseUrl);
  if (!homepage.statusCode) return [homepage];

  // Discover key pages from homepage links
  const baseHost = new URL(baseUrl.startsWith("http") ? baseUrl : "https://" + baseUrl).hostname;
  const keyPaths = ["/about", "/pricing", "/contact", "/blog", "/features", "/products", "/services"];
  const discoveredPages: string[] = [];

  for (const link of homepage.links) {
    if (!link.isInternal) continue;
    const normalized = link.href.startsWith("http") ? link.href : `https://${baseHost}${link.href}`;
    const path = new URL(normalized).pathname.toLowerCase();
    if (keyPaths.some(kp => path.includes(kp)) && discoveredPages.length < 5) {
      if (!discoveredPages.includes(normalized)) discoveredPages.push(normalized);
    }
  }

  // Fetch discovered pages in parallel (up to 5)
  const additionalPages = await Promise.all(
    discoveredPages.slice(0, 5).map(url => fetchPageContent(url))
  );

  return [homepage, ...additionalPages.filter(p => p.statusCode > 0)];
}

// ─── Business Type Detection ───────────────────────────────────

export function detectBusinessType(page: FetchedPage): string {
  const text = (page.bodyText + " " + page.title + " " + page.html).toLowerCase();

  if (text.includes("add to cart") || text.includes("shop now") || text.includes("checkout") || text.includes("product") && text.includes("price")) {
    return "E-commerce";
  }
  if (text.includes("free trial") || text.includes("sign up") || text.includes("saas") || text.includes("pricing") && text.includes("plan")) {
    return "SaaS/Software";
  }
  if (text.includes("portfolio") || text.includes("case study") || text.includes("our services") || text.includes("agency")) {
    return "Agency/Services";
  }
  if (text.includes("course") || text.includes("newsletter") || text.includes("subscribe") || text.includes("creator")) {
    return "Creator/Education";
  }
  if (text.includes("hours") || text.includes("location") || text.includes("near me") || text.includes("directions")) {
    return "Local Business";
  }
  return "Business Website";
}

// ─── Summarize Page for AI Context ─────────────────────────────

export function summarizePage(page: FetchedPage): string {
  return `
URL: ${page.url}
Title: ${page.title}
Meta Description: ${page.metaDescription}
H1: ${page.h1}
Headings: ${page.headings.map(h => `${"#".repeat(h.level)} ${h.text}`).join(" | ")}
Word Count: ${page.wordCount}
Internal Links: ${page.links.filter(l => l.isInternal).length}
External Links: ${page.links.filter(l => !l.isInternal).length}
Images: ${page.images.length} (${page.images.filter(i => !i.alt).length} missing alt)
Analytics: ${page.hasAnalytics ? "Yes" : "No"} | Tag Manager: ${page.hasTagManager ? "Yes" : "No"} | Meta Pixel: ${page.hasMetaPixel ? "Yes" : "No"}
Schema Types: ${page.schemaTypes.join(", ") || "None"}
Body Text Preview: ${page.bodyText.slice(0, 3000)}
  `.trim();
}

// ─── Core AI Call ──────────────────────────────────────────────

export async function callAgent(
  systemPrompt: string,
  userMessage: string,
  model: string,
  maxTokens: number = 4000
): Promise<string> {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    max_tokens: maxTokens,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || "";
}

// ─── Usage Checking ────────────────────────────────────────────

export async function checkAgentUsage(
  userId: string,
  planName: string,
  agentType: AgentType
): Promise<{ allowed: boolean; error?: string; remaining?: number }> {
  // Check if agent is available on plan
  if (!canRunAgent(planName, agentType)) {
    return {
      allowed: false,
      error: `The ${agentType} agent is not available on your ${planName} plan. Please upgrade to access this feature.`,
    };
  }

  // Check monthly usage
  const limits = AGENT_PLAN_LIMITS[planName] || AGENT_PLAN_LIMITS.free;
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const usedThisMonth = await prisma.agentRun.count({
    where: {
      userId,
      createdAt: { gte: startOfMonth },
      status: { in: ["completed", "running"] },
    },
  });

  const remaining = limits.agentRunsPerMonth - usedThisMonth;

  if (remaining <= 0) {
    return {
      allowed: false,
      error: `You've used all ${limits.agentRunsPerMonth} agent runs this month. Upgrade your plan for more.`,
      remaining: 0,
    };
  }

  return { allowed: true, remaining };
}

// ─── Save Agent Run ────────────────────────────────────────────

export async function createAgentRun(
  userId: string,
  agentType: AgentType,
  input: AgentInput
) {
  return prisma.agentRun.create({
    data: {
      userId,
      agentType,
      status: "running",
      input: input as any,
    },
  });
}

export async function completeAgentRun(
  runId: string,
  result: AgentResult,
  durationMs: number
) {
  return prisma.agentRun.update({
    where: { id: runId },
    data: {
      status: "completed",
      scores: result.scores ? JSON.parse(JSON.stringify(result.scores)) : undefined,
      report: result.report,
      summary: result.summary,
      metadata: result.metadata ? JSON.parse(JSON.stringify(result.metadata)) : undefined,
      durationMs,
    },
  });
}

export async function failAgentRun(runId: string, error: string) {
  return prisma.agentRun.update({
    where: { id: runId },
    data: {
      status: "failed",
      summary: error,
    },
  });
}

// ─── Parse Scores from AI Output ───────────────────────────────

export function parseScoresFromMarkdown(markdown: string): AgentScores {
  const dimensions: { name: string; score: number; maxScore: number; finding: string }[] = [];

  // Match table rows like: | Dimension | X/10 | finding |
  const tableRowRegex = /\|\s*(.+?)\s*\|\s*(\d+)\/(\d+)\s*\|\s*(.+?)\s*\|/g;
  let match;
  while ((match = tableRowRegex.exec(markdown)) !== null) {
    const name = match[1].trim();
    if (name.toLowerCase().includes("dimension") || name.toLowerCase().includes("category") || name === "---") continue;
    dimensions.push({
      name,
      score: parseInt(match[2]),
      maxScore: parseInt(match[3]),
      finding: match[4].trim(),
    });
  }

  // Calculate overall score (normalize to 0-100)
  let overall = 0;
  if (dimensions.length > 0) {
    const totalScore = dimensions.reduce((sum, d) => sum + (d.score / d.maxScore) * 100, 0);
    overall = Math.round(totalScore / dimensions.length);
  }

  // Try to extract explicit overall score
  const overallMatch = markdown.match(/(?:Overall|Global|Total)\s*(?:Score)?\s*:?\s*(\d+)\s*\/\s*(\d+)/i);
  if (overallMatch) {
    overall = Math.round((parseInt(overallMatch[1]) / parseInt(overallMatch[2])) * 100);
  }

  return {
    overall,
    grade: computeGrade(overall),
    dimensions,
  };
}

// ─── Extract Sections from Markdown ────────────────────────────

export function extractQuickWins(markdown: string): string[] {
  const wins: string[] = [];
  const section = markdown.match(/(?:Quick Wins|Gains Rapides|Quick CRO Wins).*?\n([\s\S]*?)(?=\n##|\n---|\n\*Generated|$)/i);
  if (section) {
    const items = section[1].match(/\d+\.\s*(.+)/g);
    if (items) {
      for (const item of items.slice(0, 10)) {
        wins.push(item.replace(/^\d+\.\s*/, "").trim());
      }
    }
  }
  return wins;
}

export function extractStrategicRecs(markdown: string): string[] {
  const recs: string[] = [];
  const section = markdown.match(/(?:Strategic Recommendations|Recommandations Stratégiques).*?\n([\s\S]*?)(?=\n##|\n---|\n\*Generated|$)/i);
  if (section) {
    const items = section[1].match(/\d+\.\s*(.+)/g);
    if (items) {
      for (const item of items.slice(0, 10)) {
        recs.push(item.replace(/^\d+\.\s*/, "").trim());
      }
    }
  }
  return recs;
}
