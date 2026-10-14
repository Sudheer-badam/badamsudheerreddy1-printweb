import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { orderId, uid } = await req.json();

    if (!orderId || !uid) {
      return NextResponse.json({ error: "Order ID and User ID are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (order.paymentStatus === "PAID") {
      return NextResponse.json({ error: "This order is already marked as PAID" }, { status: 400 });
    }

    // Fetch settings or env for Razorpay keys
    const settings = await prisma.adminSettings.findFirst();
    const keyId = settings?.razorpayKey || process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || keyId.includes("your-key-id") || !keySecret || keySecret.includes("your-key-secret")) {
      return NextResponse.json({
        error: "Razorpay live gateway keys not configured in Admin Settings or .env.local",
        isConfigured: false,
      }, { status: 400 });
    }

    const instance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const amountInPaise = Math.round(order.totalAmount * 100);

    const razorpayOrder = await instance.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `rcpt_${order.orderNumber.replace(/[^a-zA-Z0-9]/g, "")}`,
      notes: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: user.name || user.email,
        customerEmail: user.email,
      },
    });

    return NextResponse.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId,
    });
  } catch (error: any) {
    console.error("Razorpay order creation error:", error);
    return NextResponse.json({ error: error?.message || "Failed to create payment order" }, { status: 500 });
  }
}
