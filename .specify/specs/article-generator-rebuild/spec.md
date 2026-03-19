# Feature Specification: Article Generator V3 Rebuild

## Overview
Complete rebuild of the article generation system to replace the broken 12-phase Article Writer with a clean, single-page generator that includes all content features (FAQ, Comparison Tables, Pros/Cons, Recipe, etc.) and properly publishes to Blogger.

## Problem Statement

### Current Issues
1. **Blogger Publish Bug**: System shows "Published" but articles don't appear on Blogger
2. **Missing Features**: Current Article Writer lacks toggles for comparison tables, FAQ, pros/cons, recipe format, etc.
3. **Blogger Connection**: Shows "connected" but isn't actually connected (stale cached data)
4. **Complex UX**: 12-phase workflow is too complex for simple article generation
5. **Bulk Tool Works**: The bulk generator publishes successfully, but single article writer doesn't

### Root Causes Identified
- Article Writer was using Prisma internal ID (cuid) instead of Blogger API blog ID
- Frontend always showed success even when Blogger API failed
- No error feedback to user when publishing fails
- Missing content feature toggles in the new Article Writer

## Goals

### Primary Goals
1. **Single-Page Generator**: One comprehensive form with all options visible
2. **All Content Features**: FAQ, Comparison Table, Pros/Cons, Recipe, Step-by-Step, TOC, Internal/External Links
3. **Reliable Blogger Publishing**: Use correct blog IDs, proper error handling, accurate status reporting
4. **Simple UX**: Fill form → click generate → get article (no multi-phase workflow)
5. **Keep Bulk Tool**: Don't touch the working bulk generator

### Success Criteria
- User can generate article with all features in one click
- Publishing to Blogger works 100% of the time (or shows clear error)
- All content toggles functional (FAQ, tables, pros/cons, etc.)
- Frontend accurately reflects publish status
- No false "Published" messages

## User Stories

### Story 1: Generate Article with All Features
**As a** content creator  
**I want to** generate an SEO article with comparison tables, FAQs, and pros/cons in one click  
**So that** I can create comprehensive content without multiple steps

**Acceptance Criteria:**
- Single form with all content feature toggles visible
- Can enable/disable: FAQ, Comparison Table, Pros/Cons, Recipe, Step-by-Step, TOC, Internal Links, External Links
- Can select number of AI images (0-5)
- Can choose brand voice profile
- Can select target blog
- Generate button creates complete article with all selected features

### Story 2: Publish to Blogger Reliably
**As a** blogger  
**I want to** publish articles directly to my Blogger blog  
**So that** I don't have to manually copy/paste content

**Acceptance Criteria:**
- Select "Publish to Blogger" option before generation
- System uses correct Blogger API blog ID (not Prisma cuid)
- If publish succeeds: show "Published to Blogger!" with post URL
- If publish fails: show specific error message and save as draft
- Never show false "Published" status

### Story 3: See Accurate Connection Status
**As a** user  
**I want to** know if my Blogger account is actually connected  
**So that** I don't try to publish when disconnected

**Acceptance Criteria:**
- Settings page shows real connection status (not cached)
- If token expired: show "Reconnect Required"
- If connected: show blog list with refresh option
- Clear error messages for connection issues

## Technical Requirements

### Backend API (`/api/generate-v3`)

**Input Schema:**
```typescript
{
  keyword: string;              // Required
  language: string;             // Default: "en"
  tone: string;                 // Default: "professional"
  niche?: string;
  articleType: string;          // Default: "informational"
  wordCount: number;            // Default: 2000
  brandVoiceId?: string;
  
  // Content features
  includeFaq: boolean;          // Default: true
  includeImages: boolean;       // Default: true
  numImages: number;            // Default: 3
  includeComparisonTable: boolean;
  includeRecipe: boolean;
  includeProsCons: boolean;
  includeStepByStep: boolean;
  includeToc: boolean;          // Default: true
  includeInternalLinks: boolean;
  includeExternalLinks: boolean;
  
  // Publishing
  blogId?: string;              // Prisma blog.id
  labels?: string[];
  publishAction: "draft" | "publish";
}
```

