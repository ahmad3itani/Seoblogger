import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;

  // Log connection info on startup (masked)
  if (dbUrl) {
    try {
      const parsed = new URL(dbUrl);
      console.log(`🔗 Prisma: Connecting to ${parsed.hostname}:${parsed.port || '5432'} as ${parsed.username}`);
    } catch {
      console.error("❌ Prisma: DATABASE_URL is not a valid URL!");
    }
  } else {
    console.error("❌ Prisma: DATABASE_URL is not set!");
  }

  if (!directUrl) {
    console.warn("⚠️ Prisma: DIRECT_URL is not set (needed for migrations)");
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Test database connectivity. Returns null on success, error message on failure.
 */
export async function testDatabaseConnection(): Promise<string | null> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return null;
  } catch (error: any) {
    return error.message || "Unknown database error";
  }
}
