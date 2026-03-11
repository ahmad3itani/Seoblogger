import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/supabase/auth-helpers";

export async function GET(req: Request) {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;
        const userId = authResult.user.id;

        console.log(`📊 Fetching dashboard stats for user: ${userId}`);

        // Fetch all statistics in parallel
        const [
            totalArticles,
            publishedArticles,
            draftArticles,
            connectedBlogs,
            totalWordCount,
            recentArticles,
        ] = await Promise.all([
            // Total articles (query by userId directly to include articles without blogId)
            prisma.article.count({
                where: {
                    userId: userId,
                },
            }),
            // Published articles
            prisma.article.count({
                where: {
                    userId: userId,
                    status: "published",
                },
            }),
            // Draft articles
            prisma.article.count({
                where: {
                    userId: userId,
                    status: "draft",
                },
            }),
            // Connected blogs
            prisma.blog.count({
                where: {
                    userId: userId,
                },
            }),
            // Total word count
            prisma.article.aggregate({
                where: {
                    userId: userId,
                },
                _sum: {
                    wordCount: true,
                },
            }),
            // Recent articles (last 5)
            prisma.article.findMany({
                where: {
                    userId: userId,
                },
                orderBy: {
                    createdAt: "desc",
                },
                take: 5,
                select: {
                    id: true,
                    title: true,
                    status: true,
                    wordCount: true,
                    createdAt: true,
                    blog: {
                        select: {
                            name: true,
                        },
                    },
                },
            }),
        ]);

        // Try to fetch campaign and publish log stats (may fail if tables don't exist)
        let activeCampaigns = 0;
        let totalPublishLogs = 0;
        
        try {
            activeCampaigns = await prisma.campaign.count({
                where: {
                    userId: userId,
                    status: "active",
                },
            });
        } catch (error) {
            console.log("Campaign table not available, skipping campaign stats");
        }

        try {
            totalPublishLogs = await prisma.publishLog.count({
                where: {
                    blog: {
                        userId: userId,
                    },
                },
            });
        } catch (error) {
            console.log("PublishLog table not available, skipping publish log stats");
        }

        // Calculate average word count
        const avgWordCount = totalArticles > 0 
            ? Math.round((totalWordCount._sum.wordCount || 0) / totalArticles)
            : 0;

        // Get articles created this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const articlesThisMonth = await prisma.article.count({
            where: {
                userId: userId,
                createdAt: {
                    gte: startOfMonth,
                },
            },
        });

        // Get articles created last month for comparison
        const startOfLastMonth = new Date(startOfMonth);
        startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
        const endOfLastMonth = new Date(startOfMonth);
        endOfLastMonth.setTime(endOfLastMonth.getTime() - 1);

        const articlesLastMonth = await prisma.article.count({
            where: {
                userId: userId,
                createdAt: {
                    gte: startOfLastMonth,
                    lte: endOfLastMonth,
                },
            },
        });

        // Calculate growth percentage
        const growthPercentage = articlesLastMonth > 0
            ? Math.round(((articlesThisMonth - articlesLastMonth) / articlesLastMonth) * 100)
            : articlesThisMonth > 0 ? 100 : 0;

        const statsData = {
            totalArticles,
            publishedArticles,
            draftArticles,
            connectedBlogs,
            totalWordCount: totalWordCount._sum.wordCount || 0,
            avgWordCount,
            recentArticles,
            activeCampaigns,
            totalPublishLogs,
            articlesThisMonth,
            articlesLastMonth,
            growthPercentage,
        };

        console.log(`✅ Dashboard stats:`, {
            totalArticles,
            publishedArticles,
            draftArticles,
            connectedBlogs,
            recentArticlesCount: recentArticles.length,
        });

        return NextResponse.json(statsData);
    } catch (error) {
        console.error("Dashboard stats error:", error);
        return NextResponse.json(
            { error: "Failed to fetch statistics" },
            { status: 500 }
        );
    }
}
