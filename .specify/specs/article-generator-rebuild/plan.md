# Implementation Plan: Article Generator V3 Rebuild

## Technical Context

### Technology Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: Supabase
- **AI**: OpenAI API (GPT-4, GPT-3.5-turbo)
- **Image Generation**: OpenAI DALL-E 3
- **Publishing**: Google Blogger API v3
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui

### Existing Architecture
```
/src/app/api/
  ├── generate/route.ts          (old generator - keep as backup)
  ├── article-writer/route.ts    (12-phase - keep as backup)
  ├── generate-v3/route.ts       (NEW - to implement)
  ├── blogs/route.ts             (existing - needs connection check)
  └── auth/google/route.ts       (existing OAuth flow)

/src/app/dashboard/
  ├── new/
  │   ├── page.tsx               (current 12-phase UI)
  │   ├── page.old.tsx           (old simple generator backup)
  │   └── page.v3.tsx            (NEW - to implement, then replace)
  ├── bulk/page.tsx              (working - don't touch)
  └── settings/page.tsx          (needs connection status fix)

/src/lib/
  ├── ai/generate.ts             (existing AI functions)
  ├── blogger.ts                 (Blogger API client)
  ├── google.ts                  (OAuth token management)
  └── formatter.ts               (HTML formatting)
```

### Key Constraints
1. **No Database Schema Changes**: Use existing tables as-is
2. **Preserve Bulk Generator**: Don't modify `/dashboard/bulk`
3. **Backward Compatibility**: Keep old generators as backups
4. **Rate Limits**: OpenAI (10k RPM), Blogger API (10 QPS)
5. **Token Limits**: GPT-4 (8k context), GPT-3.5-turbo (16k context)

### Critical Bug to Fix
**Blogger Publish Issue:**
- **Root Cause**: `createPost(blogIdToUse, ...)` receives Prisma `blog.id` (cuid like `clxxx...`) instead of Blogger API `blog.blogId` (numeric like `1234567890`)
- **Fix**: Look up `blog.blogId` from database before calling Blogger API
- **Location**: `/api/generate-v3/route.ts` lines 240-260

## Constitution Check

### Project Principles (from constitution.md)
1. **User Experience First**: Simple, intuitive interfaces
2. **Reliability**: Never show false success messages
3. **Error Transparency**: Clear, actionable error messages
4. **Performance**: Fast generation, no unnecessary steps
5. **Security**: Never expose credentials, validate all inputs

### Alignment Verification
✅ **Simple UX**: Single-page form vs complex 12-phase workflow  
✅ **Reliability**: Accurate publish status, proper error handling  
✅ **Transparency**: Show specific errors (token expired, blog not found, etc.)  
✅ **Performance**: One-click generation, no multi-step navigation  
✅ **Security**: Rate limiting, input sanitization, token refresh  

**Gates Passed**: All principles aligned ✓

## Phase 0: Research & Decisions

### Research Tasks

#### 1. Blogger API Blog ID Format
**Question**: What's the difference between Prisma `blog.id` and Blogger API `blog.blogId`?

**Research**:
- Prisma `blog.id`: Internal cuid (e.g., `clxxx123abc...`)
- Blogger API `blog.blogId`: Numeric string from Google (e.g., `"1234567890123456789"`)
- Blogger API expects the numeric `blogId`, not the Prisma cuid

**Decision**: Always look up `blog.blogId` from database before calling Blogger API

**Implementation**:
```typescript
const blogRecord = await prisma.blog.findFirst({
  where: { id: blogIdToUse, userId: authUser.id },
  select: { blogId: true, id: true, name: true },
});

await createPost(
  blogRecord.blogId,  // Use Blogger API ID, not Prisma cuid
  { title, content, labels, isDraft },
  accessToken
);
```

#### 2. Content Feature Implementation
**Question**: How to implement comparison tables, pros/cons, recipe format in AI generation?

**Research**:
- Comparison tables: Add to article generation prompt with markdown table syntax
- Pros/Cons: Add structured section with bullet points
- Recipe format: Add schema.org Recipe markup + structured HTML
- Step-by-Step: Add numbered list with clear headings

