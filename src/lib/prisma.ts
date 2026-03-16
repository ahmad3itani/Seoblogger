import { PrismaClient } from "@prisma/client";

function fixDatabaseUrl(envUrl: string | undefined): string | undefined {
  if (!envUrl) return envUrl;
  try {
    const parsed = new URL(envUrl);
    // Decode then re-encode the password to ensure proper URL encoding
    const rawPassword = decodeURIComponent(parsed.password);
    const properlyEncoded = encodeURIComponent(rawPassword);
    if (parsed.password !== properlyEncoded) {
      // Password has unencoded special characters - fix it
      const fixed = envUrl.replace(
        `:${parsed.password}@`,
        `:${properlyEncoded}@`
      );
      return fixed;
    }
  } catch {
    // If URL parsing fails, return as-is
  }
  return envUrl;
}

const fixedDatabaseUrl = fixDatabaseUrl(process.env.DATABASE_URL);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: fixedDatabaseUrl !== process.env.DATABASE_URL
    ? { db: { url: fixedDatabaseUrl } }
    : undefined,
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
