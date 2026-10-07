import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { list, del } from "@vercel/blob";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const blobs = await list();
    
    // Fetch orders to determine file status
    const orders = await prisma.order.findMany({
      select: { orderNumber: true, fileUrl: true, status: true }
    });
    
    const orderMap = new Map();
    orders.forEach(o => orderMap.set(o.fileUrl, o));

    let totalSize = 0;
    const items = blobs.blobs.map(blob => {
      totalSize += blob.size;
      
      const order = orderMap.get(blob.url);
      let isSafeToDelete = false;
      let statusLabel = "Orphaned";

      if (order) {
        statusLabel = order.status;
        if (["COMPLETED", "DELIVERED", "CANCELLED"].includes(order.status)) {
          isSafeToDelete = true;
        }
      } else {
        isSafeToDelete = true;
      }

      return {
        url: blob.url,
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: blob.uploadedAt,
        orderNumber: order?.orderNumber,
        status: statusLabel,
        isSafeToDelete,
      };
    });

    // Mock capacity of 5GB for UI display purposes
    const capacity = 5 * 1024 * 1024 * 1024;

    return NextResponse.json({
      items,
      totalSize,
      totalCount: blobs.blobs.length,
      capacity,
    });
  } catch (error) {
    console.error("Storage list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");
    const url = searchParams.get("url");

    if (!uid || !url) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await del(url);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Storage delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
