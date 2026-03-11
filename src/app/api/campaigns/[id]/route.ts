import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/supabase/auth-helpers";

export async function GET(
    req: Request,
    context: any
) {
    try {
        const { id } = await context.params;
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const campaign = await prisma.campaign.findUnique({
            where: { id, userId: authUser.id },
        });

        if (!campaign) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json(campaign);
    } catch (error) {
        console.error("Error fetching campaign:", error);
        return NextResponse.json({ error: "Failed to fetch campaign" }, { status: 500 });
    }
}

export async function PUT(
    req: Request,
    context: any
) {
    try {
        const { id } = await context.params;
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const data = await req.json();

        const existing = await prisma.campaign.findUnique({
            where: { id, userId: authUser.id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
        }

        const updated = await prisma.campaign.update({
            where: { id },
            data,
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating campaign:", error);
        return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    context: any
) {
    try {
        const { id } = await context.params;
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const existing = await prisma.campaign.findUnique({
            where: { id, userId: authUser.id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
        }

        await prisma.campaign.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting campaign:", error);
        return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
    }
}
