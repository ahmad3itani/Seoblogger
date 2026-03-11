import { google } from "googleapis";
import { prisma } from "./prisma";

/**
 * Gets an authenticated Blogger API client for a specific user
 */
export async function getBloggerClient(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { googleAccessToken: true, googleRefreshToken: true }
    });

    if (!user || !user.googleAccessToken) {
        throw new Error("User not connected to Google Blogger");
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
    );

    oauth2Client.setCredentials({
        access_token: user.googleAccessToken,
        refresh_token: user.googleRefreshToken,
    });

    return google.blogger({ version: "v3", auth: oauth2Client });
}

/**
 * Fetches recent posts from a specific blog and caches them in the database for internal linking
 */
export async function syncBloggerPosts(userId: string, blogId: string, maxPosts = 50) {
    const blogger = await getBloggerClient(userId);

    try {
        const response = await blogger.posts.list({
            blogId: blogId,
            maxResults: maxPosts,
            status: ["LIVE"],
            fetchBodies: false, // We don't need the full body just for caching titles and URLs
        });

        const posts = response.data.items || [];
        console.log(`Fetched ${posts.length} posts from Blogger for blog ${blogId}`);

        let syncedCount = 0;

        for (const post of posts) {
            if (!post.id || !post.title || !post.url) continue;

            await prisma.cachedPost.upsert({
                where: {
                    blogId_postId: {
                        blogId: blogId,
                        postId: post.id,
                    }
                },
                update: {
                    title: post.title,
                    url: post.url,
                    publishedAt: post.published ? new Date(post.published) : new Date(),
                },
                create: {
                    postId: post.id,
                    blogId: blogId,
                    title: post.title,
                    url: post.url,
                    publishedAt: post.published ? new Date(post.published) : new Date(),
                }
            });
            syncedCount++;
        }

        return { success: true, count: syncedCount };
    } catch (error) {
        console.error("Error syncing Blogger posts:", error);
        throw error;
    }
}

/**
 * Fetches the full HTML content of a specific post
 */
export async function getPost(userId: string, blogId: string, postId: string) {
    const blogger = await getBloggerClient(userId);

    try {
        const response = await blogger.posts.get({
            blogId: blogId,
            postId: postId,
        });

        return response.data;
    } catch (error) {
        console.error("Error fetching Blogger post:", error);
        throw error;
    }
}

/**
 * Updates an existing post on Blogger with new HTML content
 */
export async function updatePost(userId: string, blogId: string, postId: string, title: string, content: string, labels?: string[]) {
    const blogger = await getBloggerClient(userId);

    try {
        const requestBody: any = {
            title: title,
            content: content,
        };

        if (labels && labels.length > 0) {
            requestBody.labels = labels;
        }

        const response = await blogger.posts.update({
            blogId: blogId,
            postId: postId,
            requestBody,
        });

        return response.data;
    } catch (error) {
        console.error("Error updating Blogger post:", error);
        throw error;
    }
}
