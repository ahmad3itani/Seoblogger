/**
 * GET /api/autopilot/sessions/[id]
 *
 * Retrieves a specific autopilot session with full content plan.
 * Rate limited: 30 requests/minute (standard API rate)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { rateLimitMiddleware } from '@/lib/security/rate-limit';
import type { AnalyzeResponse, ContentPlan, ContentPlanSummary } from '@/types/autopilot';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
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

    // 3. Get session ID from params
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // 4. Fetch session (ensure user owns it)
    const session = await prisma.autopilotSession.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // 5. Return session data
    const response: AnalyzeResponse = {
      success: true,
      sessionId: session.id,
      summary: session.summary as unknown as ContentPlanSummary,
      contentPlan: session.contentPlan as unknown as ContentPlan,
      durationMs: session.durationMs,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Failed to fetch autopilot session:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}
