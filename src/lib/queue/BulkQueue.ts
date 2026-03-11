// Bulk Generation Queue Manager
// Handles batch article generation with progress tracking

export interface QueueItem {
    id: string;
    keyword: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number; // 0-100
    result?: {
        articleId?: string;
        title?: string;
        wordCount?: number;
        error?: string;
    };
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
}

export interface QueueOptions {
    language?: string;
    tone?: string;
    articleType?: string;
    wordCount?: number;
    brandVoice?: string;
    includeFaq?: boolean;
    includeImages?: boolean;
    blogId?: string;
    autoPublish?: boolean;
}

export class BulkGenerationQueue {
    private items: Map<string, QueueItem> = new Map();
    private processing: boolean = false;
    private concurrency: number = 1; // Process one at a time to avoid rate limits
    private onProgress?: (item: QueueItem) => void;
    private onComplete?: (items: QueueItem[]) => void;

    constructor(concurrency: number = 1) {
        this.concurrency = concurrency;
    }

    // Add keywords to queue
    addKeywords(keywords: string[]): string[] {
        const ids: string[] = [];
        
        keywords.forEach(keyword => {
            const id = this.generateId();
            const item: QueueItem = {
                id,
                keyword: keyword.trim(),
                status: 'pending',
                progress: 0,
                createdAt: new Date(),
            };
            
            this.items.set(id, item);
            ids.push(id);
        });
        
        return ids;
    }

    // Start processing queue
    async start(
        options: QueueOptions,
        onProgress?: (item: QueueItem) => void,
        onComplete?: (items: QueueItem[]) => void
    ) {
        this.onProgress = onProgress;
        this.onComplete = onComplete;
        this.processing = true;

        const pendingItems = Array.from(this.items.values()).filter(
            item => item.status === 'pending'
        );

        // Process items with concurrency limit
        const chunks = this.chunkArray(pendingItems, this.concurrency);
        
        for (const chunk of chunks) {
            if (!this.processing) break;
            
            await Promise.all(
                chunk.map(item => this.processItem(item, options))
            );
        }

        this.processing = false;
        
        if (this.onComplete) {
            this.onComplete(Array.from(this.items.values()));
        }
    }

    // Stop processing
    stop() {
        this.processing = false;
    }

    // Process single item
    private async processItem(item: QueueItem, options: QueueOptions) {
        try {
            item.status = 'processing';
            item.startedAt = new Date();
            item.progress = 10;
            this.notifyProgress(item);

            // Step 1: Generate titles
            const titlesRes = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keyword: item.keyword,
                    language: options.language,
                    tone: options.tone,
                    articleType: options.articleType,
                    wordCount: options.wordCount,
                    brandVoice: options.brandVoice,
                    step: 'titles',
                }),
            });

            if (!titlesRes.ok) throw new Error('Failed to generate titles');
            
            const titlesData = await titlesRes.json();
            const selectedTitle = titlesData.titles[0];
            
            item.progress = 30;
            this.notifyProgress(item);

            // Step 2: Generate outline
            const outlineRes = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keyword: item.keyword,
                    language: options.language,
                    tone: options.tone,
                    articleType: options.articleType,
                    wordCount: options.wordCount,
                    brandVoice: options.brandVoice,
                    selectedTitle,
                    step: 'outline',
                }),
            });

            if (!outlineRes.ok) throw new Error('Failed to generate outline');
            
            const outlineData = await outlineRes.json();
            
            item.progress = 50;
            this.notifyProgress(item);

            // Step 3: Generate article
            const articleRes = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keyword: item.keyword,
                    language: options.language,
                    tone: options.tone,
                    articleType: options.articleType,
                    wordCount: options.wordCount,
                    brandVoice: options.brandVoice,
                    selectedTitle,
                    outline: outlineData.outline,
                    includeFaq: options.includeFaq,
                    includeImages: options.includeImages,
                    blogId: options.blogId,
                    step: 'article',
                }),
            });

            if (!articleRes.ok) throw new Error('Failed to generate article');
            
            const articleData = await articleRes.json();
            
            item.progress = 90;
            this.notifyProgress(item);

            // Step 4: Auto-publish if requested
            if (options.autoPublish && articleData.savedArticle?.id) {
                await fetch('/api/publish', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        articleId: articleData.savedArticle.id,
                        action: 'draft',
                    }),
                });
            }

            item.status = 'completed';
            item.progress = 100;
            item.completedAt = new Date();
            item.result = {
                articleId: articleData.savedArticle?.id,
                title: selectedTitle,
                wordCount: articleData.wordCount,
            };
            
            this.notifyProgress(item);
        } catch (error) {
            item.status = 'failed';
            item.progress = 0;
            item.completedAt = new Date();
            item.result = {
                error: (error as Error).message,
            };
            
            this.notifyProgress(item);
        }
    }

    // Get queue status
    getStatus() {
        const items = Array.from(this.items.values());
        
        return {
            total: items.length,
            pending: items.filter(i => i.status === 'pending').length,
            processing: items.filter(i => i.status === 'processing').length,
            completed: items.filter(i => i.status === 'completed').length,
            failed: items.filter(i => i.status === 'failed').length,
            items,
        };
    }

    // Get item by ID
    getItem(id: string): QueueItem | undefined {
        return this.items.get(id);
    }

    // Clear completed items
    clearCompleted() {
        const completed = Array.from(this.items.entries())
            .filter(([_, item]) => item.status === 'completed')
            .map(([id]) => id);
        
        completed.forEach(id => this.items.delete(id));
    }

    // Clear all items
    clearAll() {
        this.items.clear();
    }

    // Helper: Generate unique ID
    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Helper: Chunk array
    private chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    // Helper: Notify progress
    private notifyProgress(item: QueueItem) {
        if (this.onProgress) {
            this.onProgress({ ...item });
        }
    }
}
