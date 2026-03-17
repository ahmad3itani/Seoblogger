import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { user: authUser } = authResult;

    const { reason } = await req.json();

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        { error: "Please provide a detailed reason for your refund request (minimum 10 characters)" },
        { status: 400 }
      );
    }

    // Get user and subscription info
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { 
        plan: true,
        subscription: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.stripeCustomerId || !user.subscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    // Check eligibility for 7-day guarantee
    const now = new Date();
    const firstPaymentAt = user.subscription.firstPaymentAt;
    const isFirstSubscriber = user.subscription.isFirstSubscription;
    
    let daysSincePayment = null;
    let withinGuarantee = false;
    let isEligible = false;
    let eligibilityReason = "";

    if (firstPaymentAt) {
      const diffMs = now.getTime() - firstPaymentAt.getTime();
      daysSincePayment = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      withinGuarantee = daysSincePayment <= 7;
      
      if (isFirstSubscriber && withinGuarantee) {
        isEligible = true;
        eligibilityReason = `Eligible for 7-day money-back guarantee (${daysSincePayment} days since first payment)`;
      } else if (!isFirstSubscriber) {
        eligibilityReason = "Not eligible: 7-day guarantee applies to first-time subscribers only";
      } else if (!withinGuarantee) {
        eligibilityReason = `Not eligible: Request made ${daysSincePayment} days after payment (guarantee period is 7 days)`;
      }
    } else {
      eligibilityReason = "Unable to determine payment date";
    }

    // Create refund request
    const refundRequest = await prisma.refundRequest.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        stripeSubscriptionId: user.stripeSubscriptionId,
        stripeCustomerId: user.stripeCustomerId,
        planName: user.plan?.name || "unknown",
        amountPaid: user.plan?.price || 0,
        currency: "USD",
        reason: reason.trim(),
        isEligible,
        eligibilityReason,
        withinGuarantee,
        isFirstSubscriber,
        daysSincePayment,
        status: isEligible ? "pending" : "pending", // Admin will review all
      },
    });

    return NextResponse.json({
      success: true,
      refundRequest: {
        id: refundRequest.id,
        isEligible,
        eligibilityReason,
        status: refundRequest.status,
        message: isEligible
          ? "Your refund request has been submitted and is eligible for our 7-day money-back guarantee. We will process it within 5-10 business days."
          : "Your refund request has been submitted for review. While it may not qualify for our automatic 7-day guarantee, we will review it on a case-by-case basis.",
      },
    });
  } catch (error: any) {
    console.error("Refund request error:", error);
    return NextResponse.json(
      { error: "Failed to submit refund request" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { user: authUser } = authResult;

    // Get user's refund requests
    const refundRequests = await prisma.refundRequest.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ refundRequests });
  } catch (error: any) {
    console.error("Get refund requests error:", error);
    return NextResponse.json(
      { error: "Failed to fetch refund requests" },
      { status: 500 }
    );
  }
}
