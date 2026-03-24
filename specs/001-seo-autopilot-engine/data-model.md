# Data Model: SEO Autopilot Engine

**Feature**: 001-seo-autopilot-engine
**Date**: 2026-03-23

## Entities

### 1. AutopilotSession (New Model)

Tracks when a user ran the autopilot analysis and stores the resulting content plan.

```prisma
model AutopilotSession {
  id          String   @id @default(cuid())
  userId      String   @db.Uuid
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Source data
  blogId      String
  blogName    String
  postsAnalyzed Int    @default(0)

  // Settings
  language    String   @default("en")
  niche       String?
  depthLevel  String   @default("standard") // standard, aggressive

  // Analysis results
  summary     Json     // ContentPlanSummary
  contentPlan Json     // ContentPlan (grouped by priority)

  // Status
  status      String   @default("completed") // analyzing, completed, failed
  errorMessage String?
  durationMs  Int      @default(0)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@index([blogId])
}
```

**Relationships**:
- `User` → `AutopilotSession[]` (one-to-many)

**User Relation Update** (add to existing User model):
```prisma
model User {
  // ... existing fields ...
  autopilotSessions AutopilotSession[]
}
```

### 2. ContentPlanSummary (JSON Schema)

Embedded in `AutopilotSession.summary`.

```typescript
interface ContentPlanSummary {
  totalArticlesAnalyzed: number;
  mainTopics: string[];           // Detected topic clusters
  weakAreas: string[];            // Gaps identified
  contentDistribution: {
    category: string;
    count: number;
  }[];
}
```

### 3. ContentPlan (JSON Schema)

Embedded in `AutopilotSession.contentPlan`.

```typescript
interface ContentPlan {
  highPriority: ArticleIdea[];    // Generate first
  mediumPriority: ArticleIdea[];  // Generate second
  lowPriority: ArticleIdea[];     // Generate last
}
```

### 4. ArticleIdea (JSON Schema)

A single suggested article within the content plan.

```typescript
interface ArticleIdea {
  id: string;                     // Generated UUID for UI selection
  title: string;                  // SEO-optimized title
  keyword: string;                // Primary target keyword
  secondaryKeywords: string[];    // LSI/related keywords
  intent: SearchIntent;           // informational, commercial, transactional, navigational
  category: string;               // Topic cluster category
  priority: Priority;             // high, medium, low
  reason: string;                 // Why this article matters (gap/opportunity)
  internalLinks: InternalLink[];  // 0-3 suggested internal links
  estimatedDifficulty: Difficulty; // easy, medium, hard
}

type SearchIntent = 'informational' | 'commercial' | 'transactional' | 'navigational';
type Priority = 'high' | 'medium' | 'low';
type Difficulty = 'easy' | 'medium' | 'hard';
```

### 5. InternalLink (JSON Schema)

Suggested internal link for an article idea.

```typescript
interface InternalLink {
  title: string;      // Existing post title
  url: string;        // Existing post URL (from cachedPost)
  anchorText: string; // Suggested anchor text
}
```

## Validation Rules

### AutopilotSession

| Field | Rule |
|-------|------|
| `userId` | Required, must exist in User table |
| `blogId` | Required, must match a Blog the user owns |
| `depthLevel` | Must be "standard" or "aggressive" |
| `status` | Must be one of: "analyzing", "completed", "failed" |
| `summary` | Required when status = "completed", must match ContentPlanSummary schema |
| `contentPlan` | Required when status = "completed", must match ContentPlan schema |

### ArticleIdea

| Field | Rule |
|-------|------|
| `title` | Required, 30-70 characters (SEO optimal) |
| `keyword` | Required, unique within the content plan |
| `intent` | Must be valid SearchIntent enum value |
| `priority` | Must be valid Priority enum value |
| `reason` | Required, 10-100 characters |
| `internalLinks` | Max 3 items, all URLs must exist in cachedPost |

### Deduplication Rules

1. `ArticleIdea.keyword` must not be >70% similar to any existing `cachedPost.title`
2. No duplicate keywords within the same `ContentPlan`
3. `ArticleIdea.secondaryKeywords` should not overlap with `keyword`

## State Transitions

### AutopilotSession.status

```
[Initial] → analyzing → completed
                     ↘ failed
```

| Transition | Trigger | Side Effects |
|------------|---------|--------------|
| → analyzing | User clicks "Run Autopilot" | Create session, start analysis |
| analyzing → completed | AI returns valid plan | Populate summary & contentPlan |
| analyzing → failed | AI error or timeout | Set errorMessage |

## Indexes

```prisma
@@index([userId])        // Find user's sessions
@@index([blogId])        // Find sessions for a blog
@@index([createdAt])     // Recent sessions first
```

## Migration Strategy

```sql
-- Migration: add_autopilot_session
CREATE TABLE "AutopilotSession" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "blogId" TEXT NOT NULL,
    "blogName" TEXT NOT NULL,
    "postsAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "language" TEXT NOT NULL DEFAULT 'en',
    "niche" TEXT,
    "depthLevel" TEXT NOT NULL DEFAULT 'standard',
    "summary" JSONB NOT NULL DEFAULT '{}',
    "contentPlan" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'completed',
    "errorMessage" TEXT,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutopilotSession_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AutopilotSession_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "AutopilotSession_userId_idx" ON "AutopilotSession"("userId");
CREATE INDEX "AutopilotSession_blogId_idx" ON "AutopilotSession"("blogId");
CREATE INDEX "AutopilotSession_createdAt_idx" ON "AutopilotSession"("createdAt" DESC);
```

## Existing Models Used

### CachedPost (existing, read-only)

Used as input for content analysis.

```prisma
model CachedPost {
  id          String   @id @default(cuid())
  postId      String
  blogId      String
  title       String
  url         String
  contentHash String?
  publishedAt DateTime?
  // ...
}
```

**Usage**: Fetch existing posts for analysis (FR-001).

### Blog (existing, read-only)

Used to identify which blog to analyze.

```prisma
model Blog {
  id          String @id @default(cuid())
  blogId      String @unique
  name        String
  userId      String @db.Uuid
  cachedPosts CachedPost[]
  // ...
}
```

**Usage**: Validate user owns the blog, get blog name for session.
