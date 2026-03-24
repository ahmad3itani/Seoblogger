# API Contract: SEO Autopilot Engine

**Feature**: 001-seo-autopilot-engine
**Date**: 2026-03-23

## Endpoints

### 1. POST /api/autopilot/analyze

Analyzes existing blog content and generates a content plan.

#### Request

```typescript
interface AnalyzeRequest {
  blogId: string;                  // Required: Blog to analyze
  language?: string;               // Default: "en"
  niche?: string;                  // Optional: Niche context for better suggestions
  depthLevel?: "standard" | "aggressive"; // Default: "standard"
}
```

**Headers**:
- `Content-Type: application/json`
- `Cookie: supabase-auth-token=...` (authentication via Supabase)

**Example**:
```json
{
  "blogId": "clxyz123abc",
  "language": "en",
  "niche": "Technology",
  "depthLevel": "standard"
}
```

#### Response (Success: 200)

```typescript
interface AnalyzeResponse {
  success: true;
  sessionId: string;               // ID for retrieving this session later
  summary: {
    totalArticlesAnalyzed: number;
    mainTopics: string[];
    weakAreas: string[];
    contentDistribution: Array<{
      category: string;
      count: number;
    }>;
  };
  contentPlan: {
    highPriority: ArticleIdea[];
    mediumPriority: ArticleIdea[];
    lowPriority: ArticleIdea[];
  };
  durationMs: number;
}

interface ArticleIdea {
  id: string;
  title: string;
  keyword: string;
  secondaryKeywords: string[];
  intent: "informational" | "commercial" | "transactional" | "navigational";
  category: string;
  priority: "high" | "medium" | "low";
  reason: string;
  internalLinks: Array<{
    title: string;
    url: string;
    anchorText: string;
  }>;
  estimatedDifficulty: "easy" | "medium" | "hard";
}
```

**Example**:
```json
{
  "success": true,
  "sessionId": "clxyz456def",
  "summary": {
    "totalArticlesAnalyzed": 25,
    "mainTopics": ["Coffee Brewing", "Coffee Equipment", "Coffee Beans"],
    "weakAreas": ["Espresso machines", "Cold brew methods"],
    "contentDistribution": [
      { "category": "Coffee Brewing", "count": 12 },
      { "category": "Coffee Equipment", "count": 8 }
    ]
  },
  "contentPlan": {
    "highPriority": [
      {
        "id": "idea-001",
        "title": "Best Espresso Machines Under $500 (2026 Buyer's Guide)",
        "keyword": "best espresso machines under 500",
        "secondaryKeywords": ["affordable espresso maker", "budget espresso machine"],
        "intent": "commercial",
        "category": "Coffee Equipment",
        "priority": "high",
        "reason": "High search demand, no existing coverage",
        "internalLinks": [
          {
            "title": "How to Make the Perfect Espresso at Home",
            "url": "https://example.com/perfect-espresso",
            "anchorText": "espresso brewing guide"
          }
        ],
        "estimatedDifficulty": "medium"
      }
    ],
    "mediumPriority": [],
    "lowPriority": []
  },
  "durationMs": 12500
}
```

#### Response (Error)

**400 Bad Request** — Invalid input
```json
{
  "success": false,
  "error": "blogId is required"
}
```

**401 Unauthorized** — Not authenticated
```json
{
  "success": false,
  "error": "Authentication required"
}
```

**403 Forbidden** — Blog not owned by user OR usage limit exceeded
```json
{
  "success": false,
  "error": "Usage limit exceeded. Upgrade your plan for more analyses.",
  "usageLimit": true
}
```

**404 Not Found** — Blog doesn't exist or has no cached posts
```json
{
  "success": false,
  "error": "No existing posts found. Generate some articles first."
}
```

**500 Internal Server Error** — AI or system failure
```json
{
  "success": false,
  "error": "Analysis failed. Please try again."
}
```

---

### 2. GET /api/autopilot/sessions

Retrieves past autopilot sessions for the user.

#### Request

**Query Parameters**:
- `blogId` (optional): Filter by specific blog
- `limit` (optional): Max sessions to return (default: 10)

**Headers**:
- `Cookie: supabase-auth-token=...`

#### Response (Success: 200)

```typescript
interface SessionsResponse {
  success: true;
  sessions: Array<{
    id: string;
    blogId: string;
    blogName: string;
    postsAnalyzed: number;
    depthLevel: string;
    status: string;
    createdAt: string;      // ISO 8601
    articleIdeasCount: number;
  }>;
}
```

**Example**:
```json
{
  "success": true,
  "sessions": [
    {
      "id": "clxyz456def",
      "blogId": "clxyz123abc",
      "blogName": "Coffee Blog",
      "postsAnalyzed": 25,
      "depthLevel": "standard",
      "status": "completed",
      "createdAt": "2026-03-23T10:30:00.000Z",
      "articleIdeasCount": 32
    }
  ]
}
```

---

### 3. GET /api/autopilot/sessions/[id]

Retrieves a specific autopilot session with full content plan.

#### Request

**Path Parameters**:
- `id`: Session ID

**Headers**:
- `Cookie: supabase-auth-token=...`

#### Response (Success: 200)

Same as `AnalyzeResponse` from POST /api/autopilot/analyze.

#### Response (Error)

**404 Not Found**:
```json
{
  "success": false,
  "error": "Session not found"
}
```

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/autopilot/analyze | 3 requests | 1 minute |
| GET /api/autopilot/sessions | 30 requests | 1 minute |

Rate limit exceeded response:
```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again in 45s.",
  "retryAfter": 45
}
```

---

## Usage Quotas

Each successful `POST /api/autopilot/analyze` counts as **1 article** toward the user's monthly quota.

---

## Authentication

All endpoints require Supabase authentication via session cookie. Unauthenticated requests receive 401.

---

## AI Safety Constraints

The API enforces these constraints on AI-generated content:

1. **No hallucinated URLs**: Internal link URLs must exist in `cachedPost` table
2. **No duplicate keywords**: All suggested keywords are deduplicated against existing posts
3. **Realistic suggestions**: AI prompt explicitly prohibits fake products/data
4. **JSON validation**: AI output is validated against TypeScript interfaces before returning
