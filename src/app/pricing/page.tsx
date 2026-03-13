"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Check, X, Crown, Zap, Building2, ArrowRight,
} from "lucide-react";

const PLANS = [
  {
    name: "free",
    displayName: "Free",
    price: 0,
    yearlyPrice: 0,
    description: "Perfect for testing and getting started",
    features: [
      { text: "5 articles/month", included: true },
      { text: "1 blog connected", included: true },
      { text: "SEO optimization", included: true },
      { text: "10 keyword searches", included: true },
      { text: "Site audit (5 pages)", included: true },
      { text: "Internal linker", included: true },
      { text: "Images", included: false },
      { text: "Bulk generation", included: false },
      { text: "Trend ideas", included: false },
      { text: "Quality Pass", included: false },
      { text: "Content refresh", included: false },
      { text: "Scheduling & campaigns", included: false },
      { text: "Analytics", included: false },
    ],
    icon: Zap,
    color: "zinc",
    popular: false,
  },
  {
    name: "starter",
    displayName: "Starter",
    price: 12,
    yearlyPrice: 120,
    description: "Perfect for budget-conscious bloggers",
    features: [
      { text: "30 articles/month", included: true },
      { text: "10 images/month", included: true },
      { text: "2 blogs connected", included: true },
      { text: "50 keyword searches", included: true },
      { text: "10 trend ideas/month", included: true },
      { text: "Bulk generation", included: true },
      { text: "Auto-publish & scheduling", included: true },
      { text: "Site audit (full)", included: true },
      { text: "Internal linker", included: true },
      { text: "Keyword clustering", included: true },
      { text: "Brand voice profiles", included: true },
      { text: "Amazon affiliate writer", included: true },
      { text: "Quality Pass", included: false },
      { text: "Content refresh", included: false },
      { text: "Analytics dashboard", included: false },
      { text: "Priority support", included: false },
    ],
    icon: Sparkles,
    color: "blue",
    popular: true,
  },
  {
    name: "pro",
    displayName: "Pro",
    price: 39,
    yearlyPrice: 390,
    description: "Best value for full-time content creators",
    features: [
      { text: "100 articles/month", included: true },
      { text: "50 images/month", included: true },
      { text: "5 blogs connected", included: true },
      { text: "200 keyword searches", included: true },
      { text: "50 trend ideas/month", included: true },
      { text: "Bulk generation", included: true },
      { text: "Auto-publish & scheduling", included: true },
      { text: "Quality Pass", included: true },
      { text: "Content refresh", included: true },
      { text: "Keyword clustering", included: true },
      { text: "Brand voice profiles", included: true },
      { text: "Amazon affiliate writer", included: true },
      { text: "Internal linker", included: true },
      { text: "Site audit (full + smart fixes)", included: true },
      { text: "Campaign scheduler", included: true },
      { text: "Analytics dashboard", included: true },
      { text: "Advanced models", included: true },
      { text: "Priority support", included: true },
    ],
    icon: Crown,
    color: "violet",
    popular: false,
  },
  {
    name: "enterprise",
    displayName: "Enterprise",
    price: 99,
    yearlyPrice: 990,
    description: "For agencies and teams with high volume needs",
    features: [
      { text: "300 articles/month", included: true },
      { text: "200 images/month", included: true },
      { text: "Unlimited blogs", included: true },
      { text: "Unlimited keyword searches", included: true },
      { text: "Unlimited trend ideas", included: true },
      { text: "Everything in Pro", included: true },
      { text: "Quality Pass", included: true },
      { text: "Content refresh", included: true },
      { text: "Campaign scheduler", included: true },
      { text: "API access & white-label", included: true },
      { text: "Team access (3 members)", included: true },
      { text: "Dedicated support", included: true },
    ],
    icon: Building2,
    color: "amber",
    popular: false,
  },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg glow-button flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold gradient-text">BloggerSEO</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm" className="glow-button text-white border-0">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Simple, transparent <span className="gradient-text">pricing</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Affordable plans designed for Blogger users. 40-60% cheaper than competitors.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center mt-8">
            <div className="bg-gray-100 rounded-full p-1 flex items-center gap-1">
              <button
                onClick={() => setBilling("monthly")}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${billing === "monthly"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling("yearly")}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${billing === "yearly"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                Yearly
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                  Save 20%
                </Badge>
              </button>
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`glass-card rounded-2xl p-6 relative flex flex-col ${plan.popular ? "border-[#FF6600]/50 ring-1 ring-[#FF6600]/20" : ""
                }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-[#FF6600] text-white border-0 px-3">Most Popular</Badge>
                </div>
              )}

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <plan.icon className={`w-5 h-5 ${plan.color === "violet" ? "text-[#FF6600]" :
                      plan.color === "amber" ? "text-amber-400" :
                        plan.color === "blue" ? "text-blue-400" : "text-zinc-400"
                    }`} />
                  <h3 className="text-lg font-semibold">{plan.displayName}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    ${billing === "monthly" ? plan.price : (plan.yearlyPrice / 12).toFixed(2)}
                  </span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
                {billing === "yearly" && plan.price > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ${plan.yearlyPrice}/year billed annually
                  </p>
                )}
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {feature.included ? (
                      <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    ) : (
                      <span className="w-4 h-4 mt-0.5 shrink-0 flex items-center justify-center text-muted-foreground/30">—</span>
                    )}
                    <span className={feature.included ? "" : "text-muted-foreground/50"}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Link href={plan.price === 0 ? "/auth/register" : "/auth/register"}>
                <Button
                  className={`w-full ${plan.popular
                      ? "glow-button text-white border-0"
                      : ""
                    }`}
                  variant={plan.popular ? "default" : "outline"}
                >
                  {plan.price === 0 ? "Get Started Free" : "Start Free Trial"}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-20">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "Can I switch plans anytime?", a: "Yes! You can upgrade or downgrade at any time. Changes take effect at your next billing cycle." },
              { q: "Is there a free trial for paid plans?", a: "Yes, all paid plans come with a 7-day free trial. No credit card required to start." },
              { q: "What happens when I hit my limit?", a: "You'll receive a notification when you're near your limit. You can upgrade your plan or wait for the next billing cycle." },
              { q: "Do you offer refunds?", a: "Yes, we offer a 30-day money-back guarantee on all paid plans." },
            ].map((faq, i) => (
              <div key={i} className="glass-card rounded-xl p-4">
                <h4 className="font-medium text-sm mb-1">{faq.q}</h4>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
