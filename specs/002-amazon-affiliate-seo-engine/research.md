# Research: Amazon Affiliate SEO Engine

**Feature**: 002-amazon-affiliate-seo-engine
**Date**: 2026-03-24

## 1. Current Implementation Analysis

### What Already Exists

| Component | Status | Location |
|-----------|--------|----------|
| Product research | ✅ Basic | `src/lib/amazon/generate.ts:researchProducts()` |
| Article types | ✅ Good | roundup, single-review, comparison, buyers-guide |
| Affiliate links | ✅ Good | `buildAffiliateData()` with regional support |
| SEO prompts | ⚠️ Needs enhancement | `buildBrandVoice()` - missing featured snippet |
| Comparison tables | ⚠️ In prompt only | Not structured/guaranteed |
| FAQ generation | ✅ Good | Uses `generateFAQ()` from main pipeline |
| E-E-A-T signals | ✅ Good | First-person, testing language |
| UI | ⚠️ Basic | No previews, no two-step flow |

### What's Missing

1. **Featured Snippet Section** - No dedicated "quick answer" at top
2. **Strategic Product Tiers** - No explicit budget/mid/premium logic
3. **Intent Detection** - No keyword intent analysis
4. **Trust Section** - No "Why Trust Us" block
5. **Product Preview UI** - Users can't review products before generation
6. **Two-Step Generation** - Research → Review → Generate flow
7. **Structured Comparison Table** - Relies on AI, not guaranteed

## 2. Intent Detection Strategy

**Decision**: Implement client-side keyword intent classifier.

**Rationale**:
- No API call needed (fast)
- Pattern matching is sufficient for SEO keywords
- Warn users about informational keywords (low affiliate potential)

**Implementation**:
```typescript
function detectIntent(keyword: string): 'informational' | 'commercial' | 'transactional' {
  const kw = keyword.toLowerCase();

  // Transactional (buy intent)
  if (/\b(buy|deal|cheap|discount|coupon|price|order|shop)\b/.test(kw)) {
    return 'transactional';
  }

  // Commercial (comparison/best intent)
  if (/\b(best|top|vs|versus|compare|review|rating|recommend)\b/.test(kw)) {
    return 'commercial';
  }

  // Informational (what/how questions)
  if (/\b(what|how|why|when|where|is|are|can|does|guide|tutorial)\b/.test(kw)) {
    return 'informational';
  }

  // Default to commercial for affiliate
  return 'commercial';
}
```

## 3. Product Tier Selection Strategy

**Decision**: Modify `researchProducts()` prompt to explicitly request tiers.

**Current prompt asks for**: "top X products"
**New prompt should ask for**:
- 1 Budget option ($30-50)
- 2-3 Mid-range options ($50-150)
- 1 Premium option ($150+)
- 1 Best for beginners
- 1 Best for professionals

**Response validation**:
- Check that each tier is represented
- Fallback: re-categorize by price if AI doesn't follow

## 4. Featured Snippet Implementation

**Decision**: Add dedicated `generateFeaturedSnippet()` function.

**Rationale**:
- Featured snippet needs to be concise (40-60 words)
- Must directly answer the search query
- Should mention top pick + budget pick

**Placement**:
- Immediately after disclosure
- Before comparison table

**Format**:
```html
<div class="featured-answer" style="background: #f8f9fa; border-left: 4px solid #4285f4; padding: 1rem; margin: 1.5rem 0;">
  <p><strong>Quick Answer:</strong> The best [keyword] is <a href="...">Product Name</a> for most buyers,
  offering [key benefit] at [price]. For budget shoppers, <a href="...">Budget Pick</a> delivers
  excellent value at just [price].</p>
</div>
```

## 5. Trust Section Implementation

**Decision**: Static template with dynamic product count.

**Rationale**:
- Builds E-E-A-T signals
- Simple to implement
- Consistent across articles

