// Real Keyword Research API Integration
// Uses multiple free/affordable APIs to get actual keyword data

interface KeywordMetrics {
    keyword: string;
    searchVolume: number;
    difficulty: number;
    cpc?: number;
    competition?: string;
    trend: "rising" | "stable" | "declining";
}

interface KeywordSuggestion {
    keyword: string;
    searchVolume: number;
}

interface KeywordAPIResponse {
    keyword: string;
    searchVolume: number;
    difficulty: number;
    cpc: number;
    competition: string;
    trend: "rising" | "stable" | "declining";
    intent: "informational" | "commercial" | "transactional" | "navigational";
    intentConfidence: number; // 0-100
    relatedKeywords: string[];
    questions: string[];
    variations: string[];
    topQueries: Array<{
        query: string;
        volume?: number;
        relevance: number;
    }>;
    serpFeatures: string[];
    competitorDomains: Array<{
        domain: string;
        position: number;
        authority: "high" | "medium" | "low";
    }>;
    // Full SERP data from Serper
    organicResults?: Array<{
        position: number;
        title: string;
        link: string;
        snippet: string;
        domain: string;
        date?: string;
        sitelinks?: Array<{
            title: string;
            link: string;
        }>;
        richSnippet?: {
            rating?: number;
            ratingCount?: number;
            price?: string;
        };
    }>;
    knowledgeGraph?: {
        title: string;
        type: string;
        description: string;
        imageUrl?: string;
        attributes?: Record<string, string>;
        website?: string;
        profiles?: Array<{
            name: string;
            link: string;
        }>;
    };
    answerBox?: {
        snippet: string;
        title?: string;
        link?: string;
        source?: string;
        date?: string;
        list?: string[];
        table?: Array<Record<string, string>>;
    };
    shopping?: Array<{
        title: string;
        price: string;
        link: string;
        source: string;
        imageUrl?: string;
        rating?: number;
    }>;
    localResults?: Array<{
        title: string;
        address: string;
        rating?: number;
        reviews?: number;
        phone?: string;
    }>;
    images?: Array<{
        title: string;
        imageUrl: string;
        link: string;
        source: string;
    }>;
    videos?: Array<{
        title: string;
        link: string;
        channel: string;
        duration?: string;
        date?: string;
        imageUrl?: string;
    }>;
    news?: Array<{
        title: string;
        link: string;
        source: string;
        date: string;
        snippet?: string;
    }>;
    tweets?: Array<{
        text: string;
        author: string;
        date: string;
        link: string;
    }>;
    topStories?: Array<{
        title: string;
        link: string;
        source: string;
        date: string;
        imageUrl?: string;
    }>;
    inlineVideos?: Array<{
        title: string;
        link: string;
        channel: string;
        duration?: string;
        imageUrl?: string;
    }>;
    faqs?: Array<{
        question: string;
        answer: string;
        source?: string;
    }>;
    searchMetadata?: {
        totalResults: string;
        timeTaken: number;
        location: string;
    };
    seasonality?: {
        peak: string;
        trend: number[];
    };
}

// Detect search intent from keyword and SERP data
function detectSearchIntent(keyword: string, serpData?: any): { intent: KeywordAPIResponse["intent"]; confidence: number } {
    const lowerKeyword = keyword.toLowerCase();
    
    // Transactional indicators
    const transactionalWords = ["buy", "purchase", "order", "shop", "price", "cheap", "discount", "deal", "coupon", "sale"];
    let transactionalScore = transactionalWords.filter(w => lowerKeyword.includes(w)).length * 30;
    
    // Commercial indicators
    const commercialWords = ["best", "top", "review", "vs", "compare", "alternative", "versus"];
    let commercialScore = commercialWords.filter(w => lowerKeyword.includes(w)).length * 25;
    
    // Informational indicators
    const informationalWords = ["what", "how", "why", "when", "where", "guide", "tutorial", "learn", "tips"];
    let informationalScore = informationalWords.filter(w => lowerKeyword.includes(w)).length * 25;
    
    // Navigational indicators (brand/website names)
    const navigationalWords = ["login", "sign in", "account", "official", "website"];
    let navigationalScore = navigationalWords.filter(w => lowerKeyword.includes(w)).length * 35;
    
    // Check SERP features for additional signals
    if (serpData) {
        if (serpData.shopping) transactionalScore += 20;
        if (serpData.knowledgeGraph) informationalScore += 15;
        if (serpData.topStories) informationalScore += 10;
    }
    
    const scores = {
        transactional: transactionalScore,
        commercial: commercialScore,
        informational: informationalScore,
        navigational: navigationalScore,
    };
    
    const maxScore = Math.max(...Object.values(scores));
    const intent = Object.keys(scores).find(k => scores[k as keyof typeof scores] === maxScore) as KeywordAPIResponse["intent"];
    
    // Default to informational if no clear signals
    const finalIntent = maxScore > 0 ? intent : "informational";
    const confidence = Math.min(maxScore, 100);
    
    return { intent: finalIntent, confidence };
}

