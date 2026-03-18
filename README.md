# BloggerSEO

**The #1 AI content automation platform built exclusively for Google Blogger.**

Generate SEO-optimized articles, AI images, and publish directly to Blogger — all from one dashboard.

---

## Features

- **AI Article Writer** — 3000+ word, SERP-aware articles from a single keyword
- **Bulk Generator** — 10-100 articles in one batch, scheduled automatically
- **AI Image Studio** — FLUX.1 photorealistic images with SEO alt text
- **Keyword Research** — Volume, difficulty, CPC, topic clusters
- **Full Site Audit** — 50+ technical and content SEO checks
- **Internal Linker** — Smart link suggestions across your blog
- **Quality Pass** — 3-stage humanizer (clarity, originality, E-E-A-T)
- **Content Refresh** — Rewrite underperforming posts
- **1-Click Publish** — Draft or live, with labels and scheduling
- **Campaign Scheduler** — Set-and-forget content pipelines
- **Analytics Dashboard** — Track publishing trends and ROI

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind v4 |
| UI | shadcn/ui, Framer Motion |
| Database | Supabase PostgreSQL, Prisma ORM |
| Auth | Supabase Auth (Google OAuth) |
| AI Text | OpenRouter (DeepSeek, Claude 3.5, Gemini) |
| AI Images | Cloudflare Workers AI (FLUX.1 Schnell) |
| Image CDN | Cloudflare R2 |
| SERP Data | Serper API |
| Publishing | Google Blogger API v3 |

---

## Local Development Setup

### 1. Clone and install

```bash
git clone https://github.com/yourusername/BloggerSEO.git
cd BloggerSEO
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in all variables in `.env.local` — see [ARCHITECTURE.md](./ARCHITECTURE.md) for the full list.

**Required keys:**
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase project
- `OPENROUTER_API_KEY` — from openrouter.ai
- `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` — from Cloudflare dashboard
- `CLOUDFLARE_R2_BUCKET` + `CLOUDFLARE_R2_PUBLIC_URL` — R2 bucket
- `SERPER_API_KEY` — from serper.dev
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` — from Google Cloud Console

### 3. Set up the database

```bash
npx prisma generate
npx prisma db push
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable **Google Blogger API v3**
3. Create OAuth 2.0 credentials
4. Add authorized redirect URI: `http://localhost:3000/auth/callback`
5. Add required scopes:
   - `https://www.googleapis.com/auth/blogger`
   - `openid`, `email`, `profile`

---

## Cloudflare Setup

### Workers AI (Images)
1. Cloudflare Dashboard → AI → Workers AI
2. Create an API token with **Workers AI: Read** permission
3. Set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`

### R2 (Image Storage)
1. Cloudflare Dashboard → R2 → Create bucket
2. Enable public access on the bucket
3. Set `CLOUDFLARE_R2_BUCKET` (bucket name) and `CLOUDFLARE_R2_PUBLIC_URL` (public domain)

---

## Build & Deploy

```bash
# Type check
npx tsc --noEmit

# Production build
npm run build

# Start production server
npm start
```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page (dark 3D premium design)
│   ├── layout.tsx            # Root layout, fonts, metadata
│   ├── globals.css           # Brand design system + CSS variables
│   ├── dashboard/            # All dashboard pages
│   └── api/
│       ├── generate/         # Article generation pipeline
│       ├── blogger/          # Blogger API integration
│       ├── keywords/         # Keyword research
│       └── audit/            # Site audit
├── lib/
│   ├── ai/
│   │   ├── client.ts         # Model routing by plan
│   │   ├── generate.ts       # Article generation pipeline
│   │   └── prompts.ts        # All SEO prompts
│   ├── seo/
│   │   └── serp-sources.ts   # Serper API + SERP intelligence
│   ├── cloudflare/
│   │   └── image-generator.ts # FLUX.1 + R2 upload
│   └── supabase/             # Supabase client helpers
└── components/               # Shared UI components
```

---

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Full system design, API routes, pipeline flow
- [BRAND.md](./BRAND.md) — Visual identity, color palette, typography, components
- [CLAUDE.md](./CLAUDE.md) — AI agent instructions (critical rules, model routing, etc.)

---

## License

Private — All rights reserved.
