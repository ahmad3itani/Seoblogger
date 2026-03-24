"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Network, SendToBack, ArrowRight } from "lucide-react";

interface Cluster {
    clusterName: string;
    keywords: string[];
}

export default function ClusteringPage() {
    const router = useRouter();
    const [keywordsInput, setKeywordsInput] = useState("");
    const [isClustering, setIsClustering] = useState(false);
    const [clusters, setClusters] = useState<Cluster[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleCluster = async () => {
        const lines = keywordsInput.split("\n").map(k => k.trim()).filter(Boolean);
        if (lines.length === 0) return;

        if (lines.length > 200) {
            setError("Maximum 200 keywords allowed per request.");
            return;
        }

        setIsClustering(true);
        setError(null);
        setClusters([]);

        try {
            const res = await fetch("/api/cluster", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ keywords: lines }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to cluster keywords");
            }

            setClusters(data.clusters || []);
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsClustering(false);
        }
    };

    const sendToBulk = (cluster: Cluster) => {
        // Store in sessionStorage to pass large amounts of data to the next page reliably
        sessionStorage.setItem("bulkKeywords", cluster.keywords.join("\n"));
        router.push("/dashboard/bulk");
    };

    return (
        <div className="space-y-6 max-w-6xl">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(108,76,241,0.12)", border: "1px solid rgba(108,76,241,0.25)" }}>
                    <Network className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
                </div>
                <div>
                    <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>Keyword Clustering</h1>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Group raw keywords into relevant topical clusters</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <div className="rounded-2xl h-full flex flex-col" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Raw Keywords</h3>
                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Paste up to 200 keywords, one per line</p>
                        </div>
                        <div className="flex-1 flex flex-col p-5 min-h-[400px]">
                            <Textarea
                                placeholder="best dog food&#10;organic dog treats&#10;how to train a puppy&#10;dog training tips"
                                className="flex-1 min-h-[300px] mb-4 font-mono text-xs leading-relaxed whitespace-pre"
                                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)" }}
                                value={keywordsInput}
                                onChange={(e) => setKeywordsInput(e.target.value)}
                                disabled={isClustering}
                            />
                            {error && (
                                <div className="rounded-lg p-3 mb-3 text-xs" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}>{error}</div>
                            )}
                            <Button className="w-full h-11 text-sm font-semibold btn-primary" onClick={handleCluster} disabled={isClustering || !keywordsInput.trim()}>
                                {isClustering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Network className="w-4 h-4 mr-2" />}
                                {isClustering ? "Clustering..." : "Group Keywords"}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    {clusters.length === 0 && !isClustering ? (
                        <div className="h-full min-h-[400px] rounded-2xl flex flex-col items-center justify-center text-center p-8" style={{ background: "var(--bg-card)", border: "1px dashed var(--border-glass)" }}>
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(108,76,241,0.08)", border: "1px solid rgba(108,76,241,0.20)" }}>
                                <Network className="w-7 h-7" style={{ color: "var(--brand-primary)" }} />
                            </div>
                            <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>Clusters will appear here</h3>
                            <p className="text-sm max-w-sm" style={{ color: "var(--text-secondary)" }}>Paste keywords on the left and click Group to see semantic clusters</p>
                        </div>
                    ) : isClustering ? (
                        <div className="h-full min-h-[400px] rounded-2xl flex flex-col items-center justify-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                            <div className="w-16 h-16 rounded-full animate-glow-pulse flex items-center justify-center mb-6" style={{ background: "rgba(108,76,241,0.10)", border: "1px solid rgba(108,76,241,0.25)" }}>
                                <Network className="w-7 h-7" style={{ color: "var(--brand-primary)" }} />
                            </div>
                            <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Analyzing semantic relationships...</p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Grouping keywords by topic relevance</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {clusters.map((cluster, idx) => (
                                <div key={idx} className="rounded-2xl flex flex-col animate-slide-up" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", animationDelay: `${idx * 50}ms` }}>
                                    <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{cluster.clusterName}</h3>
                                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{cluster.keywords.length} keywords</p>
                                    </div>
                                    <div className="p-4 flex-1">
                                        <div className="flex flex-wrap gap-1.5">
                                            {cluster.keywords.slice(0, 10).map((k, i) => (
                                                <span key={i} className="px-2 py-0.5 text-[10px] rounded-full" style={{ background: "rgba(108,76,241,0.08)", color: "var(--brand-primary)", border: "1px solid rgba(108,76,241,0.20)" }}>
                                                    {k}
                                                </span>
                                            ))}
                                            {cluster.keywords.length > 10 && (
                                                <span className="px-2 py-0.5 text-[10px] rounded-full" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}>
                                                    +{cluster.keywords.length - 10} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="px-4 py-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                                        <button className="w-full flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg transition-all" style={{ color: "var(--brand-primary)" }} onClick={() => sendToBulk(cluster)}
                                            onMouseEnter={e => e.currentTarget.style.background = "rgba(108,76,241,0.08)"}
                                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                        >
                                            Send to Bulk Generator <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
