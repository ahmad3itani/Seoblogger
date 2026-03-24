# Implementation Plan: Amazon Affiliate SEO Engine

**Branch**: `002-amazon-affiliate-seo-engine` | **Date**: 2026-03-24 | **Spec**: [spec.md](./spec.md)

## Summary

Enhance the existing Amazon Affiliate article generator into a full SEO Engine with:
- Strategic product selection (budget/mid/premium tiers)
- Featured snippet optimization
- Trust signals and conversion boosters
- Two-step generation flow with product preview UI

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js 16
**Primary Dependencies**: OpenRouter AI, Cloudflare Workers AI, Prisma
**Storage**: PostgreSQL via Supabase
**Testing**: Manual testing (existing pattern)
**Target Platform**: Web (Vercel deployment)
**Project Type**: Web application enhancement

## Project Structure

### Files to Modify

```text
src/lib/amazon/
├── generate.ts              # Core generation logic (MODIFY)
├── intent.ts                # NEW: Intent detection
├── comparison-table.ts      # NEW: Programmatic table generation
└── featured-snippet.ts      # NEW: Featured snippet generation

src/app/api/amazon/
├── generate/route.ts        # MODIFY: Accept pre-researched products
└── research/route.ts        # NEW: Product research endpoint

src/app/dashboard/amazon/
└── page.tsx                 # MODIFY: Two-step UI with previews

src/components/amazon/
├── product-preview-card.tsx # NEW: Product preview component
├── product-list.tsx         # NEW: Editable product list
├── intent-badge.tsx         # NEW: Intent indicator
└── article-preview.tsx      # NEW: Article structure preview
```

## Implementation Phases

### Phase 1: Core Enhancements (Low effort, high impact)

**Goal**: Improve article quality without UI changes

#### T001: Add intent detection utility
- Create `src/lib/amazon/intent.ts`
- Export `detectIntent(keyword): 'informational' | 'commercial' | 'transactional'`
- Use regex patterns for classification

#### T002: Add featured snippet generation
- Create `src/lib/amazon/featured-snippet.ts`
- Generate 40-60 word quick answer
- Include top pick + budget pick with affiliate links

#### T003: Add programmatic comparison table
- Create `src/lib/amazon/comparison-table.ts`
- Generate consistent HTML table from product data
- Include product name, best for, price, rating, CTA link

#### T004: Add trust section template
- Create `generateTrustSection(productCount, niche)` in generate.ts
- Static template with dynamic values
- Include methodology + disclosure

#### T005: Update prompt for featured snippet
- Modify `buildBrandVoice()` in generate.ts
- Add explicit featured snippet instruction
- Add "Best for" header format requirement

### Phase 2: Product Selection Logic (Medium effort)

**Goal**: Strategic product tier selection

#### T006: Enhance product research prompt
- Modify `researchProducts()` prompt
- Explicitly request: budget, mid-range, premium, beginner, professional
- Add price tier requirements

#### T007: Add product tier validation
- Create `validateProductTiers(products)` function
- Check for budget/mid/premium representation
- Auto-categorize by price if AI doesn't comply

#### T008: Add tier badges to product data
- Extend `AmazonProduct` interface with `tier` field
- Assign tier based on price range
- Display tier badge in UI

### Phase 3: Two-Step UI Flow (High effort)

**Goal**: Product preview before generation

#### T009: Create product research API endpoint
- Create `src/app/api/amazon/research/route.ts`
- Accept: keyword, productCount, region
- Return: product list for preview

#### T010: Create ProductPreviewCard component
- Create `src/components/amazon/product-preview-card.tsx`
- Display: name, price, rating, best for, tier badge
- Actions: remove, move up/down

#### T011: Create ProductList component
- Create `src/components/amazon/product-list.tsx`
- Drag-and-drop reordering (optional)
- Bulk select/deselect

#### T012: Create IntentBadge component
- Create `src/components/amazon/intent-badge.tsx`
- Color-coded: green (commercial), blue (transactional), yellow (informational)
- Tooltip with explanation

#### T013: Create ArticlePreview component
- Create `src/components/amazon/article-preview.tsx`
- Show article structure outline
- Estimated word count, sections, links

#### T014: Refactor Amazon dashboard page
- Update `src/app/dashboard/amazon/page.tsx`
- Step 1: Input + Research button
- Step 2: Product preview + Edit
- Step 3: Generate + Preview

#### T015: Update generate endpoint
- Modify `src/app/api/amazon/generate/route.ts`
- Accept optional `products` array (pre-researched)
- Skip research if products provided

### Phase 4: Integration & Polish

#### T016: Add conversion-focused elements
- Add "Editor's Choice" badge to top pick
- Add "Best Value" badge to budget pick
- Style comparison table with brand colors

#### T017: Add estimated stats
- Calculate estimated word count before generation
- Show expected affiliate links count
- Display generation time estimate

#### T018: TypeScript check and testing
- Run `npx tsc --noEmit`
- Manual testing of full flow
- Verify all article sections generate correctly

## Complexity Tracking

| Enhancement | Complexity | Impact |
|-------------|------------|--------|
| Intent detection | Low | Medium |
| Featured snippet | Medium | High |
| Trust section | Low | High |
| Comparison table | Low | High |
| Product tiers | Medium | High |
| Two-step UI | High | Very High |

## Dependencies

- Phase 2 depends on Phase 1 (prompt changes first)
- Phase 3 depends on Phase 2 (needs tier logic for badges)
- Phase 4 depends on Phase 3 (polish after core features)

## Success Criteria

- [ ] Featured snippet appears at top of every article
- [ ] Products include budget/mid/premium options
- [ ] Comparison table is consistent and well-formatted
- [ ] Trust section builds credibility
- [ ] Users can preview products before generation
- [ ] Intent badge warns about informational keywords
- [ ] All TypeScript checks pass
