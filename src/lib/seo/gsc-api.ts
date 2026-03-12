/**
 * Google Search Console (Webmasters) API fetching utility.
 * Requires an active user OAuth token with the `webmasters.readonly` scope.
 */

export interface GscMetrics {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

/**
 * Fetches search analytics for a specific URL out of a verified site properly.
 * NOTE: The user must have connected the blog URL as a "Site Property" in GSC.
 */
export async function fetchGscUrlMetrics(
    providerToken: string,
    siteUrl: string,
    pageUrl: string
): Promise<GscMetrics | null> {
    try {
        // Format property URL according to GSC specs (sc-domain: or standard URL)
        let siteUrlFormatted = siteUrl;
        if (!siteUrlFormatted.endsWith('/')) {
            siteUrlFormatted += '/';
        }

        const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrlFormatted)}/searchAnalytics/query`;

        // We want the last 30 days of data for the specific page
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const body = {
            startDate,
            endDate,
            dimensions: ["page"],
            dimensionFilterGroups: [
                {
                    filters: [
                        {
                            dimension: "page",
                            operator: "equals",
                            expression: pageUrl,
                        }
                    ]
                }
            ]
        };

        const res = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${providerToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            console.error("GSC API responded with error:", await res.text());
            return null;
        }

        const data = await res.json();
        const row = data.rows?.[0]; // Because we filtered by exact page, there should be max 1 row

        if (row) {
            return {
                clicks: row.clicks || 0,
                impressions: row.impressions || 0,
                ctr: row.ctr || 0,
                position: row.position || 0,
            };
        }

        return null;

    } catch (error) {
        console.error("GSC API fetch failed:", error);
        return null;
    }
}
