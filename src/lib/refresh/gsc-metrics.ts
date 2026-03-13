/**
 * Extended Search Console metrics for the Content Refresh Engine.
 * Fetches page-level clicks, impressions, CTR, position with date-range comparison.
 */

export interface PagePerformance {
    url: string;
    clicksLast28: number;
    clicksPrev28: number;
    impressionsLast28: number;
    impressionsPrev28: number;
    ctrLast28: number;
    avgPositionLast28: number;
    topQueries: { query: string; clicks: number; impressions: number; position: number }[];
    clicksTrend: "up" | "down" | "stable";
    impressionsTrend: "up" | "down" | "stable";
}

function dateStr(d: Date): string {
    return d.toISOString().split("T")[0];
}

async function queryGsc(
    accessToken: string,
    siteUrl: string,
    startDate: string,
    endDate: string,
    dimensions: string[],
    pageFilter?: string
): Promise<any[]> {
    let formatted = siteUrl;
    if (!formatted.endsWith("/")) formatted += "/";

    const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(formatted)}/searchAnalytics/query`;

    const body: any = {
        startDate,
        endDate,
        dimensions,
        rowLimit: 1000,
    };

    if (pageFilter) {
        body.dimensionFilterGroups = [
            {
                filters: [{ dimension: "page", operator: "equals", expression: pageFilter }],
            },
        ];
    }

    const res = await fetch(endpoint, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.rows || [];
}

/**
 * Fetch all page-level metrics for the blog with current vs previous period comparison.
 */
export async function fetchAllPagePerformance(
    accessToken: string,
    siteUrl: string
): Promise<PagePerformance[]> {
    const now = new Date();
    const last28End = dateStr(new Date(now.getTime() - 1 * 86400000)); // yesterday
    const last28Start = dateStr(new Date(now.getTime() - 29 * 86400000));
    const prev28End = dateStr(new Date(now.getTime() - 30 * 86400000));
    const prev28Start = dateStr(new Date(now.getTime() - 58 * 86400000));

    // Fetch current period page metrics
    const currentRows = await queryGsc(accessToken, siteUrl, last28Start, last28End, ["page"]);
    // Fetch previous period page metrics
    const prevRows = await queryGsc(accessToken, siteUrl, prev28Start, prev28End, ["page"]);

    const prevMap = new Map<string, { clicks: number; impressions: number }>();
    for (const row of prevRows) {
        const url = row.keys?.[0];
        if (url) prevMap.set(url, { clicks: row.clicks || 0, impressions: row.impressions || 0 });
    }

    const results: PagePerformance[] = [];

    for (const row of currentRows) {
        const url = row.keys?.[0];
        if (!url) continue;

        const prev = prevMap.get(url) || { clicks: 0, impressions: 0 };
        const clicks = row.clicks || 0;
        const impressions = row.impressions || 0;

        results.push({
            url,
            clicksLast28: clicks,
            clicksPrev28: prev.clicks,
            impressionsLast28: impressions,
            impressionsPrev28: prev.impressions,
            ctrLast28: row.ctr || 0,
            avgPositionLast28: row.position || 0,
            topQueries: [], // filled separately per candidate
            clicksTrend: clicks > prev.clicks * 1.1 ? "up" : clicks < prev.clicks * 0.9 ? "down" : "stable",
            impressionsTrend: impressions > prev.impressions * 1.1 ? "up" : impressions < prev.impressions * 0.9 ? "down" : "stable",
        });
    }

    return results;
}

/**
 * Fetch top queries for a specific page URL.
 */
export async function fetchPageTopQueries(
    accessToken: string,
    siteUrl: string,
    pageUrl: string
): Promise<{ query: string; clicks: number; impressions: number; position: number }[]> {
    const now = new Date();
    const endDate = dateStr(new Date(now.getTime() - 1 * 86400000));
    const startDate = dateStr(new Date(now.getTime() - 29 * 86400000));

    const rows = await queryGsc(accessToken, siteUrl, startDate, endDate, ["query"], pageUrl);

    return rows.map((r: any) => ({
        query: r.keys?.[0] || "",
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        position: r.position || 0,
    })).sort((a: any, b: any) => b.impressions - a.impressions).slice(0, 20);
}
