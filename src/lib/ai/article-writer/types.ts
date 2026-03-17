// ─── Article Writer Workflow Types ─────────────────────────────────

export type ArticlePhase =
  | "ideation"
  | "research"
  | "style"
  | "thesis"
  | "outline"
  | "sections"
  | "writing"
  | "approval"
  | "editor"
  | "metadata"
  | "export"
  | "finished";

export const PHASE_ORDER: ArticlePhase[] = [
  "ideation",
  "research",
  "style",
  "thesis",
  "outline",
  "sections",
  "writing",
  "approval",
  "editor",
  "metadata",
  "export",
  "finished",
];

export const PHASE_LABELS: Record<ArticlePhase, string> = {
  ideation: "Topic Ideation",
  research: "Research Planning",
  style: "Style Selection",
  thesis: "Title & Thesis",
  outline: "Outline",
  sections: "Section Confirmation",
  writing: "Write Article",
  approval: "Article Approval",
  editor: "Editor Pass",
  metadata: "Article Metadata",
  export: "Export & Publish",
  finished: "Finished",
};

export interface StyleGuideSettings {
  voice: {
    tone: number;       // 0-10
    humor: number;      // 0-10
    opinion: number;    // 0-10
    technical: number;  // 0-10
  };
  formatting: {
    emojis: number;       // 0-10
    emDashes: number;     // 0-10
    blockquotes: "never" | "rare" | "occasional" | "frequent";
  };
  structure: {
    opening: string[];    // direct, contextual, narrative, tension
    closing: string[];    // summary, call_to_action, open_question, callback, provocation, key_takeaways
    visualBreaks: "minimal" | "moderate" | "generous";
    examples: "none" | "some" | "many";
    exampleTypes: string[]; // lists, tables, diagrams, code_snippets, quotes, case_studies
  };
  context: {
    authorRole: string;
    authorKnowledge: number;   // 0-10
    audienceRole: string;
    audienceKnowledge: number; // 0-10
    authorRelationship: number; // 0-10
  };
}

export interface ResearchSource {
  url: string;
  title: string;
  author?: string;
  date?: string;
  domain: string;
  required: boolean;
  relevance: string;
  excerpt: string;
  accessed: string;
}

export interface OutlineItem {
  heading: string;
  type: "opening" | "closing" | null;
  status: "pending" | "in_progress" | "complete";
  points?: string[];
}

export interface DraftState {
  id: string;
  phase: ArticlePhase;
  initialIdea?: string;
  refinedTopic?: string;
  exploratoryResearch?: {
    searchesPerformed: string[];
    sourcesReviewed: string[];
    date: string;
  };
  researchDepth: "none" | "light" | "medium" | "heavy";
  includeCitations: boolean;
  approvedSources: ResearchSource[];
  citationsUsed: Array<{
    sourceUrl: string;
    citationCount: number;
    citedInSections: string[];
  }>;
  styleGuideId?: string;
  title?: string;
  thesis?: string;
  outline?: OutlineItem[];
  writingMode?: "section" | "full";
  sections?: Record<string, string>;
  draftContent?: string;
  editorContent?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  language: string;
  keyword?: string;
  niche?: string;
  articleType: string;
  wordCount: number;
}

// API request/response types for each phase
export interface IdeationRequest {
  draftId?: string;
  initialIdea: string;
  language?: string;
  niche?: string;
  articleType?: string;
  wordCount?: number;
  blogId?: string;
}

export interface IdeationResponse {
  draftId: string;
  refinedTopic: string;
  angles: string[];
  exploratoryResearch: {
    searchesPerformed: string[];
    findings: string[];
  };
  suggestedKeyword: string;
}

export interface ResearchRequest {
  draftId: string;
  wantResearch: boolean;
  researchDepth?: "light" | "medium" | "heavy";
  includeCitations?: boolean;
  customUrls?: string[];
}

export interface ThesisRequest {
  draftId: string;
  styleGuideId?: string;
}

export interface ThesisResponse {
  titles: string[];
  theses: string[];
}

export interface OutlineRequest {
  draftId: string;
  selectedTitle: string;
  selectedThesis: string;
}

export interface SectionsRequest {
  draftId: string;
  confirmedOutline: OutlineItem[];
}

export interface WriteRequest {
  draftId: string;
  writingMode: "section" | "full";
  sectionSlug?: string; // For section-by-section mode
}

export interface EditorRequest {
  draftId: string;
  skipEditor?: boolean;
}

export interface MetadataRequest {
  draftId: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
}

export interface ExportRequest {
  draftId: string;
  includeCitationsInExport?: boolean;
  publishAction?: "draft" | "publish" | "schedule";
  scheduleDate?: string;
  blogId?: string;
  labels?: string[];
  includeImages?: boolean;
  numInlineImages?: number;
  includeFaq?: boolean;
  includeToc?: boolean;
  includeInternalLinks?: boolean;
}
