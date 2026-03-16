import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/supabase/auth-helpers";

export async function GET(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const user = await prisma.user.findUnique({
            where: { id: authUser.id },
            select: {
                googleClientId: true,
                googleClientSecret: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({
            googleClientId: user.googleClientId || "",
            googleClientSecret: user.googleClientSecret || "",
        });
    } catch (error) {
        console.error("Failed to fetch Google credentials:", error);
        return NextResponse.json(
            { error: "Failed to fetch credentials" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const body = await req.json();
        const { googleClientId, googleClientSecret } = body;

        if (!googleClientId || !googleClientSecret) {
            return NextResponse.json(
                { error: "Client ID and Secret are required" },
                { status: 400 }
            );
        }

        // Basic validation
        if (typeof googleClientId !== "string" || typeof googleClientSecret !== "string") {
            return NextResponse.json(
                { error: "Invalid credentials format" },
                { status: 400 }
            );
        }

        await prisma.user.update({
            where: { id: authUser.id },
            data: {
                googleClientId: googleClientId.trim(),
                googleClientSecret: googleClientSecret.trim(),
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to save Google credentials:", error);
        return NextResponse.json(
            { error: "Failed to save credentials" },
            { status: 500 }
        );
    }
}
