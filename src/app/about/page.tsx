import type { Metadata } from "next";
import AboutContent from "./content";

export const metadata: Metadata = {
  title: "About BloggerSEO - The #1 AI Content Automation Platform for Blogger",
  description:
    "BloggerSEO is the most powerful AI content automation platform built exclusively for Google Blogger. Generate, optimize, and auto-publish SEO articles at scale.",
  keywords: [
    "about bloggerseo",
    "blogger automation platform",
    "ai blogger tool",
    "blogger content automation company",
    "who made bloggerseo",
  ],
  openGraph: {
    title: "About BloggerSEO - AI Content Automation for Blogger",
    description: "The most powerful content automation platform built exclusively for Blogger users.",
    url: "https://bloggerseo.ai/about",
  },
  alternates: { canonical: "https://bloggerseo.ai/about" },
};

export default function AboutPage() {
  return <AboutContent />;
}
