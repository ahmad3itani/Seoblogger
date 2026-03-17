"use client";

import Link from "next/link";
import { Sparkles, ArrowRight, Calendar, Clock, TrendingUp, Lightbulb, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const articles = [
  {
    slug: "blogger-seo-guide",
    title: "The Complete Blogger SEO Guide: Rank Higher on Google in 2026",
    excerpt: "Master Blogger SEO with this comprehensive guide. Learn on-page optimization, technical SEO, content strategies, and proven tactics to rank your Blogger blog on Google's first page.",
    category: "SEO",
    readTime: "12 min read",
    date: "March 17, 2026",
    icon: Target,
  },
  {
    slug: "ai-content-writing-tips",
    title: "AI Content Writing: 15 Expert Tips to Create Human-Quality Articles",
    excerpt: "Discover how to use AI for content creation without sacrificing quality. Learn prompting techniques, editing strategies, and how to make AI-generated content undetectable.",
    category: "AI Writing",
    readTime: "10 min read",
    date: "March 16, 2026",
    icon: Lightbulb,
  },
  {
    slug: "rank-on-google-fast",
    title: "How to Rank on Google Fast: 10 Proven Strategies That Actually Work",
    excerpt: "Stop waiting months for rankings. Learn the exact strategies top SEO experts use to rank new content on Google within weeks, not months.",
    category: "SEO",
    readTime: "8 min read",
    date: "March 15, 2026",
    icon: TrendingUp,
  },
  {
    slug: "blogger-vs-wordpress-seo",
    title: "Blogger vs WordPress for SEO: Which Platform Ranks Better in 2026?",
    excerpt: "An honest comparison of Blogger and WordPress SEO capabilities. Discover which platform gives you the best chance of ranking on Google.",
    category: "Platforms",
    readTime: "7 min read",
    date: "March 14, 2026",
    icon: Zap,
  },
  {
    slug: "internal-linking-strategy",
    title: "Internal Linking Strategy: The SEO Tactic Most Bloggers Ignore",
    excerpt: "Internal linking is one of the most powerful SEO tactics, yet most bloggers do it wrong. Learn how to build a strategic internal linking structure that boosts rankings.",
    category: "SEO",
    readTime: "9 min read",
    date: "March 13, 2026",
    icon: Target,
  },
];

export default function BlogIndexContent() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md glow-button flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold gradient-text">BloggerSEO</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/auth/register">
              <Button size="sm" className="glow-button text-white">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 md:py-20 px-4 text-center border-b border-border/50">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Blogger SEO <span className="gradient-text">Blog</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Expert guides, SEO strategies, and AI content writing tips to help you rank higher on Google and grow your Blogger blog.
          </p>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <Link key={article.slug} href={`/blog/${article.slug}`}>
                <article className="rounded-xl border border-border/50 bg-card/50 p-6 hover:border-primary/30 transition-all hover:shadow-lg h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 rounded-lg glow-button flex items-center justify-center">
                      <article.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-primary">{article.category}</span>
                  </div>
                  <h2 className="text-xl font-bold mb-3 line-clamp-2">{article.title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3 flex-grow">
                    {article.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t border-border/50">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {article.date}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {article.readTime}
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 border-t border-border/50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to Automate Your Blogger Content?</h2>
          <p className="text-muted-foreground mb-6">
            Stop spending hours writing articles. Let BloggerSEO generate SEO-optimized content for you in minutes.
          </p>
          <Link href="/auth/register">
            <Button className="glow-button text-white px-6">
              Start Free Trial <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} BloggerSEO. All rights reserved.</span>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
            <Link href="/contact" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
