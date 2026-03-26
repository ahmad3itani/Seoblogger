"use client";

import { Brain, Layers, Gauge, Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function FeatureDeepDives() {
  return (
    <section className="py-32 relative overflow-hidden space-y-32">
      {/* 1. Article Writer */}
      <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="tag-pill inline-flex mb-6">
            <Brain className="w-3.5 h-3.5" /> AI Article Writer
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-6 font-display text-white">
            Write 3,000-Word <br />
            <span className="gradient-text">SEO Masterpieces</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Stop scraping by with thin, 500-word AI fluff. BloggerSEO analyzes the top-ranking Google results for your keyword and crafts massive, section-by-section articles designed to outrank the competition.
          </p>
          <ul className="space-y-4 mb-10">
            {[
              "Real-time SERP data scraping for every keyword",
              "E-E-A-T trust signals naturally embedded",
              "Automatic Schema markup and formatting",
              "Bypasses AI detectors beautifully with Quality Pass",
            ].map(item => (
              <li key={item} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-[#6C4CF1] shrink-0 mt-0.5" />
                <span className="text-white/80">{item}</span>
              </li>
            ))}
          </ul>
          <Link href="/auth/register">
            <Button size="lg" className="btn-primary gap-2">
              Start Writing <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-[#6C4CF1]/20 blur-[100px] rounded-full" />
          <div className="glass-card p-6 relative rounded-2xl border border-white/10 bg-black/40 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
              <span className="text-xs font-mono text-white/50">generation_progress</span>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">100% Complete</span>
            </div>
            <div className="space-y-3">
              <div className="h-4 w-3/4 bg-white/10 rounded" />
              <div className="h-3 w-full bg-white/5 rounded" />
              <div className="h-3 w-5/6 bg-white/5 rounded" />
              <div className="h-3 w-full bg-white/5 rounded" />
              <div className="grid grid-cols-3 gap-3 pt-4 mt-4 border-t border-white/5">
                <div className="bg-white/5 p-3 rounded-lg text-center">
                  <div className="text-xl font-bold text-[#6C4CF1]">3,240</div>
                  <div className="text-[10px] text-white/40 uppercase">Words</div>
                </div>
                <div className="bg-white/5 p-3 rounded-lg text-center">
                  <div className="text-xl font-bold text-green-400">94/100</div>
                  <div className="text-[10px] text-white/40 uppercase">SEO Score</div>
                </div>
                <div className="bg-white/5 p-3 rounded-lg text-center">
                  <div className="text-xl font-bold text-blue-400">4</div>
                  <div className="text-[10px] text-white/40 uppercase">Images</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Bulk Generator */}
      <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center">
        <div className="order-2 lg:order-1 relative">
          <div className="absolute inset-0 bg-orange-500/20 blur-[100px] rounded-full" />
          <div className="glass-card p-6 relative rounded-2xl border border-white/10 bg-black/40 shadow-2xl">
            <div className="flex gap-2 pb-4 border-b border-white/5 mb-4">
              <div className="w-8 h-8 rounded bg-orange-500/20 flex items-center justify-center"><Layers className="w-4 h-4 text-orange-400" /></div>
              <div>
                <div className="text-sm font-bold text-white">Campaign Scheduler</div>
                <div className="text-xs text-white/50">Processing 100 keywords...</div>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { kw: "best seo tools 2026", status: "Published", color: "text-green-400" },
                { kw: "how to get adsense approval", status: "Scheduled", color: "text-blue-400" },
                { kw: "blogger vs wordpress", status: "Generating", color: "text-orange-400" },
                { kw: "make money blogging", status: "Queued", color: "text-white/40" },
              ].map(row => (
                <div key={row.kw} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-xs font-mono text-white/80">{row.kw}</span>
                  <span className={`text-[10px] font-bold uppercase ${row.color}`}>{row.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <div className="tag-pill inline-flex mb-6" style={{ background: "rgba(249,115,22,0.1)", color: "#f97316", borderColor: "rgba(249,115,22,0.2)" }}>
            <Layers className="w-3.5 h-3.5" /> Autopilot Pipeline
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-6 font-display text-white">
            Set It & Forget It With <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">Bulk Generation</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Why write one article when you can write 100? Paste your keyword list, configure your Brand Voice, and let the Bulk Engine queue, write, and natively publish to your Blogger site over the next 3 months.
          </p>
          <ul className="space-y-4 mb-10">
            {[
              "Generate up to 100 massive articles in a single click",
              "Automatic Campaign Scheduler paces your posts",
              "Integrates directly with your Blogger API",
              "Saves hundreds of hours of manual labor",
            ].map(item => (
              <li key={item} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <span className="text-white/80">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 3. AdSense Engine */}
      <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="tag-pill inline-flex mb-6" style={{ background: "rgba(0,194,255,0.1)", color: "#00C2FF", borderColor: "rgba(0,194,255,0.2)" }}>
            <Gauge className="w-3.5 h-3.5" /> AdSense Readiness
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-6 font-display text-white">
            Guaranteed Google <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">AdSense Approvals</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Tired of getting "Thin Content" rejection emails from Google? Our proprietary AdSense Engine crawls your entire Blogger site just like Google does.
          </p>
          <ul className="space-y-4 mb-10">
            {[
              "Scans for required 'About' and 'Privacy Policy' pages",
              "Analyzes average word counts and depth to prevent Thin Content",
              "Checks 50+ technical SEO signals",
              "1-click 'Fix it for me' automation",
            ].map(item => (
              <li key={item} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
                <span className="text-white/80">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full" />
          <div className="glass-card p-6 relative rounded-2xl border border-white/10 bg-black/40 shadow-2xl flex flex-col items-center justify-center min-h-[300px]">
            {/* Speedometer visual */}
            <div className="relative w-48 h-48 mb-4">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="#00C2FF" strokeWidth="10" strokeDasharray="283" strokeDashoffset="28" className="animate-[spin_1s_ease-out_forwards]" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-white font-display">92</span>
                <span className="text-[10px] text-[#00C2FF] uppercase tracking-widest font-bold">Ready</span>
              </div>
            </div>
            <div className="text-sm font-medium text-white/80">Site passed all 50+ AdSense checks</div>
          </div>
        </div>
      </div>
    </section>
  );
}
