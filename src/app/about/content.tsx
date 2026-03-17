"use client";

import Link from "next/link";
import { Sparkles, ArrowLeft, ArrowRight, Target, Zap, Users, Globe, CheckCircle2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

const stats = [
  { value: "10,000+", label: "Articles Generated" },
  { value: "2,500+", label: "Active Bloggers" },
  { value: "50+", label: "Countries" },
  { value: "99.9%", label: "Uptime" },
];

const values = [
  { icon: Target, title: "Built for Blogger", desc: "Every feature is designed specifically for Google Blogger users. We don't try to be everything — we're the best at what we do." },
  { icon: Zap, title: "AI-First Approach", desc: "We use cutting-edge AI models to generate content that's indistinguishable from human-written articles, with built-in SEO optimization." },
  { icon: Users, title: "User-Centric Design", desc: "Our platform is intuitive enough for beginners yet powerful enough for professional content creators and SEO agencies." },
  { icon: Heart, title: "Quality Over Quantity", desc: "We'd rather you publish 10 excellent articles than 100 mediocre ones. Every tool is built to maximize content quality." },
  { icon: Globe, title: "Global Reach", desc: "Multi-language support lets you create content for audiences worldwide, with proper localization and cultural sensitivity." },
  { icon: CheckCircle2, title: "Transparent Pricing", desc: "No hidden fees, no surprise charges. Our free plan is genuinely useful, and paid plans are priced fairly for the value delivered." },
];

export default function AboutContent() {
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
          <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 md:py-24 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            About <span className="gradient-text">BloggerSEO</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We built the content automation platform we wished existed when we were scaling our own Blogger blogs. Now thousands of bloggers use it every day.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center p-4 rounded-xl border border-border/50 bg-card/50">
              <div className="text-2xl md:text-3xl font-bold gradient-text">{s.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold">Our Story</h2>
          <p className="text-muted-foreground leading-relaxed">
            BloggerSEO was born out of a real frustration. As Blogger users ourselves, we spent hours every week researching keywords, writing articles, optimizing for SEO, creating images, and manually publishing content. Existing tools either didn&apos;t support Blogger at all, or treated it as an afterthought.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            So we built BloggerSEO — the first and only content automation platform designed exclusively for Google Blogger. Our AI doesn&apos;t just generate generic content; it creates comprehensive, SEO-optimized articles with proper heading structure, internal and external links, FAQ schemas, comparison tables, and even AI-generated images — all formatted perfectly for Blogger&apos;s HTML editor.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Today, BloggerSEO helps thousands of bloggers across 50+ countries create professional-quality content at scale. Whether you&apos;re running a personal blog, managing multiple niche sites, or building an affiliate content business, our tools save you 10+ hours per week while improving your content quality and search rankings.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 px-4 border-t border-border/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Our Mission</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            To make professional-quality, SEO-optimized content accessible to every Blogger user — from solo bloggers to content teams — through intelligent automation that respects quality, authenticity, and search engine best practices.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">What Drives Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((v) => (
              <div key={v.title} className="rounded-xl border border-border/50 bg-card/50 p-6">
                <div className="w-10 h-10 rounded-lg glow-button flex items-center justify-center mb-4">
                  <v.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 border-t border-border/50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Start Creating Better Content Today</h2>
          <p className="text-muted-foreground mb-6">
            Join thousands of Blogger users who&apos;ve transformed their content workflow with BloggerSEO.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/auth/register">
              <Button className="glow-button text-white px-6">
                Get Started Free <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/how-it-works">
              <Button variant="outline" className="px-6">How It Works</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} BloggerSEO. All rights reserved.</span>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
            <Link href="/disclaimer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Disclaimer</Link>
            <Link href="/refund-policy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Refund Policy</Link>
            <Link href="/contact" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
