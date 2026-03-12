import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { openai } from "@/lib/ai/client";

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;

        const {
            niche,
            storeId,
            productCount = 5,
            articleType = "roundup",
            language = "English",
            tone = "professional",
            includeComparisonTable = true,
            customInstructions,
        } = await req.json();

        if (!niche || !storeId) {
            return NextResponse.json(
                { error: "Niche and Amazon Store ID are required" },
                { status: 400 }
            );
        }

        const amazonSearchBase = `https://www.amazon.com/s?k=`;
        const amazonTag = `&tag=${encodeURIComponent(storeId)}`;

        let systemPrompt = "";
        let userPrompt = "";

        if (articleType === "roundup") {
            systemPrompt = `You are an elite SEO content writer and Amazon affiliate expert. Create professional, magazine-quality product roundup articles optimized for search engines and conversions.

CRITICAL SEO & FORMATTING RULES:
1. Write in ${language}, ${tone} tone with exceptional readability.
2. Use proper semantic HTML5 structure with schema.org markup.
3. NO product links in the main content - only informational content.
4. Include ${productCount} products with detailed, unbiased reviews.
5. Each product section structure:
   - H3: Product name (bold, no link)
   - Featured image placeholder: <img src="https://via.placeholder.com/800x500/4A90E2/ffffff?text=PRODUCT+NAME" alt="Descriptive alt text with keywords" class="product-image" loading="lazy" />
   - 3-4 detailed paragraphs covering features, benefits, use cases
   - Specifications list with <ul> bullets
   - Pros & Cons in separate lists
   - NO "Check Price" links in product sections
6. ${includeComparisonTable ? "Include a professional HTML comparison table with key specs (NO links in table)." : ""}
7. Article structure:
   - Affiliate disclosure (subtle, professional)
   - SEO-optimized H1 title
   - Engaging 2-3 paragraph introduction with target keyword
   - Table of Contents (if >2000 words)
   - ${includeComparisonTable ? "Comparison table" : ""}
   - Individual product reviews (H2: "Top ${productCount} ${niche} Reviewed")
   - H2: "Buying Guide" with 5-7 detailed factors
   - H2: "Frequently Asked Questions" with 5 Q&As
   - H2: "Final Verdict" conclusion
   - CTA section at END with affiliate buttons
8. SEO optimization:
   - Target keyword in H1, first paragraph, H2s naturally
   - LSI keywords throughout
   - Meta description worthy intro
   - Image alt text optimized
   - Internal linking opportunities mentioned
9. Add JSON-LD schema for Article and Product aggregate rating
10. Professional styling with CSS classes: .product-image, .comparison-table, .pros-cons, .cta-button
11. Include realistic specs, pricing tiers ($, $$, $$$), and current year context
${customInstructions ? `12. Additional: ${customInstructions}` : ""}

OUTPUT FORMAT:
Return ONLY clean, valid HTML starting with the disclosure paragraph. NO <html>, <head>, or <body> tags.`;

            userPrompt = `Write a comprehensive, SEO-optimized "Best ${niche} [Current Year]" product roundup with ${productCount} products.

Target keyword: "best ${niche}"
Word count: 2500-3000 words
Focus: In-depth, helpful, unbiased reviews that help readers make informed decisions.

Include:
- Real product names from top brands in this niche
- Specific technical specifications and features
- Realistic pricing tiers and value analysis
- Use cases for different user types
- Professional product images (placeholders with descriptive names)
- Comparison table with key specs
- Comprehensive buying guide
- FAQ section addressing common concerns

Make it authoritative, trustworthy, and conversion-focused without being salesy.`;

        } else if (articleType === "single-review") {
            systemPrompt = `You are an elite SEO content writer specializing in in-depth product reviews.

CRITICAL SEO & FORMATTING RULES:
1. Write in ${language}, ${tone} tone - authoritative yet approachable.
2. NO product links in main content - pure informational review.
3. Structure:
   - Affiliate disclosure (professional)
   - SEO-optimized H1: "[Product Name] Review [Year]: Is It Worth It?"
   - Hero image: <img src="https://via.placeholder.com/1200x600/4A90E2/ffffff?text=PRODUCT+NAME+Review" alt="Product name review" class="hero-image" loading="eager" />
   - Quick verdict box (HTML styled div)
   - H2: "Overview"
   - H2: "Design & Build Quality" (with image)
   - H2: "Key Features & Performance" (with images)
   - H2: "Pros & Cons"
   - H2: "Who Should Buy This?"
   - H2: "Alternatives to Consider"
   - H2: "Frequently Asked Questions"
   - H2: "Final Verdict"
   - CTA section at end
4. Include 4-6 product images (placeholders) with descriptive alt text
5. Add specifications table
6. Include JSON-LD Product schema with rating
7. 2000+ words, SEO-optimized for "[product name] review"
8. Professional CSS classes for styling
${customInstructions ? `9. Additional: ${customInstructions}` : ""}`;

            userPrompt = `Write an in-depth, SEO-optimized review of the most popular/best product in the "${niche}" category.

Pick a specific, real flagship product and write an expert review.
Target keyword: "[product name] review"
Word count: 2000-2500 words
Include real specs, features, and honest pros/cons analysis.`;

        } else if (articleType === "comparison") {
            systemPrompt = `You are an elite SEO content writer specializing in product comparisons.

CRITICAL SEO & FORMATTING RULES:
1. Write in ${language}, ${tone} tone - objective and data-driven.
2. NO product links in main content.
3. Compare ${Math.min(productCount, 3)} top products head-to-head.
4. Structure:
   - Affiliate disclosure
   - H1: "[Product A] vs [Product B] vs [Product C]: Which Is Best?"
   - Quick comparison summary table
   - H2: "At a Glance" (3-column comparison)
   - Individual H2 sections for each product with images
   - H2: "Head-to-Head Comparison" (detailed table)
   - H2: "Category Winners" (Best for X, Best for Y, etc.)
   - H2: "Which Should You Choose?"
   - H2: "FAQ"
   - CTA section
5. Include comparison images and spec tables
6. 1800+ words, SEO-optimized
7. Professional styling with comparison tables
${customInstructions ? `8. Additional: ${customInstructions}` : ""}`;

            userPrompt = `Write a detailed comparison of the top ${Math.min(productCount, 3)} products in "${niche}".

Pick real competing products and compare them objectively.
Target keyword: "[product] vs [product]"
Word count: 1800-2200 words`;

        } else {
            // buyers-guide
            systemPrompt = `You are an elite SEO content writer specializing in comprehensive buyer's guides.

CRITICAL SEO & FORMATTING RULES:
1. Write in ${language}, ${tone} tone - educational and helpful.
2. NO product links in main content.
3. Structure:
   - Affiliate disclosure
   - H1: "The Ultimate ${niche} Buying Guide [Year]"
   - H2: "Why This Guide?"
   - H2: "Types of ${niche}" (with images)
   - H2: "Key Features to Consider" (7-10 factors, each H3)
   - H2: "Budget Breakdown" (Entry/Mid/Premium tiers)
   - H2: "Top ${productCount} ${niche} Recommendations" (brief mentions, no links)
   - H2: "Common Mistakes to Avoid"
   - H2: "FAQ" (8-10 questions)
   - H2: "Final Recommendations"
   - CTA section
4. Include infographic-style images and comparison charts
5. 2500+ words, highly educational
6. SEO-optimized for "how to choose ${niche}"
${customInstructions ? `7. Additional: ${customInstructions}` : ""}`;

            userPrompt = `Write the ultimate buyer's guide for "${niche}".

Target keyword: "how to choose ${niche}" and "${niche} buying guide"
Word count: 2500-3000 words
Focus: Educate readers on making the best purchase decision.
Include ${productCount} product recommendations (brief mentions only).`;
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 4000,
        });

        let generatedHtml = completion.choices[0].message.content || "";

        // Extract a title from the generated content
        const titleMatch = generatedHtml.match(/<h1[^>]*>(.*?)<\/h1>/i);
        const title = titleMatch
            ? titleMatch[1].replace(/<[^>]*>/g, "")
            : `Best ${niche} - Top ${productCount} Picks`;

        // Build affiliate CTA section to append at the end
        const nicheEncoded = encodeURIComponent(niche).replace(/%20/g, '+');
        const affiliateUrl = `https://www.amazon.com/s?k=${nicheEncoded}&tag=${storeId}`;
        
        const ctaSection = `
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 12px; margin: 40px 0; text-align: center; color: white;">
    <h2 style="color: white; margin-bottom: 20px; font-size: 28px;">Ready to Make Your Purchase?</h2>
    <p style="font-size: 18px; margin-bottom: 30px; opacity: 0.95;">Click below to explore these products on Amazon and find the best deals available today.</p>
    <a href="${affiliateUrl}" target="_blank" rel="nofollow noopener" style="display: inline-block; background: #FF9900; color: #232F3E; padding: 18px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); transition: transform 0.2s;">
        🛒 View on Amazon
    </a>
    <p style="font-size: 14px; margin-top: 20px; opacity: 0.8;">As an Amazon Associate, we earn from qualifying purchases at no extra cost to you.</p>
</div>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${title.replace(/"/g, '\\"')}",
  "description": "Comprehensive guide to the best ${niche} with expert reviews, comparisons, and buying advice.",
  "author": {
    "@type": "Organization",
    "name": "BloggerSEO"
  },
  "datePublished": "${new Date().toISOString()}",
  "dateModified": "${new Date().toISOString()}",
  "image": "https://via.placeholder.com/1200x630/4A90E2/ffffff?text=${encodeURIComponent(niche)}",
  "publisher": {
    "@type": "Organization",
    "name": "BloggerSEO",
    "logo": {
      "@type": "ImageObject",
      "url": "https://via.placeholder.com/200x60/4A90E2/ffffff?text=Logo"
    }
  }
}
</script>`;

        // Append CTA section to the generated content
        generatedHtml += ctaSection;

        // Count affiliate links (should be 1 from CTA section)
        const affiliateLinkCount = (generatedHtml.match(new RegExp(storeId, "g")) || []).length;

        // Count words
        const textOnly = generatedHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        const wordCount = textOnly.split(" ").length;

        return NextResponse.json({
            success: true,
            article: {
                title,
                content: generatedHtml,
                wordCount,
                affiliateLinkCount,
                storeId,
                niche,
                articleType,
            },
        });

    } catch (error: any) {
        console.error("Amazon Generate Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate article" },
            { status: 500 }
        );
    }
}