**Decision**: Enhance AI prompts based on selected features

**Implementation**:
```typescript
const options: GenerationOptions = {
  keyword,
  includeComparisonTable,
  includeProsCons,
  includeRecipe,
  includeStepByStep,
  // ... other options
};

// In generateArticle():
if (options.includeComparisonTable) {
  prompt += "\n\nInclude a comparison table in markdown format.";
}
if (options.includeProsCons) {
  prompt += "\n\nInclude a Pros & Cons section with bullet points.";
}
```

#### 3. Token Validation Strategy
**Question**: How to check if Google OAuth token is valid before showing "connected"?

**Research**:
- Token stored in `user.googleAccessToken` and `user.googleRefreshToken`
- Token expires after 1 hour
- Can check validity by making a test API call to Blogger
- Refresh token if expired using `getValidAccessToken()`

**Decision**: Add token validation to `/api/blogs` GET endpoint

**Implementation**:
```typescript
// In /api/blogs GET:
if (user.googleAccessToken) {
  try {
    await getValidAccessToken(user.id); // Throws if can't refresh
    setHasConnection(true);
  } catch (e) {
    if (e.message === "NEEDS_RECONNECT") {
      setHasConnection(false);
      return { error: "Token expired. Please reconnect." };
    }
  }
}
```

#### 4. Progress Updates Strategy
**Question**: How to show real-time progress during generation?

**Research**:
- Can't use Server-Sent Events (SSE) easily with Next.js App Router
- Can use polling with status endpoint
- Can use optimistic UI updates on client

**Decision**: Use client-side progress simulation (simpler, good UX)

**Implementation**:
```typescript
// Frontend simulates progress:
setProgress("Generating titles...");
// ... API call starts
setTimeout(() => setProgress("Creating outline..."), 2000);
setTimeout(() => setProgress("Writing article..."), 5000);
// ... API call completes
setProgress("");
```

### Alternatives Considered

| Decision | Alternative | Why Not Chosen |
|----------|-------------|----------------|
| Single-page UI | Keep 12-phase workflow | Too complex for simple generation |
| Client progress simulation | Server-Sent Events | SSE complex in App Router |
| Fix existing Article Writer | Build from scratch | Too much technical debt |
| Modify bulk generator | Keep separate | Bulk tool works, don't break it |

## Phase 1: Design & Contracts

### Data Model

**No schema changes needed**. Using existing tables:

```prisma
model User {
  id                  String   @id @db.Uuid
  googleAccessToken   String?
  googleRefreshToken  String?
  blogs               Blog[]
  articles            Article[]
  brandProfiles       BrandProfile[]
}

model Blog {
  id          String   @id @default(cuid())
  blogId      String   @unique  // Blogger API ID (numeric)
  name        String
  url         String
  userId      String   @db.Uuid
  isDefault   Boolean  @default(false)
  user        User     @relation(fields: [userId], references: [id])
  articles    Article[]
}

model Article {
  id              String   @id @default(cuid())
  title           String
  content         String   @db.Text
  outline         String?  @db.Text
  metaDescription String?
  excerpt         String?
  labels          String?
  tone            String
  articleType     String
  wordCount       Int
  status          String   // "draft" | "published"
  bloggerPostId   String?  // Blogger post ID
  blogId          String?  // References Blog.id (Prisma cuid)
  userId          String   @db.Uuid
  user            User     @relation(fields: [userId], references: [id])
  blog            Blog?    @relation(fields: [blogId], references: [id])
}

model BrandProfile {
  id           String   @id @default(cuid())
  name         String
  tone         String
  language     String
  niche        String?
  instructions String?  @db.Text
  isDefault    Boolean  @default(false)
  userId       String   @db.Uuid
  user         User     @relation(fields: [userId], references: [id])
}
```

### API Contracts

#### POST `/api/generate-v3`

