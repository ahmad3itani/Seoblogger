import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import OpenAI from "openai";
import { getPost } from "@/lib/blogger-api";
import { prisma } from "@/lib/prisma";
import * as cheerio from "cheerio";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "dummy_key_for_build",
});

function getIssuePrompt(issueId: string): string {
    const prompts: Record<string, string> = {
        missing_title: `Generate an SEO-optimized title tag (50-60 characters) that includes the primary keyword naturally. The title should be compelling and click-worthy.`,
        title_too_short: `Rewrite the title tag to be 50-60 characters. Keep the same topic but make it more keyword-rich and compelling.`,
        title_too_long: `Shorten the title tag to 50-60 characters while keeping the primary keyword and making it compelling.`,
        missing_meta_description: `Generate a compelling meta description (150-160 characters) that includes the primary keyword, has a clear value proposition, and includes a call-to-action.`,
        meta_description_too_short: `Expand the meta description to 150-160 characters. Include the primary keyword and a compelling reason to click.`,
        meta_description_too_long: `Shorten the meta description to 150-160 characters while keeping the primary keyword and call-to-action.`,
        missing_h1: `Generate an H1 heading that matches the primary keyword and accurately describes the content. Keep it under 70 characters.`,
        no_h2_tags: `Generate 3-5 H2 subheadings that break the content into logical sections, each incorporating relevant secondary keywords. Return as HTML: <h2>Heading</h2>`,
        thin_content: `Generate a comprehensive FAQ section (5-7 questions with detailed answers) related to the primary keyword. Return as clean HTML with <h2>Frequently Asked Questions</h2> followed by <h3> for each question and <p> for each answer.`,
        low_word_count: `Generate 2-3 additional paragraphs that add valuable, unique information about the topic. Include relevant examples, statistics, or tips. Return as HTML paragraphs.`,
        missing_alt_text: `Analyze the images in the content and generate descriptive, keyword-relevant alt text for each image that is missing one. Return a JSON array of {imgIndex: number, altText: string} pairs.`,
        orphan_page: `Generate 2-3 contextually relevant internal link suggestions as HTML anchor tags. Use the blog's other post titles/URLs if available.`,
        low_internal_links: `Generate 1-2 additional internal link suggestions as HTML anchor tags that naturally fit within the existing content.`,
        multiple_h1: `This page has multiple H1 tags. Suggest which single H1 to keep and which to convert to H2. Return the recommended single H1 text.`,
        missing_canonical: `Suggest the correct canonical URL for this page. Return just the full URL that should be set as the canonical.`,
        missing_open_graph: `Generate Open Graph meta tags (og:title, og:description, og:type) for this page based on its content. Return as HTML meta tags.`,
        missing_schema: `Generate a JSON-LD structured data snippet (Article schema) for this blog post, including headline, description, datePublished, and author. Return the complete <script type="application/ld+json"> block.`,
        noindex_detected: `This page has a noindex tag preventing it from appearing in search results. Confirm whether this is intentional. If not, recommend removing the noindex directive.`,
        missing_viewport: `The page is missing a viewport meta tag. Suggest the standard responsive viewport tag to add.`,
        missing_lang: `The HTML element is missing a lang attribute. Based on the content language, suggest the correct lang value (e.g., "en", "es", "fr").`,
        low_text_html_ratio: `The text-to-HTML ratio is very low. Suggest ways to increase meaningful text content or reduce unnecessary HTML bloat.`,
        no_https: `The page is not served over HTTPS. Recommend enabling HTTPS/SSL for the domain.`,
        no_images: `This content-heavy page has no images. Suggest 2-3 relevant image ideas with descriptive alt text that would improve engagement. Return as a brief recommendation.`,
        excessive_external_links: `This page has too many external links. Suggest which types of external links to remove or nofollow to preserve link equity.`,
        duplicate_title: `This page has a duplicate title shared with other pages. Generate a unique, SEO-optimized title (50-60 characters) that differentiates this page by incorporating its specific content and primary keyword.`,
    };
    return prompts[issueId] || `Generate the most appropriate SEO fix for this issue. Be specific and provide exact replacement text.`;
}

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        const { issueId, description, pageUrl, bloggerPostId, blogId } = await req.json();

        // Find the original post ID from the URL we crawled
        let targetPostId = bloggerPostId;
        
        if (targetPostId === "mock-post-id" || !targetPostId) {
            const cached = await prisma.cachedPost.findFirst({
                where: { url: pageUrl, blog: { blogId: blogId } }
            });
            if (cached) {
                targetPostId = cached.postId;
            } else {
                return NextResponse.json({ error: "Could not locate Blogger Post ID for this URL. Ensure posts are synced." }, { status: 404 });
            }
        }

        // Fetch original post content — full HTML for accurate context
        const originalPost = await getPost(userId, blogId, targetPostId);
        const title = originalPost.title || "";
        const html = originalPost.content || "";

        // Parse HTML to extract structured info for the AI
        const $ = cheerio.load(html);
        const existingH1 = $("h1").first().text();
        const existingH2s = $("h2").map((_, el) => $(el).text()).get();
        const imagesWithoutAlt: { index: number; src: string }[] = [];
        $("img").each((i, el) => {
            const alt = $(el).attr("alt");
            if (!alt || alt.trim() === "") {
                imagesWithoutAlt.push({ index: i, src: $(el).attr("src") || "" });
            }
        });
        const textContent = $("body").text().replace(/\s+/g, " ").trim();
        // Send up to 6000 chars of text for keyword analysis
        const contentForAI = textContent.slice(0, 6000);

        // Get other posts for internal linking context
        let otherPosts: { title: string; url: string }[] = [];
        if (issueId === "orphan_page" || issueId === "low_internal_links") {
            const cached = await prisma.cachedPost.findMany({
                where: { blog: { blogId } },
                take: 20,
                select: { title: true, url: true },
            });
            otherPosts = cached.filter(p => p.url !== pageUrl);
        }

        const issueSpecificPrompt = getIssuePrompt(issueId);

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `You are an elite SEO engineer who fixes real blog posts. You analyze the full content, identify the primary target keyword, and generate EXACT fixes that can be applied directly.

Your output MUST be a JSON object:
{
  "analyzedKeyword": "the primary SEO keyword from the content",
  "suggested_fix": "the EXACT replacement text or HTML to apply",
  "explanation": "brief explanation of why this fix improves SEO",
  "fixType": "replace_title | replace_meta | prepend_content | append_content | replace_html_segment",
  "confidence": 0.95
}

IMPORTANT RULES:
- The "suggested_fix" must be EXACT and ready to paste/apply — no placeholders or examples.
- For content additions (thin_content, low_word_count, no_h2_tags), return valid HTML.
- For title/meta fixes, return plain text only.
- For missing_alt_text, return a JSON string of [{imgIndex, altText}] as the suggested_fix.
- For internal links, return HTML <a> tags using the real URLs provided.
- NEVER change content that already works well. Only fix the specific issue.`
                },
                {
                    role: "user",
                    content: `ISSUE: ${issueId}
DESCRIPTION: ${description}
TASK: ${issueSpecificPrompt}

POST TITLE: ${title}
EXISTING H1: ${existingH1 || "none"}
EXISTING H2s: ${existingH2s.join(", ") || "none"}
${imagesWithoutAlt.length > 0 ? `IMAGES WITHOUT ALT: ${JSON.stringify(imagesWithoutAlt)}` : ""}
${otherPosts.length > 0 ? `OTHER BLOG POSTS (for internal linking): ${JSON.stringify(otherPosts.slice(0, 10))}` : ""}

CONTENT TEXT:
${contentForAI}`
                }
            ],
            temperature: 0.5,
            max_tokens: 1500,
        });

        const rawJson = completion.choices[0].message.content || "{}";
        const parsedResult = JSON.parse(rawJson);

        // Save suggestion to database
        if (parsedResult.suggested_fix) {
            const dbIssue = await prisma.seoIssue.findFirst({
                where: { issueId, page: { url: pageUrl } },
                orderBy: { createdAt: "desc" },
            });
            if (dbIssue) {
                await prisma.fixSuggestion.upsert({
                    where: { issueId: dbIssue.id },
                    update: {
                        suggestedFix: parsedResult.suggested_fix,
                        explanation: parsedResult.explanation,
                        status: "pending",
                    },
                    create: {
                        issueId: dbIssue.id,
                        suggestedFix: parsedResult.suggested_fix,
                        explanation: parsedResult.explanation,
                    },
                });
            }
        }

        return NextResponse.json({
            success: true,
            suggestion: parsedResult.suggested_fix,
            explanation: parsedResult.explanation,
            analyzedKeyword: parsedResult.analyzedKeyword,
            fixType: parsedResult.fixType,
        });

    } catch (error: any) {
        console.error("AI Fix Gen Error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate AI fix" }, { status: 500 });
    }
}
