"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  PenTool,
  Image,
  Send,
  BarChart3,
  Globe,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  FileText,
  Tags,
  Eye,
  Clock,
  Rocket,
  Star,
  ChevronRight,
  Menu,
  X,
  User,
  LayoutDashboard,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const FEATURES = [
  {
    icon: Zap,
    title: "1-Click Article Generation",
    description:
      "Enter a keyword and get a complete, SEO-optimized article with title, headings, FAQs, and meta descriptions.",
    color: "from-indigo-500 to-violet-500",
  },
  {
    icon: Image,
    title: "AI Image Studio",
    description:
      "Generate stunning featured images and section visuals with AI. Includes alt text generation for SEO.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: PenTool,
    title: "Blogger-Perfect Formatting",
    description:
      "Auto-formats your content with clean HTML, styled blocks, tables, FAQs, and CTAs that look great on any Blogger theme.",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Tags,
    title: "Smart Labels & SEO",
    description:
      "AI suggests relevant labels, generates meta descriptions, and optimizes heading structure for search engines.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: Send,
    title: "Draft & Publish",
    description:
      "Save as draft, publish instantly, or update existing posts. Full control over your Blogger publishing workflow.",
    color: "from-blue-500 to-indigo-500",
  },
  {
    icon: Globe,
    title: "Multi-Language Support",
    description:
      "Generate content in any language. Perfect for Arabic bloggers, multilingual sites, and global audiences.",
    color: "from-cyan-500 to-blue-500",
  },
];

const STEPS = [
  {
    step: 1,
    title: "Connect Blogger",
    description: "Sign in with Google and select your blog",
    icon: Globe,
  },
  {
    step: 2,
    title: "Enter Keyword",
    description: "Type your target keyword and set preferences",
    icon: FileText,
  },
  {
    step: 3,
    title: "Generate Content",
    description: "AI creates title, outline, article, and images",
    icon: Sparkles,
  },
  {
    step: 4,
    title: "Review & Publish",
    description: "Edit, add labels, and publish to Blogger",
    icon: Rocket,
  },
];

