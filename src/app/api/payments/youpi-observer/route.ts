import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BankSmsParser } from "@/lib/youpi/bankSmsParser";

/**
 * YouPI Automated Payment Observer Webhook
 * Receives bank credit alerts from YouPI Android SMS Observer or Bank Webhooks,
 * parses UTR and Amount, and auto-verifies matching orders in real-time.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, utr, amount, sender } = body;

    let targetUtr = utr;
    let targetAmount = typeof amount === "number" ? amount : undefined;

    // If raw SMS text was sent, parse it with YouPI BankSmsParser
    if (text) {
      const parsed = BankSmsParser.parse({ text, sender });
      if (parsed) {
        if (!targetUtr && parsed.bankReferenceNumber) {
          targetUtr = parsed.bankReferenceNumber;
        }
        if (!targetAmount && parsed.amount) {
          targetAmount = parsed.amount;
        }
      }
    }

    if (!targetUtr && !targetAmount) {
      return NextResponse.json(
        { error: "Could not extract valid UTR or Amount from notification" },
        { status: 400 }
      );
    }

    // 1. First, search if a customer already submitted this UTR
    let matchedPayment = null;
    if (targetUtr) {
      matchedPayment = await prisma.payment.findFirst({
        where: {
          transactionId: targetUtr,
          status: { in: ["PENDING", "SUBMITTED", "UNDER_REVIEW"] },
        },
        include: { order: true },
      });
    }

    // 2. If not found by UTR, look for a pending payment matching the exact order amount within the last 60 minutes
    if (!matchedPayment && targetAmount) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      matchedPayment = await prisma.payment.findFirst({
        where: {
          amount: targetAmount,
          status: { in: ["PENDING", "SUBMITTED", "UNDER_REVIEW"] },
          createdAt: { gte: oneHourAgo },
        },
        include: { order: true },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!matchedPayment) {
      return NextResponse.json({
        success: true,
        matched: false,
        message: "Bank alert recorded, but no pending order matched yet.",
        extracted: { utr: targetUtr, amount: targetAmount },
      });
    }

    // 3. Mark payment as PAID
    await prisma.payment.update({
      where: { id: matchedPayment.id },
      data: {
        status: "PAID",
        transactionId: targetUtr || matchedPayment.transactionId,
        verifiedBy: "YOUPI_OBSERVER",
        verifiedAt: new Date(),
        paidAt: new Date(),
        adminNotes: `Auto-verified via YouPI Observer. Bank UTR: ${targetUtr || "Confirmed"}`,
      },
    });

    // 4. Update Order Status
    await prisma.order.update({
      where: { id: matchedPayment.orderId },
      data: {
        paymentStatus: "PAID",
        status: matchedPayment.order.status === "UPLOADED" ? "ACCEPTED" : matchedPayment.order.status,
      },
    });

    // 5. Add order status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId: matchedPayment.orderId,
        status: matchedPayment.order.status === "UPLOADED" ? "ACCEPTED" : matchedPayment.order.status,
        changedBy: "YOUPI_OBSERVER",
        notes: `Payment auto-verified with UTR ${targetUtr || "Matched Amount"}`,
      },
    });

    return NextResponse.json({
      success: true,
      matched: true,
      orderNumber: matchedPayment.order.orderNumber,
      orderId: matchedPayment.orderId,
      amount: matchedPayment.amount,
      utr: targetUtr,
    });
  } catch (error) {
    console.error("YouPI observer error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
