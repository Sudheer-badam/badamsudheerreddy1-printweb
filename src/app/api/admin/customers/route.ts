import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");
    const search = searchParams.get("search") || "";

    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const where = search
      ? {
          role: "CUSTOMER" as const,
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } },
          ],
        }
      : { role: "CUSTOMER" as const };

    const customers = await prisma.user.findMany({
      where,
      include: { _count: { select: { orders: true } } },
      orderBy: { registrationDate: "desc" },
    });

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const customersWithRealtimeOnline = customers.map((c) => ({
      ...c,
      isOnline: Boolean(
        c.isOnline &&
        c.lastLocationUpdate &&
        new Date(c.lastLocationUpdate).getTime() >= fiveMinutesAgo.getTime()
      ),
    }));

    const seenEmails = new Set<string>();
    const uniqueCustomers: typeof customersWithRealtimeOnline = [];
    for (const c of customersWithRealtimeOnline) {
      const emailKey = c.email ? c.email.toLowerCase().trim() : c.id;
      if (!seenEmails.has(emailKey)) {
        seenEmails.add(emailKey);
        uniqueCustomers.push(c);
      }
    }

    return NextResponse.json(uniqueCustomers);
  } catch (error) {
    console.error("Get customers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
