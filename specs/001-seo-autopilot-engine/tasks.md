# Tasks: SEO Autopilot Engine

**Input**: Design documents from `/specs/001-seo-autopilot-engine/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Paths follow existing BloggerSEO structure: `src/app/`, `src/lib/`, `src/components/`, `prisma/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, types, and database schema

- [ ] T001 Create TypeScript interfaces in src/types/autopilot.ts (ContentPlan, ArticleIdea, InternalLink, AutopilotSession types)
- [ ] T002 [P] Create Prisma migration for AutopilotSession model in prisma/migrations/
- [ ] T003 [P] Update prisma/schema.prisma with AutopilotSession model and User relation
- [ ] T004 Run prisma migrate dev and prisma generate to apply schema changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core AI analysis infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create AI prompts for autopilot analysis in src/lib/ai/autopilot/prompts.ts
- [ ] T006 [P] Create content analyzer logic in src/lib/ai/autopilot/analyzer.ts (extract topics, categories from posts)
- [ ] T007 [P] Create gap finder logic in src/lib/ai/autopilot/gap-finder.ts (identify missing keywords, weak areas)
- [ ] T008 [P] Create deduplication utility in src/lib/ai/autopilot/deduplication.ts (fuzzy title matching per research.md)
- [ ] T009 Create plan generator in src/lib/ai/autopilot/plan-generator.ts (orchestrates analysis → gap → keywords → plan)
- [ ] T010 [P] Create internal link matcher in src/lib/ai/autopilot/internal-linker.ts (TF-IDF matching per research.md)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Autopilot Content Analysis (Priority: P1) 🎯 MVP

**Goal**: User can analyze their blog's existing posts and receive a structured content plan with gap analysis, keyword opportunities, and prioritized article ideas.

**Independent Test**: User with ≥5 cached posts clicks "Run Autopilot Analysis" and receives a valid JSON content plan with at least 10 article ideas within 60 seconds.

### Implementation for User Story 1

- [ ] T011 [US1] Create POST /api/autopilot/analyze endpoint in src/app/api/autopilot/analyze/route.ts
- [ ] T012 [US1] Implement authentication and blog ownership validation in analyze route
- [ ] T013 [US1] Implement usage quota check (1 analysis = 1 article) in analyze route
- [ ] T014 [US1] Integrate plan-generator.ts orchestration in analyze route
- [ ] T015 [US1] Save AutopilotSession to database after successful analysis
- [ ] T016 [US1] Add error handling with retry logic (single retry per research.md)
- [ ] T017 [US1] Add rate limiting (3 requests/minute per contracts/autopilot-api.md)
- [ ] T018 [P] [US1] Create AutopilotPanel component in src/components/dashboard/bulk/autopilot-panel.tsx
- [ ] T019 [P] [US1] Create ContentPlanView component in src/components/dashboard/bulk/content-plan-view.tsx
- [ ] T020 [P] [US1] Create ArticleIdeaCard component in src/components/dashboard/bulk/article-idea-card.tsx
- [ ] T021 [US1] Add "SEO Autopilot" tab to bulk page in src/app/dashboard/bulk/page.tsx
- [ ] T022 [US1] Integrate AutopilotPanel into bulk page with blog selector
- [ ] T023 [US1] Add loading state, progress indicator, and error display to AutopilotPanel
- [ ] T024 [US1] Handle edge case: 0 cached posts → show helpful message with link to generate articles

**Checkpoint**: User Story 1 should be fully functional - users can analyze blogs and see content plans

---

## Phase 4: User Story 2 - One-Click Bulk Generation from Plan (Priority: P1)

**Goal**: After autopilot generates a content plan, user can select articles and queue them into the existing bulk generation pipeline.

**Independent Test**: Generate a plan, select 3 high-priority articles, click "Generate Selected", and verify they appear in bulk generation queue.

### Implementation for User Story 2

- [ ] T025 [US2] Add selection state management (checkboxes) to ContentPlanView component
- [ ] T026 [US2] Add "Select All High Priority" button to ContentPlanView
- [ ] T027 [US2] Add "Generate Selected" button that extracts keywords from selected ArticleIdeas
- [ ] T028 [US2] Implement sessionStorage integration to pass keywords to bulk pipeline
- [ ] T029 [US2] Add tab switching or page refresh to trigger bulk generation after selection
- [ ] T030 [US2] Display selected count and estimated generation time in UI

**Checkpoint**: User Stories 1 AND 2 work together - analyze → select → generate in one flow

---

## Phase 5: User Story 3 - Internal Linking Suggestions (Priority: P2)

**Goal**: Each article idea in the content plan includes 0-3 internal linking suggestions referencing existing posts.

**Independent Test**: Verify each article idea has internal link suggestions with valid URLs that exist in cachedPost table.

### Implementation for User Story 3

