/**
 * GET /api/autopilot/sessions
 *
 * Retrieves past autopilot sessions for the authenticated user.
 * Rate limited: 30 requests/minute (standard API rate)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { rateLimitMiddleware } from '@/lib/security/rate-limit';
import type { SessionsResponse, SessionListItem, ContentPlan } from '@/types/autopilot';

export async function GET(req: NextRequest) {
  try {
    // 1. Authentication
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Rate limiting
    const rateLimitResult = await rateLimitMiddleware(user.id, 'api');
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(req.url);
    const blogId = searchParams.get('blogId');
    const limitParam = searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam || '10', 10), 1), 50);

    // 4. Build query
    const whereClause: { userId: string; blogId?: string } = {
      userId: user.id,
    };

    if (blogId) {
      whereClause.blogId = blogId;
    }

    // 5. Fetch sessions
    const sessions = await prisma.autopilotSession.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // 6. Transform to response format
    const sessionList: SessionListItem[] = sessions.map((session) => {
      const contentPlan = session.contentPlan as unknown as ContentPlan;
      const articleIdeasCount =
        (contentPlan?.highPriority?.length || 0) +
        (contentPlan?.mediumPriority?.length || 0) +
        (contentPlan?.lowPriority?.length || 0);

      return {
        id: session.id,
        blogId: session.blogId,
        blogName: session.blogName,
        postsAnalyzed: session.postsAnalyzed,
        depthLevel: session.depthLevel,
        status: session.status,
        createdAt: session.createdAt.toISOString(),
        articleIdeasCount,
      };
    });

    const response: SessionsResponse = {
      success: true,
      sessions: sessionList,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Failed to fetch autopilot sessions:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