// Google Trends API (Free, no key needed)
async function getGoogleTrends(keyword: string): Promise<{ trend: "rising" | "stable" | "declining" }> {
    try {
        // Using google-trends-api npm package or direct API
        // For now, return stable as fallback
        return { trend: "stable" };
    } catch (error) {
        console.error("Google Trends error:", error);
        return { trend: "stable" };
    }
}

// ValueSERP API (Free tier: 100 searches/month)
async function getValueSERPData(keyword: string): Promise<Partial<KeywordMetrics>> {
    const apiKey = process.env.VALUESERP_API_KEY;
    
    if (!apiKey) {
        console.warn("VALUESERP_API_KEY not configured");
        return {};
    }

    try {
        const response = await fetch(
            `https://api.valueserp.com/search?api_key=${apiKey}&q=${encodeURIComponent(keyword)}&location=United States&google_domain=google.com&gl=us&hl=en&num=10`,
            { next: { revalidate: 86400 } } // Cache for 24 hours
        );

        if (!response.ok) {
            throw new Error(`ValueSERP API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Extract search volume from related searches or estimate from results
        const resultsCount = data.search_information?.total_results || 0;
        const estimatedVolume = Math.min(Math.floor(resultsCount / 1000), 100000);

        return {
            searchVolume: estimatedVolume,
            difficulty: calculateDifficultyFromResults(data),
        };
    } catch (error) {
        console.error("ValueSERP API error:", error);
        return {};
    }
}

// Serper API (Affordable: $50 for 10k searches)
async function getSerperData(keyword: string): Promise<Partial<KeywordAPIResponse>> {
    const apiKey = process.env.SERPER_API_KEY;
    
    if (!apiKey) {
        console.warn("SERPER_API_KEY not configured");
        return {};
    }

    try {
        console.log(`📡 Calling Serper API for keyword: "${keyword}"`);
        
        // Get search results
        const searchResponse = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: {
                "X-API-KEY": apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                q: keyword,
                gl: "us",
                hl: "en",
                num: 10,
            }),
            next: { revalidate: 86400 },
        });

        console.log(`📊 Serper API response status: ${searchResponse.status}`);

        if (!searchResponse.ok) {
            const errorText = await searchResponse.text();
            console.error(`❌ Serper API error (${searchResponse.status}):`, errorText);
            throw new Error(`Serper API error: ${searchResponse.status} - ${errorText}`);
        }

        // Check content type before parsing
        const contentType = searchResponse.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const responseText = await searchResponse.text();
            console.error(`❌ Serper API returned non-JSON response:`, responseText.substring(0, 200));
            throw new Error(`Serper API returned invalid content type: ${contentType}`);
        }

        const searchData = await searchResponse.json();
        console.log(`✅ Serper API data received successfully`);
        console.log(`📊 Search info:`, JSON.stringify(searchData.searchInformation, null, 2));

        // Get related searches
        const relatedKeywords = searchData.relatedSearches?.map((r: any) => r.query) || [];
        
        // Get People Also Ask questions
        const questions = searchData.peopleAlsoAsk?.map((q: any) => q.question) || [];

        // Estimate search volume from results count
        const totalResults = searchData.searchInformation?.totalResults;
        console.log(`📈 Total results from Serper:`, totalResults);
        
        const resultsCount = totalResults ? parseInt(totalResults.toString().replace(/,/g, "")) : 0;
        console.log(`🔢 Parsed results count:`, resultsCount);
        
        // Better estimation: use organic results count and related searches as signals
        let estimatedVolume = 0;
        if (resultsCount > 0) {
            // More realistic estimation based on results count
            estimatedVolume = Math.min(Math.floor(resultsCount / 100), 500000);
        } else {
            // Fallback: estimate based on number of organic results and related searches
            const organicCount = searchData.organic?.length || 0;
            const relatedCount = searchData.relatedSearches?.length || 0;
            estimatedVolume = (organicCount + relatedCount) * 100;
        }
        console.log(`📊 Estimated search volume:`, estimatedVolume);

        // Calculate difficulty based on domain authority of top results
        const difficulty = calculateDifficultyFromSerperResults(searchData.organic || []);
        
        // Extract top queries (related searches with relevance scoring)
        const topQueries = relatedKeywords.slice(0, 10).map((query: string, index: number) => ({
            query,
            relevance: Math.max(100 - (index * 8), 20),
        }));
        
        // Detect SERP features
        const serpFeatures: string[] = [];
        if (searchData.answerBox) serpFeatures.push("Answer Box");
        if (searchData.knowledgeGraph) serpFeatures.push("Knowledge Graph");
        if (searchData.peopleAlsoAsk?.length > 0) serpFeatures.push("People Also Ask");
        if (searchData.relatedSearches?.length > 0) serpFeatures.push("Related Searches");
        if (searchData.topStories) serpFeatures.push("Top Stories");
        if (searchData.videos) serpFeatures.push("Video Results");
        if (searchData.shopping) serpFeatures.push("Shopping Results");
        if (searchData.images) serpFeatures.push("Image Pack");
        if (searchData.local) serpFeatures.push("Local Results");
        if (searchData.tweets) serpFeatures.push("Twitter Results");
        
        // Extract competitor domains
        const competitorDomains = (searchData.organic || []).slice(0, 5).map((result: any, index: number) => {
            const domain = new URL(result.link).hostname.replace("www.", "");
            const highAuthDomains = ["wikipedia.org", "youtube.com", "amazon.com", "reddit.com", "forbes.com", "nytimes.com"];
            const authority = highAuthDomains.includes(domain) ? "high" : index < 2 ? "medium" : "low";
            
            return {
                domain,
                position: index + 1,
                authority: authority as "high" | "medium" | "low",
            };
        });

        // Extract full organic results with ALL available data
        const organicResults = (searchData.organic || []).slice(0, 10).map((result: any, index: number) => ({
            position: index + 1,
            title: result.title || "",
            link: result.link || "",
            snippet: result.snippet || "",
            domain: new URL(result.link).hostname.replace("www.", ""),
            date: result.date,
            sitelinks: result.sitelinks?.map((sl: any) => ({
                title: sl.title || "",
                link: sl.link || "",
            })),
            richSnippet: result.richSnippet ? {
                rating: result.richSnippet.rating,
                ratingCount: result.richSnippet.ratingCount || result.richSnippet.reviews,
                price: result.richSnippet.price,
            } : undefined,
        }));

        // Extract Knowledge Graph with ALL fields
        const knowledgeGraph = searchData.knowledgeGraph ? {
            title: searchData.knowledgeGraph.title || "",
            type: searchData.knowledgeGraph.type || "",
            description: searchData.knowledgeGraph.description || "",
            imageUrl: searchData.knowledgeGraph.imageUrl || searchData.knowledgeGraph.image,
            attributes: searchData.knowledgeGraph.attributes || {},
            website: searchData.knowledgeGraph.website,
            profiles: searchData.knowledgeGraph.profiles?.map((p: any) => ({
                name: p.name || "",
                link: p.link || "",
            })),
        } : undefined;

        // Extract Answer Box with ALL fields
        const answerBox = searchData.answerBox ? {
            snippet: searchData.answerBox.snippet || searchData.answerBox.answer || "",
            title: searchData.answerBox.title,
            link: searchData.answerBox.link,
            source: searchData.answerBox.source,
            date: searchData.answerBox.date,
            list: searchData.answerBox.list,
            table: searchData.answerBox.table,
        } : undefined;

        // Extract Shopping Results
        const shopping = searchData.shopping?.slice(0, 8).map((item: any) => ({
            title: item.title || "",
            price: item.price || "",
            link: item.link || "",
            source: item.source || "",
            imageUrl: item.imageUrl,
            rating: item.rating,
        }));

        // Extract Local Results
        const localResults = searchData.local?.slice(0, 5).map((place: any) => ({
            title: place.title || "",
            address: place.address || "",
            rating: place.rating,
            reviews: place.reviews,
            phone: place.phone,
        }));

        // Extract Images
        const images = searchData.images?.slice(0, 12).map((img: any) => ({
            title: img.title || "",
            imageUrl: img.imageUrl || "",
            link: img.link || "",
            source: img.source || "",
        }));

        // Extract Videos
        const videos = searchData.videos?.slice(0, 6).map((video: any) => ({
            title: video.title || "",
            link: video.link || "",
            channel: video.channel || "",
            duration: video.duration,
            date: video.date,
            imageUrl: video.imageUrl,
        }));

        // Extract News
        const news = searchData.news?.slice(0, 5).map((article: any) => ({
            title: article.title || "",
            link: article.link || "",
            source: article.source || "",
            date: article.date || "",
            snippet: article.snippet,
        }));

        // Extract Tweets
        const tweets = searchData.tweets?.slice(0, 5).map((tweet: any) => ({
            text: tweet.snippet || "",
            author: tweet.title || "",
            date: tweet.date || "",
            link: tweet.link || "",
        }));

        // Extract Top Stories
        const topStories = searchData.topStories?.slice(0, 5).map((story: any) => ({
            title: story.title || "",
            link: story.link || "",
            source: story.source || "",
            date: story.date || "",
            imageUrl: story.imageUrl,
        }));

        // Extract Inline Videos
        const inlineVideos = searchData.inlineVideos?.slice(0, 5).map((video: any) => ({
            title: video.title || "",
            link: video.link || "",
            channel: video.channel || "",
            duration: video.duration,
            imageUrl: video.imageUrl,
        }));

        // Extract FAQs from People Also Ask
        const faqs = searchData.peopleAlsoAsk?.slice(0, 10).map((faq: any) => ({
            question: faq.question || "",
            answer: faq.snippet || faq.answer || "",
            source: faq.link,
        }));

        // Extract Search Metadata
        const searchMetadata = searchData.searchInformation ? {
            totalResults: searchData.searchInformation.totalResults || "0",
            timeTaken: searchData.searchInformation.timeTaken || 0,
            location: "United States",
        } : undefined;

        return {
            searchVolume: estimatedVolume,
            difficulty,
            relatedKeywords: relatedKeywords.slice(0, 10),
            questions: questions.slice(0, 8),
            topQueries,
            serpFeatures,
            competitorDomains,
            organicResults,
            knowledgeGraph,
            answerBox,
            shopping,
            localResults,
            images,
            videos,
            news,
            tweets,
            topStories,
            inlineVideos,
            faqs,
            searchMetadata,
        };
    } catch (error) {
        console.error("Serper API error:", error);
        return {};
    }
}

// DataForSEO API (Free tier available)
async function getDataForSEOData(keyword: string): Promise<Partial<KeywordMetrics>> {
    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;
    
    if (!login || !password) {
        console.warn("DataForSEO credentials not configured");
        return {};
    }

    try {
        const auth = Buffer.from(`${login}:${password}`).toString("base64");
        
        const response = await fetch("https://api.dataforseo.com/v3/keywords_data/google/search_volume/live", {
            method: "POST",
            headers: {
                "Authorization": `Basic ${auth}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify([{
                keywords: [keyword],
                location_code: 2840, // United States
                language_code: "en",
            }]),
            next: { revalidate: 86400 },
        });

        if (!response.ok) {
            throw new Error(`DataForSEO API error: ${response.status}`);
        }

        const data = await response.json();
        const result = data.tasks?.[0]?.result?.[0];

        if (result) {
            return {
                searchVolume: result.search_volume || 0,
                cpc: result.cpc || 0,
                competition: result.competition || "low",
            };
        }

        return {};
    } catch (error) {
        console.error("DataForSEO API error:", error);
        return {};
    }
}

