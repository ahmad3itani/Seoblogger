import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, any> = {};
  
  // Check DATABASE_URL
  const dbUrl = process.env.DATABASE_URL || "";
  const directUrl = process.env.DIRECT_URL || "";
  
  // Mask password in URL for safe display
  const maskUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.password) {
        const passLength = parsed.password.length;
        parsed.password = parsed.password[0] + "*".repeat(passLength - 2) + parsed.password[passLength - 1];
      }
      return parsed.toString();
    } catch {
      return url ? "INVALID_URL_FORMAT: " + url.substring(0, 30) + "..." : "NOT_SET";
    }
  };

  results.DATABASE_URL = {
    exists: !!dbUrl,
    masked: maskUrl(dbUrl),
    length: dbUrl.length,
    startsWithPostgresql: dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://"),
    containsBrackets: dbUrl.includes("[") || dbUrl.includes("]"),
    host: (() => {
      try { return new URL(dbUrl).hostname; } catch { return "PARSE_ERROR"; }
    })(),
    port: (() => {
      try { return new URL(dbUrl).port; } catch { return "PARSE_ERROR"; }
    })(),
    username: (() => {
      try { return new URL(dbUrl).username; } catch { return "PARSE_ERROR"; }
    })(),
    passwordLength: (() => {
      try { return new URL(dbUrl).password.length; } catch { return 0; }
    })(),
    hasQueryParams: dbUrl.includes("?"),
  };

  results.DIRECT_URL = {
    exists: !!directUrl,
    masked: maskUrl(directUrl),
    length: directUrl.length,
  };

  // Check other critical env vars
  results.GOOGLE_CLIENT_ID = {
    exists: !!process.env.GOOGLE_CLIENT_ID,
    length: process.env.GOOGLE_CLIENT_ID?.length || 0,
    preview: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.substring(0, 20) + "..." : "NOT_SET",
  };
  
  results.GOOGLE_CLIENT_SECRET = {
    exists: !!process.env.GOOGLE_CLIENT_SECRET,
    length: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
  };

  // Try connecting to database
  try {
    const { prisma } = await import("@/lib/prisma");
    const userCount = await prisma.user.count();
    results.database_connection = {
      status: "SUCCESS",
      userCount,
    };
  } catch (error: any) {
    results.database_connection = {
      status: "FAILED",
      error: error.message,
      errorCode: error.code,
      errorName: error.name,
    };
  }

  return NextResponse.json(results, { status: 200 });
}
