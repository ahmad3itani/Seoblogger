import type { Metadata } from "next";
import TermsContent from "./content";

export const metadata: Metadata = {
  title: "Terms of Service - BloggerSEO",
  description:
    "BloggerSEO Terms of Service. Read our terms and conditions for using the BloggerSEO content automation platform for Blogger.",
  openGraph: {
    title: "Terms of Service - BloggerSEO",
    description: "Terms and conditions for using BloggerSEO.",
    url: "https://bloggerseo.ai/terms",
  },
  alternates: { canonical: "https://bloggerseo.ai/terms" },
};

export default function TermsPage() {
  return <TermsContent />;
}
