# Implementation Plan: SEO Autopilot Engine

**Branch**: `001-seo-autopilot-engine` | **Date**: 2026-03-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-seo-autopilot-engine/spec.md`

## Summary

Add an intelligent SEO Autopilot mode to the existing bulk generation tool. The system analyzes a user's existing blog content (from `cachedPost` table), identifies content gaps and keyword opportunities, generates a prioritized content plan with 20-50 article ideas, suggests internal linking opportunities, and outputs a structured JSON plan ready for one-click bulk generation.

**Technical Approach**: New API route `/api/autopilot/analyze` accepts blog context, calls OpenAI with specialized SEO strategist prompt, post-processes output to deduplicate against existing posts and validate internal links, returns JSON. New React component `AutopilotPanel` in bulk page displays plan with selection UI and feeds selected keywords into existing bulk generation pipeline.

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 14 App Router)  
**Primary Dependencies**: OpenAI API (gpt-4o), Prisma ORM, React 18, TailwindCSS  
**Storage**: PostgreSQL (existing `cachedPost`, `article`, `blog` tables) + new `autopilotSession` table  
**Testing**: Manual testing in dev environment (existing project has no test suite)  
**Target Platform**: Web application (Next.js server + client components)
**Project Type**: Web service feature (API route + React UI component)  
**Performance Goals**: <60s analysis time for 100 posts, <3s UI response time  
**Constraints**: OpenAI rate limits (60 req/min), token limits (128k context), must not hallucinate URLs  
**Scale/Scope**: Single API route, 1 React component, 1 DB table, ~500 LOC total

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: No constitution file exists (template only) — no gates to enforce. Proceeding with best practices:
- Reuse existing patterns (API routes, Prisma queries, React components)
- No new external dependencies
- Follow existing code style and structures

- ✅ **No new database**: Uses existing `cachedPost` model, adds new `AutopilotSession` model
- ✅ **Follows existing patterns**: Integrates with existing bulk generation UI and API structure
- ✅ **TypeScript strict mode**: All new code will use strict TypeScript per CLAUDE.md
- ✅ **No hallucinated data**: AI prompts will explicitly prevent URL/product fabrication (FR-009)

## Project Structure

### Documentation (this feature)

```text
specs/001-seo-autopilot-engine/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-contract.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   └── autopilot/
│   │       └── analyze/
│   │           └── route.ts          # NEW: Autopilot analysis API
│   └── dashboard/
│       └── bulk/
│           └── page.tsx               # MODIFIED: Add autopilot tab
├── components/
│   └── dashboard/
│       └── bulk/
│           └── autopilot-panel.tsx    # NEW: Autopilot UI component
├── lib/
│   ├── ai/
│   │   └── prompts.ts                 # MODIFIED: Add autopilot prompt
│   └── prisma/
│       └── schema.prisma              # MODIFIED: Add AutopilotSession model
└── types/
    └── autopilot.ts                   # NEW: TypeScript interfaces

specs/
└── 001-seo-autopilot-engine/
    ├── spec.md                        # Feature specification
    ├── plan.md                        # This file
    ├── research.md                    # Phase 0 output
    ├── data-model.md                  # Phase 1 output
    ├── quickstart.md                  # Phase 1 output
    └── contracts/
        └── api-contract.md            # Phase 1 output
```

**Structure Decision**: Next.js App Router structure. New API route under `/api/autopilot/analyze`, new React component in existing bulk page components folder, new Prisma model for session tracking. Follows existing project patterns.

## Complexity Tracking

No violations requiring justification. Feature follows existing patterns and doesn't introduce new architectural complexity.