const TEMPLATES = [
  "How-To Guide",
  "Listicle",
  "Product Review",
  "Comparison",
  "Q&A Article",
  "Informational",
  "Affiliate Post",
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setUserEmail(user?.email || null);
    };
    checkAuth();
  }, []);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
            ? "bg-background/80 backdrop-blur-xl border-b border-border/50"
            : "bg-transparent"
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg glow-button flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold gradient-text">BloggerSEO</span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                How It Works
              </a>
              <a
                href="#templates"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Templates
              </a>
              <a
                href="#pricing"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </a>
            </div>

            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <Link href="/dashboard">
                    <Button
                      size="sm"
                      className="glow-button text-white border-0 px-6"
                    >
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-sm">
                    <User className="w-4 h-4" />
                    <span className="text-muted-foreground">{userEmail?.split('@')[0]}</span>
                  </div>
                </>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="ghost" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth/login">
                    <Button
                      size="sm"
                      className="glow-button text-white border-0 px-6"
                    >
                      Get Started Free
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border">
            <div className="px-4 py-4 space-y-3">
              <a
                href="#features"
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                How It Works
              </a>
              <a
                href="#templates"
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                Templates
              </a>
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button className="w-full glow-button text-white border-0 mt-2">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href="/auth/login">
                  <Button className="w-full glow-button text-white border-0 mt-2">
                    Get Started Free
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center">
          <div className="animate-slide-up opacity-0 stagger-1">
            <Badge
              variant="secondary"
              className="mb-6 px-4 py-1.5 text-sm glass-card border-violet-500/20"
            >
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block mr-2 animate-pulse-dot" />
              Now in Beta — Free to Try
            </Badge>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6 animate-slide-up opacity-0 stagger-2">
            <span className="gradient-text">Automate Your Blogger Content</span>
            <br />
            <span className="text-foreground/90">AI-Powered Article Generator for Blogger Platform</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up opacity-0 stagger-3">
            Save 10+ hours per week with AI blogger automation. Generate SEO-optimized articles, 
            images, and publish directly to Blogger. Perfect for content creators who want to scale 
            their Blogger sites effortlessly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up opacity-0 stagger-4">
            <Link href="/dashboard">
              <Button
                size="lg"
                className="glow-button text-white border-0 px-8 h-12 text-base"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Start Writing Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button
                variant="outline"
                size="lg"
                className="glass-card h-12 text-base px-8"
              >
                <Eye className="w-5 h-5 mr-2" />
                See How It Works
              </Button>
            </a>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto animate-slide-up opacity-0 stagger-5">
            {[
              { value: "1-Click", label: "Article Generation" },
              { value: "7+", label: "Article Templates" },
              { value: "100%", label: "Blogger Native" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold gradient-text">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero visual mockup */}
        <div className="max-w-4xl mx-auto mt-16 animate-slide-up opacity-0 stagger-5">
          <div className="gradient-border rounded-xl overflow-hidden">
            <div className="bg-card/80 p-1 rounded-xl">
              <div className="bg-background/60 rounded-lg p-6 sm:p-8">
                {/* Fake UI */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  <div className="flex-1 h-7 rounded-md bg-muted/50 flex items-center px-3">
                    <span className="text-xs text-muted-foreground">
                      bloggerseo.com/dashboard/new
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="h-3 w-24 rounded bg-violet-500/30" />
                    <div className="h-10 rounded-md bg-muted/30 border border-border/50 flex items-center px-3">
                      <span className="text-sm text-muted-foreground">
                        best coffee machines 2025
                      </span>
                    </div>
                    <div className="h-3 w-20 rounded bg-violet-500/30 mt-4" />
                    <div className="flex gap-2 flex-wrap">
                      {["English", "Professional", "2000 words"].map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/20"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="h-10 rounded-md glow-button flex items-center justify-center mt-4">
                      <span className="text-sm text-white font-medium">
                        ✨ Generate Article
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-3 w-32 rounded bg-violet-500/30" />
                    {[
                      "✅ 10 Best Coffee Machines for Home...",
                      "✅ Top Coffee Machines Reviewed...",
                      "✅ Ultimate Guide to Coffee Machines...",
                      "⏳ Best Coffee Machines Under $200...",
                      "⏳ Coffee Machine Comparison Chart...",
                    ].map((item) => (
                      <div
                        key={item}
                        className="h-8 rounded-md bg-muted/20 border border-border/30 flex items-center px-3"
                      >
                        <span className="text-xs text-muted-foreground">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge
              variant="secondary"
              className="mb-4 px-4 py-1 glass-card border-violet-500/20"
            >
              Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need to{" "}
              <span className="gradient-text">Dominate Blogger</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From keyword to published post — our AI handles the entire content
              pipeline so you can focus on growing your blog.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className="glass-card rounded-xl p-6 hover:scale-[1.02] transition-all duration-300 group"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge
              variant="secondary"
              className="mb-4 px-4 py-1 glass-card border-violet-500/20"
            >
              How It Works
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              From Keyword to Published Post in{" "}
              <span className="gradient-text">4 Simple Steps</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <div key={step.step} className="relative">
                <div className="glass-card rounded-xl p-6 text-center hover:scale-[1.03] transition-all duration-300">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mx-auto mb-4">
                    <step.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-xs font-semibold text-violet-400 mb-2">
                    STEP {step.step}
                  </div>
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                    <ChevronRight className="w-6 h-6 text-violet-500/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates Section */}
      <section id="templates" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge
              variant="secondary"
              className="mb-4 px-4 py-1 glass-card border-violet-500/20"
            >
              Templates
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="gradient-text">7 Article Templates</span> Built
              for Every Niche
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose a template and the AI follows the perfect structure for that
              content type — from how-to guides to affiliate reviews.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {TEMPLATES.map((template) => (
              <div
                key={template}
                className="glass-card rounded-full px-6 py-3 hover:scale-105 transition-all duration-200 cursor-default group"
              >
                <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">
                  {template}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <Badge
              variant="secondary"
              className="mb-4 px-4 py-1 glass-card border-violet-500/20"
            >
              Pricing
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Start for <span className="gradient-text">Free</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Try BloggerSEO with 5 free articles. Upgrade for more articles
              and premium features at 40-60% less than competitors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Free */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-1">Free</h3>
              <div className="text-3xl font-bold mb-4">
                $0<span className="text-sm text-muted-foreground">/mo</span>
              </div>
              <ul className="space-y-3 mb-6">
                {["5 articles/month", "1 blog", "SEO optimization", "10 keyword searches"].map(
                  (f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                      {f}
                    </li>
                  )
                )}
              </ul>
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  className="w-full glass-card"
                >
                  Get Started
                </Button>
              </Link>
            </div>

            {/* Starter */}
            <div className="gradient-border rounded-xl">
              <div className="bg-card rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 px-3 py-1 text-xs font-semibold bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-bl-lg">
                  POPULAR
                </div>
                <h3 className="text-lg font-semibold mb-1">Starter</h3>
                <div className="text-3xl font-bold mb-4">
                  $12<span className="text-sm text-muted-foreground">/mo</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {[
                    "30 articles/month",
                    "2 blogs",
                    "10 AI images",
                    "50 keyword searches",
                    "Bulk generation",
                    "Auto-publish",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/dashboard">
                  <Button className="w-full glow-button text-white border-0">
                    Start Free Trial
                  </Button>
                </Link>
              </div>
            </div>

            {/* Pro */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-1">Pro</h3>
              <div className="text-3xl font-bold mb-4">
                $39<span className="text-sm text-muted-foreground">/mo</span>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  "100 articles/month",
                  "5 blogs",
                  "50 AI images",
                  "200 keyword searches",
                  "Analytics dashboard",
                  "Priority support",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/pricing">
                <Button
                  variant="outline"
                  className="w-full glass-card"
                >
                  Learn More
                </Button>
              </Link>
            </div>

            {/* Enterprise */}
            <div className="glass-card rounded-xl p-6 border-amber-500/30">
              <h3 className="text-lg font-semibold mb-1">Enterprise</h3>
              <div className="text-3xl font-bold mb-4">
                $99<span className="text-sm text-muted-foreground">/mo</span>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  "300 articles/month",
                  "Unlimited blogs",
                  "200 AI images",
                  "Unlimited searches",
                  "API access",
                  "Team (3 members)",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/pricing">
                <Button
                  variant="outline"
                  className="w-full glass-card"
                >
                  Contact Sales
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="gradient-border rounded-2xl p-1">
            <div className="bg-card rounded-2xl p-12">
              <Sparkles className="w-12 h-12 text-violet-400 mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">
                Ready to Automate Your{" "}
                <span className="gradient-text">Blogger Content?</span>
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Join bloggers who are publishing SEO-optimized content 10x
                faster with AI. Start your free trial today.
              </p>
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="glow-button text-white border-0 px-10 h-12"
                >
                  <Rocket className="w-5 h-5 mr-2" />
                  Start Writing Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md glow-button flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold gradient-text">BloggerSEO</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="#features"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </a>
            <span className="text-xs text-muted-foreground">
              © 2025 BloggerSEO. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
