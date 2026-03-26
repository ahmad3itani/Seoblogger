"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Share2, Check, AlertCircle, ExternalLink, Facebook, Linkedin, Twitter } from "lucide-react";

interface SocialCaptions {
  facebook: string;
  linkedin: string;
  x: string;
}

interface SocialAccount {
  id: string;
  platform: string;
  accountId: string;
  accountName: string;
  autoShare: boolean;
}

interface SocialSharePanelProps {
  articleId: string;
  articleTitle: string;
  liveUrl?: string;
}

const PLATFORM_CONFIG = {
  facebook: { label: "Facebook", color: "bg-[#1877F2]", icon: Facebook },
  linkedin: { label: "LinkedIn", color: "bg-[#0A66C2]", icon: Linkedin },
  x:        { label: "X", color: "bg-black",     icon: Twitter },
};

export default function SocialSharePanel({ articleId, articleTitle, liveUrl }: SocialSharePanelProps) {
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [captions, setCaptions] = useState<SocialCaptions | null>(null);
  const [socialImageUrl, setSocialImageUrl] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [postResults, setPostResults] = useState<Record<string, { status: string; postId?: string; error?: string }>>({});
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"facebook" | "linkedin" | "x">("facebook");

  useEffect(() => {
    fetchAccounts();
    generatePackage();
  }, [articleId]);

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/social/accounts");
      const data = await res.json();
      const accs: SocialAccount[] = data.accounts || [];
      setAccounts(accs);
      // Pre-select platforms that have auto-share enabled
      setSelectedPlatforms(new Set(accs.filter(a => a.autoShare).map(a => a.platform)));
    } catch {}
  };

  const generatePackage = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, generateImage: false }),
      });
      const data = await res.json();
      if (data.socialPackage) {
        setCaptions(data.socialPackage.captions);
        setSocialImageUrl(data.socialPackage.imageUrl);
      }
    } catch (e: any) {
      setError("Failed to generate social captions. You can still use the manual share buttons.");
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  };

  const handlePost = async () => {
    if (selectedPlatforms.size === 0) return;
    setPosting(true);
    setError("");
    try {
      const res = await fetch("/api/social/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          platforms: Array.from(selectedPlatforms),
          captions,
        }),
      });
      const data = await res.json();
      setPostResults(data.results || {});
    } catch (e: any) {
      setError("Failed to post. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  // Build manual share URLs
  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(liveUrl || "")}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(liveUrl || "")}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(captions?.x || articleTitle)}&url=${encodeURIComponent(liveUrl || "")}`,
  };

  const connectedPlatforms = new Set(accounts.map(a => a.platform));

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F97316] to-pink-500 flex items-center justify-center">
          <Share2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Share to Social Media</h3>
          <p className="text-xs text-muted-foreground">AI-generated captions, ready to post</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 text-xs text-yellow-400 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating captions...
        </div>
      ) : (
        <>
          {/* Platform Tabs */}
          <div className="flex gap-1.5">
            {(["facebook", "linkedin", "x"] as const).map((p) => {
              const cfg = PLATFORM_CONFIG[p];
              const connected = connectedPlatforms.has(p);
              const result = postResults[p];
              return (
                <button
                  key={p}
                  onClick={() => setActiveTab(p)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === p ? `${cfg.color} text-white` : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  <cfg.icon className="w-3 h-3" />
                  {cfg.label}
                  {connected && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                  {result?.status === "posted" && <Check className="w-3 h-3 text-green-400" />}
                  {result?.status === "failed" && <AlertCircle className="w-3 h-3 text-red-400" />}
                </button>
              );
            })}
          </div>

          {/* Caption editor */}
          {captions && (
            <div className="space-y-2">
              <Textarea
                className="bg-muted/30 border-border/50 text-sm min-h-[100px] resize-none"
                value={captions[activeTab]}
                onChange={(e) => setCaptions({ ...captions, [activeTab]: e.target.value })}
              />
              <p className="text-xs text-muted-foreground text-right">
                {captions[activeTab].length} chars
              </p>
            </div>
          )}

          {/* Auto-post section (only if connected accounts exist) */}
          {accounts.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Post to connected accounts:</p>
              <div className="space-y-2">
                {accounts.map((acc) => {
                  const cfg = PLATFORM_CONFIG[acc.platform as keyof typeof PLATFORM_CONFIG];
                  const result = postResults[acc.platform];
                  return (
                    <div
                      key={acc.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedPlatforms.has(acc.platform)
                          ? "border-[#F97316]/40 bg-[#F97316]/5"
                          : "border-border/30 bg-muted/20"
                      }`}
                      onClick={() => togglePlatform(acc.platform)}
                    >
                      <div className={`w-7 h-7 rounded-md ${cfg?.color || "bg-gray-600"} flex items-center justify-center`}>
                        {cfg && <cfg.icon className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{acc.accountName}</p>
                        <p className="text-[10px] text-muted-foreground">{cfg?.label || acc.platform}</p>
                      </div>
                      {result?.status === "posted" ? (
                        <Badge className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20">Posted ✓</Badge>
                      ) : result?.status === "failed" ? (
                        <Badge className="text-[10px] bg-red-500/10 text-red-400 border-red-500/20">Failed</Badge>
                      ) : (
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedPlatforms.has(acc.platform) ? "bg-[#F97316] border-[#F97316]" : "border-border/50"
                        }`}>
                          {selectedPlatforms.has(acc.platform) && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <Button
                onClick={handlePost}
                disabled={posting || selectedPlatforms.size === 0}
                className="w-full bg-[#F97316] hover:bg-[#F97316]/90 text-white"
              >
                {posting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Posting...</>
                ) : (
                  <><Share2 className="w-4 h-4 mr-2" /> Post to {selectedPlatforms.size} Account{selectedPlatforms.size !== 1 ? "s" : ""}</>
                )}
              </Button>
            </div>
          )}

          {/* Manual share links (always visible as fallback) */}
          <div className="border-t border-border/30 pt-4">
            <p className="text-xs text-muted-foreground mb-3">
              {accounts.length === 0 ? "Manual share:" : "Or share manually:"}
              {accounts.length === 0 && (
                <a href="/dashboard/settings" className="ml-1 text-[#F97316] hover:underline">Connect accounts →</a>
              )}
            </p>
            <div className="flex gap-2">
              {(["facebook", "linkedin", "x"] as const).map((p) => {
                const cfg = PLATFORM_CONFIG[p];
                return (
                  <a
                    key={p}
                    href={shareUrls[p]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs text-white font-medium transition-opacity hover:opacity-90 ${cfg.color}`}
                  >
                    <cfg.icon className="w-3 h-3" />
                    {cfg.label}
                    <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                  </a>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
