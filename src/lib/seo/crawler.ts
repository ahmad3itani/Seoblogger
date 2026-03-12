import * as cheerio from "cheerio";

export interface CrawledPageData {
    url: string;
    title: string | null;
    metaDescription: string | null;
    h1: string | null;
    h1Count: number;
    h2Count: number;
    h3Count: number;
    wordCount: number;
    internalLinks: number;
    externalLinks: number;
    brokenLinks: number;
    imagesCount: number;
    missingAltCount: number;
    statusCode: number;
    loadTimeMs: number;
    canonical: string | null;
    hasOpenGraph: boolean;
    hasTwitterCard: boolean;
    hasSchemaMarkup: boolean;
    robotsMeta: string | null;
    hasViewport: boolean;
    htmlLang: string | null;
    textToHtmlRatio: number;
    hasSslIssue: boolean;
}

/**
 * Fetches and parses the sitemap.xml of a Blogger site to discover all URLs.
 * Blogger usually has sitemaps at /sitemap.xml
 */
export async function fetchSitemapUrls(baseUrl: string): Promise<string[]> {
    try {
        const sitemapUrl = new URL("/sitemap.xml", baseUrl).toString();
        const res = await fetch(sitemapUrl, { method: "GET" });
        if (!res.ok) return [];

        const xml = await res.text();
        const $ = cheerio.load(xml, { xmlMode: true });

        const urls: string[] = [];
        $("url > loc").each((_, el) => {
            const loc = $(el).text().trim();
            if (loc) urls.push(loc);
        });

        return urls;
    } catch (error) {
        console.error("Failed to parse sitemap:", error);
        return [];
    }
}

/**
 * Crawls a specific URL and parses the HTML to extract on-page SEO metrics.
 */
export async function crawlPage(url: string, baseUrl: string): Promise<CrawledPageData> {
    const data: CrawledPageData = {
        url,
        title: null,
        metaDescription: null,
        h1: null,
        h1Count: 0,
        h2Count: 0,
        h3Count: 0,
        wordCount: 0,
        internalLinks: 0,
        externalLinks: 0,
        brokenLinks: 0,
        imagesCount: 0,
        missingAltCount: 0,
        statusCode: 0,
        loadTimeMs: 0,
        canonical: null,
        hasOpenGraph: false,
        hasTwitterCard: false,
        hasSchemaMarkup: false,
        robotsMeta: null,
        hasViewport: false,
        htmlLang: null,
        textToHtmlRatio: 0,
        hasSslIssue: !url.startsWith("https"),
    };

    try {
        const start = Date.now();
        const res = await fetch(url, { headers: { "User-Agent": "BloggerSEO-Bot/1.0" } });
        const end = Date.now();

        data.statusCode = res.status;
        data.loadTimeMs = end - start;

        if (!res.ok) return data;

        const html = await res.text();
        const $ = cheerio.load(html);

        data.title = $("title").text().trim() || null;
        data.metaDescription = $("meta[name='description']").attr("content")?.trim() || null;

        // Heading analysis
        const h1s = $("h1");
        data.h1Count = h1s.length;
        if (h1s.length > 0) {
            data.h1 = $(h1s[0]).text().trim();
        }
        data.h2Count = $("h2").length;
        data.h3Count = $("h3").length;

        // Word count estimation (strip tags, count words in body)
        const textContent = $("body").text().replace(/\s+/g, ' ').trim();
        data.wordCount = textContent.split(' ').length;

        // Text-to-HTML ratio
        const htmlLength = html.length;
        const textLength = textContent.length;
        data.textToHtmlRatio = htmlLength > 0 ? Math.round((textLength / htmlLength) * 100) : 0;

        // Canonical URL
        data.canonical = $("link[rel='canonical']").attr("href")?.trim() || null;

        // Open Graph
        data.hasOpenGraph = $("meta[property='og:title']").length > 0 || $("meta[property='og:description']").length > 0;

        // Twitter Card
        data.hasTwitterCard = $("meta[name='twitter:card']").length > 0 || $("meta[name='twitter:title']").length > 0;

        // Schema / JSON-LD
        data.hasSchemaMarkup = $("script[type='application/ld+json']").length > 0;

        // Robots meta
        data.robotsMeta = $("meta[name='robots']").attr("content")?.trim() || null;

        // Viewport
        data.hasViewport = $("meta[name='viewport']").length > 0;

        // HTML lang
        data.htmlLang = $("html").attr("lang")?.trim() || null;

        // Links parsing
        $("a[href]").each((_, el) => {
            const href = $(el).attr("href");
            if (!href) return;
            if (href.startsWith("http") && !href.includes(baseUrl)) {
                data.externalLinks++;
            } else if (href.startsWith("/") || href.includes(baseUrl)) {
                data.internalLinks++;
            }
        });

        // Images parsing
        $("img").each((_, el) => {
            data.imagesCount++;
            const alt = $(el).attr("alt");
            if (!alt || alt.trim() === "") {
                data.missingAltCount++;
            }
        });

    } catch (error) {
        console.error(`Failed to crawl ${url}:`, error);
        data.statusCode = 500;
    }

    return data;
}
