import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOrderStatusEmail } from "@/lib/email";

// GET - List payments (Admins see all with status filtering; Customers see only their own)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");
    const status = searchParams.get("status");
    const orderId = searchParams.get("orderId");

    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const where: Record<string, any> = {};

    if (user.role !== "ADMIN") {
      where.userId = user.id;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (orderId) {
      where.orderId = orderId;
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            fileName: true,
            totalAmount: true,
            status: true,
            paymentStatus: true,
            totalPages: true,
            copies: true,
            printColor: true,
            printSide: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profilePhoto: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Get payments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Submit payment proof / transaction reference (Customer)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      uid,
      orderId,
      transactionId,
      paymentProofUrl,
      method = "GOOGLEPAY",
      upiId,
    } = body;

    // 1. Validate required fields
    if (!uid || !orderId) {
      return NextResponse.json({ error: "User ID and Order ID are required" }, { status: 400 });
    }

    const cleanTransactionId = (transactionId || "").trim();
    if (!cleanTransactionId && !paymentProofUrl) {
      return NextResponse.json(
        { error: "Please provide a UPI Transaction Reference (UTR) number or upload a payment screenshot." },
        { status: 400 }
      );
    }

    if (cleanTransactionId && cleanTransactionId.length < 4) {
      return NextResponse.json(
        { error: "Transaction reference number is too short. Please provide a valid UTR." },
        { status: 400 }
      );
    }

    // 2. Authenticate customer
    const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // 3. Find and authorize order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (user.role !== "ADMIN" && order.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized access to this order" }, { status: 403 });
    }

    // 4. Check if order is already paid
    if (order.paymentStatus === "PAID") {
      return NextResponse.json(
        { error: "This order has already been verified and paid." },
        { status: 400 }
      );
    }

    // 5. Check for duplicate pending submission
    const existingPending = order.payments.find(
      (p) => p.status === "SUBMITTED" || p.status === "UNDER_REVIEW"
    );

    // 6. Check if transaction ID was already used in a PAID payment elsewhere
    if (cleanTransactionId) {
      const duplicateTx = await prisma.payment.findFirst({
        where: {
          transactionId: cleanTransactionId,
          status: "PAID",
          orderId: { not: orderId },
        },
      });

      if (duplicateTx) {
        return NextResponse.json(
          { error: "This transaction reference number has already been used for another verified payment." },
          { status: 400 }
        );
      }
    }

    // 7. Security: Always calculate/take amount from order record, never client input
    const paymentAmount = order.totalAmount;

    let payment;
    if (existingPending) {
      // Update the existing pending submission with new details
      payment = await prisma.payment.update({
        where: { id: existingPending.id },
        data: {
          amount: paymentAmount,
          method: method || "GOOGLEPAY",
          transactionId: cleanTransactionId || existingPending.transactionId || null,
          paymentProofUrl: paymentProofUrl || existingPending.paymentProofUrl || null,
          upiId: upiId || existingPending.upiId || null,
          status: "SUBMITTED",
          rejectionReason: null,
          adminNotes: "Resubmitted by customer",
        },
      });
    } else {
      // Create new payment submission record
      payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          userId: user.id,
          amount: paymentAmount,
          method: method || "GOOGLEPAY",
          status: "SUBMITTED", // Payment Submitted — Verification Pending
          transactionId: cleanTransactionId || null,
          paymentProofUrl: paymentProofUrl || null,
          upiId: upiId || null,
        },
      });
    }

    // 8. Update Order paymentStatus to SUBMITTED
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "SUBMITTED",
        ...(paymentProofUrl ? { paymentProofUrl } : {}),
      },
    });

    // 9. Record status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: order.status,
        changedBy: user.id,
        notes: `Payment proof submitted by customer. UTR: ${cleanTransactionId || "Screenshot uploaded"}. Awaiting admin verification.`,
      },
    });

    // 10. Notify Customer
    await prisma.notification.create({
      data: {
        userId: user.id,
        orderId: order.id,
        title: "Payment Submitted — Verification Pending ⏳",
        message: `Your payment of ₹${paymentAmount.toFixed(2)} for Order #${order.orderNumber} has been received and is awaiting verification by the shop admin.`,
        channel: "IN_APP",
        status: "SENT",
      },
    });

    // 11. Notify Admins
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          orderId: order.id,
          title: "New Payment to Verify 💳",
          message: `Customer ${user.name || user.email} submitted payment for Order #${order.orderNumber} (₹${paymentAmount.toFixed(2)}, UTR: ${cleanTransactionId || "Screenshot"}).`,
          channel: "IN_APP" as const,
          status: "SENT" as const,
        })),
      });
    }

    return NextResponse.json(
      {
        message: "Payment submitted successfully. Awaiting verification.",
        payment,
        status: "SUBMITTED",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Payment submission error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// PATCH - Admin Payment Verification (APPROVE / REJECT / UNDER_REVIEW)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      uid,
      paymentId,
      action, // 'APPROVE' | 'REJECT' | 'UNDER_REVIEW'
      rejectionReason,
      adminNotes,
    } = body;

    // 1. Authorization: Only ADMIN can verify payments
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminUser = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only administrators can verify payments" }, { status: 403 });
    }

    if (!paymentId || !action) {
      return NextResponse.json({ error: "Payment ID and verification action are required" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: { include: { user: true } },
        user: true,
      },
    });

    if (!payment) return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    const order = payment.order;

    if (action === "APPROVE") {
      // 1. Mark payment as PAID
      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: "PAID",
          paidAt: new Date(),
          verifiedBy: adminUser.id,
          verifiedAt: new Date(),
          adminNotes: adminNotes || "Payment verified in merchant account records",
          rejectionReason: null,
        },
      });

      // 2. Update Order: paymentStatus -> PAID, and auto-advance status to ACCEPTED if UPLOADED/VERIFIED
      const newOrderStatus = (order.status === "UPLOADED" || order.status === "VERIFIED") ? "ACCEPTED" : order.status;

      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PAID",
          status: newOrderStatus,
        },
      });

      // 3. Record Order Status History
      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: newOrderStatus,
          changedBy: adminUser.id,
          notes: `Payment verified and approved by admin (${adminUser.name || adminUser.email}). Payment ref: ${payment.transactionId || "Verified"}.`,
        },
      });

      // 4. Notify Customer
      await prisma.notification.create({
        data: {
          userId: payment.userId,
          orderId: order.id,
          title: "Payment Verified & Approved! 🎉",
          message: `Your payment of ₹${payment.amount.toFixed(2)} for Order #${order.orderNumber} has been verified successfully. Your order is now being processed.`,
          channel: "IN_APP",
          status: "SENT",
        },
      });

      // 5. Send Email if email exists
      if (order.user?.email) {
        await sendOrderStatusEmail(
          order.user.email,
          order.user.name || order.user.email,
          order.orderNumber,
          newOrderStatus,
          order.fileName || "Print Order"
        );
      }

      return NextResponse.json({
        message: "Payment verified and approved successfully.",
        payment: updatedPayment,
      });
    } else if (action === "REJECT") {
      if (!rejectionReason || !rejectionReason.trim()) {
        return NextResponse.json(
          { error: "A rejection reason must be provided so the customer can correct the payment." },
          { status: 400 }
        );
      }

      // 1. Mark payment as REJECTED
      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: "REJECTED",
          verifiedBy: adminUser.id,
          verifiedAt: new Date(),
          rejectionReason: rejectionReason.trim(),
          adminNotes: adminNotes || rejectionReason.trim(),
        },
      });

      // 2. Update Order: paymentStatus -> REJECTED
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "REJECTED",
          rejectionReason: rejectionReason.trim(),
        },
      });

      // 3. Record Order Status History
      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: order.status,
          changedBy: adminUser.id,
          notes: `Payment verification rejected: ${rejectionReason.trim()}`,
        },
      });

      // 4. Notify Customer with reason
      await prisma.notification.create({
        data: {
          userId: payment.userId,
          orderId: order.id,
          title: "Payment Verification Notice ⚠️",
          message: `Payment verification for Order #${order.orderNumber} was rejected. Reason: ${rejectionReason.trim()}. Please review and submit valid payment proof.`,
          channel: "IN_APP",
          status: "SENT",
        },
      });

      return NextResponse.json({
        message: "Payment rejected.",
        payment: updatedPayment,
      });
    } else if (action === "UNDER_REVIEW") {
      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: "UNDER_REVIEW",
          verifiedBy: adminUser.id,
          adminNotes: adminNotes || "Payment currently under review with bank / merchant account",
        },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "UNDER_REVIEW",
        },
      });

      return NextResponse.json({
        message: "Payment marked as under review.",
        payment: updatedPayment,
      });
    } else {
      return NextResponse.json({ error: "Invalid action. Must be APPROVE, REJECT, or UNDER_REVIEW." }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Payment verification error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
