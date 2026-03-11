import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = (authResult as any).user?.id || "anon";

        // Rate limit: 5 scrapes per minute
        const rl = checkRateLimit(`scrape:${userId}`, 5, 60_000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` },
                { status: 429 }
            );
        }

        const { url } = await req.json();

        if (!url || typeof url !== "string") {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        // Validate URL format
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
        } catch {
            return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
        }

        // SSRF protection - block internal/private URLs
        const blockedHostnames = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"];
        const blockedPatterns = [/^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^169\.254\./];
        
        if (blockedHostnames.includes(parsedUrl.hostname)) {
            return NextResponse.json({ error: "Access to internal URLs is not allowed" }, { status: 403 });
        }
        
        for (const pattern of blockedPatterns) {
            if (pattern.test(parsedUrl.hostname)) {
                return NextResponse.json({ error: "Access to internal URLs is not allowed" }, { status: 403 });
            }
        }

        // Only allow HTTP/HTTPS
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            return NextResponse.json({ error: "Only HTTP/HTTPS URLs are allowed" }, { status: 400 });
        }

        // Fetch the target URL
        // Adding headers to mimic a browser to avoid simple bot blocks
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            },
            next: { revalidate: 3600 } // cache for 1 hour to prevent abuse
        });

        if (!response.ok) {
            return NextResponse.json({ error: `Failed to fetch URL: ${response.statusText}` }, { status: 400 });
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Extract Title
        const title = $("title").text().trim() || $("h1").first().text().trim();

        // Extract Meta Description
        const description = $("meta[name='description']").attr("content")?.trim() ||
            $("meta[property='og:description']").attr("content")?.trim() || "";

        // Extract Headings (H2 and H3)
        const headings: { level: string; text: string }[] = [];
        $("h2, h3").each((_, el) => {
            const text = $(el).text().replace(/\s+/g, ' ').trim();
            if (text.length > 3 && text.length < 150) { // arbitrary limits to avoid noise
                headings.push({
                    level: el.tagName.toLowerCase(),
                    text
                });
            }
        });

        return NextResponse.json({
            title,
            description,
            headings
        });

    } catch (error) {
        console.error("Scraping error:", error);
        return NextResponse.json({ error: "Failed to scrape URL" }, { status: 500 });
    }
}
