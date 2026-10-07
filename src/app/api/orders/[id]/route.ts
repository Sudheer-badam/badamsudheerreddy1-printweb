import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET single order
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");

    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, profilePhoto: true },
        },
        payments: true,
        invoice: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
        notifications: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        review: true,
      },
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Authorization: customer can only see own orders
    if (user.role !== "ADMIN" && order.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Get order error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update order (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { uid, status, paymentStatus, adminNotes, rejectionReason } = body;

    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingOrder) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
    if (status === "COMPLETED") updateData.completedAt = new Date();

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        payments: true,
        invoice: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    });

    // Add status history if status changed
    if (status) {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          status,
          changedBy: user.id,
          notes: adminNotes || `Status updated to ${status}`,
        },
      });

      // Create notification for customer
      const statusMessages: Record<string, { title: string; message: string }> = {
        ACCEPTED: {
          title: "Order Accepted! 🎉",
          message: `Your order ${existingOrder.orderNumber} has been accepted and will be processed soon.`,
        },
        PRINTING: {
          title: "Printing Started 🖨️",
          message: `Your order ${existingOrder.orderNumber} is now being printed.`,
        },
        READY_FOR_PICKUP: {
          title: "Ready for Pickup! 📦",
          message: `Your order ${existingOrder.orderNumber} is ready. Please collect your documents.`,
        },
        COMPLETED: {
          title: "Order Completed ✅",
          message: `Your order ${existingOrder.orderNumber} has been completed successfully. Thank you!`,
        },
        CANCELLED: {
          title: "Order Cancelled ❌",
          message: `Your order ${existingOrder.orderNumber} has been cancelled. ${rejectionReason || ""}`,
        },
      };

      const notifData = statusMessages[status];
      if (notifData) {
        await prisma.notification.create({
          data: {
            userId: existingOrder.userId,
            orderId: id,
            title: notifData.title,
            message: notifData.message,
            channel: "IN_APP",
            status: "SENT",
          },
        });
      }
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete order (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");

    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (user.role !== "ADMIN" && order.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.order.delete({ where: { id } });

    return NextResponse.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Delete order error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
