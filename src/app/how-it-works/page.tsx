import type { Metadata } from "next";
import HowItWorksContent from "./content";

export const metadata: Metadata = {
  title: "How BloggerSEO Works - AI Content Automation for Blogger in 3 Steps",
  description:
    "Learn how BloggerSEO automates your Blogger content creation in 3 simple steps. Enter a keyword, generate SEO articles with AI, and auto-publish to Blogger. Start free today.",
  keywords: [
    "how bloggerseo works",
    "blogger automation tool",
    "ai content generator for blogger",
    "auto publish blogger posts",
    "blogger seo tool how to use",
    "automated blog writing",
  ],
  openGraph: {
    title: "How BloggerSEO Works - AI Content Automation for Blogger",
    description: "Generate SEO-optimized articles and auto-publish to Blogger in 3 simple steps.",
    url: "https://bloggerseowriting.com/how-it-works",
  },
  alternates: { canonical: "https://bloggerseowriting.com/how-it-works" },
};

export default function HowItWorksPage() {
  return <HowItWorksContent />;
}
