/**
 * Utility for fetching Core Web Vitals and Performance scores 
 * from the Google PageSpeed Insights API.
 */

export interface PageSpeedData {
    performanceScore: number;
    lcp: number; // Largest Contentful Paint (ms)
    cls: number; // Cumulative Layout Shift
    fid: number; // First Input Delay (ms)
}

export async function fetchPageSpeedMetrics(url: string, strategy: "mobile" | "desktop" = "mobile"): Promise<PageSpeedData | null> {
    try {
        const apiKey = process.env.GOOGLE_API_KEY; // General Google API Key
        let apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}`;

        if (apiKey) {
            apiUrl += `&key=${apiKey}`;
        }

        const res = await fetch(apiUrl);
        if (!res.ok) return null;

        const data = await res.json();

        const lighthouse = data.lighthouseResult;
        if (!lighthouse) return null;

        const categories = lighthouse.categories;
        const audits = lighthouse.audits;

        return {
            performanceScore: Math.round((categories?.performance?.score || 0) * 100),
            lcp: Math.round(audits?.['largest-contentful-paint']?.numericValue || 0),
            cls: Number((audits?.['cumulative-layout-shift']?.numericValue || 0).toFixed(3)),
            fid: Math.round(audits?.['max-potential-fid']?.numericValue || 0), // Fallback if exact FID isn't available
        };
    } catch (error) {
        console.error("PageSpeed Insights fetch failed:", error);
        return null;
    }
}
