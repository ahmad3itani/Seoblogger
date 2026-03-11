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

        const profile = await prisma.brandProfile.findUnique({
            where: {
                id: id,
                userId: authUser.id,
            },
        });

        if (!profile) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json(profile);
    } catch (error) {
        console.error("Error fetching brand profile:", error);
        return NextResponse.json(
            { error: "Failed to fetch brand profile" },
            { status: 500 }
        );
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

        const existingProfile = await prisma.brandProfile.findUnique({
            where: { id: id, userId: authUser.id },
        });

        if (!existingProfile) {
            return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
        }

        // If setting this to default, unset others
        if (data.isDefault && !existingProfile.isDefault) {
            await prisma.brandProfile.updateMany({
                where: { userId: authUser.id, isDefault: true },
                data: { isDefault: false },
            });
        }

        const updatedProfile = await prisma.brandProfile.update({
            where: { id },
            data,
        });

        return NextResponse.json(updatedProfile);
    } catch (error) {
        console.error("Error updating brand profile:", error);
        return NextResponse.json(
            { error: "Failed to update brand profile" },
            { status: 500 }
        );
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

        const existingProfile = await prisma.brandProfile.findUnique({
            where: { id: id, userId: authUser.id },
        });

        if (!existingProfile) {
            return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
        }

        await prisma.brandProfile.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting brand profile:", error);
        return NextResponse.json(
            { error: "Failed to delete brand profile" },
            { status: 500 }
        );
    }
}
