// Article templates for different content types

export interface ArticleTemplate {
    id: string;
    name: string;
    type: string;
    description: string;
    icon: string;
    structure: string[];
    defaultWordCount: number;
    defaultTone: string;
}

export const ARTICLE_TEMPLATES: ArticleTemplate[] = [
    {
        id: "how-to",
        name: "How-To Guide",
        type: "how-to",
        description: "Step-by-step tutorial explaining how to accomplish something",
        icon: "📝",
        structure: [
            "Introduction (what + why)",
            "Prerequisites / What you need",
            "Step-by-step instructions (5-10 steps)",
            "Pro tips / Common mistakes",
            "FAQ section",
            "Conclusion + CTA",
        ],
        defaultWordCount: 2000,
        defaultTone: "instructional",
    },
    {
        id: "listicle",
        name: "Listicle",
        type: "listicle",
        description: "Numbered list of items, tips, or resources",
        icon: "📋",
        structure: [
            "Introduction (why this list matters)",
            "Numbered items (7-15 items)",
            "Each item: subheading + 2-3 paragraphs",
            "Comparison or summary",
            "FAQ section",
            "Conclusion + CTA",
        ],
        defaultWordCount: 2500,
        defaultTone: "engaging",
    },
    {
        id: "comparison",
        name: "Comparison / Versus",
        type: "comparison",
        description: "Comparing two or more options side by side",
        icon: "⚖️",
        structure: [
            "Introduction (why compare)",
            "Quick comparison table",
            "Detailed breakdown per option",
            "Pros and cons for each",
            "Use cases: which is best for whom",
            "FAQ section",
            "Final verdict + CTA",
        ],
        defaultWordCount: 2500,
        defaultTone: "analytical",
    },
    {
        id: "product-review",
        name: "Product Review",
        type: "review",
        description: "In-depth review of a product or service",
        icon: "⭐",
        structure: [
            "Introduction + Quick verdict",
            "Product overview",
            "Key features breakdown",
            "Pros and cons",
            "Pricing analysis",
            "Alternatives comparison",
            "Rating breakdown",
            "FAQ section",
            "Conclusion + Buy recommendation",
        ],
        defaultWordCount: 3000,
        defaultTone: "expert",
    },
    {
        id: "informational",
        name: "Informational / Explainer",
        type: "informational",
        description: "Deep-dive educational content on a topic",
        icon: "🎓",
        structure: [
            "Introduction (what + context)",
            "Background / History",
            "Core explanation (3-5 sections)",
            "Examples and use cases",
            "Best practices",
            "FAQ section",
            "Conclusion + Further reading",
        ],
        defaultWordCount: 2000,
        defaultTone: "informational",
    },
    {
        id: "qa",
        name: "Q&A Article",
        type: "qa",
        description: "Question and answer format covering a topic thoroughly",
        icon: "❓",
        structure: [
            "Introduction (topic overview)",
            "Main questions (8-12 Q&A pairs)",
            "Each answer: 2-4 paragraphs",
            "Summary of key takeaways",
            "Related resources",
        ],
        defaultWordCount: 2000,
        defaultTone: "conversational",
    },
    {
        id: "affiliate",
        name: "Affiliate / Best-of",
        type: "affiliate",
        description: "Curated recommendations with affiliate links",
        icon: "💰",
        structure: [
            "Affiliate disclosure",
            "Introduction (what we reviewed)",
            "How we tested / Criteria",
            "Top pick summary",
            "Individual product reviews (5-10)",
            "Comparison table",
            "Buying guide",
            "FAQ section",
            "Conclusion + Top recommendations",
        ],
        defaultWordCount: 3500,
        defaultTone: "trustworthy",
    },
    {
        id: "recipe",
        name: "Recipe Post",
        type: "recipe",
        description: "A structured recipe post with ingredients and instructions",
        icon: "🍳",
        structure: [
            "Introduction (story behind the recipe)",
            "Why this recipe works",
            "Ingredients list (with quantities)",
            "Step-by-step cooking instructions",
            "Expert tips & variations",
            "Storage instructions",
            "FAQ section",
            "Conclusion",
        ],
        defaultWordCount: 1500,
        defaultTone: "friendly",
    },
    {
        id: "local-seo",
        name: "Local Service Page",
        type: "service",
        description: "Service area page optimized for local SEO",
        icon: "📍",
        structure: [
            "Hero hook (Service + Location)",
            "Why choose us for [Service] in [Location]",
            "Our specific services offered",
            "Benefits of hiring professionals",
            "Local landmarks/areas we serve",
            "Customer testimonials / Case study summary",
            "FAQ section",
            "Conclusion + Call to Action for quote",
        ],
        defaultWordCount: 1500,
        defaultTone: "professional",
    },
];

export function getTemplate(id: string): ArticleTemplate | undefined {
    return ARTICLE_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByType(type: string): ArticleTemplate[] {
    return ARTICLE_TEMPLATES.filter((t) => t.type === type);
}
