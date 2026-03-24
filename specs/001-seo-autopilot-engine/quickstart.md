# Quickstart: SEO Autopilot Engine

**Feature**: 001-seo-autopilot-engine
**Date**: 2026-03-23

## Overview

The SEO Autopilot Engine analyzes your existing blog content and generates a prioritized content plan with keyword opportunities, gap analysis, and internal linking suggestions — all ready for bulk article generation.

## User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Go to Dashboard → Bulk Generator                            │
│  2. Click "SEO Autopilot" tab                                   │
│  3. Select a blog to analyze                                    │
│  4. Choose depth level (Standard/Aggressive)                    │
│  5. Click "Run Autopilot Analysis"                              │
│  6. Review content plan (sorted by priority)                    │
│  7. Select articles to generate                                 │
│  8. Click "Generate Selected" → Bulk pipeline starts            │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- User must have at least 1 connected blog
- Blog should have existing posts (cached via Blogger API sync)
- Minimum 3 posts recommended for meaningful analysis

## Quick Integration

### 1. Run Analysis (Frontend)

```typescript
// In AutopilotPanel component
const runAnalysis = async () => {
  setLoading(true);
  const res = await fetch('/api/autopilot/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      blogId: selectedBlogId,
      language: 'en',
      niche: 'Technology',
      depthLevel: 'standard'
    })
  });
  const data = await res.json();
  if (data.success) {
    setContentPlan(data.contentPlan);
    setSummary(data.summary);
  }
  setLoading(false);
};
```

### 2. Display Content Plan (Frontend)

```tsx
// Render priority-grouped article ideas
<div className="space-y-4">
  <h3>High Priority</h3>
  {contentPlan.highPriority.map(idea => (
    <ArticleIdeaCard
      key={idea.id}
      idea={idea}
      selected={selectedIds.includes(idea.id)}
      onSelect={() => toggleSelect(idea.id)}
    />
  ))}
</div>
```

### 3. Send to Bulk Generation

```typescript
const handleGenerateSelected = () => {
  const selectedIdeas = allIdeas.filter(i => selectedIds.includes(i.id));
  const keywords = selectedIdeas.map(i => i.keyword).join('\n');

  // Existing bulk page reads from sessionStorage
  sessionStorage.setItem('bulkKeywords', keywords);

  // Switch to keywords tab or refresh page
  setActiveTab('keywords');
};
```

## API Quick Reference

| Action | Endpoint | Method |
|--------|----------|--------|
| Analyze blog | `/api/autopilot/analyze` | POST |
| Get past sessions | `/api/autopilot/sessions` | GET |
| Get session details | `/api/autopilot/sessions/[id]` | GET |

## Key Files

| File | Purpose |
|------|---------|
| `src/app/api/autopilot/analyze/route.ts` | Main analysis endpoint |
| `src/lib/ai/autopilot/analyzer.ts` | Content analysis logic |
| `src/lib/ai/autopilot/prompts.ts` | AI prompts |
| `src/components/dashboard/bulk/autopilot-panel.tsx` | Autopilot UI |
| `src/types/autopilot.ts` | TypeScript interfaces |

## Configuration

No additional environment variables required. Uses existing:
- `OPENROUTER_API_KEY` — For AI analysis
- `DATABASE_URL` — For session storage
- Supabase auth — For user authentication

## Success Criteria Checklist

- [ ] Analysis completes in <60 seconds for 100 posts
- [ ] Returns minimum 20 unique article ideas
- [ ] All internal link URLs exist in cachedPost table
- [ ] User can select ideas and send to bulk generation in <3 clicks
- [ ] No hallucinated URLs or fake data in output

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No existing posts found" | Sync blog posts first (Settings → Blogs → Sync) |
| Analysis times out | Try "Standard" depth level instead of "Aggressive" |
| Few article suggestions | Add more existing posts for better gap analysis |
| Internal links missing | Ensure cachedPost table has post URLs |
