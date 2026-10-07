import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const ordersCompleted = await prisma.order.count({
      where: { status: "COMPLETED" },
    });

    const totalOrders = await prisma.order.count();

    const customers = await prisma.user.count({
      where: { role: "CUSTOMER" },
    });

    // We can just sum up the totalPages for completed orders
    const pagesPrintedResult = await prisma.order.aggregate({
      _sum: { totalPages: true },
      where: { status: "COMPLETED" },
    });

    let totalPages = pagesPrintedResult._sum.totalPages || 0;
    
    return NextResponse.json({
      ordersCompleted: ordersCompleted,
      totalOrders: totalOrders,
      customers: customers,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
