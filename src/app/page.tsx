"use client";

import { useState, useEffect, useRef } from "react";
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
  Eye,
  Rocket,
  Star,
  ChevronRight,
  Menu,
  X,
  User,
  LayoutDashboard,
  Search,
  TrendingUp,
  RefreshCw,
  Network,
  Lightbulb,
  Calendar,
  Activity,
  Link as LinkIcon,
  ShoppingCart,
  Megaphone,
  Shield,
  Layers,
  Crown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ─── Scroll reveal hook ──────────────────────────────────────────
function Reveal({ children, className = "", delay = 0, direction = "up" }: {
  children: React.ReactNode; className?: string; delay?: number; direction?: "up" | "left" | "right";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.unobserve(el); } },
      { threshold: 0.12, rootMargin: "0px 0px -30px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const cls = direction === "left" ? "fade-in-left" : direction === "right" ? "fade-in-right" : "fade-in-up";
  return <div ref={ref} className={`${cls} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

// ─── Animated counter ────────────────────────────────────────────
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const dur = 1400, t0 = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - t0) / dur, 1);
          setCount(Math.round(target * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

// ─── Data ────────────────────────────────────────────────────────

const TOOL_CATEGORIES = [
  {
    id: "creation",
    title: "Content Creation",
    icon: PenTool,
    tools: [
      { icon: PenTool, name: "Article Writer", desc: "Generate complete SEO-optimized articles from a single keyword — title, headings, FAQs, meta, and Blogger-ready HTML.", color: "from-[#FF6600] to-amber-500" },
      { icon: Layers, name: "Bulk Generator", desc: "Generate 10, 50, or 100 articles in one batch. Scale your content pipeline.", color: "from-purple-500 to-pink-500", pro: true },
      { icon: Image, name: "Image Studio", desc: "Generate featured images and section visuals with SEO-optimized alt text.", color: "from-blue-500 to-indigo-500" },
      { icon: ShoppingCart, name: "Amazon Affiliate Writer", desc: "Product reviews with affiliate links, comparison tables, and buying guides.", color: "from-emerald-500 to-teal-500" },
      { icon: Megaphone, name: "Brand Voice Profiles", desc: "Save your brand tone, audience, and style. Every article matches your voice.", color: "from-rose-500 to-pink-500" },
    ],
  },
  {
    id: "seo",
    title: "SEO & Research",
    icon: Search,
    tools: [
      { icon: TrendingUp, name: "Keyword Research", desc: "Find high-opportunity keywords with search volume, difficulty, and suggestions.", color: "from-[#FF6600] to-red-500" },
      { icon: Lightbulb, name: "Trend Ideas", desc: "Discover trending topics in your niche before your competitors.", color: "from-amber-500 to-yellow-500", pro: true },
      { icon: Network, name: "Keyword Clustering", desc: "Group keywords into topic clusters. Build topical authority.", color: "from-cyan-500 to-blue-500", pro: true },
      { icon: Activity, name: "Full Site Audit", desc: "Deep-scan for 50+ SEO issues: technical, content, performance. Smart fix suggestions.", color: "from-green-500 to-emerald-500" },
      { icon: LinkIcon, name: "Internal Linker", desc: "Smart internal link suggestions. Boost link equity and reduce orphan pages.", color: "from-violet-500 to-purple-500" },
    ],
  },
  {
    id: "optimize",
    title: "Optimize & Publish",
    icon: Rocket,
    tools: [
      { icon: Sparkles, name: "Quality Pass", desc: "3-stage editorial engine: improves clarity, originality, helpfulness, and trust.", color: "from-[#FF6600] to-rose-500", pro: true },
      { icon: RefreshCw, name: "Content Refresh", desc: "Find underperforming posts and rewrite with better structure and SEO.", color: "from-indigo-500 to-blue-500", pro: true },
      { icon: Send, name: "1-Click Publish", desc: "Publish to Blogger as draft or live. Labels, scheduling, post updates.", color: "from-green-500 to-teal-500" },
      { icon: Calendar, name: "Campaign Scheduler", desc: "Schedule content campaigns. Set keywords, frequency, publish on autopilot.", color: "from-orange-500 to-amber-500", pro: true },
      { icon: BarChart3, name: "Analytics Dashboard", desc: "Track performance, publishing trends, word counts, and content ROI.", color: "from-pink-500 to-rose-500", pro: true },
    ],
  },
];

const STATS = [
  { value: 15, suffix: "+", label: "Built-in Tools" },
  { value: 7, suffix: "", label: "Article Templates" },
  { value: 50, suffix: "+", label: "SEO Checks" },
  { value: 10, suffix: "x", label: "Faster Content" },
];

const STEPS = [
  { step: 1, title: "Connect Blogger", desc: "Sign in with Google and link your Blogger account in seconds.", icon: Globe },
  { step: 2, title: "Choose Your Tool", desc: "Write an article, run an audit, research keywords, or schedule a campaign.", icon: Search },
  { step: 3, title: "Generate & Optimize", desc: "Content is generated, optimized, and formatted — ready for Blogger.", icon: Sparkles },
  { step: 4, title: "Review & Publish", desc: "Preview, edit, polish with Quality Pass, and publish to your blog.", icon: Rocket },
];

const REVIEWS = [
  { name: "Sarah K.", role: "Travel Blogger", text: "BloggerSEO cut my content creation time from 8 hours to 30 minutes per article. The Quality Pass makes every article read like an expert wrote it." },
  { name: "Ahmed R.", role: "Tech Reviewer", text: "The Amazon Affiliate writer is a game-changer. Product reviews with comparison tables in minutes. My revenue doubled." },
  { name: "Maria L.", role: "Food Blogger", text: "The Site Audit found 23 SEO issues I had no idea about. Smart fix suggestions saved me hours. Organic traffic up 40%." },
  { name: "David C.", role: "Agency Owner", text: "We manage 12 Blogger sites. Bulk Generator and Campaign Scheduler let us publish 100+ articles per month on autopilot." },
];

const TEMPLATES = ["How-To Guide", "Listicle", "Product Review", "Comparison", "Q&A Article", "Informational", "Affiliate Post"];

// ─── Component ───────────────────────────────────────────────────

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [activeCat, setActiveCat] = useState(0);
  const [heroWord, setHeroWord] = useState(0);
  const heroWords = ["Articles", "Reviews", "Guides", "Campaigns", "Content"];

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setUserEmail(user?.email || null);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setHeroWord(w => (w + 1) % heroWords.length), 2500);
    return () => clearInterval(t);
  }, []);

  const ctaHref = isAuthenticated ? "/dashboard" : "/auth/register";
  const ctaLabel = isAuthenticated ? "Go to Dashboard" : "Get Started Free";

  return (
    <div className="min-h-screen">
      {/* ═══ Navbar ═══ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg glow-button flex items-center justify-center"><Sparkles className="w-4 h-4 text-white" /></div>
              <span className="text-lg font-bold gradient-text">BloggerSEO</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              {[["Tools", "#tools"], ["How It Works", "#how-it-works"], ["Pricing", "#pricing"], ["Free Audit", "/free-audit"]].map(([l, h]) => (
                <a key={h} href={h} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</a>
              ))}
            </div>
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <Link href="/dashboard"><Button size="sm" className="glow-button text-white border-0 px-6"><LayoutDashboard className="w-4 h-4 mr-2" />Dashboard</Button></Link>
              ) : (
                <>
                  <Link href="/auth/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
                  <Link href="/auth/register"><Button size="sm" className="glow-button text-white border-0 px-6">Get Started Free <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
                </>
              )}
            </div>
            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border">
            <div className="px-4 py-4 space-y-3">
              {[["Tools", "#tools"], ["How It Works", "#how-it-works"], ["Pricing", "#pricing"], ["Free Audit", "/free-audit"]].map(([l, h]) => (
                <a key={h} href={h} className="block text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>{l}</a>
              ))}
              <Link href={ctaHref}><Button className="w-full glow-button text-white border-0 mt-2">{ctaLabel}</Button></Link>
            </div>
          </div>
        )}
      </nav>

      {/* ═══ Hero ═══ */}
      <section className="relative pt-28 pb-16 px-4 overflow-hidden">
        <div className="absolute inset-0 grid-pattern" />
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="animate-slide-up opacity-0 stagger-1">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm glass-card border-[#FF6600]/20">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block mr-2 animate-pulse-dot" />
              15+ Tools for Blogger — Start Free
            </Badge>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6 animate-slide-up opacity-0 stagger-2">
            <span className="text-foreground/90">Generate SEO</span>{" "}
            <span className="gradient-text inline-block min-w-[180px] sm:min-w-[260px] text-left" key={heroWord}>
              {heroWords[heroWord]}
            </span>
            <br />
            <span className="text-foreground/70 text-3xl sm:text-4xl md:text-5xl">for Blogger — Faster</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up opacity-0 stagger-3">
            The all-in-one content platform built for Blogger. Write articles, audit SEO, research keywords,
            refresh old content, and publish — all from one dashboard.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up opacity-0 stagger-4">
            <Link href={ctaHref}>
              <Button size="lg" className="glow-button text-white border-0 px-8 h-12 text-base group">
                <Sparkles className="w-5 h-5 mr-2" />
                {ctaLabel}
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <a href="#tools">
              <Button variant="outline" size="lg" className="glass-card h-12 text-base px-8">
                <Eye className="w-5 h-5 mr-2" />Explore All Tools
              </Button>
            </a>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative max-w-3xl mx-auto mt-16 animate-slide-up opacity-0 stagger-5">
          <div className="glass-card rounded-2xl p-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold gradient-text"><Counter target={s.value} suffix={s.suffix} /></div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Tool ticker (marquee) ═══ */}
      <section className="py-6 overflow-hidden border-y border-border/30 bg-muted/20">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...TOOL_CATEGORIES.flatMap(c => c.tools), ...TOOL_CATEGORIES.flatMap(c => c.tools)].map((t, i) => (
            <div key={i} className="flex items-center gap-2 mx-6 text-sm text-muted-foreground shrink-0">
              <t.icon className="w-4 h-4 text-[#FF6600]/60" />
              <span>{t.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ All Tools Section ═══ */}
      <section id="tools" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4 px-4 py-1 glass-card border-[#FF6600]/20">All Tools</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Every Tool You Need to <span className="gradient-text">Dominate Blogger</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From keyword research to published post — every step of the content pipeline, handled.
              </p>
            </div>
          </Reveal>

          {/* Category tabs */}
          <Reveal delay={100}>
            <div className="flex justify-center gap-2 mb-10 flex-wrap">
              {TOOL_CATEGORIES.map((cat, i) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(i)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${activeCat === i
                    ? "bg-[#FF6600] text-white shadow-md shadow-[#FF6600]/20"
                    : "glass-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <cat.icon className="w-4 h-4" />{cat.title}
                </button>
              ))}
            </div>
          </Reveal>

          {/* Tool cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {TOOL_CATEGORIES[activeCat].tools.map((tool, i) => (
              <Reveal key={tool.name} delay={i * 80}>
                <div className="glass-card rounded-xl p-6 hover:scale-[1.02] transition-all duration-300 group h-full relative">
                  {tool.pro && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-[#FF6600]/10 text-[#FF6600] border-[#FF6600]/20 text-[10px]"><Crown className="w-3 h-3 mr-1" />Pro</Badge>
                    </div>
                  )}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <tool.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{tool.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{tool.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* See all CTA */}
          <Reveal delay={200}>
            <div className="text-center mt-10">
              <p className="text-sm text-muted-foreground mb-3">That&apos;s {TOOL_CATEGORIES.flatMap(c => c.tools).length} tools — and we&apos;re adding more every month.</p>
              <Link href={ctaHref}>
                <Button className="glow-button text-white border-0 px-8">Try All Tools Free <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ How it Works ═══ */}
      <section id="how-it-works" className="py-20 px-4 dot-pattern">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <Badge variant="secondary" className="mb-4 px-4 py-1 glass-card border-[#FF6600]/20">How It Works</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Keyword to Published Post in <span className="gradient-text">4 Steps</span>
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <Reveal key={step.step} delay={i * 120}>
                <div className="relative">
                  <div className="glass-card rounded-xl p-6 text-center hover:scale-[1.03] transition-all duration-300 h-full">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FF6600] to-amber-400 flex items-center justify-center mx-auto mb-4 animate-gentle-bounce" style={{ animationDelay: `${i * 0.5}s` }}>
                      <step.icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-xs font-semibold text-[#FF6600] mb-2">STEP {step.step}</div>
                    <h3 className="font-semibold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2">
                      <ChevronRight className="w-6 h-6 text-[#FF6600]/40" />
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Templates ═══ */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4 px-4 py-1 glass-card border-[#FF6600]/20">Templates</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                <span className="gradient-text">7 Article Templates</span> for Every Niche
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Choose a template and the engine follows the perfect structure — from how-to guides to affiliate reviews.
              </p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="flex flex-wrap justify-center gap-3">
              {TEMPLATES.map(t => (
                <div key={t} className="glass-card rounded-full px-6 py-3 hover:scale-105 hover:border-[#FF6600]/30 transition-all duration-200 cursor-default">
                  <span className="text-sm font-medium">{t}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ Social Proof / Reviews ═══ */}
      <section className="py-20 px-4 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4 px-4 py-1 glass-card border-[#FF6600]/20">Testimonials</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Loved by <span className="gradient-text">Bloggers Worldwide</span>
              </h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {REVIEWS.map((r, i) => (
              <Reveal key={r.name} delay={i * 100}>
                <div className="glass-card rounded-xl p-6 h-full">
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 fill-[#FF6600] text-[#FF6600]" />)}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">&ldquo;{r.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF6600] to-amber-400 flex items-center justify-center text-white text-sm font-bold">
                      {r.name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.role}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Pricing Preview ═══ */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4 px-4 py-1 glass-card border-[#FF6600]/20">Pricing</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Start for <span className="gradient-text">Free</span></h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Try every core tool free. Upgrade for bulk generation, Quality Pass, campaigns, and more — at 40-60% less than competitors.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {/* Free */}
            <Reveal delay={0}>
              <div className="glass-card rounded-xl p-6 h-full flex flex-col">
                <h3 className="text-lg font-semibold mb-1">Free</h3>
                <div className="text-3xl font-bold mb-4">$0<span className="text-sm text-muted-foreground font-normal">/mo</span></div>
                <ul className="space-y-2 mb-6 flex-1">
                  {["5 articles/month", "1 blog connected", "Keyword research", "Site audit", "Internal linker", "SEO optimization"].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/register"><Button variant="outline" className="w-full glass-card">Get Started</Button></Link>
              </div>
            </Reveal>

            {/* Starter */}
            <Reveal delay={80}>
              <div className="glass-card rounded-xl p-6 h-full flex flex-col">
                <h3 className="text-lg font-semibold mb-1">Starter</h3>
                <div className="text-3xl font-bold mb-4">$12<span className="text-sm text-muted-foreground font-normal">/mo</span></div>
                <ul className="space-y-2 mb-6 flex-1">
                  {["30 articles/month", "2 blogs connected", "10 images/month", "Bulk generation", "Scheduling", "Keyword clustering", "Brand voices", "Amazon affiliate writer"].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link href="/pricing"><Button variant="outline" className="w-full glass-card">Start Free Trial</Button></Link>
              </div>
            </Reveal>

            {/* Pro — highlighted */}
            <Reveal delay={160}>
              <div className="relative glass-card rounded-xl p-6 h-full flex flex-col border-[#FF6600]/40 ring-1 ring-[#FF6600]/20">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-[#FF6600] text-white border-0 px-3">Most Popular</Badge>
                </div>
                <h3 className="text-lg font-semibold mb-1">Pro</h3>
                <div className="text-3xl font-bold mb-4">$39<span className="text-sm text-muted-foreground font-normal">/mo</span></div>
                <ul className="space-y-2 mb-6 flex-1">
                  {["100 articles/month", "5 blogs connected", "50 images", "Quality Pass", "Content Refresh", "Bulk generation", "Campaign scheduler", "Analytics dashboard", "Priority support"].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-[#FF6600] shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link href="/pricing"><Button className="w-full glow-button text-white border-0">Start Free Trial</Button></Link>
              </div>
            </Reveal>

            {/* Enterprise */}
            <Reveal delay={240}>
              <div className="glass-card rounded-xl p-6 h-full flex flex-col">
                <h3 className="text-lg font-semibold mb-1">Enterprise</h3>
                <div className="text-3xl font-bold mb-4">$99<span className="text-sm text-muted-foreground font-normal">/mo</span></div>
                <ul className="space-y-2 mb-6 flex-1">
                  {["300 articles/month", "Unlimited blogs", "200 images", "Everything in Pro", "API access", "White-label", "Team access (3 seats)", "Dedicated support"].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link href="/pricing"><Button variant="outline" className="w-full glass-card">Learn More</Button></Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={150}>
            <p className="text-center text-sm text-muted-foreground mt-6">
              All paid plans include a 7-day free trial. No credit card required. <Link href="/pricing" className="text-[#FF6600] hover:underline">See full comparison &rarr;</Link>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ═══ Free Audit CTA ═══ */}
      <section className="py-16 px-4 bg-gradient-to-r from-[#FF6600]/5 via-amber-50/30 to-orange-50/20">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="glass-card rounded-2xl p-8 sm:p-12 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-5 h-5 text-[#FF6600]" />
                  <span className="text-sm font-semibold text-[#FF6600]">FREE TOOL</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold mb-3">Audit Your Blog&apos;s SEO — Free</h3>
                <p className="text-muted-foreground mb-4">
                  Get an instant SEO health score for your Blogger site. We scan up to 5 pages, check 50+ issues, and give you an actionable report. No sign-up required.
                </p>
                <Link href="/free-audit">
                  <Button size="lg" className="glow-button text-white border-0 px-8 group">
                    <Shield className="w-5 h-5 mr-2" />
                    Run Free SEO Audit
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
              <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-[#FF6600]/10 to-amber-100/30 flex items-center justify-center shrink-0">
                <div className="text-center">
                  <div className="text-5xl font-bold gradient-text">A+</div>
                  <div className="text-xs text-muted-foreground mt-1">SEO Score</div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ Final CTA ═══ */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <div className="glass-card rounded-2xl p-10 sm:p-14 border-[#FF6600]/10">
              <Sparkles className="w-12 h-12 text-[#FF6600] mx-auto mb-6 animate-gentle-bounce" />
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to Automate Your <span className="gradient-text">Blogger Content?</span>
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Join thousands of bloggers publishing SEO-optimized content 10x faster. Free to start, no credit card required.
              </p>
              <Link href={ctaHref}>
                <Button size="lg" className="glow-button text-white border-0 px-10 h-12 group">
                  <Rocket className="w-5 h-5 mr-2" />{ctaLabel}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="border-t border-border/50 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-md glow-button flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-white" /></div>
                <span className="text-sm font-bold gradient-text">BloggerSEO</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The all-in-one content platform built exclusively for Blogger. Generate, optimize, and publish SEO content at scale.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">Product</h4>
              <div className="space-y-2">
                {[["Article Writer", "#tools"], ["Keyword Research", "#tools"], ["Site Audit", "/free-audit"], ["Quality Pass", "#tools"]].map(([l, h]) => (
                  <a key={l} href={h} className="block text-xs text-muted-foreground hover:text-foreground transition-colors">{l}</a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">Resources</h4>
              <div className="space-y-2">
                {[["Pricing", "/pricing"], ["Free SEO Audit", "/free-audit"], ["Templates", "#tools"]].map(([l, h]) => (
                  <a key={l} href={h} className="block text-xs text-muted-foreground hover:text-foreground transition-colors">{l}</a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">Get Started</h4>
              <div className="space-y-2">
                <Link href="/auth/register" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Sign Up Free</Link>
                <Link href="/auth/login" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
                <Link href="/dashboard" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-border/50 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} BloggerSEO. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <a href="#tools" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <Link href="/free-audit" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Free Audit</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
