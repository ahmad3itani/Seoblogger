import { NextResponse } from "next/server";
import { prisma, testDatabaseConnection } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    status: "checking",
  };
  
  const dbUrl = process.env.DATABASE_URL || "";
  const directUrl = process.env.DIRECT_URL || "";

  // ─── 1. Check env vars exist ─────────────────────────────
  results.env = {
    DATABASE_URL: dbUrl ? "SET" : "MISSING",
    DIRECT_URL: directUrl ? "SET" : "MISSING",
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "MISSING",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "MISSING",
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "SET" : "MISSING",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "SET" : "MISSING",
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? "SET" : "MISSING",
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? "SET" : "MISSING",
  };

  // ─── 2. Parse DATABASE_URL ───────────────────────────────
  if (dbUrl) {
    try {
      const parsed = new URL(dbUrl);
      results.database_url = {
        valid: true,
        host: parsed.hostname,
        port: parsed.port || "5432",
        username: parsed.username,
        passwordLength: parsed.password.length,
        database: parsed.pathname.replace("/", ""),
        hasPooler: dbUrl.includes("pgbouncer=true") || dbUrl.includes("pooler"),
        isSupabase: parsed.hostname.includes("supabase.com"),
      };

      // Supabase-specific check: username must be "postgres.PROJECT_REF"
      if (parsed.hostname.includes("pooler.supabase.com") && !parsed.username.includes(".")) {
        results.database_url.WARNING = "Username should be 'postgres.PROJECT_REF' for Supabase pooler. Your username is just '" + parsed.username + "'. Get the correct URL from: Supabase Dashboard → Settings → Database → Connection string (URI, Transaction mode).";
      }
    } catch (e: any) {
      results.database_url = {
        valid: false,
        error: "DATABASE_URL is not a valid URL: " + e.message,
        fix: "Go to Supabase Dashboard → Settings → Database → Connection string and copy the Transaction mode URI.",
      };
    }
  }

  // ─── 3. Test actual database connection ──────────────────
  const dbError = await testDatabaseConnection();
  if (dbError) {
    results.connection = {
      status: "FAILED",
      error: dbError,
    };

    // Provide specific fix guidance based on error
    if (dbError.includes("Tenant or user not found")) {
      results.connection.diagnosis = "The DATABASE_URL has the wrong project reference or credentials.";
      results.connection.fix = [
        "1. Go to Supabase Dashboard → Settings → Database",
        "2. Scroll to 'Connection string' section",
        "3. Select 'URI' tab and 'Transaction' mode",
        "4. Copy the full connection string",
        "5. Paste it as DATABASE_URL in Vercel → Settings → Environment Variables",
        "6. Also copy 'Session' mode URI as DIRECT_URL",
        "7. Redeploy the application",
      ];
    } else if (dbError.includes("password authentication failed")) {
      results.connection.diagnosis = "Wrong password in DATABASE_URL.";
      results.connection.fix = [
        "1. Go to Supabase Dashboard → Settings → Database",
        "2. Reset the database password if needed",
        "3. Copy the fresh connection string",
        "4. Update DATABASE_URL and DIRECT_URL in Vercel",
      ];
    } else if (dbError.includes("ENOTFOUND") || dbError.includes("ECONNREFUSED")) {
      results.connection.diagnosis = "Cannot reach the database server. Host or port is wrong.";
      results.connection.fix = [
        "1. Verify DATABASE_URL host matches your Supabase project",
        "2. Use port 6543 for pooled (Transaction) mode",
        "3. Use port 5432 for direct (Session) mode",
      ];
    }

    results.status = "FAILED";
  } else {
    results.connection = { status: "SUCCESS" };

    // ─── 4. Check data integrity ────────────────────────────
    try {
      const userCount = await prisma.user.count();
      const planCount = await prisma.plan.count();
      const blogCount = await prisma.blog.count();

      results.data = {
        users: userCount,
        plans: planCount,
        blogs: blogCount,
      };

      if (planCount === 0) {
        results.data.WARNING = "No plans in database! Run: npx prisma db seed";
      }
    } catch (e: any) {
      results.data = { error: e.message };
    }

    results.status = "OK";
  }

  return NextResponse.json(results, {
    status: results.status === "OK" ? 200 : 500,
  });
}
