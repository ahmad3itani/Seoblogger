# Implementation Plan: SEO Autopilot Engine

**Branch**: `001-seo-autopilot-engine` | **Date**: 2026-03-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-seo-autopilot-engine/spec.md`

## Summary

The SEO Autopilot Engine analyzes a user's existing blog posts, identifies content gaps and keyword opportunities, and generates a prioritized content plan ready for bulk article generation. The feature integrates with the existing bulk generation UI and uses AI to perform gap analysis, keyword expansion, and internal linking strategy. Built on the existing `cachedPost` model for content analysis and outputs directly to the bulk generation pipeline.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend + API), SQL (Prisma migrations)
**Primary Dependencies**: Next.js 14 (App Router), Prisma ORM, OpenRouter (AI models), React 18, Tailwind CSS
**Storage**: PostgreSQL via Supabase (existing), `cachedPost` model for existing blog posts
**Testing**: Vitest (unit), Playwright (E2E) per CLAUDE.md
**Target Platform**: Web application (Vercel deployment)
**Project Type**: Web service with API routes + React frontend
**Performance Goals**: Analysis completes within 60 seconds for up to 100 posts (SC-001)
**Constraints**: AI token limits (8K output for Claude Sonnet), usage quota enforcement, no hallucinated URLs
**Scale/Scope**: Single user per analysis, up to 100 posts analyzed, 20-50 article ideas generated

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution is a template and not yet configured with specific principles. Proceeding with standard best practices:

- ✅ **No new database**: Uses existing `cachedPost` model, adds new `AutopilotSession` model
- ✅ **Follows existing patterns**: Integrates with existing bulk generation UI and API structure
- ✅ **TypeScript strict mode**: All new code will use strict TypeScript per CLAUDE.md
- ✅ **No hallucinated data**: AI prompts will explicitly prevent URL/product fabrication (FR-009)
- ✅ **Deduplication**: Output will be deduplicated against existing posts (FR-005)

## Project Structure

### Documentation (this feature)

```text
specs/001-seo-autopilot-engine/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── autopilot-api.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── dashboard/
│   │   └── bulk/
│   │       └── page.tsx           # Existing - add Autopilot mode UI
│   └── api/
│       └── autopilot/
│           ├── analyze/
│           │   └── route.ts       # POST: Analyze existing content
│           └── plan/
│               └── route.ts       # GET: Retrieve saved plan
├── lib/
│   └── ai/
│       └── autopilot/
│           ├── analyzer.ts        # Content analysis logic
│           ├── gap-finder.ts      # Gap analysis + keyword expansion
│           ├── plan-generator.ts  # Content plan creation
│           └── prompts.ts         # AI prompts for autopilot
├── components/
│   └── dashboard/
│       └── bulk/
│           ├── autopilot-panel.tsx    # Autopilot mode UI
│           ├── content-plan-view.tsx  # Plan display + selection
│           └── article-idea-card.tsx  # Single article idea display
└── types/
    └── autopilot.ts               # TypeScript interfaces

prisma/
└── migrations/
    └── YYYYMMDD_add_autopilot_session/
        └── migration.sql          # AutopilotSession model
```

**Structure Decision**: Extends existing Next.js App Router structure. New API routes under `/api/autopilot/`. AI logic isolated in `lib/ai/autopilot/` to follow existing pattern (`lib/ai/generate.ts`).

## Complexity Tracking

No violations requiring justification. Feature follows existing patterns and doesn't introduce new architectural complexity.
