import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://bloggerseo.ai'),
  title: {
    default: "BloggerSEO - AI Content Automation for Blogger Platform | Auto-Generate SEO Articles",
    template: "%s | BloggerSEO - Blogger Automation Tool"
  },
  description:
    "Automate your Blogger content creation with AI. Generate SEO-optimized articles, images, and publish directly to Blogger. Save 10+ hours per week. Perfect for Blogger users who want to scale content production effortlessly.",
  keywords: [
    "blogger automation",
    "blogger ai writer",
    "auto post to blogger",
    "blogger content generator",
    "blogger seo tool",
    "ai blogger automation",
    "automatic blogger posting",
    "blogger article generator",
    "blogger autopilot",
    "blogger content automation",
    "ai content for blogger",
    "blogger seo automation",
    "bulk blogger posts",
    "blogger scheduling tool",
    "blogger ai assistant"
  ],
  authors: [{ name: "BloggerSEO Team" }],
  creator: "BloggerSEO",
  publisher: "BloggerSEO",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://bloggerseo.ai",
    siteName: "BloggerSEO",
    title: "BloggerSEO - AI Content Automation for Blogger Platform",
    description: "Automate your Blogger content with AI. Generate SEO articles, images, and publish automatically. Save 10+ hours/week.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BloggerSEO - AI Blogger Automation Tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BloggerSEO - AI Content Automation for Blogger",
    description: "Automate Blogger content creation with AI. Generate SEO articles & publish automatically.",
    images: ["/og-image.png"],
    creator: "@bloggerseo",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
  alternates: {
    canonical: "https://bloggerseo.ai",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "BloggerSEO",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free plan available"
    },
    "description": "AI-powered content automation tool for Blogger platform. Generate SEO-optimized articles and publish automatically.",
    "url": "https://bloggerseo.ai",
    "screenshot": "https://bloggerseo.ai/screenshot.png",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "127"
    },
    "featureList": [
      "AI Article Generation",
      "SEO Optimization",
      "Auto-Publishing to Blogger",
      "Bulk Content Creation",
      "Image Generation",
      "Content Scheduling"
    ]
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased font-sans`}
        suppressHydrationWarning
      >
        {/* Background gradient orbs */}
        <div className="gradient-orb gradient-orb-1" />
        <div className="gradient-orb gradient-orb-2" />
        <div className="gradient-orb gradient-orb-3" />

        <div className="relative z-10">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
