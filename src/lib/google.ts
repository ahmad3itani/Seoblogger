import { prisma } from "./prisma";

export async function getValidAccessToken(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            googleAccessToken: true,
            googleRefreshToken: true,
            googleTokenExpiry: true,
        },
    });

    if (!user || !user.googleAccessToken) {
        throw new Error("NOT_CONNECTED");
    }

    // Check if token is expired or expires within the next 2 minutes
    const expiresAt = user.googleTokenExpiry ? new Date(user.googleTokenExpiry).getTime() : 0;
    if (expiresAt && expiresAt < Date.now() + 120000) {
        if (!user.googleRefreshToken) {
            console.error("Access token expired but no refresh token is present in the database.");
            throw new Error("NEEDS_RECONNECT");
        }

        console.log("Token expired. Auto-refreshing Google OAuth Access Token...");
        try {
            const response = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    client_id: process.env.GOOGLE_CLIENT_ID!,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                    grant_type: "refresh_token",
                    refresh_token: user.googleRefreshToken,
                }),
            });

            const tokens = await response.json();

            if (!response.ok) {
                console.error("Google Token Refresh Error:", tokens);
                throw new Error("NEEDS_RECONNECT");
            }

            // Update user with the new access token
            await prisma.user.update({
                where: { id: userId },
                data: {
                    googleAccessToken: tokens.access_token,
                    googleTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
                    ...(tokens.refresh_token && { googleRefreshToken: tokens.refresh_token }),
                },
            });

            return tokens.access_token;
        } catch (error) {
            console.error("Failed to refresh token:", error);
            throw new Error("NEEDS_RECONNECT");
        }
    }

    return user.googleAccessToken;
}
