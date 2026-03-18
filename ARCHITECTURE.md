# BloggerSEO — System Architecture

## Overview

BloggerSEO is a Next.js 16 SaaS application that automates content creation and publishing for Google Blogger. It orchestrates multiple AI providers and external APIs to generate high-quality, SEO-optimized articles and publish them directly to users' Blogger blogs.

```
User Browser
    │
    ▼
Next.js App (App Router)
    ├── Landing Page (/page.tsx)
    ├── Auth (/auth/signin, /signup)
    ├── Dashboard (/dashboard/*)
    └── API Routes (/api/*)
         ├── /api/generate       → Article generation pipeline
         ├── /api/blogger        → Blogger publish/manage
         ├── /api/keywords       → Keyword research
         ├── /api/audit          → Site audit
         └── /api/images         → Image generation
    │
    ├── Supabase (Auth + PostgreSQL via Prisma)
    ├── OpenRouter (AI proxy → Claude, DeepSeek, Gemini)
    ├── Cloudflare Workers AI (FLUX.1 image generation)
    ├── Cloudflare R2 (image storage)
    ├── Serper API (SERP data, PAA questions)
    └── Google Blogger API v3 (publish)
```

---

## Article Generation Pipeline

`POST /api/generate` orchestrates the full pipeline:

```
1. Input validation (keyword, wordCount, articleType, etc.)
2. fetchSerpIntelligence(keyword)          → real URLs + PAA questions
3. generateTitles(keyword, ...)            → 5 title options (DeepSeek)
4. selectBestTitle(titles)                 → pick title #1
5. generateOutline(keyword, title, ...)    → H2/H3 JSON outline (DeepSeek)
6. generateArticle(title, outline, ...)    → full article HTML
   ├── if targetWords > 3000:
   │     generateArticleSectionBySection() → per-H2 API calls
   └── else:
         generateArticleSinglePass()       → single API call
7. generateFAQ(keyword, article, paaQuestions) → FAQ HTML (DeepSeek)
8. generateMeta(keyword, article)          → meta description (DeepSeek)
9. generateImages(keyword, sections)       → FLUX.1 via Cloudflare
10. embedImages(article, imageUrls)        → inject <figure> tags
11. qualityValidation(article)             → wordCount, H2 count checks
12. Return: { article, title, meta, faqs, images, qualityWarnings }
```

---

## Model Routing

File: `src/lib/ai/client.ts`

| Task | Model | Cost/1M in |
|------|-------|-----------|
| Titles, Outlines, FAQ, Meta | DeepSeek Chat | $0.14 |
| Free plan articles | DeepSeek Chat | $0.14 |
| Starter plan articles | Claude 3.5 Haiku | $0.80 |
| Pro/Enterprise articles | Claude 3.5 Sonnet | $3.00 |
| Humanizer | DeepSeek Chat | $0.14 |

Article cost estimate:
- Free: ~$0.002/article
- Starter: ~$0.024/article
- Pro: ~$0.09/article

---

## Database Schema (Prisma)

Key tables (managed via Supabase PostgreSQL):

```prisma
User          - id, email, plan, blogger_access_token, ...
Article       - id, userId, keyword, title, content, status, blogId, ...
Blog          - id, userId, bloggerBlogId, name, url, ...
KeywordList   - id, userId, keywords[], scheduledAt, ...
SiteAudit     - id, userId, blogUrl, issues[], score, createdAt
```

---

## Authentication Flow

1. User signs in via Google OAuth (Supabase Auth)
2. App requests additional scope: `https://www.googleapis.com/auth/blogger`
3. Access token stored in Supabase user metadata
4. Token refreshed automatically via Supabase session
5. Blogger API calls use token from session

---

## Image Generation Pipeline

File: `src/lib/cloudflare/image-generator.ts`

