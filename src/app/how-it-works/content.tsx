"use client";

import Link from "next/link";
import { Sparkles, ArrowLeft, ArrowRight, Search, FileText, Send, BarChart3, Zap, Shield, RefreshCw, Image, PenTool, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Enter Your Keyword",
    description: "Type in your target keyword or topic. BloggerSEO analyzes search intent, competition, and trending angles to craft the perfect content strategy for your niche.",
    details: [
      "AI-powered keyword analysis with search volume data",
      "Automatic title generation optimized for CTR",
      "Smart outline creation with H2/H3 structure",
      "LSI keyword suggestions for topical authority",
    ],
  },
  {
    number: "02",
    icon: PenTool,
    title: "Generate SEO-Optimized Content",
    description: "Our AI writes comprehensive, human-quality articles with proper SEO structure, internal links, external authority links, images, FAQ sections, and schema markup — all in one click.",
    details: [
      "2,000-5,000+ word articles with rich paragraphs",
      "Automatic image generation and placement",
      "Internal and external linking built in",
      "FAQ schema, comparison tables, and structured data",
    ],
  },
  {
    number: "03",
    icon: Send,
    title: "Auto-Publish to Blogger",
    description: "One click publishes your article directly to your Blogger blog — formatted, optimized, and ready to rank. Schedule posts or publish immediately.",
    details: [
      "Direct Blogger API integration",
      "Schedule posts for optimal timing",
      "Bulk generation and publishing",
      "Labels and categories auto-assigned",
    ],
  },
];

const features = [
  { icon: Zap, title: "Bulk Generator", desc: "Generate 10, 50, or 100+ articles at once. Perfect for scaling content production across multiple blogs." },
  { icon: BarChart3, title: "SEO Site Audit", desc: "Free comprehensive audit that checks on-page SEO, technical issues, content quality, and provides actionable fixes." },
  { icon: RefreshCw, title: "Content Refresh", desc: "Update outdated articles with current data, improved SEO, and fresh insights — all with one click." },
  { icon: Shield, title: "Quality Pass", desc: "AI-powered editing that humanizes content, fixes readability issues, and ensures every article passes AI detection." },
  { icon: Image, title: "AI Image Generation", desc: "Automatically generate unique, relevant featured and inline images for every article you create." },
  { icon: FileText, title: "Smart Internal Linking", desc: "Automatically finds and inserts relevant internal links between your blog posts for better SEO structure." },
];

export default function HowItWorksContent() {
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
      <section className="py-16 md:py-24 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            How <span className="gradient-text">BloggerSEO</span> Works
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From keyword to published article in under 5 minutes. Our AI handles research, writing, SEO optimization, image creation, and publishing — so you can focus on growing your blog.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto space-y-16">
          {steps.map((step, i) => (
            <div key={step.number} className={`flex flex-col ${i % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-8 md:gap-12`}>
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-bold gradient-text opacity-50">{step.number}</span>
                  <div className="w-10 h-10 rounded-lg glow-button flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold">{step.title}</h2>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                <ul className="space-y-2 pt-2">
                  {step.details.map((d) => (
                    <li key={d} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full">
                <div className="rounded-xl border border-border/50 bg-card/50 p-8 flex items-center justify-center min-h-[220px]">
                  <step.icon className="w-20 h-20 text-muted-foreground/20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Arrow connector */}
      <div className="flex justify-center py-4">
        <ArrowRight className="w-8 h-8 text-muted-foreground/30 rotate-90" />
      </div>

      {/* Result */}
      <section className="py-12 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600 text-sm font-medium mb-4">
            <CheckCircle2 className="w-4 h-4" />
            Published & Ranking
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Your Article Is Live</h2>
          <p className="text-muted-foreground">
            A fully optimized, human-quality article is now live on your Blogger blog — complete with images, internal links, external authority links, FAQ schema, and structured data. Ready to rank on Google.
          </p>
        </div>
      </section>

      {/* All Features */}
      <section className="py-16 px-4 border-t border-border/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">Everything You Need to Scale Your Blog</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            BloggerSEO is the most complete content automation platform built exclusively for Blogger users.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-border/50 bg-card/50 p-6 hover:border-primary/30 transition-colors">
                <div className="w-10 h-10 rounded-lg glow-button flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to Automate Your Blogger Content?</h2>
          <p className="text-muted-foreground mb-6">
            Join thousands of Blogger users who save 10+ hours per week with BloggerSEO. Start with our free plan — no credit card required.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/auth/register">
              <Button className="glow-button text-white px-6">
                Start Free <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" className="px-6">View Pricing</Button>
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