**Template**:
```html
<div class="trust-section" style="background: #e8f5e9; border-radius: 8px; padding: 1rem; margin: 1.5rem 0;">
  <h3 style="margin-top: 0;">🔍 Why Trust This Guide?</h3>
  <p>We analyzed <strong>{productCount}+ products</strong> in the {niche} category,
  comparing features, prices, and thousands of user reviews. Our recommendations
  prioritize real value—not just popularity or brand recognition.</p>
  <p><em>Disclosure: As an Amazon Associate, we earn from qualifying purchases at no extra cost to you.</em></p>
</div>
```

## 6. UI Two-Step Flow

**Decision**: Split generation into Research → Review → Generate.

**Step 1: Research Products** (new endpoint)
- User enters keyword + options
- API researches products (5-10 sec)
- Returns product list for preview

**Step 2: Review Products** (UI only)
- User sees product cards
- Can remove/reorder products
- Confirms selection

**Step 3: Generate Article** (existing endpoint, modified)
- Takes confirmed product list
- Generates full article
- Shows preview

**Benefits**:
- User control over product selection
- Faster iteration (change products without re-researching)
- Better UX (no surprises)

## 7. Structured Comparison Table

**Decision**: Generate table programmatically, not via AI.

**Rationale**:
- Guaranteed consistent format
- Uses product data already researched
- AI-generated tables are inconsistent

**Implementation**:
```typescript
function generateComparisonTable(products: AmazonProduct[]): string {
  const header = `<table class="comparison-table">
  <thead>
    <tr>
      <th>Product</th>
      <th>Best For</th>
      <th>Price</th>
      <th>Rating</th>
      <th></th>
    </tr>
  </thead>
  <tbody>`;

  const rows = products.map(p => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.bestFor}</td>
      <td>${p.priceRange}</td>
      <td>⭐ ${p.rating}</td>
      <td><a href="${p.affiliateUrl}" target="_blank" rel="nofollow noopener sponsored">Check Price →</a></td>
    </tr>`).join('');

  return header + rows + '</tbody></table>';
}
```

## 8. Prompt Enhancement Strategy

**Current prompt**: 500+ lines in `buildBrandVoice()`

**Enhancements needed**:
1. Add explicit instruction for featured snippet paragraph
2. Require "Best for" in each product section header
3. Add buying guide section requirement
4. Add trust section instruction
5. Reduce repetition in product names

**Key additions to prompt**:
```
FEATURED SNIPPET (MANDATORY - FIRST THING AFTER DISCLOSURE):
Write a 40-60 word "Quick Answer" that:
- Names the #1 overall pick with affiliate link
- Names the best budget option with affiliate link
- Gives the key reason for each recommendation
- This paragraph MUST be able to stand alone as a Google featured snippet

PRODUCT SECTION HEADERS (MANDATORY FORMAT):
Each product section MUST use this header format:
<h3>1. [Product Name] – Best for [Specific Use Case]</h3>

TRUST SECTION (AFTER BUYING GUIDE):
Include a "Why Trust This Guide?" section explaining your methodology.
```

## Summary of Decisions

| Area | Decision | Complexity |
|------|----------|------------|
| Intent Detection | Client-side regex classifier | Low |
| Product Tiers | Enhanced prompt + validation | Medium |
| Featured Snippet | New function + prompt update | Medium |
| Trust Section | Static template injection | Low |
| Comparison Table | Programmatic generation | Low |
| Two-Step UI Flow | New API + UI refactor | High |
| Prompt Enhancements | Update `buildBrandVoice()` | Medium |

## Implementation Order

1. **Phase 1** (Low effort, high impact):
   - Intent detection
   - Featured snippet prompt
   - Trust section template
   - Programmatic comparison table

2. **Phase 2** (Medium effort):
   - Product tier selection logic
   - Enhanced prompts

3. **Phase 3** (High effort):
   - Two-step UI flow
   - Product preview cards
   - Research API endpoint
