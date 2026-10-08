import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    let pricing = await prisma.pricing.findFirst({ where: { name: "default" } });

    if (!pricing) {
      // Create default pricing
      pricing = await prisma.pricing.create({
        data: {
          name: "default",
          colorPrice: 10.0,
          bwPrice: 2.0,
          a3Multiplier: 2.0,
          bindingCost: 50.0,
          laminationCost: 20.0,
          gstRate: 18.0,
          maxFileSize: 52428800,
        },
      });
    }

    return NextResponse.json(pricing, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      }
    });
  } catch (error) {
    console.error("Get pricing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");

    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const { colorPrice, bwPrice, a3Multiplier, bindingCost, laminationCost, gstRate, maxFileSize } = body;

    const pricing = await prisma.pricing.upsert({
      where: { name: "default" },
      update: {
        ...(colorPrice !== undefined && { colorPrice }),
        ...(bwPrice !== undefined && { bwPrice }),
        ...(a3Multiplier !== undefined && { a3Multiplier }),
        ...(bindingCost !== undefined && { bindingCost }),
        ...(laminationCost !== undefined && { laminationCost }),
        ...(gstRate !== undefined && { gstRate }),
        ...(maxFileSize !== undefined && { maxFileSize }),
      },
      create: {
        name: "default",
        colorPrice: colorPrice || 10.0,
        bwPrice: bwPrice || 2.0,
        a3Multiplier: a3Multiplier || 2.0,
        bindingCost: bindingCost || 50.0,
        laminationCost: laminationCost || 20.0,
        gstRate: gstRate || 18.0,
        maxFileSize: maxFileSize || 52428800,
      },
    });

    return NextResponse.json(pricing);
  } catch (error) {
    console.error("Update pricing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
