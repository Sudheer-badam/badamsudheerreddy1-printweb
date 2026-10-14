import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";
import { prisma } from "@/lib/prisma";
import { PaymentMethod } from "@prisma/client";
import { sendOrderStatusEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orderId,
      uid,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = body;

    if (!orderId || !uid || !razorpay_payment_id) {
      return NextResponse.json({ error: "Missing required payment verification parameters" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Fetch keys
    const settings = await prisma.adminSettings.findFirst();
    const keyId = settings?.razorpayKey || process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Verify signature if secret is present
    if (keySecret && razorpay_order_id && razorpay_signature) {
      const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        return NextResponse.json({ error: "Invalid payment signature verification" }, { status: 400 });
      }
    }

    // Fetch real bank details from Razorpay to get the EXACT real UTR from NPCI
    let realUtr = razorpay_payment_id;
    let upiVpa = null;
    let paymentMethod: PaymentMethod = PaymentMethod.UPI;

    if (keyId && keySecret) {
      try {
        const instance = new Razorpay({ key_id: keyId, key_secret: keySecret });
        const rzpPayment: any = await instance.payments.fetch(razorpay_payment_id);
        
        // Extract real Bank Reference / UTR Number
        realUtr =
          rzpPayment.acquirer_data?.rrn ||
          rzpPayment.acquirer_data?.upi_transaction_id ||
          rzpPayment.acquirer_data?.bank_transaction_id ||
          rzpPayment.id;

        upiVpa = rzpPayment.vpa || null;
        if (rzpPayment.method === "upi") {
          paymentMethod = PaymentMethod.UPI;
        } else {
          paymentMethod = PaymentMethod.RAZORPAY;
        }
      } catch (fetchErr) {
        console.warn("Could not fetch extended Razorpay details:", fetchErr);
      }
    }

    const paymentAmount = order.totalAmount;
    const newOrderStatus = order.status === "UPLOADED" ? "ACCEPTED" : order.status;

    // Save payment as PAID with real UTR
    const existingPending = order.payments.find(
      (p) => p.status === "SUBMITTED" || p.status === "UNDER_REVIEW"
    );

    let payment;
    if (existingPending) {
      payment = await prisma.payment.update({
        where: { id: existingPending.id },
        data: {
          amount: paymentAmount,
          method: paymentMethod,
          transactionId: realUtr,
          upiId: upiVpa,
          status: "PAID",
          paidAt: new Date(),
          verifiedBy: "RAZORPAY_GATEWAY",
          verifiedAt: new Date(),
          adminNotes: `Verified via Gateway. Razorpay ID: ${razorpay_payment_id}`,
        },
      });
    } else {
      payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          userId: user.id,
          amount: paymentAmount,
          method: paymentMethod,
          status: "PAID",
          paidAt: new Date(),
          verifiedBy: "RAZORPAY_GATEWAY",
          verifiedAt: new Date(),
          transactionId: realUtr,
          upiId: upiVpa,
          adminNotes: `Verified via Gateway. Razorpay ID: ${razorpay_payment_id}`,
        },
      });
    }

    // Update order status
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        status: newOrderStatus,
      },
    });

    // Generate Invoice
    try {
      const existingInvoice = await prisma.invoice.findUnique({ where: { orderId: order.id } });
      if (!existingInvoice) {
        await prisma.invoice.create({
          data: {
            invoiceNumber: `INV-${order.orderNumber}`,
            orderId: order.id,
            userId: user.id,
            amount: order.subtotal || (paymentAmount - (order.gstAmount || 0)),
            gstAmount: order.gstAmount || 0,
            totalAmount: paymentAmount,
          },
        });
      }
    } catch (invErr) {
      console.warn("Invoice creation error:", invErr);
    }

    // Notifications
    await prisma.notification.create({
      data: {
        userId: user.id,
        orderId: order.id,
        title: "Payment Successful & Verified! 🎉",
        message: `Your payment of ₹${paymentAmount.toFixed(2)} was verified via bank gateway. UTR: ${realUtr}. Order #${order.orderNumber} is confirmed!`,
        channel: "IN_APP",
        status: "SENT",
      },
    });

    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          orderId: order.id,
          title: "Payment Verified via Gateway 💰",
          message: `Order #${order.orderNumber} paid by ${user.name || user.email} (₹${paymentAmount.toFixed(2)}, Real UTR: ${realUtr}). Recorded in Payment History.`,
          channel: "IN_APP" as const,
          status: "SENT" as const,
        })),
      });
    }

    // Email
    if (user.email) {
      try {
        await sendOrderStatusEmail(
          user.email,
          user.name || user.email,
          order.orderNumber,
          newOrderStatus,
          order.fileName || "Print Order"
        );
      } catch (emailErr) {
        console.warn("Email warning:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      transactionId: realUtr,
      payment,
    });
  } catch (error: any) {
    console.error("Razorpay verification error:", error);
    return NextResponse.json({ error: error?.message || "Payment verification failed" }, { status: 500 });
  }
}
