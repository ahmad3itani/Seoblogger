import type { Metadata } from "next";
import PrivacyContent from "./content";

export const metadata: Metadata = {
  title: "Privacy Policy - BloggerSEO",
  description:
    "BloggerSEO Privacy Policy. Learn how we collect, use, and protect your personal data when you use our Blogger content automation platform.",
  openGraph: {
    title: "Privacy Policy - BloggerSEO",
    description: "How BloggerSEO collects, uses, and protects your personal data.",
    url: "https://bloggerseowriting.com/privacy",
  },
  alternates: { canonical: "https://bloggerseowriting.com/privacy" },
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