**Request:**
```typescript
interface GenerateV3Request {
  // Required
  keyword: string;
  
  // Article settings
  language?: string;           // Default: "en"
  tone?: string;              // Default: "professional"
  niche?: string;
  articleType?: string;       // Default: "informational"
  wordCount?: number;         // Default: 2000
  brandVoiceId?: string;
  
  // Content features (all boolean, default varies)
  includeFaq?: boolean;           // Default: true
  includeImages?: boolean;        // Default: true
  numImages?: number;             // Default: 3
  includeComparisonTable?: boolean;
  includeRecipe?: boolean;
  includeProsCons?: boolean;
  includeStepByStep?: boolean;
  includeToc?: boolean;           // Default: true
  includeInternalLinks?: boolean; // Default: true
  includeExternalLinks?: boolean; // Default: true
  
  // Publishing
  blogId?: string;            // Prisma Blog.id
  labels?: string[];
  publishAction?: "draft" | "publish"; // Default: "draft"
}
```

**Response (Success):**
```typescript
interface GenerateV3Response {
  success: true;
  article: {
    id: string;
    title: string;
    content: string;
    wordCount: number;
    status: "draft" | "published";
  };
  meta: {
    metaDescription: string;
    excerpt: string;
  };
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
  image?: {
    url: string;
    altText: string;
  };
  publishedToBlogger: boolean;
  publishError?: string;
}
```

**Response (Error):**
```typescript
interface GenerateV3Error {
  error: string;
  usageLimit?: boolean;  // If true, user hit usage limit
}
```

**Status Codes:**
- `200`: Success (even if publish failed - check `publishError`)
- `400`: Invalid input
- `403`: Usage limit exceeded
- `429`: Rate limit exceeded
- `500`: Server error

### Component Architecture

**Frontend Component Tree:**
```
NewArticlePageV3
├── ArticleSettingsCard
│   ├── KeywordInput
│   ├── LanguageSelect
│   ├── ToneSelect
│   ├── ArticleTypeSelect
│   ├── WordCountSelect
│   ├── NicheInput
│   ├── LabelsInput
│   ├── BrandVoiceSelect
│   └── BlogSelect
├── ContentFeaturesCard
│   ├── FeatureToggle (FAQ)
│   ├── FeatureToggle (Images)
│   ├── FeatureToggle (TOC)
│   ├── FeatureToggle (Internal Links)
│   ├── FeatureToggle (External Links)
│   ├── FeatureToggle (Comparison Table)
│   ├── FeatureToggle (Recipe)
│   ├── FeatureToggle (Pros/Cons)
│   ├── FeatureToggle (Step-by-Step)
│   └── ImageCountSelect
├── PublishingCard
│   ├── DraftOption
│   └── PublishOption
├── ErrorAlert (conditional)
├── GenerateButton
└── ResultCard (conditional)
    ├── StatusIcon
    ├── StatusMessage
    ├── PublishErrorAlert (conditional)
    ├── ArticlePreview
    └── ActionButtons
```

## Phase 2: Implementation Tasks

### Task Breakdown

#### Backend Tasks

**Task 1.1: Create `/api/generate-v3/route.ts`**
- [ ] Set up route handler with POST method
- [ ] Add authentication check
- [ ] Add rate limiting (5 req/min per user)
- [ ] Add input validation and sanitization
- [ ] Add usage limit check

**Task 1.2: Implement Generation Pipeline**
- [ ] Generate titles (pick best one)
- [ ] Generate outline
- [ ] Generate article with content features
- [ ] Generate FAQs (if requested)
- [ ] Generate meta tags
- [ ] Generate images (if requested)
- [ ] Add internal links (if requested)
- [ ] Embed images in content
- [ ] Format for Blogger

**Task 1.3: Fix Blogger Publish Logic**
- [ ] Look up `blog.blogId` from database
- [ ] Validate blog belongs to user
- [ ] Get valid access token (refresh if needed)
- [ ] Call `createPost` with correct Blogger API blog ID
- [ ] Handle publish errors gracefully
- [ ] Set article status based on actual result
- [ ] Return `publishedToBlogger` and `publishError` flags

**Task 1.4: Save to Database**
- [ ] Create article record with correct status
- [ ] Link to blog (Prisma ID)
- [ ] Store Blogger post ID if published
- [ ] Track usage (articles, images, words)

#### Frontend Tasks

