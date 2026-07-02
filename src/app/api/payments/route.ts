import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");

    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const where = user.role === "ADMIN" ? {} : { userId: user.id };

    const payments = await prisma.payment.findMany({
      where,
      include: {
        order: { select: { orderNumber: true, fileName: true } },
        user: { select: { name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Get payments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, orderId, amount, method, transactionId, razorpayId } = body;

    if (!uid || !orderId || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const payment = await prisma.payment.create({
      data: {
        orderId,
        userId: user.id,
        amount,
        method: method || null,
        status: "PAID",
        transactionId: transactionId || null,
        razorpayId: razorpayId || null,
        paidAt: new Date(),
      },
    });

    // Update order payment status
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: "PAID" },
    });

    // Send payment confirmation notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        orderId,
        title: "Payment Received ✅",
        message: `Your payment of ₹${amount} has been received successfully.`,
        channel: "IN_APP",
        status: "SENT",
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
