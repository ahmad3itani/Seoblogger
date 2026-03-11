// Schema Markup Generator
// Generates structured data for better SEO

export interface ArticleSchema {
    "@context": string;
    "@type": string;
    headline: string;
    description?: string;
    image?: string[];
    datePublished?: string;
    dateModified?: string;
    author?: {
        "@type": string;
        name: string;
    };
    publisher?: {
        "@type": string;
        name: string;
        logo?: {
            "@type": string;
            url: string;
        };
    };
}

export interface FAQSchema {
    "@context": string;
    "@type": string;
    mainEntity: Array<{
        "@type": string;
        name: string;
        acceptedAnswer: {
            "@type": string;
            text: string;
        };
    }>;
}

export interface HowToSchema {
    "@context": string;
    "@type": string;
    name: string;
    description?: string;
    totalTime?: string;
    step: Array<{
        "@type": string;
        name: string;
        text: string;
        url?: string;
    }>;
}

export interface BreadcrumbSchema {
    "@context": string;
    "@type": string;
    itemListElement: Array<{
        "@type": string;
        position: number;
        name: string;
        item: string;
    }>;
}

// Generate Article schema
export function generateArticleSchema(options: {
    title: string;
    description?: string;
    imageUrl?: string;
    authorName?: string;
    publisherName?: string;
    publisherLogo?: string;
    datePublished?: Date;
    dateModified?: Date;
}): ArticleSchema {
    const schema: ArticleSchema = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: options.title,
    };

    if (options.description) {
        schema.description = options.description;
    }

    if (options.imageUrl) {
        schema.image = [options.imageUrl];
    }

    if (options.datePublished) {
        schema.datePublished = options.datePublished.toISOString();
    }

    if (options.dateModified) {
        schema.dateModified = options.dateModified.toISOString();
    }

    if (options.authorName) {
        schema.author = {
            "@type": "Person",
            name: options.authorName,
        };
    }

    if (options.publisherName) {
        schema.publisher = {
            "@type": "Organization",
            name: options.publisherName,
        };

        if (options.publisherLogo) {
            schema.publisher.logo = {
                "@type": "ImageObject",
                url: options.publisherLogo,
            };
        }
    }

    return schema;
}

// Generate FAQ schema from Q&A pairs
export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>): FAQSchema {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map(faq => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
            },
        })),
    };
}

// Generate HowTo schema from steps
export function generateHowToSchema(options: {
    title: string;
    description?: string;
    steps: Array<{ title: string; description: string }>;
    totalTime?: string;
}): HowToSchema {
    return {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: options.title,
        description: options.description,
        totalTime: options.totalTime,
        step: options.steps.map((step, index) => ({
            "@type": "HowToStep",
            name: step.title,
            text: step.description,
        })),
    };
}

// Generate Breadcrumb schema
export function generateBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string }>): BreadcrumbSchema {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((crumb, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: crumb.name,
            item: crumb.url,
        })),
    };
}

// Extract steps from HTML content for HowTo schema
export function extractStepsFromContent(html: string): Array<{ title: string; description: string }> {
    const steps: Array<{ title: string; description: string }> = [];
    
    // Look for numbered lists or headings with "step" in them
    const stepRegex = /<(h[2-6]|li)[^>]*>.*?(step\s+\d+|^\d+\.).*?<\/(h[2-6]|li)>/gi;
    const matches = html.match(stepRegex);
    
    if (matches) {
        matches.forEach(match => {
            const titleMatch = match.match(/>([^<]+)</);
            if (titleMatch) {
                steps.push({
                    title: titleMatch[1].trim(),
                    description: titleMatch[1].trim(),
                });
            }
        });
    }
    
    return steps;
}

// Format schema as JSON-LD script tag
export function formatSchemaAsScript(schema: any): string {
    return `<script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
</script>`;
}

