import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { prisma } from "@/lib/prisma";

// GET /api/social/accounts — list all connected social accounts for the user
export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { user: authUser } = authResult;

    const accounts = await prisma.socialAccount.findMany({
      where: { userId: authUser.id },
      select: {
        id: true,
        platform: true,
        accountId: true,
        accountName: true,
        autoShare: true,
        tokenExpiry: true,
        createdAt: true,
        // Never expose encrypted tokens to the client
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ accounts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/social/accounts — toggle autoShare
export async function PATCH(req: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { user: authUser } = authResult;

    const { accountId, autoShare } = await req.json();
    if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });

    const account = await prisma.socialAccount.findFirst({
      where: { id: accountId, userId: authUser.id },
    });
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    await prisma.socialAccount.update({
      where: { id: accountId },
      data: { autoShare },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/social/accounts — disconnect a social account
export async function DELETE(req: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { user: authUser } = authResult;

    const { accountId } = await req.json();
    if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });

    const account = await prisma.socialAccount.findFirst({
      where: { id: accountId, userId: authUser.id },
    });
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    await prisma.socialAccount.delete({ where: { id: accountId } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
