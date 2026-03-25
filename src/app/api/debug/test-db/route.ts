import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  // Block in production unless debug token is provided
  if (process.env.NODE_ENV === "production") {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (token !== process.env.DEBUG_TOKEN) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: {},
    issues: [],
    recommendations: [],
  };

  try {
    // Test 1: Supabase Auth
    results.tests.supabaseAuth = { status: "testing" };
    try {
      const supabase = await createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        results.tests.supabaseAuth = { 
          status: "error", 
          error: error.message,
          user: null 
        };
        results.issues.push("Supabase auth error: " + error.message);
      } else if (!user) {
        results.tests.supabaseAuth = { 
          status: "warning", 
          message: "No authenticated user",
          user: null 
        };
      } else {
        results.tests.supabaseAuth = { 
          status: "success", 
          user: {
            id: user.id,
            email: user.email,
            metadata: user.user_metadata,
          }
        };
      }
    } catch (e: any) {
      results.tests.supabaseAuth = { status: "error", error: e.message };
      results.issues.push("Supabase connection failed: " + e.message);
    }

    // Test 2: Prisma Connection
    results.tests.prismaConnection = { status: "testing" };
    try {
      await prisma.$connect();
      results.tests.prismaConnection = { status: "success" };
    } catch (e: any) {
      results.tests.prismaConnection = { status: "error", error: e.message };
      results.issues.push("Prisma connection failed: " + e.message);
      return NextResponse.json(results, { status: 500 });
    }

    // Test 3: User in Database
    results.tests.userInDatabase = { status: "testing" };
    const supabaseUser = results.tests.supabaseAuth?.user;
    if (supabaseUser?.id) {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: supabaseUser.id },
          include: { plan: true, usage: true },
        });

        if (!dbUser) {
          results.tests.userInDatabase = { 
            status: "error", 
            message: "User exists in Supabase but NOT in database",
            supabaseId: supabaseUser.id 
          };
          results.issues.push("User not synced to database. Run /api/user/sync");
          results.recommendations.push("Call POST /api/user/sync to create user record");
        } else {
          results.tests.userInDatabase = { 
            status: "success",
            user: {
              id: dbUser.id,
              email: dbUser.email,
              name: dbUser.name,
              planId: dbUser.planId,
              plan: dbUser.plan?.name,
              hasGoogleToken: !!dbUser.googleAccessToken,
            }
          };

          // Check for missing name
          if (!dbUser.name) {
            results.issues.push("User name is NULL in database");
            results.recommendations.push("User metadata may be missing. Check Supabase user_metadata.full_name or user_metadata.name");
          }
        }
      } catch (e: any) {
        results.tests.userInDatabase = { status: "error", error: e.message };
        results.issues.push("Database query failed: " + e.message);
      }
    } else {
      results.tests.userInDatabase = { 
        status: "skipped", 
        reason: "No authenticated user" 
      };
    }

    // Test 4: Blogs in Database
    results.tests.blogsInDatabase = { status: "testing" };
    if (supabaseUser?.id) {
      try {
        const blogs = await prisma.blog.findMany({
          where: { userId: supabaseUser.id },
          orderBy: { createdAt: 'desc' },
        });

        results.tests.blogsInDatabase = { 
          status: blogs.length > 0 ? "success" : "warning",
          count: blogs.length,
          blogs: blogs.map(b => ({
            id: b.id,
            blogId: b.blogId,
            name: b.name,
            url: b.url,
            isDefault: b.isDefault,
            userId: b.userId,
          }))
        };

        if (blogs.length === 0) {
          results.issues.push("No blogs found in database");
          results.recommendations.push("Call GET /api/blogs?refresh=true to sync from Blogger");
        }
      } catch (e: any) {
        results.tests.blogsInDatabase = { status: "error", error: e.message };
        results.issues.push("Blog query failed: " + e.message);
      }
    } else {
      results.tests.blogsInDatabase = { 
        status: "skipped", 
        reason: "No authenticated user" 
      };
    }

    // Test 5: Plan exists
    results.tests.planCheck = { status: "testing" };
    try {
      const plans = await prisma.plan.findMany();
      results.tests.planCheck = { 
        status: plans.length > 0 ? "success" : "error",
        count: plans.length,
        plans: plans.map(p => ({ id: p.id, name: p.name, displayName: p.displayName }))
      };

      if (plans.length === 0) {
        results.issues.push("No plans in database - run seed script");
        results.recommendations.push("Run: npx prisma db seed");
      }
    } catch (e: any) {
      results.tests.planCheck = { status: "error", error: e.message };
      results.issues.push("Plan query failed: " + e.message);
    }

    // Summary
    results.summary = {
      totalTests: Object.keys(results.tests).length,
      passed: Object.values(results.tests).filter((t: any) => t.status === "success").length,
      failed: Object.values(results.tests).filter((t: any) => t.status === "error").length,
      warnings: Object.values(results.tests).filter((t: any) => t.status === "warning").length,
      issuesFound: results.issues.length,
    };

    return NextResponse.json(results, { 
      status: results.issues.length > 0 ? 500 : 200 
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "Test failed",
      message: error.message,
      stack: error.stack,
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