**Task 2.1: Create `/dashboard/new/page.v3.tsx`**
- [ ] Set up page component with state management
- [ ] Load brand profiles on mount
- [ ] Load blogs on mount
- [ ] Handle brand profile selection
- [ ] Handle blog selection

**Task 2.2: Build Form UI**
- [ ] Article settings section
- [ ] Content features toggles
- [ ] Publishing options
- [ ] Image count selector (conditional)
- [ ] Error alert component

**Task 2.3: Implement Generation Flow**
- [ ] Validate keyword input
- [ ] Show loading state with progress
- [ ] Call `/api/generate-v3`
- [ ] Handle success response
- [ ] Handle error response
- [ ] Show result card

**Task 2.4: Build Result UI**
- [ ] Status icon (green for success, yellow for partial)
- [ ] Status message (accurate based on flags)
- [ ] Publish error alert (if present)
- [ ] Article preview
- [ ] Action buttons (View Articles, Write Another)

#### Connection Fix Tasks

**Task 3.1: Update `/api/blogs` GET**
- [ ] Add token validation check
- [ ] Return connection status in response
- [ ] Handle token refresh errors
- [ ] Add logging for debugging

**Task 3.2: Update Settings UI**
- [ ] Show real connection status
- [ ] Add "Test Connection" button
- [ ] Show reconnect prompt if token expired
- [ ] Add refresh blogs button

#### Deployment Tasks

**Task 4.1: Testing**
- [ ] Test all content features individually
- [ ] Test Blogger publish (success case)
- [ ] Test Blogger publish (failure cases)
- [ ] Test connection status accuracy
- [ ] Test error handling
- [ ] Test rate limiting

**Task 4.2: Replace Old Generator**
- [ ] Rename current `page.tsx` to `page.old-v2.tsx`
- [ ] Rename `page.v3.tsx` to `page.tsx`
- [ ] Update navigation if needed
- [ ] Test production build

**Task 4.3: Deploy**
- [ ] Commit changes
- [ ] Push to GitHub
- [ ] Verify Vercel deployment
- [ ] Test in production
- [ ] Monitor for errors

## Phase 3: Testing Strategy

### Unit Tests (Manual)

**Backend API Tests:**
1. Valid request with all features → Success
2. Valid request with publish → Publishes to Blogger
3. Invalid blog ID → Error
4. Expired token → Refresh and retry
5. Rate limit exceeded → 429 error
6. Usage limit exceeded → 403 error

**Frontend UI Tests:**
1. All toggles work correctly
2. Form validation works
3. Loading state shows progress
4. Success state shows accurate status
5. Error state shows clear message
6. Reset works correctly

### Integration Tests

**End-to-End Flows:**
1. **Happy Path**: Generate → Publish → Verify on Blogger
2. **Draft Path**: Generate → Save as Draft → Verify in DB
3. **Error Path**: Invalid token → Show error → Reconnect
4. **Feature Path**: Enable all features → Verify in output

### Acceptance Criteria

- [ ] Can generate article with all features in one click
- [ ] Blogger publish works 100% or shows clear error
- [ ] All content toggles functional
- [ ] Frontend shows accurate publish status
- [ ] No false "Published" messages
- [ ] Connection status is accurate
- [ ] Bulk generator still works

## Rollback Plan

If deployment fails:
1. Revert `page.tsx` to `page.old-v2.tsx`
2. Remove `/api/generate-v3` route
3. Git revert to previous commit
4. Redeploy

Backup files preserved:
- `page.old.tsx` (original simple generator)
- `page.old-v2.tsx` (12-phase Article Writer)
- `/api/generate/route.ts` (old generator)
- `/api/article-writer/route.ts` (12-phase backend)

## Success Metrics

**Technical Metrics:**
- Blogger publish success rate: >95%
- False positive rate: 0%
- Average generation time: <30s
- Error rate: <5%

**User Metrics:**
- User can complete generation in <2 minutes
- Clear error messages for all failure cases
- No confusion about publish status

## Next Steps

After plan approval:
1. Execute Phase 1 (Backend) - Already 80% complete
2. Execute Phase 2 (Frontend) - Already 80% complete
3. Execute Phase 3 (Connection fix)
4. Execute Phase 4 (Testing & Deployment)