```
1. Build FLUX-optimized prompt (descriptive sentence style, negatives embedded)
2. POST https://api.cloudflare.com/client/v4/accounts/{id}/ai/run/@cf/black-forest-labs/flux-1-schnell
   { prompt, num_steps: 8, width: 1024, height: 1024 }
3. Receive binary PNG response
4. Generate SEO-friendly filename: {slug}-{type}-{timestamp}-{random}.png
5. Upload to Cloudflare R2 via S3-compatible API
6. Return public URL: {CLOUDFLARE_R2_PUBLIC_URL}/{filename}
7. Fallback: SDXL if FLUX returns 404/400
```

---

## SERP Intelligence

File: `src/lib/seo/serp-sources.ts`

```
fetchSerpIntelligence(keyword, country, language):
  POST https://google.serper.dev/search
  → organic results (filtered: no pinterest/quora/reddit/amazon/ebay)
  → PAA questions (People Also Ask)
  → competitor titles
  → answer box snippet

Returns: { sources[], paaQuestions[], competitorTitles[], answerBoxSnippet }
```

Outputs are injected into prompts:
- `options.serpSources` → article external links (real URLs only)
- `options.paaQuestions` → FAQ generation (PAA-targeted questions)

---

## Prompt Engineering Strategy

File: `src/lib/ai/prompts.ts`

### Key Techniques
1. **Passage indexing**: Each H2 independently answers its heading (Google MUM)
2. **E-E-A-T signals**: Experience markers, statistics, authoritative tone
3. **Featured snippet targeting**: TLDR structured as 2-3 sentence direct answer
4. **LSI keyword integration**: Semantic variations distributed naturally
5. **Banned AI phrases**: 25+ phrases explicitly blacklisted (e.g. "delve", "tapestry")
6. **Paragraph variety**: 4 rotation types (fact-opening, story, contrast, statistic)
7. **Section-by-section generation**: For >3000 words, each H2 generated independently with `SECTION_WRITER` prompt

---

## API Routes Reference

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/generate` | POST | Required | Full article generation pipeline |
| `/api/blogger/publish` | POST | Required | Publish article to Blogger |
| `/api/blogger/blogs` | GET | Required | List user's Blogger blogs |
| `/api/keywords/research` | POST | Required | Keyword research via Serper |
| `/api/audit/run` | POST | Required | Run SEO site audit |
| `/api/images/generate` | POST | Required | Generate single image |

---

## Frontend Architecture

- **Framework**: Next.js 16 with App Router
- **Styling**: Tailwind CSS v4 + custom CSS design system (`globals.css`)
- **UI Components**: shadcn/ui (Radix primitives)
- **Animations**: Framer Motion + CSS keyframes
- **State**: React hooks (no Zustand/Redux — keep it simple)
- **Auth**: Supabase client (`createClient`)
- **Fonts**: Inter (body) + Space Grotesk (display) + Geist Mono (code)

### Dashboard Structure
```
/dashboard
  ├── /write           → Article Writer
  ├── /bulk            → Bulk Generator
  ├── /keywords        → Keyword Research
  ├── /audit           → Site Audit
  ├── /scheduler       → Campaign Scheduler
  ├── /analytics       → Analytics Dashboard
  └── /settings        → Blog settings, brand voice
```

---

## Environment Variables

| Variable | Source | Required |
|----------|--------|---------|
| `DATABASE_URL` | Supabase → Settings → Database | Yes |
| `DIRECT_URL` | Supabase direct connection | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role | Yes |
| `OPENROUTER_API_KEY` | openrouter.ai/keys | Yes |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard | Yes |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token (Workers AI + R2) | Yes |
| `CLOUDFLARE_R2_BUCKET` | R2 bucket name | Yes |
| `CLOUDFLARE_R2_PUBLIC_URL` | R2 public domain | Yes |
| `SERPER_API_KEY` | serper.dev | Yes |
| `GOOGLE_CLIENT_ID` | Google Cloud Console | Yes |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | Yes |

---

## Performance Notes

- Section-by-section generation adds latency but prevents truncation for long articles
- FLUX.1 Schnell at 8 steps: ~2-4s per image via Cloudflare edge
- Humanizer adds ~2-3s for articles under 4000 words (skipped above that threshold)
- Serper API call adds ~300-500ms — run early in pipeline
- DeepSeek is significantly faster than Claude for fast tasks (~400ms vs ~1200ms)
