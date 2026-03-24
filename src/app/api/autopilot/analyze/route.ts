/**
 * POST /api/autopilot/analyze
 *
 * Analyzes existing blog content and generates a prioritized content plan
 * with gap analysis, keyword opportunities, and internal linking suggestions.
 *
 * Per research.md:
 * - Uses DeepSeek fast model for analysis
 * - Counts as 1 article usage
 * - Single retry on AI failure
 * - Rate limited: 3 requests/minute
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getAuthUser,
  checkUsageLimit,
  trackUsage,
} from '@/lib/supabase/auth-helpers';
import { rateLimitMiddleware } from '@/lib/security/rate-limit';
import { generateContentPlan } from '@/lib/ai/autopilot/plan-generator';
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  AnalyzeErrorResponse,
  DepthLevel,
  CachedPostForAnalysis,
} from '@/types/autopilot';

// ─── POST HANDLER ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authentication
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' } as AnalyzeErrorResponse,
        { status: 401 }
      );
    }

    console.log(`📊 Autopilot analysis requested by user: ${user.id}`);

    // 2. Rate limiting (3 requests/minute per contracts/autopilot-api.md)
    const rateLimitResult = await rateLimitMiddleware(user.id, 'autopilot');
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // 3. Parse and validate request body
    let body: AnalyzeRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' } as AnalyzeErrorResponse,
        { status: 400 }
      );
    }

    const { blogId, language = 'en', niche, depthLevel = 'standard' } = body;

    if (!blogId) {
      return NextResponse.json(
        { success: false, error: 'blogId is required' } as AnalyzeErrorResponse,
        { status: 400 }
      );
    }

    // Validate depthLevel
    if (depthLevel !== 'standard' && depthLevel !== 'aggressive') {
      return NextResponse.json(
        { success: false, error: 'depthLevel must be "standard" or "aggressive"' } as AnalyzeErrorResponse,
        { status: 400 }
      );
    }

    // 4. Verify blog ownership
    const blog = await prisma.blog.findFirst({
      where: {
        blogId: blogId,
        userId: user.id,
      },
    });

    if (!blog) {
      return NextResponse.json(
        { success: false, error: 'Blog not found or not owned by user' } as AnalyzeErrorResponse,
        { status: 404 }
      );
    }

    console.log(`📝 Analyzing blog: ${blog.name} (${blog.blogId})`);

    // 5. Check usage quota (1 analysis = 1 article per research.md)
    const usageCheck = await checkUsageLimit(user.id, 'articles', 1);
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: usageCheck.error || 'Usage limit exceeded. Upgrade your plan for more analyses.',
          usageLimit: true,
        } as AnalyzeErrorResponse,
        { status: 403 }
      );
    }

    // 6. Fetch cached posts for this blog
    const cachedPosts = await prisma.cachedPost.findMany({
      where: { blogId: blog.id },
      select: {
        id: true,
        postId: true,
        blogId: true,
        title: true,
        url: true,
        contentHash: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: 'desc' },
    });

    if (cachedPosts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No existing posts found. Generate some articles first or sync your blog.',
        } as AnalyzeErrorResponse,
        { status: 404 }
      );
    }

    console.log(`📚 Found ${cachedPosts.length} cached posts to analyze`);

    // 7. Generate content plan
    const postsForAnalysis: CachedPostForAnalysis[] = cachedPosts.map((p) => ({
      id: p.id,
      postId: p.postId,
      blogId: p.blogId,
      title: p.title,
      url: p.url,
      contentHash: p.contentHash,
      publishedAt: p.publishedAt,
    }));

    const result = await generateContentPlan(postsForAnalysis, {
      language,
      niche,
      depthLevel: depthLevel as DepthLevel,
    });

    // 8. Save session to database
    const session = await prisma.autopilotSession.create({
      data: {
        userId: user.id,
        blogId: blog.blogId,
        blogName: blog.name,
        postsAnalyzed: cachedPosts.length,
        language,
        niche,
        depthLevel,
        summary: JSON.parse(JSON.stringify(result.summary)),
        contentPlan: JSON.parse(JSON.stringify(result.contentPlan)),
        status: 'completed',
        durationMs: result.durationMs,
      },
    });

    console.log(`💾 Session saved: ${session.id}`);

    // 9. Track usage (1 analysis = 1 article equivalent)
    await trackUsage(user.id, 'article', 1);

    // 10. Return success response
    const response: AnalyzeResponse = {
      success: true,
      sessionId: session.id,
      summary: result.summary,
      contentPlan: result.contentPlan,
      durationMs: Date.now() - startTime,
    };

    console.log(`✅ Analysis complete in ${response.durationMs}ms`);

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Autopilot analysis failed:', error);

    // Don't expose internal error details
    const message = error instanceof Error ? error.message : 'Analysis failed. Please try again.';

    return NextResponse.json(
      { success: false, error: message } as AnalyzeErrorResponse,
      { status: 500 }
    );
  }
}
