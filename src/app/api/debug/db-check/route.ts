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

  // Check password for special characters that need URL encoding
  try {
    const parsedUrl = new URL(dbUrl);
    const rawPassword = parsedUrl.password;
    const decodedPassword = decodeURIComponent(rawPassword);
    const needsEncoding = /[^A-Za-z0-9\-._~]/.test(decodedPassword);
    const specialChars = decodedPassword.split('').filter(c => /[^A-Za-z0-9]/.test(c));
    
    results.password_analysis = {
      rawLength: rawPassword.length,
      decodedLength: decodedPassword.length,
      needsUrlEncoding: needsEncoding,
      specialCharacters: specialChars,
      isUrlEncoded: rawPassword !== decodedPassword,
      firstChar: decodedPassword[0],
      lastChar: decodedPassword[decodedPassword.length - 1],
      hasSpaces: decodedPassword.includes(' '),
      hasAtSign: decodedPassword.includes('@'),
      hasHash: decodedPassword.includes('#'),
    };
  } catch (e: any) {
    results.password_analysis = { error: e.message };
  }

  // Try connecting to database with current URL
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

  // Try connecting with manually URL-encoded password
  try {
    const parsedUrl = new URL(dbUrl);
    const rawPassword = decodeURIComponent(parsedUrl.password);
    const encodedPassword = encodeURIComponent(rawPassword);
    
    // Reconstruct URL with properly encoded password
    const fixedUrl = dbUrl.replace(
      `:${parsedUrl.password}@`,
      `:${encodedPassword}@`
    );
    
    const isAlreadyCorrect = fixedUrl === dbUrl;
    results.url_encoding_fix = {
      passwordWasAlreadyEncoded: isAlreadyCorrect,
      wouldChangeUrl: !isAlreadyCorrect,
    };
    
    if (!isAlreadyCorrect) {
      // Try connecting with the fixed URL
      const { PrismaClient } = await import("@prisma/client");
      const testPrisma = new PrismaClient({
        datasources: { db: { url: fixedUrl } },
      });
      try {
        const count = await testPrisma.user.count();
        results.fixed_url_connection = {
          status: "SUCCESS",
          userCount: count,
          message: "URL encoding was the issue! The password needs to be URL-encoded.",
        };
      } catch (err: any) {
        results.fixed_url_connection = {
          status: "ALSO_FAILED",
          error: err.message,
        };
      } finally {
        await testPrisma.$disconnect();
      }
    }
  } catch (e: any) {
    results.url_encoding_fix = { error: e.message };
  }

  return NextResponse.json(results, { status: 200 });
}
