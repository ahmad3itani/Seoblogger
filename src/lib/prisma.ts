import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Ensures the DATABASE_URL has the parameters required for
 * serverless / Supabase Supavisor Transaction mode:
 *   - connection_limit=1  (one connection per cold-start Lambda)
 *   - pgbouncer=true      (required when port=6543 / Transaction mode)
 *
 * IMPORTANT: In Vercel/production set DATABASE_URL to Supabase's
 * Transaction mode pooler URL (port 6543), e.g.:
 *   postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres
 *
 * Set DIRECT_URL to the direct (non-pooled) connection (port 5432):
 *   postgresql://postgres:[pass]@db.[ref].supabase.co:5432/postgres
 */
function buildUrl(raw: string): string {
  try {
    const u = new URL(raw);
    // Always limit to 1 connection per serverless instance
    if (!u.searchParams.has("connection_limit")) {
      u.searchParams.set("connection_limit", "1");
    }
    // Supavisor Transaction mode (port 6543) requires pgbouncer=true
    if (u.port === "6543" && !u.searchParams.has("pgbouncer")) {
      u.searchParams.set("pgbouncer", "true");
    }
    return u.toString();
  } catch {
    return raw;
  }
}

function createPrismaClient(): PrismaClient {
  const rawUrl = process.env.DATABASE_URL;

  if (!rawUrl) {
    console.error("❌ Prisma: DATABASE_URL is not set!");
  }

  if (!process.env.DIRECT_URL) {
    console.warn("⚠️ Prisma: DIRECT_URL is not set (required for migrations)");
  }

  const url = rawUrl ? buildUrl(rawUrl) : undefined;

  return new PrismaClient({
    datasources: url ? { db: { url } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// In development, reuse the client across hot-reloads to avoid exhausting
// connections. In production (Vercel) each Lambda has its own globalThis.
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
