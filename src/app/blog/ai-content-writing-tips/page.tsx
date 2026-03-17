import type { Metadata } from "next";
import AIContentWritingContent from "./content";

export const metadata: Metadata = {
  title: "AI Content Writing: 15 Expert Tips for Human-Quality Articles | BloggerSEO",
  description:
    "Master AI content writing with 15 expert tips. Learn how to create undetectable, high-quality articles using AI while maintaining authenticity and SEO value.",
  keywords: [
    "ai content writing",
    "ai writing tips",
    "chatgpt content creation",
    "ai article writing",
    "how to use ai for blogging",
    "ai content quality",
  ],
  openGraph: {
    title: "AI Content Writing: 15 Expert Tips for Human-Quality Articles",
    description: "Create undetectable, high-quality content with AI using these expert tips.",
    url: "https://bloggerseowriting.com/blog/ai-content-writing-tips",
  },
  alternates: { canonical: "https://bloggerseowriting.com/blog/ai-content-writing-tips" },
};

export default function AIContentWritingPage() {
  return <AIContentWritingContent />;
}