// Calculate difficulty from SERP results
function calculateDifficultyFromSerperResults(organicResults: any[]): number {
    if (!organicResults || organicResults.length === 0) return 50;

    let totalScore = 0;
    const weights = [0.3, 0.25, 0.2, 0.15, 0.1]; // Top 5 results weighted

    organicResults.slice(0, 5).forEach((result, index) => {
        let score = 50; // Base score

        // High authority domains
        const highAuthDomains = ["wikipedia.org", "youtube.com", "amazon.com", "reddit.com", "quora.com"];
        if (highAuthDomains.some(domain => result.link?.includes(domain))) {
            score += 30;
        }

        // HTTPS
        if (result.link?.startsWith("https://")) {
            score += 5;
        }

        // Long content (estimated from snippet)
        if (result.snippet?.length > 150) {
            score += 10;
        }

        totalScore += score * (weights[index] || 0.05);
    });

    return Math.min(Math.round(totalScore), 100);
}

// Calculate difficulty from ValueSERP results
function calculateDifficultyFromResults(data: any): number {
    const resultsCount = data.search_information?.total_results || 0;
    const organicResults = data.organic_results || [];

    let difficulty = 50;

    // More results = higher competition
    if (resultsCount > 100000000) difficulty += 20;
    else if (resultsCount > 10000000) difficulty += 10;

    // Check top domains
    const topDomains = organicResults.slice(0, 3).map((r: any) => r.domain);
    const highAuthDomains = ["wikipedia.org", "youtube.com", "amazon.com"];
    
    if (topDomains.some((d: string) => highAuthDomains.includes(d))) {
        difficulty += 15;
    }

    return Math.min(difficulty, 100);
}

