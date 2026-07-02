import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");

    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalOrders,
      todayOrders,
      pendingOrders,
      completedOrders,
      totalRevenue,
      todayRevenue,
      monthRevenue,
      totalCustomers,
      totalPages,
      pendingPayments,
      recentOrders,
      mostActiveCustomer,
      ordersByStatus,
      revenueByMonth,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.order.count({ where: { status: { in: ["UPLOADED", "VERIFIED", "ACCEPTED", "PRINTING"] } } }),
      prisma.order.count({ where: { status: "COMPLETED" } }),
      prisma.order.aggregate({ _sum: { totalAmount: true }, where: { paymentStatus: "PAID" } }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { paymentStatus: "PAID", createdAt: { gte: todayStart } },
      }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { paymentStatus: "PAID", createdAt: { gte: monthStart } },
      }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.order.aggregate({ _sum: { totalPages: true } }),
      prisma.order.aggregate({ _sum: { totalAmount: true }, where: { paymentStatus: "PENDING" } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true, phone: true } },
        },
      }),
      prisma.order.groupBy({
        by: ["userId"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 1,
      }),
      prisma.order.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      // Revenue for last 6 months
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          SUM("totalAmount") as revenue,
          COUNT(*) as orders
        FROM "Order"
        WHERE "paymentStatus" = 'PAID'
        AND "createdAt" >= NOW() - INTERVAL '6 months'
        GROUP BY month
        ORDER BY month ASC
      `,
    ]);

    // Get most active customer details
    let topCustomer = null;
    if (mostActiveCustomer.length > 0) {
      topCustomer = await prisma.user.findUnique({
        where: { id: mostActiveCustomer[0].userId },
        select: { name: true, email: true, phone: true },
      });
    }

    return NextResponse.json({
      stats: {
        totalOrders,
        todayOrders,
        pendingOrders,
        completedOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        todayRevenue: todayRevenue._sum.totalAmount || 0,
        monthRevenue: monthRevenue._sum.totalAmount || 0,
        totalCustomers,
        totalPages: totalPages._sum.totalPages || 0,
        pendingPayments: pendingPayments._sum.totalAmount || 0,
        mostActiveCustomer: topCustomer
          ? { ...topCustomer, orderCount: mostActiveCustomer[0]._count.id }
          : null,
      },
      recentOrders,
      ordersByStatus,
      revenueByMonth,
    });
  } catch (error) {
    console.error("Dashboard analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
