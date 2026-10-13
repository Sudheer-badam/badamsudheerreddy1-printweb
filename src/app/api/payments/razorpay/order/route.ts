import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, orderId } = body;

    if (!uid || !orderId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (user.role !== "ADMIN" && order.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized access to order" }, { status: 403 });
    }

    if (order.paymentStatus === "PAID") {
      return NextResponse.json({ error: "Order is already paid" }, { status: 400 });
    }

    // Get Razorpay Key from AdminSettings or environment variables
    const settings = await prisma.adminSettings.findFirst();
    const keyId =
      settings?.razorpayKey ||
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
      process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    const amountInPaise = Math.round(order.totalAmount * 100);

    // If live or test keys are configured with secret, create official order via Razorpay API
    if (keyId && keySecret && keySecret !== "your-key-secret") {
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${authHeader}`,
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: "INR",
          receipt: order.orderNumber,
          notes: {
            orderId: order.id,
            userId: user.id,
          },
        }),
      });

      if (rzpResponse.ok) {
        const rzpOrder = await rzpResponse.json();
        return NextResponse.json({
          keyId,
          orderId: rzpOrder.id,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          businessName: settings?.businessName || "PRINT DOCKER",
          isTestMode: keyId.startsWith("rzp_test_"),
        });
      } else {
        const errData = await rzpResponse.json().catch(() => ({}));
        console.error("Razorpay API order creation error:", errData);
      }
    }

    // Fallback for Free Tier / Test Sandbox mode (when API key is client-only or in sandbox)
    const fallbackOrderId = `order_${Math.random().toString(36).substring(2, 12)}`;
    return NextResponse.json({
      keyId: keyId || "rzp_test_mock_sandbox",
      orderId: fallbackOrderId,
      amount: amountInPaise,
      currency: "INR",
      businessName: settings?.businessName || "PRINT DOCKER",
      isTestMode: true,
      notice: "Razorpay Test Mode / Sandbox active",
    });
  } catch (error: any) {
    console.error("Create Razorpay order error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