**Processing Flow:**
1. Validate inputs and check rate limits
2. Generate titles (pick best one)
3. Generate outline
4. Generate article content with all requested features
5. Generate FAQs if requested
6. Generate meta tags
7. Generate images if requested
8. Add internal links if requested
9. Embed images in content
10. Format for Blogger
11. **Publish to Blogger** (if requested):
    - Look up actual Blogger API blog ID from database
    - Call Blogger API with correct blog ID
    - Handle errors gracefully
    - Return accurate status
12. Save to database with correct status
13. Track usage

**Output Schema:**
```typescript
{
  success: boolean;
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
  faqs?: Array<{question: string; answer: string}>;
  image?: {url: string; altText: string};
  publishedToBlogger: boolean;
  publishError?: string;
}
```

### Frontend UI (`/dashboard/new`)

**Layout:**
```
┌─────────────────────────────────────┐
│  Article Generator                   │
├─────────────────────────────────────┤
│  Article Settings                    │
│  - Keyword *                         │
│  - Language, Tone, Type, Word Count  │
│  - Niche, Labels                     │
│  - Brand Voice, Target Blog          │
├─────────────────────────────────────┤
│  Content Features (Toggle Buttons)   │
│  [✓] FAQ  [✓] Images  [✓] TOC       │
│  [ ] Comparison  [ ] Pros/Cons       │
│  [ ] Recipe  [ ] Step-by-Step        │
│  [✓] Internal Links  [✓] External    │
├─────────────────────────────────────┤
│  Publishing                          │
│  ( ) Save as Draft                   │
│  (•) Publish to Blogger              │
├─────────────────────────────────────┤
│  [Generate Article]                  │
└─────────────────────────────────────┘
```

**States:**
1. **Form State**: User fills out options
2. **Loading State**: Shows progress ("Generating titles...", "Writing article...", etc.)
3. **Success State**: Shows result with accurate status
4. **Error State**: Shows specific error message

### Blogger Connection Fix

**Issue:** Settings shows "connected" based on cached blogs, but Google token may be expired

**Solution:**
- Check token validity before showing "connected"
- Add "Test Connection" button that actually calls Blogger API
- Show token expiry date if available
- Clear "Reconnect Required" messaging

## Data Model

### Existing Tables (No Changes)
- `User`: Has `googleAccessToken`, `googleRefreshToken`
- `Blog`: Has `blogId` (Blogger API ID) and `id` (Prisma cuid)
- `Article`: Has `bloggerPostId`, `status`, `blogId`
- `BrandProfile`: Has brand voice instructions

### Key Relationships
```
User.id → Blog.userId
User.id → Article.userId
Blog.id → Article.blogId  (Prisma ID, not Blogger API ID)
```

## Implementation Plan

### Phase 1: Backend API
1. Create `/api/generate-v3/route.ts`
2. Implement all generation steps in sequence
3. Fix Blogger publish logic (use correct blog ID)
4. Add comprehensive error handling
5. Return accurate status flags

### Phase 2: Frontend UI
1. Create `/dashboard/new/page.v3.tsx`
2. Single-page form with all toggles
3. Real-time progress updates
4. Success/error state handling
5. Accurate status display

### Phase 3: Blogger Connection
1. Add token validation to `/api/blogs`
2. Add "Test Connection" endpoint
3. Update Settings UI with clear status
4. Add reconnect flow

### Phase 4: Testing & Deployment
1. Test all content features
2. Test Blogger publish (success & failure cases)
3. Test connection status accuracy
4. Replace old Article Writer with new one
5. Deploy to production

## Non-Goals
- Don't modify the bulk generator (it works)
- Don't change the 12-phase workflow (keep as backup)
- Don't modify database schema
- Don't change authentication flow

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Blogger API rate limits | High | Add rate limiting, queue system |
| Token expiry during generation | Medium | Refresh token before publish |
| Image generation failures | Low | Make images optional, continue without |
| Missing content features | Medium | Test all toggles thoroughly |

## Dependencies
- OpenAI API (article generation)
- Blogger API (publishing)
- Prisma (database)
- Supabase (auth)

## Timeline Estimate
- Phase 1 (Backend): 2 hours
- Phase 2 (Frontend): 1 hour
- Phase 3 (Connection): 1 hour
- Phase 4 (Testing): 1 hour
- **Total**: ~5 hours
