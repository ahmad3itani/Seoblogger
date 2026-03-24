# Feature Specification: Amazon Affiliate SEO Engine

**Feature ID**: 002-amazon-affiliate-seo-engine
**Date**: 2026-03-24
**Status**: Draft

## Overview

Enhance the existing Amazon Affiliate article generator into a full **Amazon Affiliate SEO Engine** that generates buyer-ready, SEO-optimized, conversion-focused articles.

## Problem Statement

Current tool limitations:
- Random product lists without strategic selection
- Missing buyer intent optimization
- No featured snippet targeting
- Weak trust signals
- Basic UI without previews

**Result**: Low clicks, low conversions, poor SEO performance.

## Goals

Transform the generator into an engine that produces:
- Buyer-ready content (commercial + transactional intent)
- SEO-optimized structure (featured snippets, keyword placement)
- Conversion-focused layout (trust signals, strategic CTAs)
- Preview-enabled UI (see products & article before generating)

## Functional Requirements

### FR-001: Smart Input System
- **Main keyword** (required)
- **Article type**: roundup | single-review | comparison | buyers-guide
- **Budget range** (optional): budget | mid-range | premium | all
- **Product count**: 5-10 (default: 5)
- **Tone**: review | comparison | listicle
- **Target audience** (optional): beginners | professionals | general

### FR-002: Intent Detection
- Detect query intent from keyword:
  - Informational: "what is...", "how does..."
  - **Commercial**: "best...", "top...", "vs" (PRIMARY FOCUS)
  - **Transactional**: "buy...", "deal...", "cheap..." (PRIMARY FOCUS)
- Warn user if keyword has informational intent (not ideal for affiliate)

### FR-003: Strategic Product Selection
Products must be selected with variation:
- **Budget option** (~$30-50 range)
- **Mid-range option** (~$50-150 range)
- **Premium option** (~$150+ range)
- **Best for beginners**
- **Best for professionals**
- **Best value for money**

Selection criteria:
- Popularity (simulated best-sellers)
- Price variation across tiers
- Use-case variation
- Real product types (no fake names)

### FR-004: High-Converting Article Structure

#### 1. Featured Snippet (TOP - CRITICAL)
```html
<div class="featured-snippet">
  <p><strong>The best [keyword] is [Product Name] because [reason].</strong></p>
  <p>For budget buyers, [Budget Pick] offers [benefit] at just [price].</p>
</div>
```

#### 2. Quick Comparison Table
| Product | Best For | Price | Rating | Link |
|---------|----------|-------|--------|------|
| Product 1 | Beginners | $XX | 4.5/5 | [Check Price] |

#### 3. Product Sections (for each product)
```html
<h3>1. [Product Name] – Best for [Use Case]</h3>
<p><strong>Best for:</strong> [target user]</p>
<p><strong>Why we like it:</strong> [2-3 sentences]</p>

<h4>Key Features</h4>
<ul>
  <li>Feature 1</li>
  <li>Feature 2</li>
</ul>

<h4>Pros</h4>
<ul class="pros">...</ul>

<h4>Cons</h4>
<ul class="cons">...</ul>

<p><a href="AFFILIATE_LINK" class="cta-button">Check Price on Amazon →</a></p>
```

#### 4. Buying Guide Section
```html
<h2>How to Choose the Best [Keyword]</h2>
<h3>Key Factors to Consider</h3>
<ul>
  <li><strong>Factor 1:</strong> explanation</li>
  <li><strong>Factor 2:</strong> explanation</li>
</ul>
```

#### 5. Trust Section (NEW)
```html
<div class="trust-box">
  <h3>Why Trust This Guide?</h3>
  <p>We analyzed [X] products based on features, price, user reviews,
  and real-world performance. Our recommendations focus on value
  and quality, not just popularity.</p>
</div>
```

#### 6. FAQ Section
- 5-7 buyer-focused questions
- Schema markup for rich results

#### 7. Conclusion with Strong CTA
```html
<h2>Final Verdict</h2>
<p><strong>Best Overall:</strong> [Product] – [reason]</p>
<p><strong>Best Budget:</strong> [Product] – [reason]</p>
<p><strong>Best Premium:</strong> [Product] – [reason]</p>
```

### FR-005: Affiliate Link Strategy
- **1 link per product** (not spammy)
- Natural placement within content
- Strong CTA text:
  - "Check latest price on Amazon"
  - "View on Amazon"
  - "Check Price on Amazon →"
- Link format: `https://www.amazon.ca/s?k=KEYWORD&tag=STOREID`

### FR-006: SEO Layer
- Keyword placement:
  - Title (H1)
  - First H2
  - First 100 words
  - Meta description
- Internal links to related articles
- LSI keywords naturally distributed
- Schema markup (Product, FAQ, Article)

### FR-007: UI Enhancements

#### Left Panel (Inputs)
- Main keyword input
- Article type selector
- Budget range filter
- Product count slider (5-10)
- Tone selector
- Target audience

#### Right Panel (Previews)
- **Product Preview**: Cards showing selected products before generation
- **Structure Preview**: Outline of article sections
- **Estimated Stats**:
  - Word count estimate
  - Number of products
  - Affiliate links count

#### Generation Flow
1. User enters keyword → AI researches products
2. Products displayed for review/edit
3. User confirms → Full article generated
4. Article preview with edit capability

## Non-Functional Requirements

### NFR-001: Performance
- Product research: < 10 seconds
- Full article generation: < 60 seconds
- UI responsiveness: < 100ms

### NFR-002: Quality
- Zero hallucinated product names
- Accurate price ranges for region
- Natural, non-spammy language
- E-E-A-T compliant content

## Success Metrics

| Metric | Target |
|--------|--------|
| User satisfaction with product selection | > 80% |
| Article completion rate | > 90% |
| Time to generate | < 60s |
| Affiliate link CTR (if trackable) | > 3% |

## Out of Scope

- Amazon Product Advertising API integration (future)
- Real-time price fetching
- Automatic publishing to Amazon Associates
- Multi-language support beyond current regions

## Dependencies

- Existing: `src/lib/amazon/generate.ts`
- Existing: `src/app/api/amazon/generate/route.ts`
- Existing: `src/app/dashboard/amazon/page.tsx`
- OpenRouter AI for product research
- Cloudflare AI for images

## Risks

| Risk | Mitigation |
|------|------------|
| AI hallucinates products | Strict prompt constraints + validation |
| Slow generation | Parallel API calls where possible |
| Generic content | Enhanced prompts with specificity requirements |
