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
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Keyword Clustering</h1>
                <p className="text-muted-foreground mt-1">
                    Paste a massive list of raw keywords. The AI will group them into relevant hub-and-spoke topical clusters.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <Card className="glass-card h-full flex flex-col">
                        <CardHeader>
                            <CardTitle>Raw Keywords</CardTitle>
                            <CardDescription>Paste your exported list (up to 200 at a time).</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col min-h-[400px]">
                            <Textarea
                                placeholder="best dog food&#10;organic dog treats&#10;how to train a puppy&#10;dog training tips&#10..."
                                className="flex-1 min-h-[300px] mb-4 font-mono text-sm leading-relaxed whitespace-pre"
                                value={keywordsInput}
                                onChange={(e) => setKeywordsInput(e.target.value)}
                                disabled={isClustering}
                            />
                            {error && (
                                <p className="text-sm text-red-400 mb-4">{error}</p>
                            )}
                            <Button
                                size="lg"
                                className="w-full bg-[#FF6600] hover:bg-violet-700 text-white"
                                onClick={handleCluster}
                                disabled={isClustering || !keywordsInput.trim()}
                            >
                                {isClustering ? (
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                ) : (
                                    <Network className="w-5 h-5 mr-2" />
                                )}
                                {isClustering ? "Semantic Clustering..." : "Group Keywords"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    {clusters.length === 0 && !isClustering ? (
                        <div className="h-full min-h-[400px] border border-dashed border-border/50 rounded-xl flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
                            <Network className="w-12 h-12 mb-4 opacity-20" />
                            <p>Clusters will appear here after processing.</p>
                        </div>
                    ) : isClustering ? (
                        <div className="h-full min-h-[400px] border border-border/50 rounded-xl flex flex-col items-center justify-center text-[#FF6600]">
                            <Loader2 className="w-12 h-12 mb-4 animate-spin opacity-50" />
                            <p className="animate-pulse">Analyzing semantic relationships...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {clusters.map((cluster, idx) => (
                                <Card key={idx} className="glass-card flex flex-col animate-slide-up" style={{ animationDelay: `${idx * 50}ms` }}>
                                    <CardHeader className="pb-3 border-b border-border/50">
                                        <CardTitle className="text-lg text-violet-100">{cluster.clusterName}</CardTitle>
                                        <CardDescription>{cluster.keywords.length} keywords</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-4 flex-1">
                                        <div className="flex flex-wrap gap-2">
                                            {cluster.keywords.slice(0, 10).map((k, i) => (
                                                <span key={i} className="px-2 py-1 bg-orange-500/10 border border-[#FF6600]/20 text-violet-300 text-xs rounded-md">
                                                    {k}
                                                </span>
                                            ))}
                                            {cluster.keywords.length > 10 && (
                                                <span className="px-2 py-1 bg-muted/50 text-muted-foreground text-xs rounded-md">
                                                    +{cluster.keywords.length - 10} more
                                                </span>
                                            )}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="pt-3 border-t border-border/50">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-[#FF6600] hover:text-orange-500 hover:bg-orange-500/10"
                                            onClick={() => sendToBulk(cluster)}
                                        >
                                            Send to Bulk Generator
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
