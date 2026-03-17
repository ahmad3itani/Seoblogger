import type { Metadata } from "next";
import ContactContent from "./content";

export const metadata: Metadata = {
  title: "Contact BloggerSEO - Get Help & Support",
  description:
    "Contact the BloggerSEO team for support, feedback, or business inquiries. We're here to help you get the most out of your Blogger content automation.",
  keywords: [
    "contact bloggerseo",
    "bloggerseo support",
    "blogger automation help",
    "bloggerseo customer service",
  ],
  openGraph: {
    title: "Contact BloggerSEO - Get Help & Support",
    description: "Reach out to the BloggerSEO team for support, feedback, or inquiries.",
    url: "https://bloggerseo.ai/contact",
  },
  alternates: { canonical: "https://bloggerseo.ai/contact" },
};

export default function ContactPage() {
  return <ContactContent />;
}
