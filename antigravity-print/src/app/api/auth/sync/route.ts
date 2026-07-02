import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify Firebase token via Admin SDK would go here
    // For now, trust the client-sent data (in production, verify token server-side)
    const body = await req.json();
    const { uid, email, name, phone, photoURL, provider } = body;

    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    }

    // Determine role - check if email is admin email
    const adminEmail = process.env.ADMIN_EMAIL;
    const role = email === adminEmail ? "ADMIN" : "CUSTOMER";

    // Upsert user in database
    const user = await prisma.user.upsert({
      where: { firebaseUid: uid },
      update: {
        lastLogin: new Date(),
        ...(email && { email }),
        ...(name && { name }),
        ...(phone && { phone }),
        ...(photoURL && { profilePhoto: photoURL }),
        ...(provider && { authProvider: provider }),
      },
      create: {
        firebaseUid: uid,
        email: email || null,
        name: name || null,
        phone: phone || null,
        profilePhoto: photoURL || null,
        authProvider: provider || null,
        role,
        registrationDate: new Date(),
        lastLogin: new Date(),
      },
    });

    return NextResponse.json({ role: user.role, userId: user.id });
  } catch (error) {
    console.error("Auth sync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
