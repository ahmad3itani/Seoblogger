import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { user: authUser } = authResult;

    const { disputeType, amount, description, stripeChargeId, stripeInvoiceId } = await req.json();

    if (!disputeType || !amount || !description) {
      return NextResponse.json(
        { error: "Dispute type, amount, and description are required" },
        { status: 400 }
      );
    }

    if (description.trim().length < 20) {
      return NextResponse.json(
        { error: "Please provide a detailed description (minimum 20 characters)" },
        { status: 400 }
      );
    }

    const validDisputeTypes = ["unauthorized_charge", "incorrect_amount", "duplicate_charge", "service_not_received", "other"];
    if (!validDisputeTypes.includes(disputeType)) {
      return NextResponse.json(
        { error: "Invalid dispute type" },
        { status: 400 }
      );
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create billing dispute
    const dispute = await prisma.billingDispute.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        disputeType,
        amount: parseFloat(amount),
        currency: "USD",
        description: description.trim(),
        stripeChargeId: stripeChargeId || null,
        stripeInvoiceId: stripeInvoiceId || null,
        status: "open",
      },
    });

    return NextResponse.json({
      success: true,
      dispute: {
        id: dispute.id,
        status: dispute.status,
        message: "Your billing dispute has been submitted. We will investigate and respond within 48 hours. Please do not initiate a chargeback with your bank while we resolve this issue.",
      },
    });
  } catch (error: any) {
    console.error("Billing dispute error:", error);
    return NextResponse.json(
      { error: "Failed to submit billing dispute" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { user: authUser } = authResult;

    // Get user's billing disputes
    const disputes = await prisma.billingDispute.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ disputes });
  } catch (error: any) {
    console.error("Get billing disputes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing disputes" },
      { status: 500 }
    );
  }
}