- [ ] T031 [US3] Integrate internal-linker.ts into plan-generator.ts (call for each article idea)
- [ ] T032 [US3] Add internalLinks array to ArticleIdea JSON output in plan-generator.ts
- [ ] T033 [US3] Display internal link suggestions in ArticleIdeaCard component (title, URL, anchor text)
- [ ] T034 [US3] Add "No relevant internal links found" message when suggestions are empty
- [ ] T035 [US3] Validate all suggested URLs exist in cachedPost before returning (no hallucination)

**Checkpoint**: Internal linking suggestions appear in content plan for each article idea

---

## Phase 6: User Story 4 - Content Depth Level Toggle (Priority: P3)

**Goal**: User can toggle between "Standard" (20-30 ideas) and "Aggressive" (40-50 ideas) content depth levels.

**Independent Test**: Run analysis twice with different depth levels, compare number of article ideas returned.

### Implementation for User Story 4

- [ ] T036 [US4] Add depthLevel parameter to /api/autopilot/analyze endpoint
- [ ] T037 [US4] Modify AI prompts in prompts.ts to support depth level parameter (keyword count, subtopic coverage)
- [ ] T038 [US4] Add depth level toggle (radio buttons or select) to AutopilotPanel component
- [ ] T039 [US4] Pass depthLevel to API call from AutopilotPanel
- [ ] T040 [US4] Update plan-generator.ts to adjust output based on depth level

**Checkpoint**: All user stories functional - depth level affects plan output

---

## Phase 7: Session History & Retrieval (Supplementary)

**Purpose**: Allow users to view past autopilot sessions

- [ ] T041 Create GET /api/autopilot/sessions endpoint in src/app/api/autopilot/sessions/route.ts
- [ ] T042 Create GET /api/autopilot/sessions/[id] endpoint in src/app/api/autopilot/sessions/[id]/route.ts
- [ ] T043 [P] Add session history list to AutopilotPanel (optional dropdown or link)
- [ ] T044 Allow loading a previous session's content plan in ContentPlanView

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T045 [P] Add console logging throughout autopilot flow for debugging
- [ ] T046 [P] Add TypeScript strict mode validation (run npx tsc --noEmit)
- [ ] T047 Performance optimization: cache existing posts during analysis session
- [ ] T048 Add usage tracking after successful analysis (trackUsage call)
- [ ] T049 Run quickstart.md validation scenarios manually

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (types must exist for AI modules)
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 & US2 are both P1, but US2 depends on US1's UI components
  - US3 (P2) can start after Foundational but integrates with US1 output
  - US4 (P3) can start after Foundational but modifies US1 components
- **Session History (Phase 7)**: Can run in parallel with US3/US4 after US1 complete
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Depends on US1 UI components (T018-T023) - extends selection/generation
- **User Story 3 (P2)**: Can start after Foundational - integrates with plan-generator output
- **User Story 4 (P3)**: Can start after Foundational - modifies AutopilotPanel and prompts

### Within Each User Story

- API routes before UI components (data must flow)
- Core implementation before integration
- Validation and error handling at the end of each story

### Parallel Opportunities

- T002, T003: Schema tasks can run in parallel
- T006, T007, T008, T010: AI modules can be developed in parallel (different files)
- T018, T019, T020: UI components can be developed in parallel
- Session History (T041-T044) can run parallel to US3/US4

---

## Parallel Example: Foundational Phase

```bash
# Launch all AI modules in parallel:
Task: "Create content analyzer logic in src/lib/ai/autopilot/analyzer.ts"
Task: "Create gap finder logic in src/lib/ai/autopilot/gap-finder.ts"
Task: "Create deduplication utility in src/lib/ai/autopilot/deduplication.ts"
Task: "Create internal link matcher in src/lib/ai/autopilot/internal-linker.ts"
```

## Parallel Example: User Story 1 UI

```bash
# Launch all UI components in parallel:
Task: "Create AutopilotPanel component in src/components/dashboard/bulk/autopilot-panel.tsx"
Task: "Create ContentPlanView component in src/components/dashboard/bulk/content-plan-view.tsx"
Task: "Create ArticleIdeaCard component in src/components/dashboard/bulk/article-idea-card.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T010)
3. Complete Phase 3: User Story 1 (T011-T024)
4. **STOP and VALIDATE**: Test US1 independently — user can analyze blog and see plan
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (full autopilot-to-generation flow)
4. Add User Story 3 → Test independently → Deploy/Demo (internal linking)
5. Add User Story 4 → Test independently → Deploy/Demo (depth toggle)
6. Add Session History → Deploy/Demo (view past analyses)

### Suggested MVP Scope

**MVP = Phase 1 + Phase 2 + Phase 3 (User Story 1)**

This delivers:
- ✅ Blog analysis capability
- ✅ Content plan generation
- ✅ Gap analysis and keyword opportunities
- ✅ Prioritized article ideas display

User Story 2 (one-click generation) should be added immediately after MVP validation.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All AI calls use DeepSeek (fast model) per research.md
- No hallucinated URLs — internal links validated against cachedPost table
