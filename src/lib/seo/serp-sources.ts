// SERP Source Fetcher
// Fetches real URLs from Serper API to use as external links in articles
// Prevents AI from hallucinating fake URLs

export interface SerpSource {
    url: string;
    title: string;
    snippet: string;
    domain: string;
    position: number;
}

export interface PAAQuestion {
    question: string;
    snippet?: string;
    link?: string;
}

export interface SerpIntelligence {
    sources: SerpSource[];
    paaQuestions: PAAQuestion[];
    competitorTitles: string[];
    answerBoxSnippet?: string;
}

// Fetch real SERP data for a keyword to use in article generation
export async function fetchSerpIntelligence(
    keyword: string,
    country: string = "us",
    language: string = "en"
): Promise<SerpIntelligence> {
    const apiKey = process.env.SERPER_API_KEY;

    if (!apiKey) {
        console.log("⚠️ No SERPER_API_KEY — skipping SERP intelligence fetch");
        return { sources: [], paaQuestions: [], competitorTitles: [] };
    }

    try {
        const response = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: {
                "X-API-KEY": apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                q: keyword,
                gl: country,
                hl: language,
                num: 10,
            }),
        });

        if (!response.ok) {
            console.warn(`Serper API error: ${response.status}`);
            return { sources: [], paaQuestions: [], competitorTitles: [] };
        }

        const data = await response.json();

        // Extract organic results as sources (skip low-quality domains)
        const BLOCKED_DOMAINS = ["pinterest.com", "quora.com", "reddit.com", "amazon.com", "ebay.com"];
        const sources: SerpSource[] = (data.organic || [])
            .filter((r: any) => r.link && r.title && r.snippet)
            .filter((r: any) => {
                const domain = extractDomain(r.link);
                return !BLOCKED_DOMAINS.some(blocked => domain.includes(blocked));
            })
            .slice(0, 8)
            .map((r: any, idx: number) => ({
                url: r.link,
                title: r.title,
                snippet: r.snippet || "",
                domain: extractDomain(r.link),
                position: idx + 1,
            }));

        // Extract People Also Ask questions
        const paaQuestions: PAAQuestion[] = (data.peopleAlsoAsk || []).map((paa: any) => ({
            question: paa.question,
            snippet: paa.snippet,
            link: paa.link,
        }));

        // Extract competitor titles for outline context
        const competitorTitles = (data.organic || [])
            .slice(0, 5)
            .map((r: any) => r.title)
            .filter(Boolean);

        // Extract answer box snippet
        const answerBoxSnippet = data.answerBox?.snippet || data.answerBox?.answer;

        console.log(`✅ SERP Intelligence: ${sources.length} sources, ${paaQuestions.length} PAA questions for "${keyword}"`);

        return { sources, paaQuestions, competitorTitles, answerBoxSnippet };
    } catch (error) {
        console.error("Failed to fetch SERP intelligence:", error);
        return { sources: [], paaQuestions: [], competitorTitles: [] };
    }
}

function extractDomain(url: string): string {
    try {
        return new URL(url).hostname.replace("www.", "");
    } catch {
        return url;
    }
}

// Format sources for injection into article prompt
// Returns a string that tells the AI exactly which URLs to link to
export function formatSourcesForPrompt(sources: SerpSource[]): string {
    if (sources.length === 0) return "";

    const selected = sources.slice(0, 5);
    const lines = selected.map(
        (s) => `- "${s.title}" → ${s.url} (${s.domain})`
    );

    return `REAL EXTERNAL SOURCES (use these actual URLs — do NOT invent other URLs):
${lines.join("\n")}

RULES FOR EXTERNAL LINKS:
- Link to 3-4 of these sources naturally within paragraph text
- Use descriptive anchor text (2-5 words) that fits the sentence context
- Add target="_blank" rel="noopener noreferrer" to all external links
- Format: <a href="URL" target="_blank" rel="noopener noreferrer">descriptive anchor text</a>
- Spread links across different sections — do NOT cluster them
- ONLY use the URLs listed above — do NOT invent or guess any other URLs
- If a source doesn't fit naturally, skip it (quality over quantity)`;
}

// Format PAA questions for FAQ generation
export function formatPAAForFAQ(paaQuestions: PAAQuestion[]): string {
    if (paaQuestions.length === 0) return "";
    return paaQuestions.map((q) => `- ${q.question}`).join("\n");
}
