import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/supabase/auth-helpers";

export async function GET(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const campaigns = await prisma.campaign.findMany({
            where: { userId: authUser.id },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(campaigns);
    } catch (error) {
        console.error("Error fetching campaigns:", error);
        return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        const data = await req.json();

        if (!data.name || !data.blogId || !data.keywords) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const campaign = await prisma.campaign.create({
            data: {
                userId: authUser.id,
                name: data.name,
                blogId: data.blogId,
                language: data.language || "en",
                tone: data.tone || "professional",
                articleType: data.articleType || "informational",
                wordCount: parseInt(data.wordCount) || 2000,
                brandVoice: data.brandVoice || null,
                includeImages: data.includeImages !== undefined ? data.includeImages : true,
                autoInterlink: data.autoInterlink !== undefined ? data.autoInterlink : true,
                frequencyDays: parseInt(data.frequencyDays) || 1,
                keywords: data.keywords,
                status: "active",
                nextPublishAt: new Date(Date.now() + 1000 * 60 * 5), // starts in 5 minutes
            },
        });

        return NextResponse.json(campaign);
    } catch (error) {
        console.error("Error creating campaign:", error);
        return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
    }
}