// Generate keyword variations using AI
async function generateKeywordVariations(keyword: string): Promise<string[]> {
    const variations: string[] = [];
    
    // Add common modifiers
    const modifiers = [
        "best", "top", "how to", "what is", "guide", "tips",
        "vs", "review", "tutorial", "examples", "free", "online"
    ];

    // Add year
    const currentYear = new Date().getFullYear();
    variations.push(`${keyword} ${currentYear}`);

    // Add modifiers
    modifiers.forEach(mod => {
        variations.push(`${mod} ${keyword}`);
        variations.push(`${keyword} ${mod}`);
    });

    // Add question formats
    variations.push(`how to ${keyword}`);
    variations.push(`what is ${keyword}`);
    variations.push(`why ${keyword}`);
    variations.push(`when to ${keyword}`);

    return variations.slice(0, 15);
}

// Main function to aggregate data from all sources
export async function getKeywordData(keyword: string): Promise<KeywordAPIResponse> {
    console.log(`🔍 Fetching real keyword data for: "${keyword}"`);

    // Fetch from all available sources in parallel
    const [serperData, valueSerpData, dataForSeoData, trendData] = await Promise.all([
        getSerperData(keyword),
        getValueSERPData(keyword),
        getDataForSEOData(keyword),
        getGoogleTrends(keyword),
    ]);

    // Merge data with priority: DataForSEO > Serper > ValueSERP
    const searchVolume = 
        dataForSeoData.searchVolume || 
        serperData.searchVolume || 
        valueSerpData.searchVolume || 
        0;

    const difficulty = 
        serperData.difficulty || 
        valueSerpData.difficulty || 
        50;

    const cpc = dataForSeoData.cpc || 0;
    const competition = dataForSeoData.competition || "medium";

    // Generate variations if not provided
    const variations = await generateKeywordVariations(keyword);
    
    // Detect search intent
    const intentData = detectSearchIntent(keyword, serperData);

    const result: KeywordAPIResponse = {
        keyword,
        searchVolume,
        difficulty,
        cpc,
        competition,
        trend: trendData.trend,
        intent: intentData.intent,
        intentConfidence: intentData.confidence,
        relatedKeywords: serperData.relatedKeywords || [],
        questions: serperData.questions || [],
        variations,
        topQueries: serperData.topQueries || [],
        serpFeatures: serperData.serpFeatures || [],
        competitorDomains: serperData.competitorDomains || [],
    };

    console.log(`✅ Keyword data fetched:`, {
        keyword,
        searchVolume,
        difficulty,
        sources: {
            serper: !!serperData.searchVolume,
            valueSerp: !!valueSerpData.searchVolume,
            dataForSeo: !!dataForSeoData.searchVolume,
        }
    });

    return result;
}

// Fallback to estimated data if no API keys configured
export function getEstimatedKeywordData(keyword: string): KeywordAPIResponse {
    const wordCount = keyword.split(" ").length;
    
    // Deterministic estimates based on keyword characteristics (no random data)
    // Use keyword length as a consistent factor
    const keywordLength = keyword.length;
    const consistentFactor = (keywordLength % 10) / 10 + 0.8; // 0.8 to 1.7 based on length
    
    const baseVolume = wordCount === 1 ? 50000 : wordCount === 2 ? 10000 : 2000;
    const searchVolume = Math.round(baseVolume * consistentFactor);
    
    const difficulty = wordCount === 1 ? 75 : wordCount === 2 ? 50 : 30;
    
    // Detect intent from keyword alone
    const intentData = detectSearchIntent(keyword);

    return {
        keyword,
        searchVolume,
        difficulty,
        cpc: 1.5,
        competition: difficulty > 60 ? "high" : difficulty > 40 ? "medium" : "low",
        trend: "stable",
        intent: intentData.intent,
        intentConfidence: intentData.confidence,
        relatedKeywords: [],
        questions: [],
        variations: [],
        topQueries: [],
        serpFeatures: [],
        competitorDomains: [],
    };
}
