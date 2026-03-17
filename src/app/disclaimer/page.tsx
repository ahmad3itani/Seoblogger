import type { Metadata } from "next";
import DisclaimerContent from "./content";

export const metadata: Metadata = {
  title: "Disclaimer - BloggerSEO",
  description:
    "BloggerSEO Disclaimer. Important information about AI-generated content, affiliate disclosures, and limitations of our Blogger automation platform.",
  openGraph: {
    title: "Disclaimer - BloggerSEO",
    description: "Important disclaimers about using BloggerSEO's AI content automation platform.",
    url: "https://bloggerseo.ai/disclaimer",
  },
  alternates: { canonical: "https://bloggerseo.ai/disclaimer" },
};

export default function DisclaimerPage() {
  return <DisclaimerContent />;
}
