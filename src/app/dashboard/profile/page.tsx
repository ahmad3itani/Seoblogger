"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/supabase/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  User, Mail, Shield, CreditCard, BarChart3, Crown, 
  Calendar, Edit2, Save, X, Zap, FileText, Image,
} from "lucide-react";

interface UsageData {
  articles: { used: number; limit: number };
  images: { used: number; limit: number };
  words: { used: number };
  apiCalls: { used: number };
}

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    if (profile) setName(profile.name || "");
    fetchUsage();
  }, [profile]);

  const fetchUsage = async () => {
    try {
      const res = await fetch("/api/user/usage");
      if (res.ok) {
        const data = await res.json();
        setUsage(data.usage);
      }
    } catch (e) {
      console.error("Failed to fetch usage:", e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        await refreshProfile();
        setEditing(false);
      }
    } catch (e) {
      console.error("Failed to save profile:", e);
    } finally {
      setSaving(false);
    }
  };

  const planColor = {
    free: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    pro: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    enterprise: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };

  const currentPlan = profile?.plan?.name || "free";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your account settings and subscription
        </p>
      </div>

      {/* Profile Card */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xl font-bold">
              {(profile?.name || profile?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-8 px-3 rounded-lg border border-border/50 bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    placeholder="Your name"
                  />
                  <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 gap-1">
                    <Save className="w-3 h-3" />
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-8">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{profile?.name || "No name set"}</h2>
                  <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {profile?.email || user?.email}
              </p>
            </div>
          </div>
          <Badge className={planColor[currentPlan as keyof typeof planColor] || planColor.free}>
            <Crown className="w-3 h-3 mr-1" />
            {profile?.plan?.displayName || "Free Plan"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/30">
            <Shield className="w-5 h-5 text-violet-400" />
            <div>
              <p className="text-xs text-muted-foreground">Role</p>
              <p className="text-sm font-medium capitalize">{profile?.role || "user"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/30">
            <Calendar className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-xs text-muted-foreground">Member Since</p>
              <p className="text-sm font-medium">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/30">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-xs text-muted-foreground">Billing</p>
              <p className="text-sm font-medium">{currentPlan === "free" ? "No billing" : "Active"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-violet-400" />
          Usage This Month
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UsageBar
            icon={<FileText className="w-4 h-4 text-blue-400" />}
            label="Articles"
            used={usage?.articles.used || 0}
            limit={usage?.articles.limit || 10}
          />
          <UsageBar
            icon={<Image className="w-4 h-4 text-emerald-400" />}
            label="Images"
            used={usage?.images.used || 0}
            limit={usage?.images.limit || 30}
          />
        </div>
      </div>

      {/* Plan Upgrade CTA */}
      {currentPlan === "free" && (
        <div className="glass-card rounded-2xl p-6 border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-indigo-500/5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-violet-400" />
                Upgrade to Pro
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Unlock unlimited articles, analytics, campaigns, and more.
              </p>
            </div>
            <Link href="/pricing">
              <Button className="glow-button text-white border-0 gap-2">
                <Crown className="w-4 h-4" />
                View Plans
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function UsageBar({
  icon,
  label,
  used,
  limit,
}: {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number;
}) {
  const percent = Math.min(100, Math.round((used / limit) * 100));
  const isNearLimit = percent >= 80;

  return (
    <div className="p-4 rounded-lg bg-background/50 border border-border/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className={`text-sm font-mono ${isNearLimit ? "text-red-400" : "text-muted-foreground"}`}>
          {used}/{limit}
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-border/30 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isNearLimit ? "bg-red-500" : "bg-violet-500"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
