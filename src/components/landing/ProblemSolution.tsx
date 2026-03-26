import { XCircle, CheckCircle2, TrendingDown, Zap } from "lucide-react";

export function ProblemSolutionMatrix() {
  return (
    <section className="py-24 relative overflow-hidden bg-[rgba(108,76,241,0.02)] border-y border-white/5">
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />
      
      <div className="max-w-5xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="tag-pill inline-flex mb-4">
            <Zap className="w-3.5 h-3.5" /> Stop Wasting Time
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 font-display text-white">
            The Old Way vs. <span className="gradient-text">The BloggerSEO Way</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Writing content manually is a grind. BloggerSEO automates the busywork so you can focus on building your empire.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          {/* Default Blogger / Old Way */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white font-display">The Old Way</h3>
            </div>
            <ul className="space-y-4 flex-1">
              {[
                "Hours spent writing 3000-word articles manually",
                "Guessing which keywords actually drive traffic",
                "Struggling to pass AI content detectors",
                "Getting rejected by Google AdSense indefinitely",
                "Copying and pasting HTML into Blogger manually",
                "Finding and formatting royalty-free images",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-500/70 shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* BloggerSEO Way */}
          <div className="rounded-2xl border border-[#6C4CF1]/30 bg-[#6C4CF1]/5 p-8 flex flex-col relative overflow-hidden shadow-[0_0_40px_rgba(108,76,241,0.1)]">
            <div className="absolute top-0 right-0 p-4">
              <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded bg-[#6C4CF1]/20 text-[#6C4CF1]">
                Winner
              </span>
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#6C4CF1]/20 border border-[#6C4CF1]/40 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#6C4CF1]" />
              </div>
              <h3 className="text-xl font-bold text-white font-display">The BloggerSEO Way</h3>
            </div>
            <ul className="space-y-4 flex-1">
              {[
                "1-click 3000-word articles with real SERP data",
                "Built-in Keyword Research & Clustering silos",
                "Quality Pass AI humanizer guarantees safe content",
                "AdSense Engine scores your site for guaranteed approval",
                "Native API: Post directly to your Blogger URL instantly",
                "Auto-embedded, gorgeous photorealistic AI images",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#6C4CF1] shrink-0 mt-0.5" />
                  <span className="text-sm text-white font-medium leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