// Generate Recipe schema
export function generateRecipeSchema(options: {
    title: string;
    description?: string;
    imageUrl?: string;
    prepTime?: string;
    cookTime?: string;
    totalTime?: string;
    recipeYield?: string;
    ingredients?: string[];
    instructions?: string[];
    keywords?: string;
}): any {
    const schema: any = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: options.title,
        description: options.description,
        image: options.imageUrl ? [options.imageUrl] : undefined,
        prepTime: options.prepTime,
        cookTime: options.cookTime,
        totalTime: options.totalTime,
        recipeYield: options.recipeYield,
        recipeIngredient: options.ingredients || [],
        recipeInstructions: (options.instructions || []).map((instruction, index) => ({
            "@type": "HowToStep",
            name: `Step ${index + 1}`,
            text: instruction,
        })),
        keywords: options.keywords,
    };
    
    return schema;
}

// Extract recipe data from HTML content
export function extractRecipeFromContent(html: string): any {
    const ingredients: string[] = [];
    const instructions: string[] = [];
    
    // Extract ingredients from lists
    const ingredientSection = html.match(/ingredients?[^<]*<ul[^>]*>([\s\S]*?)<\/ul>/i);
    if (ingredientSection) {
        const items = ingredientSection[1].match(/<li[^>]*>(.*?)<\/li>/gi);
        if (items) {
            items.forEach(item => {
                const text = item.replace(/<[^>]*>/g, '').trim();
                if (text) ingredients.push(text);
            });
        }
    }
    
    // Extract instructions from ordered lists
    const instructionSection = html.match(/instructions?[^<]*<ol[^>]*>([\s\S]*?)<\/ol>/i);
    if (instructionSection) {
        const items = instructionSection[1].match(/<li[^>]*>(.*?)<\/li>/gi);
        if (items) {
            items.forEach(item => {
                const text = item.replace(/<[^>]*>/g, '').trim();
                if (text) instructions.push(text);
            });
        }
    }
    
    return { ingredients, instructions };
}

// Generate all relevant schemas for an article
export function generateAllSchemas(options: {
    title: string;
    description?: string;
    content: string;
    imageUrl?: string;
    faqs?: Array<{ question: string; answer: string }>;
    authorName?: string;
    publisherName?: string;
    publisherLogo?: string;
    articleType?: string;
    hasRecipe?: boolean;
    hasStepByStep?: boolean;
    keyword?: string;
}): string[] {
    const schemas: string[] = [];
    
    // Always add Article schema
    const articleSchema = generateArticleSchema({
        title: options.title,
        description: options.description,
        imageUrl: options.imageUrl,
        authorName: options.authorName,
        publisherName: options.publisherName,
        publisherLogo: options.publisherLogo,
        datePublished: new Date(),
        dateModified: new Date(),
    });
    schemas.push(formatSchemaAsScript(articleSchema));
    
    // Add FAQ schema if FAQs exist
    if (options.faqs && options.faqs.length > 0) {
        const faqSchema = generateFAQSchema(options.faqs);
        schemas.push(formatSchemaAsScript(faqSchema));
    }
    
    // Add Recipe schema if recipe content detected
    if (options.hasRecipe) {
        const recipeData = extractRecipeFromContent(options.content);
        if (recipeData.ingredients.length > 0 || recipeData.instructions.length > 0) {
            const recipeSchema = generateRecipeSchema({
                title: options.title,
                description: options.description,
                imageUrl: options.imageUrl,
                ingredients: recipeData.ingredients,
                instructions: recipeData.instructions,
                keywords: options.keyword,
            });
            schemas.push(formatSchemaAsScript(recipeSchema));
        }
    }
    
    // Add HowTo schema for step-by-step guides
    if (options.hasStepByStep || options.articleType === 'how-to') {
        const steps = extractStepsFromContent(options.content);
        if (steps.length > 0) {
            const howToSchema = generateHowToSchema({
                title: options.title,
                description: options.description,
                steps,
            });
            schemas.push(formatSchemaAsScript(howToSchema));
        }
    }
    
    return schemas;
}
