import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { requireAuth, requireFeature } from "@/lib/supabase/auth-helpers";

export async function GET(req: Request) {
    try {
        const authResult = await requireFeature("hasScheduling");
        if (authResult instanceof NextResponse) return authResult;
        const { user: authUser } = authResult;

        // Get query params for date range (optional)
        const url = new URL(req.url);
        const monthParam = url.searchParams.get('month');

        // Default to current month +/- 1 month for better performance
        const referenceDate = monthParam ? new Date(monthParam) : new Date();
        const startDate = startOfMonth(subMonths(referenceDate, 1));
        const endDate = endOfMonth(addMonths(referenceDate, 1));

        // Fetch all articles with dates in the range
        const articles = await prisma.article.findMany({
            where: {
                userId: authUser.id,
                OR: [
                    // Scheduled articles
                    {
                        status: "scheduled",
                        scheduledFor: {
                            gte: startDate,
                            lte: endDate
                        }
                    },
                    // Published articles (by creation date)
                    {
                        status: "published",
                        createdAt: {
                            gte: startDate,
                            lte: endDate
                        }
                    },
                    // Recently created drafts
                    {
                        status: "draft",
                        createdAt: {
                            gte: startDate,
                            lte: endDate
                        }
                    }
                ]
            },
            select: {
                id: true,
                title: true,
                status: true,
                scheduledFor: true,
                createdAt: true,
                updatedAt: true,
                wordCount: true,
                blog: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Transform articles into calendar events
        const events = articles.map(article => {
            let eventDate;

            if (article.status === "scheduled" && article.scheduledFor) {
                eventDate = article.scheduledFor;
            } else {
                eventDate = article.createdAt;
            }

            return {
                id: article.id,
                title: article.title,
                status: article.status,
                date: startOfDay(eventDate).toISOString(),
                wordCount: article.wordCount,
                blogName: article.blog?.name || "No Blog",
                type: article.status === "scheduled" ? "scheduled" :
                    article.status === "published" ? "published" : "draft"
            };
        });

        return NextResponse.json(events);
    } catch (error) {
        console.error("Error fetching calendar events:", error);
        return NextResponse.json([], { status: 200 }); // Return empty array on error to avoid breaking UI
    }
}
