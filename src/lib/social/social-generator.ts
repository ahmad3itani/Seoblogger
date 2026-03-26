// ─── AI Social Package Generator ────────────────────────────────────────────
// Generates platform-specific captions from an article, plus a social image.

import { openai, getModelForPlan } from "@/lib/ai/client";

export interface SocialCaptions {
  facebook: string;
  linkedin: string;
  x: string;
}

export interface SocialPackage {
  captions: SocialCaptions;
  imageUrl: string | null;
  imageAlt: string;
}

const CAPTION_PROMPT = (
  title: string,
  keyword: string,
  excerpt: string,
  liveUrl: string
) => `You are an expert social media manager. Generate platform-specific captions for a blog post.

ARTICLE DETAILS:
Title: ${title}
Primary Keyword: ${keyword}
Excerpt: ${excerpt}
Live URL: ${liveUrl}

Generate captions for THREE platforms. Return ONLY valid JSON (no markdown fences):

{
  "facebook": "<storytelling hook 2-3 sentences, end with the URL, add 3 relevant hashtags>",
  "linkedin": "<professional insight framing 2-3 sentences, no branded hashtags, end with the URL>",
  "x": "<punchy hook under 240 chars, 2-3 hashtags, URL at the end>"
}

Rules:
- Facebook: warm, engaging, uses emojis sparingly, ends with the article URL, 3 hashtags
- LinkedIn: professional, insight-driven, no fluff, no #hashtags (or max 2 professional ones), ends with URL
- X: under 240 characters total including URL, punchy, 2-3 relevant hashtags
- Always include the exact live URL in each caption`;

export async function generateSocialPackage(opts: {
  title: string;
  keyword: string;
  excerpt: string;
  liveUrl: string;
  userPlan?: string;
  generateImage?: boolean;
}): Promise<SocialPackage> {
  const model = getModelForPlan(opts.userPlan);

  // Generate captions
  const captionRes = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "You are a social media expert. Return only valid JSON." },
      { role: "user", content: CAPTION_PROMPT(opts.title, opts.keyword, opts.excerpt || opts.title, opts.liveUrl) },
    ],
    temperature: 0.75,
    max_tokens: 800,
  });

  let captions: SocialCaptions = {
    facebook: `Check out our latest post: "${opts.title}" 🔗 ${opts.liveUrl}`,
    linkedin: `New article: "${opts.title}" ${opts.liveUrl}`,
    x: `${opts.title} ${opts.liveUrl}`,
  };

  try {
    const raw = captionRes.choices[0]?.message?.content || "{}";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
    const parsed = JSON.parse(cleaned);
    if (parsed.facebook) captions = parsed as SocialCaptions;
  } catch {
    console.warn("Social caption JSON parse failed — using fallback captions.");
  }

  // Optionally generate a social image
  let imageUrl: string | null = null;
  const imageAlt = `${opts.keyword} — ${opts.title}`;

  if (opts.generateImage) {
    try {
      const { generateFeaturedImage } = await import("@/lib/ai/generate");
      const img = await generateFeaturedImage(opts.title, opts.keyword, "social");
      imageUrl = img?.url || null;
    } catch (e) {
      console.warn("Social image generation failed:", e);
    }
  }

  return { captions, imageUrl, imageAlt };
}
