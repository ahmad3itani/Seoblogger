import { openai } from "@/lib/ai/client";
import { ADSENSE_PROMPT } from "./prompts";

export interface AdSenseIssue {
  type: string;
  severity: "high" | "medium" | "low";
  message: string;
}

export interface AdSenseReport {
  adsense_score: number;
  status: "Ready" | "Almost Ready" | "Not Ready";
  issues: AdSenseIssue[];
  recommendations: string[];
}

export async function analyzeAdSenseReadiness(
  posts: any[],
  structureInfo: {
    hasAbout: boolean;
    hasContact: boolean;
    hasPrivacy: boolean;
    topCategories: string[];
    totalPosts: number;
    hasNavigation: boolean;
  }
): Promise<AdSenseReport> {
  const postsJson = JSON.stringify(
    posts.map((p) => ({
      title: p.title,
      contentLength: p.wordCount || (p.content ? p.content.split(/\s+/).length : 0),
      url: p.url,
    })),
    null,
    2
  );

  const structureJson = JSON.stringify(structureInfo, null, 2);
  const prompt = ADSENSE_PROMPT.replace("{posts_json}", postsJson).replace("{structure_json}", structureJson);

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o", // Strongest reasoning model for the audit
      messages: [
        { role: "system", content: "You are an AdSense expert. Return only JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const content = res.choices[0]?.message?.content || "{}";
    const report: AdSenseReport = JSON.parse(content);
    return report;
  } catch (error) {
    console.error("AdSense analysis failed:", error);
    return {
      adsense_score: 0,
      status: "Not Ready",
      issues: [{ type: "System Error", severity: "high", message: "Failed to run AdSense analysis." }],
      recommendations: ["Retry the audit."],
    };
  }
}
