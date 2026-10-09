import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all orders (admin) or user orders (customer)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const where: Record<string, unknown> = {};

    // Customers can only see their own orders
    if (user.role !== "ADMIN") {
      where.userId = user.id;
    }

    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;

    if (search && user.role === "ADMIN") {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { fileName: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { user: { phone: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              profilePhoto: true,
            },
          },
          payments: {
            select: { id: true, amount: true, status: true, method: true, paidAt: true },
          },
          invoice: { select: { id: true, invoiceNumber: true, pdfUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get orders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create new order
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      uid,
      fileName,
      fileUrl,
      fileKey,
      fileSize,
      totalPages,
      colorPages,
      bwPages,
      paperSize = "A4",
      orientation = "PORTRAIT",
      printSide = "SINGLE",
      printColor = "BLACK_AND_WHITE",
      copies = 1,
      binding = false,
      lamination = false,
      paperQuality = "standard",
      instructions,
      colorPrice,
      bwPrice,
      bindingCost = 0,
      laminationCost = 0,
      subtotal,
      gstRate = 0,
      gstAmount = 0,
      discount = 0,
      totalAmount,
      collate = true,
      pagesToPrint = "ALL",
      customPageRange = null,
      pageSizing = "FIT",
      saveInk = false,
      documents = null, // Array of documents if multi-document order
    } = body;

    if (!uid) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }
    
    // Support either single document fields OR multiple documents array
    if ((!fileName || !fileUrl) && (!documents || documents.length === 0)) {
       return NextResponse.json({ error: "Missing document information" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Generate unique order number
    const orderNumber = `AGP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: user.id,
        fileName: fileName || (documents && documents[0]?.fileName) || "Multiple Files",
        fileUrl: fileUrl || (documents && documents[0]?.fileUrl) || "",
        fileKey: fileKey || (documents && documents[0]?.fileKey) || "",
        fileSize: fileSize || (documents && documents.reduce((acc: number, d: any) => acc + (d.fileSize || 0), 0)) || 0,
        documents,
        totalPages: totalPages || (documents && documents.reduce((acc: number, d: any) => acc + (d.totalPages || 0), 0)) || 0,
        colorPages: colorPages || (documents && documents.reduce((acc: number, d: any) => acc + (d.colorPages || 0), 0)) || 0,
        bwPages: bwPages || (documents && documents.reduce((acc: number, d: any) => acc + (d.bwPages || 0), 0)) || 0,
        paperSize,
        orientation: orientation === "AUTO" ? "PORTRAIT" : orientation,
        printSide,
        printColor,
        copies,
        binding,
        lamination,
        paperQuality,
        instructions,
        colorPrice,
        bwPrice,
        bindingCost,
        laminationCost,
        subtotal,
        gstRate,
        gstAmount,
        discount,
        totalAmount,
        collate,
        pagesToPrint,
        customPageRange,
        pageSizing,
        saveInk,
        status: "UPLOADED",
        paymentStatus: "PENDING",
      },
    });

    // Create status history entry
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: "UPLOADED",
        changedBy: "system",
        notes: "Order created",
      },
    });

    // Create in-app notification for user
    await prisma.notification.create({
      data: {
        userId: user.id,
        orderId: order.id,
        title: "Order Uploaded Successfully",
        message: `Your order ${orderNumber} has been uploaded and is awaiting review.`,
        channel: "IN_APP",
        status: "SENT",
      },
    });

    // Create in-app notification for all admins
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    if (admins.length > 0) {
      const adminNotifications = admins.map(admin => ({
        userId: admin.id,
        orderId: order.id,
        title: "New Order Received",
        message: `New order ${orderNumber} uploaded by ${user.name || user.email || 'Customer'}.`,
        channel: "IN_APP" as const,
        status: "SENT" as const,
      }));
      await prisma.notification.createMany({ data: adminNotifications });
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
