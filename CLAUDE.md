# BloggerSEO — Agent Instructions

## No Compaction
This file prevents conversation compaction. All context must be preserved across the full session.

## Project Identity
- **Name**: BloggerSEO
- **URL**: https://bloggerseowriting.com
- **Stack**: Next.js 16, React 19, TypeScript strict, Tailwind v4, Supabase, Prisma, Cloudflare Workers AI
- **AI Proxy**: OpenRouter (Claude, DeepSeek, Gemini via OpenAI-compatible API)
- **Image AI**: Cloudflare Workers AI — FLUX.1 Schnell (`@cf/black-forest-labs/flux-1-schnell`)
- **Image Storage**: Cloudflare R2
- **Publish Target**: Google Blogger API v3
- **Auth**: Supabase Auth (Google OAuth)

## Critical Rules — Always Follow

### TypeScript
- Run `npx tsc --noEmit` after every code change. Zero errors required.
- No `any` types unless absolutely unavoidable and commented.
- All new files must have full type coverage.

### Model Routing (src/lib/ai/client.ts)
- Free plan articles: `deepseek/deepseek-chat` (~$0.002/article)
- Starter plan articles: `anthropic/claude-3.5-haiku-20241022` (~$0.024/article)
- Pro/Enterprise articles: `anthropic/claude-3.5-sonnet-20241022` (~$0.09/article)
- Fast tasks (titles, outlines, FAQ, meta): `deepseek/deepseek-chat`
- Humanizer: `deepseek/deepseek-chat`
- NEVER use Claude Sonnet for all users — it destroys margins.

### Token Limits
- OpenRouter Claude 3.5 Sonnet hard cap: **8,192 output tokens**
- Always use `Math.min(Math.ceil(targetWords * 1.5), 8000)` for article max_tokens
- Articles > 3000 words → use section-by-section generation (`generateArticleSectionBySection`)
- Skip humanizer if article > 4000 words (would exceed token budget)

### Article Quality Pipeline
1. SERP intelligence fetch (Serper API) → real URLs, PAA questions
2. Outline generation (fast model)
3. Article generation (plan-based model, section-by-section if >3000 words)
4. FAQ from PAA questions (fast model)
5. Meta description (fast model)
6. Image generation (FLUX.1 Schnell via Cloudflare Workers AI)
7. Humanizer (skip if >4000 words)

### External Links
- **NEVER** let AI hallucinate URLs — always inject real URLs from SERP via `options.serpSources`
- Fallback instruction: "Only use URLs you are 100% certain exist"

### Image Generation
- Model: `@cf/black-forest-labs/flux-1-schnell`
- Steps: 8 (optimal FLUX quality/speed)
- Featured: 1024×1024, Content: 1280×720
- FLUX does NOT support `negative_prompt` field — embed negatives in main prompt
- SDXL fallback if FLUX returns 404/400

### HTML Output for Blogger
- No inline styles — use semantic HTML only
- Images: `<figure class="article-image"><img loading="lazy" /></figure>`
- No `style=""` attributes anywhere in generated article HTML

### Database
- Supabase PostgreSQL via Prisma ORM
- Never expose credentials in code
- Connection via `DATABASE_URL` env var only

## File Map — Key Files

| File | Purpose |
|------|---------|
| `src/lib/ai/client.ts` | Model routing by plan |
| `src/lib/ai/generate.ts` | Full article generation pipeline |
| `src/lib/ai/prompts.ts` | All SEO prompts (ARTICLE_WRITER, SECTION_WRITER, etc.) |
| `src/lib/seo/serp-sources.ts` | Serper API fetch for real URLs + PAA |
| `src/lib/cloudflare/image-generator.ts` | FLUX.1 image generation + R2 upload |
| `src/app/api/generate/route.ts` | Main article generation API endpoint |
| `src/app/page.tsx` | Landing page (dark 3D premium design) |
| `src/app/globals.css` | Brand design system + CSS variables |
| `src/app/layout.tsx` | Root layout, fonts, metadata, JSON-LD |

## Brand Design System

- **Background**: `#050912` (Deep Space)
- **Surface**: `#0D1526` / `#111827`
- **Brand Orange**: `#FF6B35`
- **Electric Blue**: `#4F8EFF`
- **Purple Accent**: `#7C3AED`
- **Display Font**: Space Grotesk (`var(--font-display)`)
- **Body Font**: Inter (`var(--font-sans)`)
- **Glassmorphism**: `backdrop-filter: blur(20px)` + `rgba(13,21,38,0.6)` bg
- **3D Cards**: CSS `perspective(900px) rotateX/Y` on mouse-move
- Use `btn-primary` class for orange CTA buttons
- Use `glass-card` for card surfaces
- Use `gradient-text` for highlighted headings

## Environment Variables Required

```
DATABASE_URL=
DIRECT_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_PUBLIC_URL=
SERPER_API_KEY=
```

## Common Issues & Fixes

**Article truncated mid-sentence**: Token math wrong → use `Math.min(Math.ceil(words * 1.5), 8000)`

**Hallucinated URLs**: SERP fetch disabled or `options.serpSources` not passed → check `fetchSerpIntelligence()` call in route.ts

**Images not generating**: Check `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` env vars; FLUX model string is `@cf/black-forest-labs/flux-1-schnell`

**TypeScript errors after editing generate.ts**: Re-read file before editing — template literals have exact whitespace that string replacement must match

**Blogger publish fails**: Check Google OAuth scopes include `https://www.googleapis.com/auth/blogger`
