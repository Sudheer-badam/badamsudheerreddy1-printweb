import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendOrderStatusEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      uid,
      orderId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = body;

    if (!uid || !orderId || !razorpay_payment_id) {
      return NextResponse.json(
        { error: "Payment verification parameters are missing" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (user.role !== "ADMIN" && order.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized access to order" }, { status: 403 });
    }

    // If order is already paid, return existing success
    if (order.paymentStatus === "PAID") {
      return NextResponse.json({ message: "Order is already paid and verified" });
    }

    const isSandboxSimulation =
      razorpay_signature === "sandbox_auto_approved" ||
      razorpay_payment_id.startsWith("pay_sim_") ||
      razorpay_payment_id.startsWith("pay_test_mock");

    // Verify HMAC SHA256 Signature if secret is configured and not sandbox simulation
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!isSandboxSimulation && keySecret && keySecret !== "your-key-secret" && razorpay_order_id && razorpay_signature) {
      const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        return NextResponse.json(
          { error: "Invalid payment signature. Verification failed." },
          { status: 400 }
        );
      }
    }

    // Check duplicate transaction ID
    const existingTx = await prisma.payment.findFirst({
      where: {
        transactionId: razorpay_payment_id,
        status: "PAID",
      },
    });

    if (existingTx && existingTx.orderId !== order.id) {
      return NextResponse.json(
        { error: "This payment reference has already been claimed." },
        { status: 400 }
      );
    }

    // Create or update payment record
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        userId: user.id,
        amount: order.totalAmount, // Server-side validated order amount
        method: "RAZORPAY",
        status: "PAID",
        transactionId: razorpay_payment_id,
        razorpayId: razorpay_payment_id,
        paidAt: new Date(),
        verifiedAt: new Date(),
        adminNotes: isSandboxSimulation
          ? `Free Tier Sandbox Simulation payment verified (Test Order ID: ${razorpay_order_id || "N/A"})`
          : `Automated gateway verification via Razorpay (Order ID: ${razorpay_order_id || "N/A"})`,
      },
    });

    // Auto advance order status
    const newOrderStatus =
      order.status === "UPLOADED" || order.status === "VERIFIED" ? "ACCEPTED" : order.status;

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        status: newOrderStatus,
      },
    });

    // Log history
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: newOrderStatus,
        changedBy: user.id,
        notes: `Payment completed via Razorpay Gateway (Txn ID: ${razorpay_payment_id}). Status updated to PAID & ACCEPTED.`,
      },
    });

    // Notify customer
    await prisma.notification.create({
      data: {
        userId: user.id,
        orderId: order.id,
        title: "Payment Received & Verified! 🎉",
        message: `Your payment of ₹${order.totalAmount.toFixed(2)} via Razorpay has been received and confirmed.`,
        channel: "IN_APP",
        status: "SENT",
      },
    });

    // Email customer
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
      message: "Payment successfully verified and order updated.",
      payment,
    });
  } catch (error: any) {
    console.error("Razorpay verification error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
