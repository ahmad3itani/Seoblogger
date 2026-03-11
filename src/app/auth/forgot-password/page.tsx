"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Sparkles, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl glow-button flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Check your email</h1>
          <p className="text-muted-foreground text-sm mb-6">
            We sent a password reset link to <strong className="text-foreground">{email}</strong>.
          </p>
          <Link href="/auth/login">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl glow-button flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">BloggerSEO</span>
          </Link>
          <h1 className="text-2xl font-bold mt-4">Reset your password</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-6">
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-border/50 bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full h-11 glow-button text-white border-0">
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link href="/auth/login" className="text-violet-400 hover:text-violet-300 font-medium inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" />
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
