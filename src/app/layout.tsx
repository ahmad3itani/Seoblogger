import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import GoogleAnalytics from "@/components/GoogleAnalytics";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://bloggerseowriting.com'),
  title: {
    default: "BloggerSEO - Content Automation for Blogger Platform | Auto-Generate SEO Articles",
    template: "%s | BloggerSEO - Blogger Automation Tool"
  },
  description:
    "Automate your Blogger content creation. Generate SEO-optimized articles, images, and publish directly to Blogger. Save 10+ hours per week. Perfect for Blogger users who want to scale content production effortlessly.",
  keywords: [
    "blogger automation",
    "blogger content writer",
    "auto post to blogger",
    "blogger content generator",
    "blogger seo tool",
    "blogger auto post",
    "automatic blogger posting",
    "blogger article generator",
    "blogger autopilot",
    "blogger content automation",
    "content automation for blogger",
    "blogger seo automation",
    "bulk blogger posts",
    "blogger scheduling tool",
    "blogger writing assistant"
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
    url: "https://bloggerseowriting.com",
    siteName: "BloggerSEO",
    title: "BloggerSEO - Content Automation for Blogger Platform",
    description: "Automate your Blogger content. Generate SEO articles, images, and publish automatically. Save 10+ hours/week.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BloggerSEO - Blogger Automation Tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BloggerSEO - Content Automation for Blogger",
    description: "Automate Blogger content creation. Generate SEO articles & publish automatically.",
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
    canonical: "https://bloggerseowriting.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "BloggerSEO",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "offers": [
        {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
          "description": "Free plan - 5 articles/month"
        },
        {
          "@type": "Offer",
          "price": "19",
          "priceCurrency": "USD",
          "description": "Pro plan - Unlimited articles",
          "priceValidUntil": "2026-12-31"
        }
      ],
      "description": "AI content automation platform for Google Blogger. Generate SEO-optimized articles, images, and auto-publish to Blogger.",
      "url": "https://bloggerseowriting.com",
      "screenshot": "https://bloggerseowriting.com/og-image.png",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "ratingCount": "127",
        "bestRating": "5"
      },
      "featureList": [
        "AI Article Generation",
        "SEO Optimization",
        "Auto-Publishing to Blogger",
        "Bulk Content Creation",
        "AI Image Generation",
        "Content Scheduling",
        "Keyword Research",
        "Internal Linking",
        "Content Refresh",
        "SEO Site Audit",
        "Quality Pass Humanizer"
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "BloggerSEO",
      "url": "https://bloggerseowriting.com",
      "logo": "https://bloggerseowriting.com/icon.png",
      "description": "The #1 AI content automation platform built exclusively for Google Blogger users.",
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "support@bloggerseowriting.com",
        "contactType": "customer support",
        "availableLanguage": "English"
      },
      "sameAs": []
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "BloggerSEO",
      "url": "https://bloggerseowriting.com",
      "description": "AI content automation for Blogger. Generate SEO articles, images, and publish automatically.",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://bloggerseowriting.com/dashboard/keywords?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    }
  ];

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <GoogleAnalytics />
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
