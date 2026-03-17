"use client";

import Link from "next/link";
import { Sparkles, ArrowLeft, Mail, MessageSquare, Clock, HelpCircle, Bug, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";

const contactMethods = [
  {
    icon: Mail,
    title: "Email Support",
    description: "For general questions, account issues, or feature requests.",
    action: "support@bloggerseo.ai",
    href: "mailto:support@bloggerseo.ai",
    buttonText: "Send Email",
  },
  {
    icon: Bug,
    title: "Report a Bug",
    description: "Found something not working? Let us know so we can fix it quickly.",
    action: "bugs@bloggerseo.ai",
    href: "mailto:bugs@bloggerseo.ai",
    buttonText: "Report Bug",
  },
  {
    icon: Briefcase,
    title: "Business Inquiries",
    description: "For partnerships, enterprise plans, or press inquiries.",
    action: "business@bloggerseo.ai",
    href: "mailto:business@bloggerseo.ai",
    buttonText: "Get in Touch",
  },
];

const faqs = [
  { q: "How fast do you respond to support emails?", a: "We typically respond within 24 hours on business days. Urgent issues are prioritized." },
  { q: "Do you offer live chat support?", a: "Currently we provide email support. We're working on adding live chat for Pro and Enterprise users." },
  { q: "Can I request a feature?", a: "Absolutely! Send your feature request to support@bloggerseo.ai. We review every suggestion and prioritize based on user demand." },
  { q: "How do I cancel my subscription?", a: "You can cancel anytime from your Dashboard → Settings. See our Refund Policy for details." },
];

export default function ContactContent() {
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
      <section className="py-16 md:py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Get in <span className="gradient-text">Touch</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Have a question, feedback, or need help? We&apos;re here for you. Choose the best way to reach us below.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-8 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {contactMethods.map((m) => (
            <div key={m.title} className="rounded-xl border border-border/50 bg-card/50 p-6 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-lg glow-button flex items-center justify-center mb-4">
                <m.icon className="w-6 h-6 text-white" />
              </div>
              <h2 className="font-semibold text-lg mb-2">{m.title}</h2>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{m.description}</p>
              <a href={m.href}>
                <Button variant="outline" size="sm">{m.buttonText}</Button>
              </a>
              <p className="text-xs text-muted-foreground mt-3">{m.action}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Response Time */}
      <section className="py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600 text-sm font-medium mb-4">
            <Clock className="w-4 h-4" />
            Average Response Time: Under 24 Hours
          </div>
          <p className="text-sm text-muted-foreground">
            Our support team is available Monday through Friday. We prioritize urgent issues and aim to resolve most inquiries within one business day.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 border-t border-border/50">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <HelpCircle className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((f) => (
              <div key={f.q} className="rounded-xl border border-border/50 bg-card/50 p-5">
                <h3 className="font-semibold mb-2">{f.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </div>
            ))}
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
            <Link href="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors">About</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
