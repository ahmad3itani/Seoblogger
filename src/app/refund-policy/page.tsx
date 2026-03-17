import type { Metadata } from "next";
import RefundContent from "./content";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy - BloggerSEO",
  description:
    "BloggerSEO Refund and Cancellation Policy. Learn about our subscription cancellation process, refund eligibility, and money-back guarantee.",
  openGraph: {
    title: "Refund & Cancellation Policy - BloggerSEO",
    description: "Subscription cancellation and refund information for BloggerSEO.",
    url: "https://bloggerseowriting.com/refund-policy",
  },
  alternates: { canonical: "https://bloggerseowriting.com/refund-policy" },
};

export default function RefundPage() {
  return <RefundContent />;
}
