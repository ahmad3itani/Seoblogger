import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/supabase/auth-helpers";

export async function GET() {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const brandProfiles = await prisma.brandProfile.findMany({
            where: { userId: authUser.id },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(brandProfiles);
    } catch (error) {
        console.error("Error fetching brand profiles:", error);
        return NextResponse.json(
            { error: "Failed to fetch brand profiles" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const data = await req.json();

        if (!data.name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        if (data.isDefault) {
            await prisma.brandProfile.updateMany({
                where: { userId: authUser.id, isDefault: true },
                data: { isDefault: false },
            });
        }

        const newProfile = await prisma.brandProfile.create({
            data: {
                ...data,
                userId: authUser.id,
            },
        });

        return NextResponse.json(newProfile);
    } catch (error) {
        console.error("Error creating brand profile:", error);
        return NextResponse.json(
            { error: "Failed to create brand profile" },
            { status: 500 }
        );
    }
}

export async function PUT(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const data = await req.json();
        const { id, ...updateData } = data;

        if (!id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 });
        }

        if (updateData.isDefault) {
            await prisma.brandProfile.updateMany({
                where: { userId: authUser.id, isDefault: true, NOT: { id } },
                data: { isDefault: false },
            });
        }

        const updatedProfile = await prisma.brandProfile.update({
            where: { id, userId: authUser.id },
            data: updateData,
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

