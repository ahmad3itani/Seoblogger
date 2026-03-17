import type { Metadata } from "next";
import BloggerSEOGuideContent from "./content";

export const metadata: Metadata = {
  title: "Complete Blogger SEO Guide 2026: Rank Higher on Google | BloggerSEO",
  description:
    "Master Blogger SEO with this comprehensive 2026 guide. Learn on-page optimization, technical SEO, keyword research, and proven strategies to rank your Blogger blog #1 on Google.",
  keywords: [
    "blogger seo guide",
    "blogger seo optimization",
    "how to rank blogger on google",
    "blogger seo tips 2026",
    "google blogger seo",
    "blogger search engine optimization",
  ],
  openGraph: {
    title: "Complete Blogger SEO Guide 2026: Rank Higher on Google",
    description: "Master Blogger SEO and rank your blog on Google's first page.",
    url: "https://bloggerseowriting.com/blog/blogger-seo-guide",
  },
  alternates: { canonical: "https://bloggerseowriting.com/blog/blogger-seo-guide" },
};

export default function BloggerSEOGuidePage() {
  return <BloggerSEOGuideContent />;
}
