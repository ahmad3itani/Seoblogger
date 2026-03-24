# Feature Specification: SEO Autopilot Engine

**Feature Branch**: `001-seo-autopilot-engine`  
**Created**: 2026-03-23  
**Status**: Draft  
**Input**: User description: "Add SEO Autopilot Engine to bulk generation tool — analyzes existing content, finds gaps, expands keywords, creates content plan, suggests internal links, outputs bulk-ready JSON"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Autopilot Content Analysis (Priority: P1)

A user navigates to the Bulk Generator page and clicks "SEO Autopilot" mode. The system fetches their existing blog posts (from cached posts in the database), sends them to the AI for analysis, and receives back a structured content plan with gap analysis, keyword opportunities, and prioritized article ideas.

**Why this priority**: This is the core value proposition — turning a dumb keyword list into an intelligent content strategy. Without this, the feature doesn't exist.

**Independent Test**: Can be fully tested by having a user with ≥5 existing blog posts click "Analyze My Blog" and receiving a valid JSON content plan with at least 10 article ideas.

**Acceptance Scenarios**:

1. **Given** a user with 10+ cached blog posts, **When** they click "Run Autopilot Analysis", **Then** the system returns a content plan with summary, gap analysis, and prioritized article ideas within 60 seconds.
2. **Given** a user with 0 cached posts, **When** they click "Run Autopilot Analysis", **Then** the system shows a helpful message explaining they need existing content first, with a link to generate their first articles.
3. **Given** a user with posts, **When** the analysis completes, **Then** all returned article ideas have: title, primary keyword, secondary keywords, search intent, category, priority, and reason.

---

### User Story 2 - One-Click Bulk Generation from Plan (Priority: P1)

After the autopilot generates a content plan, the user can review the plan, select/deselect specific articles, and click "Generate Selected" to automatically queue them into the existing bulk generation pipeline.

**Why this priority**: This closes the loop — analysis without execution is useless. The user needs to go from plan to articles in one click.

**Independent Test**: Can be tested by generating a plan, selecting 3 high-priority articles, clicking "Generate Selected", and verifying they appear in the bulk generation queue.

**Acceptance Scenarios**:

1. **Given** a completed content plan with 15 articles, **When** the user selects 5 high-priority articles and clicks "Generate Selected", **Then** those 5 keywords are queued in the bulk generation pipeline with correct settings.
2. **Given** a content plan, **When** the user clicks "Select All High Priority", **Then** all high-priority articles are selected.
3. **Given** selected articles, **When** bulk generation starts, **Then** the existing bulk generation flow (titles → outline → article) runs for each keyword.

---

### User Story 3 - Internal Linking Suggestions (Priority: P2)

The content plan includes internal linking suggestions for each new article idea, referencing existing posts by title and URL with suggested anchor text.

**Why this priority**: Adds SEO value but is supplementary — the core plan works without it.

**Independent Test**: Can be tested by verifying each article idea in the plan has 0-3 internal link suggestions, and all referenced URLs exist in the user's cached posts.

**Acceptance Scenarios**:

1. **Given** a content plan with link suggestions, **When** the user views an article idea, **Then** each suggestion shows the linked post title, URL, and anchor text.
2. **Given** an article idea with no relevant existing posts, **When** the plan is displayed, **Then** the link suggestions section shows "No relevant internal links found" or is omitted.

---

### User Story 4 - Content Depth Level Toggle (Priority: P3)

The user can toggle between "Standard" (20-30 article ideas) and "Aggressive" (40-50 article ideas with deeper subtopic coverage) content depth levels.

**Why this priority**: Nice-to-have refinement. Standard mode delivers full value.

**Independent Test**: Can be tested by running analysis twice with different depth levels and comparing the number and specificity of returned article ideas.

**Acceptance Scenarios**:

1. **Given** the user selects "Aggressive" depth, **When** analysis runs, **Then** the plan contains 40-50 article ideas vs 20-30 for "Standard".

---

### Edge Cases

- What happens when the user has fewer than 3 posts? → Show warning but still attempt analysis with limited data.
- What happens when the AI returns invalid JSON? → Retry once, then show error with "Try Again" button.
- What happens when the blog has posts in multiple languages? → Filter to posts matching the selected language.
- What happens when the AI suggests keywords that already exist as articles? → Post-process to deduplicate against existing post titles.
- What happens when the API times out (>120s)? → Show timeout error with option to retry.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST fetch existing blog posts from `cachedPost` table for the user's active blog.
- **FR-002**: System MUST send existing posts (title, URL, category) to an AI model for content analysis.
- **FR-003**: System MUST return a structured JSON content plan with: summary, gap analysis, and prioritized article ideas.
- **FR-004**: Each article idea MUST include: title, primary keyword, secondary keywords, search intent, category, priority (high/medium/low), and reason.
- **FR-005**: System MUST deduplicate suggestions against existing posts (no suggesting articles that already exist).
- **FR-006**: System MUST group output into high/medium/low priority tiers.
- **FR-007**: Users MUST be able to select articles from the plan and send them to bulk generation.
- **FR-008**: System MUST support "Standard" and "Aggressive" content depth levels.
- **FR-009**: Internal linking suggestions MUST only reference real existing post URLs (no hallucinated links).
- **FR-010**: System MUST respect rate limits and usage quotas.

### Key Entities

- **ContentPlan**: The full analysis result — contains summary, gap analysis, and article ideas grouped by priority.
- **ArticleIdea**: A single suggested article — title, keyword, secondary keywords, intent, category, priority, reason, internal link suggestions.
- **AutopilotSession**: Tracks when the user ran autopilot, what blog was analyzed, and the resulting plan.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Autopilot analysis completes within 60 seconds for blogs with up to 100 posts.
- **SC-002**: Generated content plans contain a minimum of 20 unique, non-duplicate article ideas.
- **SC-003**: 100% of suggested internal links reference real existing URLs from the user's blog.
- **SC-004**: Users can go from "Run Autopilot" to "Articles Generating" in under 3 clicks.
- **SC-005**: Zero hallucinated URLs, products, or data in the content plan output.
