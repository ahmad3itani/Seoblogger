"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Zap, PenTool, Image, Send, BarChart3, Globe, ArrowRight,
  CheckCircle2, Sparkles, FileText, Rocket, Star, ChevronRight,
  Menu, X, Search, TrendingUp, RefreshCw, Network, Lightbulb,
  Calendar, Activity, Link as LinkIcon, ShoppingCart, Shield,
  Layers, Crown, Brain, Target, Timer, Users, Gauge, Award,
  Play, ChevronDown, Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

// ─── Reveal on scroll ───────────────────────────────────────────
function Reveal({
  children, className = "", delay = 0, direction = "up",
}: {
  children: React.ReactNode; className?: string; delay?: number;
  direction?: "up" | "left" | "right" | "scale";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.unobserve(el); } },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const cls =
    direction === "left" ? "fade-in-left" :
    direction === "right" ? "fade-in-right" :
    direction === "scale" ? "scale-in" : "fade-in-up";
  return (
    <div ref={ref} className={`${cls} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// ─── Animated counter ───────────────────────────────────────────
function Counter({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const dur = 1600;
        const t0 = performance.now();
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
  return <span ref={ref} className="stat-number">{prefix}{count}{suffix}</span>;
}

// ─── Tilt card ──────────────────────────────────────────────────
function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width  - 0.5) * 12;
    const y = ((e.clientY - r.top)  / r.height - 0.5) * -12;
    el.style.transform = `perspective(900px) rotateX(${y}deg) rotateY(${x}deg) translateZ(4px)`;
  }, []);
  const onLeave = useCallback(() => {
    const el = ref.current;
    if (el) el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)";
  }, []);
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
      style={{ transition: "transform 0.15s ease", transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  );
}

// ─── Data ────────────────────────────────────────────────────────

// icon accent color values (static — no dynamic class names)
const C = {
  orange: { bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.25)", text: "#F97316" },
  blue:   { bg: "rgba(59,130,246,0.10)",  border: "rgba(59,130,246,0.22)",  text: "#3B82F6" },
  purple: { bg: "rgba(139,92,246,0.10)", border: "rgba(139,92,246,0.22)", text: "#8B5CF6" },
  green:  { bg: "rgba(34,197,94,0.10)",   border: "rgba(34,197,94,0.20)",   text: "#22C55E" },
} as const;
type CKey = keyof typeof C;

// span: 1 = single column, 2 = double column (lg:col-span-2 applied via ternary)
const FEATURES: Array<{
  icon: any; title: string; span: 1 | 2; desc: string;
  badge: string; color: CKey;
  preview?: Array<{ label: string; val: string }>;
  stat?: { val: number; suffix: string; label: string };
}> = [
  {
    icon: Brain, title: "AI Article Writer", span: 2,
    desc: "Generate complete, 3000+ word SEO articles from a single keyword. Real SERP data. E-E-A-T signals. Blogger-ready HTML in one click.",
    badge: "Most Popular", color: "orange",
    preview: [
      { label: "Keyword", val: "best running shoes 2026" },
      { label: "Words",   val: "3,200" },
      { label: "SEO Score", val: "94 / 100" },
    ],
  },
  {
    icon: Gauge, title: "Full Site Audit", span: 1,
    desc: "Scan 50+ SEO signals — technical issues, broken links, thin content, missing meta. Smart fix suggestions included.",
    badge: "Free", color: "blue",
    stat: { val: 50, suffix: "+", label: "SEO checks" },
  },
  {
    icon: Target, title: "Keyword Research", span: 1,
    desc: "Find high-opportunity keywords with real search volume, difficulty scores, and topic cluster suggestions.",
    badge: "Free", color: "purple",
    stat: { val: 10, suffix: "k+", label: "Keywords scanned" },
  },
  {
    icon: Layers, title: "Bulk Generator", span: 2,
    desc: "Generate 10, 50, or 100 articles in a single batch. Schedule them across weeks. Your content pipeline runs itself.",
    badge: "Pro", color: "orange",
    preview: [
      { label: "Articles queued", val: "47" },
      { label: "Published",       val: "23" },
      { label: "Scheduled",       val: "24" },
    ],
  },
  {
    icon: Sparkles, title: "Quality Pass", span: 1,
    desc: "3-stage editorial engine — improves clarity, originality, and trustworthiness. Makes AI content read like a human wrote it.",
    badge: "Pro", color: "blue",
  },
  {
    icon: Send, title: "1-Click Publish", span: 1,
    desc: "Publish to Blogger as draft or live. Set labels, schedule future dates, and update existing posts.",
    badge: "Free", color: "green",
  },
  {
    icon: Image, title: "AI Image Studio", span: 1,
    desc: "FLUX.1 Schnell photorealistic images. Auto-embed with SEO alt text. Hosted on Cloudflare.",
    badge: "Free", color: "purple",
  },
];

const STEPS = [
  { n: "01", icon: Globe,    title: "Connect Blogger",      desc: "Sign in with Google. Link your Blogger blog in under 30 seconds." },
  { n: "02", icon: Search,   title: "Enter a Keyword",      desc: "Type any topic. BloggerSEO pulls live SERP data and builds your article strategy." },
  { n: "03", icon: Sparkles, title: "Generate & Optimize",  desc: "Full article generated, humanized, images added, meta description written." },
  { n: "04", icon: Rocket,   title: "Publish to Blogger",   desc: "Review your article and publish with one click — or schedule for later." },
];

const REVIEWS = [
  { name: "Sarah K.",  role: "Travel Blogger",   avatar: "SK", text: "Cut my content time from 8 hours to 30 minutes. The Quality Pass makes every article read like a pro wrote it.", stars: 5 },
  { name: "Ahmed R.",  role: "Tech Reviewer",    avatar: "AR", text: "Amazon Affiliate writer is a game-changer. Product reviews with comparison tables in minutes. Revenue doubled.", stars: 5 },
  { name: "Maria L.",  role: "Food Blogger",     avatar: "ML", text: "The Site Audit found 23 issues I had no idea about. Smart fix suggestions. Organic traffic up 40%.", stars: 5 },
  { name: "David C.",  role: "Agency Owner",     avatar: "DC", text: "We manage 12 Blogger sites. Bulk Generator runs 100+ articles/month on autopilot. Incredible ROI.", stars: 5 },
  { name: "Priya N.",  role: "Lifestyle Blogger",avatar: "PN", text: "The keyword clustering tool helped me build topical authority fast. Rankings shot up in 6 weeks.", stars: 5 },
  { name: "James W.",  role: "Finance Blogger",  avatar: "JW", text: "Finally a Blogger-specific tool. The native publish integration saves hours every week.", stars: 5 },
];

const PLANS = [
  {
    name: "Free", price: 0, period: "forever",
    features: ["5 articles / month", "Article Writer", "Site Audit", "Keyword Research", "1-Click Publish", "AI Images (5/mo)"],
    cta: "Get Started Free", featured: false,
  },
  {
    name: "Starter", price: 19, period: "/month",
    features: ["30 articles / month", "Everything in Free", "Quality Pass", "Content Refresh", "Analytics Dashboard", "AI Images (50/mo)", "Priority support"],
    cta: "Start 7-Day Trial", featured: true,
  },
  {
    name: "Pro", price: 49, period: "/month",
    features: ["Unlimited articles", "Everything in Starter", "Bulk Generator", "Campaign Scheduler", "Keyword Clustering", "Trend Discovery", "AI Images (∞)", "White-label reports"],
    cta: "Go Pro", featured: false,
  },
];

const STATS = [
  { value: 15,   suffix: "+",  prefix: "",  label: "Built-in Tools"  },
  { value: 3200, suffix: "",   prefix: "",  label: "Articles Written" },
  { value: 40,   suffix: "%",  prefix: "+", label: "Avg Traffic Lift" },
  { value: 10,   suffix: "x",  prefix: "",  label: "Faster Content"  },
];

const TEMPLATES = ["How-To Guide", "Listicle", "Product Review", "Comparison Post", "Q&A Article", "Informational", "Affiliate Post"];

const TOOLS_SHOWCASE = [
  { icon: PenTool,    name: "Article Writer",         desc: "SERP-aware, section-by-section generation for 3000+ word articles.", free: true  },
  { icon: Layers,     name: "Bulk Generator",         desc: "Batch generate 100 articles. Queue and schedule automatically.",       free: false },
  { icon: Image,      name: "AI Image Studio",        desc: "FLUX.1 photorealistic images with SEO alt text. Auto-embedded.",       free: true  },
  { icon: ShoppingCart, name: "Affiliate Writer",     desc: "Amazon product reviews, comparison tables, and buying guides.",        free: true  },
  { icon: Search,     name: "Keyword Research",       desc: "Volume, difficulty, CPC, and topic cluster suggestions.",              free: true  },
  { icon: Network,    name: "Keyword Clustering",     desc: "Group keywords into topic silos. Build topical authority.",            free: false },
  { icon: Activity,   name: "Full Site Audit",        desc: "50+ technical, content, and performance checks.",                      free: true  },
  { icon: LinkIcon,   name: "Internal Linker",        desc: "Smart link suggestions to boost equity and eliminate orphan pages.",   free: true  },
  { icon: Sparkles,   name: "Quality Pass",           desc: "3-stage humanizer — clarity, originality, E-E-A-T trust signals.",    free: false },
  { icon: RefreshCw,  name: "Content Refresh",        desc: "Rewrite underperforming posts with updated structure and keywords.",   free: false },
  { icon: Send,       name: "1-Click Publish",        desc: "Publish draft or live. Labels, scheduling, post updates.",             free: true  },
  { icon: Calendar,   name: "Campaign Scheduler",     desc: "Set keywords, frequency, and publish on autopilot.",                   free: false },
  { icon: BarChart3,  name: "Analytics Dashboard",    desc: "Track publishing trends, word counts, and content ROI.",              free: false },
  { icon: Lightbulb,  name: "Trend Discovery",        desc: "Find trending topics in your niche before competitors do.",           free: false },
  { icon: Brain,      name: "Brand Voice Profiles",   desc: "Save your tone, audience, and style. Every article matches.",         free: true  },
];

// ─── Component ───────────────────────────────────────────────────

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [heroWord, setHeroWord] = useState(0);
  const [prevWord, setPrevWord] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const heroWords = ["Articles", "Reviews", "Guides", "Campaigns", "Traffic"];

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setPrevWord(heroWord);
      setHeroWord(w => (w + 1) % heroWords.length);
    }, 2800);
    return () => clearInterval(t);
  }, [heroWord]);

  const toolCategories = [
    { label: "All Tools",     slice: [0, 15] },
    { label: "Creation",      slice: [0, 5]  },
    { label: "SEO & Research",slice: [4, 10] },
    { label: "Optimize",      slice: [9, 15] },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-space)" }}>

      {/* ── NAVBAR ── */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? "glass border-b" : ""
        }`}
        style={{
          borderColor: scrolled ? "rgba(255,255,255,0.06)" : "transparent",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg btn-primary flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span
                className="text-lg font-semibold"
                style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
              >
                BloggerSEO
              </span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6">
              {["Features", "Tools", "Pricing", "Testimonials"].map(item => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-sm font-medium transition-colors hover:text-white"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {item}
                </a>
              ))}
            </div>

            {/* CTAs */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button size="sm" className="btn-primary px-5">
                    Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/auth/signin">
                    <button className="text-sm font-medium px-4 py-2 rounded-lg btn-ghost">
                      Sign In
                    </button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button size="sm" className="btn-primary px-5">
                      Get Started Free
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile */}
            <button
              className="md:hidden p-2 rounded-lg btn-ghost"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="md:hidden glass border-t px-4 pb-5 pt-3 space-y-3"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              {["Features", "Tools", "Pricing", "Testimonials"].map(item => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {item}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <Link href="/auth/signup">
                  <Button size="sm" className="btn-primary w-full">Get Started Free</Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ══ HERO ══════════════════════════════════════════════════ */}
      <section className="hero-mesh relative pt-28 pb-20 overflow-hidden" id="hero">
        {/* Dot grid overlay */}
        <div className="absolute inset-0 dot-grid opacity-60 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">

            {/* Tag */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="tag-pill mb-6"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] animate-pulse-dot" />
              The #1 AI Tool Built Exclusively for Blogger
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] mb-6"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              Publish SEO{" "}
              <span className="relative inline-block" style={{ minWidth: "6ch" }}>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={heroWord}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                    className="gradient-text inline-block"
                  >
                    {heroWords[heroWord]}
                  </motion.span>
                </AnimatePresence>
              </span>
              <br />
              to Blogger in Minutes
            </motion.h1>

            {/* Subline */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl max-w-2xl leading-relaxed mb-10"
              style={{ color: "var(--text-secondary)" }}
            >
              AI-powered article generation, keyword research, site audits, and one-click Blogger publishing.
              Save 10+ hours/week while ranking higher.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3 mb-14"
            >
              <Link href="/auth/signup">
                <Button size="lg" className="btn-primary px-8 py-6 text-base gap-2">
                  <Zap className="w-4 h-4" />
                  Start for Free — No Card Needed
                </Button>
              </Link>
              <button
                className="btn-ghost flex items-center gap-2 px-8 py-3 text-sm font-medium rounded-xl"
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              >
                <Play className="w-4 h-4" style={{ color: "var(--brand-orange)" }} />
                See How It Works
              </button>
            </motion.div>

            {/* Trust signals */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-5 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              {[
                { icon: Shield, label: "Free forever plan" },
                { icon: Zap,    label: "Live in 60 seconds" },
                { icon: Users,  label: "3,200+ articles written" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" style={{ color: "var(--brand-orange)" }} />
                  <span>{label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Hero Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="mt-16 relative"
          >
            <div className="hero-mockup max-w-5xl mx-auto relative">
              {/* Glow effect behind mockup */}
              <div
                className="absolute inset-0 rounded-2xl opacity-40 blur-3xl"
                style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(249,115,22,0.15), rgba(59,130,246,0.08), transparent 70%)" }}
              />

              {/* Dashboard preview */}
              <div className="mockup-surface relative overflow-hidden rounded-2xl shadow-2xl">
                {/* Top bar */}
                <div
                  className="flex items-center gap-1.5 px-5 py-3 border-b"
                  style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(5,9,18,0.7)" }}
                >
                  <span className="w-3 h-3 rounded-full bg-red-500/60" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <span className="w-3 h-3 rounded-full bg-green-500/60" />
                  <span className="ml-3 text-xs font-medium px-4 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}>
                    bloggerseo.app/dashboard/write
                  </span>
                </div>

                {/* Dashboard body */}
                <div className="grid grid-cols-4 min-h-[380px]">
                  {/* Sidebar */}
                  <div
                    className="col-span-1 border-r p-4 flex flex-col gap-1"
                    style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(5,9,18,0.5)" }}
                  >
                    {[
                      { icon: PenTool, label: "Article Writer", active: true },
                      { icon: Search,  label: "Keywords",       active: false },
                      { icon: Activity,label: "Site Audit",     active: false },
                      { icon: Send,    label: "Publish",        active: false },
                      { icon: BarChart3,label: "Analytics",     active: false },
                    ].map(({ icon: Icon, label, active }) => (
                      <div
                        key={label}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                          active ? "nav-active" : ""
                        }`}
                        style={!active ? { color: "var(--text-muted)" } : {}}
                      >
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="hidden sm:block">{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Main content */}
                  <div className="col-span-3 p-5 flex flex-col gap-4">
                    {/* Input row */}
                    <div
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs"
                      style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)", color: "var(--text-secondary)" }}
                    >
                      <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--brand-orange)" }} />
                      <span>best running shoes for beginners 2026</span>
                      <div className="ml-auto btn-primary px-3 py-1 rounded-lg text-xs text-white font-medium">
                        Generate
                      </div>
                    </div>

                    {/* Generation output */}
                    <div
                      className="rounded-xl p-4 border flex-1 space-y-2"
                      style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.05)" }}
                    >
                      {/* Title */}
                      <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        10 Best Running Shoes for Beginners in 2026
                      </div>
                      {/* Body lines */}
                      {[100, 88, 94, 72, 90, 80].map((w, i) => (
                        <div
                          key={i}
                          className="h-2 rounded-full"
                          style={{ width: `${w}%`, background: "rgba(255,255,255,0.07)" }}
                        />
                      ))}
                      {/* Inline keyword highlight */}
                      <div className="flex items-center gap-2 pt-1">
                        <div className="h-2 rounded-full flex-1" style={{ background: "rgba(255,255,255,0.07)" }} />
                        <div className="h-2 w-20 rounded-full" style={{ background: "rgba(249,115,22,0.3)" }} />
                        <div className="h-2 rounded-full flex-1" style={{ background: "rgba(255,255,255,0.07)" }} />
                      </div>
                    </div>

                    {/* Metrics row */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "Words", val: "3,240", color: "orange" },
                        { label: "SEO Score", val: "94", color: "green" },
                        { label: "Readability", val: "A+", color: "blue" },
                        { label: "Images", val: "4", color: "purple" },
                      ].map(({ label, val, color }) => {
                        const colors: Record<string, string> = { orange: "rgba(249,115,22,0.12)", green: "rgba(34,197,94,0.10)", blue: "rgba(59,130,246,0.10)", purple: "rgba(139,92,246,0.10)" };
                        const texts: Record<string, string> = { orange: "#F97316", green: "#22C55E", blue: "#3B82F6", purple: "#8B5CF6" };
                        return (
                          <div
                            key={label}
                            className="rounded-lg px-3 py-2 text-center"
                            style={{ background: colors[color] }}
                          >
                            <div className="text-base font-bold" style={{ color: texts[color], fontFamily: "var(--font-display)" }}>
                              {val}
                            </div>
                            <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div
                className="absolute -top-4 -right-4 glass-card float-badge-1 px-3 py-2 flex items-center gap-2 text-xs font-medium"
                style={{ borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.08)" }}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                <span style={{ color: "var(--text-primary)" }}>Published to Blogger</span>
              </div>

              <div
                className="absolute -bottom-4 -left-4 glass-card float-badge-2 px-3 py-2 flex items-center gap-2 text-xs font-medium"
              >
                <TrendingUp className="w-3.5 h-3.5" style={{ color: "var(--brand-orange)" }} />
                <span style={{ color: "var(--text-primary)" }}>SEO Score 94/100</span>
              </div>

              <div
                className="absolute top-1/2 -right-6 glass-card float-badge-3 px-3 py-2 flex items-center gap-2 text-xs font-medium"
                style={{ borderColor: "rgba(59,130,246,0.25)", background: "rgba(59,130,246,0.07)" }}
              >
                <Zap className="w-3.5 h-3.5" style={{ color: "var(--brand-blue)" }} />
                <span style={{ color: "var(--text-primary)" }}>3,240 words</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS STRIP ─────────────────────────────────────────── */}
      <section className="py-12 border-y relative" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}>
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 80} direction="up" className="text-center">
              <div
                className="text-4xl font-bold mb-1"
                style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
              >
                <Counter target={s.value} prefix={s.prefix} suffix={s.suffix} />
              </div>
              <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── TEMPLATE MARQUEE ────────────────────────────────────── */}
      <div className="py-4 overflow-hidden relative" style={{ background: "rgba(249,115,22,0.04)" }}>
        <div className="flex animate-marquee whitespace-nowrap">
          {[...TEMPLATES, ...TEMPLATES, ...TEMPLATES, ...TEMPLATES].map((t, i) => (
            <span key={i} className="mx-4 text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: "rgba(249,115,22,0.10)", color: "var(--brand-orange)", border: "1px solid rgba(249,115,22,0.15)" }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ══ FEATURES BENTO ════════════════════════════════════════ */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-14">
            <div className="tag-pill inline-flex mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Features
            </div>
            <h2
              className="text-4xl sm:text-5xl font-bold mb-4"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              Everything You Need to{" "}
              <span className="gradient-text">Dominate Google</span>
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              A complete content automation suite built for Blogger. No other tool comes close.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              const c = C[f.color];
              return (
                <Reveal
                  key={f.title}
                  delay={i * 60}
                  className={f.span === 2 ? "lg:col-span-2" : "lg:col-span-1"}
                >
                  <TiltCard className="bento-card h-full flex flex-col">
                    {/* Badge */}
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-4 self-start uppercase tracking-wider"
                      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
                    >
                      {f.badge === "Pro" && <Crown className="w-2.5 h-2.5" />}
                      {f.badge}
                    </span>

                    {/* Icon + title */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="icon-badge flex-shrink-0"
                        style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3
                        className="text-base font-semibold"
                        style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
                      >
                        {f.title}
                      </h3>
                    </div>

                    <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
                      {f.desc}
                    </p>

                    {/* Preview rows */}
                    {f.preview && (
                      <div
                        className="rounded-xl p-3 space-y-2 text-xs mt-auto"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                      >
                        {f.preview.map(r => (
                          <div key={r.label} className="flex justify-between">
                            <span style={{ color: "var(--text-muted)" }}>{r.label}</span>
                            <span style={{ color: c.text, fontFamily: "var(--font-display)", fontWeight: 600 }}>{r.val}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Stat */}
                    {f.stat && (
                      <div className="mt-auto pt-3">
                        <span
                          className="text-3xl font-bold"
                          style={{ fontFamily: "var(--font-display)", color: c.text }}
                        >
                          <Counter target={f.stat.val} suffix={f.stat.suffix} />
                        </span>
                        <span className="ml-2 text-sm" style={{ color: "var(--text-muted)" }}>{f.stat.label}</span>
                      </div>
                    )}
                  </TiltCard>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════════ */}
      <section id="tools" className="py-24 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-40"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(59,130,246,0.05), transparent)" }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <Reveal className="text-center mb-16">
            <div className="tag-pill inline-flex mb-4">
              <Play className="w-3.5 h-3.5" /> How It Works
            </div>
            <h2
              className="text-4xl sm:text-5xl font-bold mb-4"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              From Keyword to{" "}
              <span className="gradient-text-blue">Published Article</span>
              <br />in 4 Simple Steps
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-4 gap-5">
            {STEPS.map(({ n, icon: Icon, title, desc }, i) => (
              <Reveal key={n} delay={i * 100}>
                <TiltCard className="bento-card text-center group relative">
                  {/* Connector line */}
                  {i < STEPS.length - 1 && (
                    <div
                      className="hidden md:block absolute top-10 left-full w-full h-px z-10"
                      style={{ background: "linear-gradient(90deg, rgba(249,115,22,0.3), transparent)" }}
                    />
                  )}

                  <div
                    className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center text-sm font-bold relative"
                    style={{
                      background: "rgba(249,115,22,0.12)",
                      border: "1px solid rgba(249,115,22,0.25)",
                      fontFamily: "var(--font-display)",
                      color: "var(--brand-orange)",
                    }}
                  >
                    {n}
                  </div>

                  <div
                    className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <Icon className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
                  </div>

                  <h3
                    className="text-base font-semibold mb-2"
                    style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
                  >
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {desc}
                  </p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ALL TOOLS ═════════════════════════════════════════════ */}
      <section className="py-24 border-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-12">
            <div className="tag-pill inline-flex mb-4">
              <Layers className="w-3.5 h-3.5" /> Full Toolkit
            </div>
            <h2
              className="text-4xl sm:text-5xl font-bold mb-4"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              15 Tools.{" "}
              <span className="gradient-text">One Platform.</span>
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              Cancel every other SEO tool you're paying for.
            </p>
          </Reveal>

          {/* Tab filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {toolCategories.map((cat, i) => (
              <button
                key={cat.label}
                onClick={() => setActiveTab(i)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={
                  activeTab === i
                    ? { background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.35)", color: "var(--brand-orange)" }
                    : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-secondary)" }
                }
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Tools grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TOOLS_SHOWCASE
              .slice(toolCategories[activeTab].slice[0], toolCategories[activeTab].slice[1])
              .map((tool, i) => {
                const Icon = tool.icon;
                return (
                  <Reveal key={tool.name} delay={i * 40}>
                    <div
                      className="flex items-start gap-3 p-4 rounded-xl border transition-all hover:border-orange-500/20"
                      style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}
                    >
                      <div className="icon-badge icon-badge-orange flex-shrink-0">
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                            {tool.name}
                          </span>
                          {!tool.free && (
                            <span
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                              style={{ background: "rgba(139,92,246,0.12)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.2)" }}
                            >
                              <Crown className="w-2.5 h-2.5" /> Pro
                            </span>
                          )}
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                          {tool.desc}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
          </div>
        </div>
      </section>

      {/* ══ PRICING ═══════════════════════════════════════════════ */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-14">
            <div className="tag-pill inline-flex mb-4">
              <Crown className="w-3.5 h-3.5" /> Pricing
            </div>
            <h2
              className="text-4xl sm:text-5xl font-bold mb-4"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              Simple,{" "}
              <span className="gradient-text">Transparent</span> Pricing
            </h2>
            <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
              Start free. Upgrade when you're ready to scale.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PLANS.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 100} direction="scale">
                <div className={`pricing-card h-full flex flex-col ${plan.featured ? "featured" : ""}`}>
                  {plan.featured && (
                    <div
                      className="text-center text-xs font-bold py-1.5 rounded-full mb-5 tracking-widest uppercase"
                      style={{ background: "rgba(249,115,22,0.15)", color: "var(--brand-orange)", border: "1px solid rgba(249,115,22,0.25)" }}
                    >
                      Most Popular
                    </div>
                  )}

                  <div className="mb-6">
                    <h3
                      className="text-xl font-semibold mb-1"
                      style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
                    >
                      {plan.name}
                    </h3>
                    <div className="flex items-end gap-1">
                      <span
                        className="text-4xl font-bold"
                        style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
                      >
                        ${plan.price}
                      </span>
                      <span className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                        {plan.period}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                        <Check
                          className="w-4 h-4 flex-shrink-0 mt-0.5"
                          style={{ color: plan.featured ? "var(--brand-orange)" : "var(--brand-blue)" }}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link href={plan.price === 0 ? "/auth/signup" : "/auth/signup?plan=" + plan.name.toLowerCase()}>
                    <Button
                      className={`w-full ${plan.featured ? "btn-primary" : "btn-ghost"}`}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ══════════════════════════════════════════ */}
      <section id="testimonials" className="py-24 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(249,115,22,0.08), transparent 60%)" }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <Reveal className="text-center mb-14">
            <div className="tag-pill inline-flex mb-4">
              <Star className="w-3.5 h-3.5" /> Testimonials
            </div>
            <h2
              className="text-4xl sm:text-5xl font-bold mb-4"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              Loved by{" "}
              <span className="gradient-text">Blogger Creators</span>
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {REVIEWS.map((r, i) => (
              <Reveal key={r.name} delay={i * 70}>
                <TiltCard className="bento-card h-full">
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: r.stars }).map((_, s) => (
                      <Star key={s} className="w-3.5 h-3.5 fill-current" style={{ color: "var(--brand-orange)" }} />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-secondary)" }}>
                    &quot;{r.text}&quot;
                  </p>
                  <div className="flex items-center gap-3 mt-auto">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: "rgba(249,115,22,0.15)", color: "var(--brand-orange)", fontFamily: "var(--font-display)" }}
                    >
                      {r.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{r.name}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{r.role}</div>
                    </div>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ═════════════════════════════════════════════ */}
      <section className="py-28 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 80% 80% at 50% 50%, rgba(249,115,22,0.08), rgba(59,130,246,0.04), transparent 70%)" }}
        />
        <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />

        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <Reveal>
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full mb-8"
              style={{
                background: "rgba(249,115,22,0.08)",
                border: "1px solid rgba(249,115,22,0.2)",
                color: "var(--brand-orange)",
              }}
            >
              <Zap className="w-3.5 h-3.5" />
              Free to start · No credit card needed
            </div>
            <h2
              className="text-4xl sm:text-6xl font-bold mb-6"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              Start Ranking Higher{" "}
              <span className="gradient-text">Today</span>
            </h2>
            <p className="text-lg mb-10" style={{ color: "var(--text-secondary)" }}>
              Join thousands of Blogger creators who save 10+ hours/week and grow organic traffic with BloggerSEO.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="btn-primary px-10 py-6 text-base animate-glow-pulse">
                  <Rocket className="w-4 h-4 mr-2" />
                  Get Started for Free
                </Button>
              </Link>
              <Link href="/auth/signin">
                <Button size="lg" className="btn-ghost px-10 py-6 text-base">
                  Sign In
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════════ */}
      <footer className="border-t py-12" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(5,9,18,0.8)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            {/* Brand */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg btn-primary flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <div
                  className="text-base font-semibold"
                  style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
                >
                  BloggerSEO
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  AI Content Automation for Blogger
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="flex flex-wrap gap-6 text-sm" style={{ color: "var(--text-secondary)" }}>
              {[
                { label: "Features",     href: "#features"     },
                { label: "Pricing",      href: "#pricing"      },
                { label: "Privacy",      href: "/privacy"      },
                { label: "Terms",        href: "/terms"        },
                { label: "Contact",      href: "/contact"      },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="hover:text-white transition-colors"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          <div
            className="mt-8 pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-3 text-xs"
            style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}
          >
            <span>© {new Date().getFullYear()} BloggerSEO. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" /> Built for Google Blogger
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> GDPR Compliant
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
