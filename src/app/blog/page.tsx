import type { Metadata } from "next";
import BlogIndexContent from "./content";

export const metadata: Metadata = {
  title: "Blog - Blogger SEO Tips, AI Content Writing & SEO Guides | BloggerSEO",
  description:
    "Learn how to optimize your Blogger blog for SEO, create better content with AI, and rank higher on Google. Expert tips, guides, and strategies for Blogger users.",
  keywords: [
    "blogger seo tips",
    "blogger optimization guide",
    "ai content writing",
    "blogger ranking tips",
    "seo for blogger",
    "blogger content strategy",
    "google blogger seo",
  ],
  openGraph: {
    title: "Blog - Blogger SEO Tips & AI Content Writing Guides",
    description: "Expert SEO tips and content strategies for Blogger users.",
    url: "https://bloggerseowriting.com/blog",
  },
  alternates: { canonical: "https://bloggerseowriting.com/blog" },
};

export default function BlogPage() {
  return <BlogIndexContent />;
}
