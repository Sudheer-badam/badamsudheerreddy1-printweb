import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { KNOWN_GMAIL_LOCATIONS } from "@/lib/location";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify Firebase token via Admin SDK would go here
    // For now, trust the client-sent data (in production, verify token server-side)
    const body = await req.json();
    const { uid, email, name, phone, photoURL, provider, location } = body;

    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    }

    // Determine role - check if email is admin email
    const adminEmail = process.env.ADMIN_EMAIL;
    const role = email === adminEmail ? "ADMIN" : "CUSTOMER";

    let user = await prisma.user.findUnique({
      where: { firebaseUid: uid },
    });

    if (!user && email) {
      // If no user found by uid, check if they exist by email
      user = await prisma.user.findUnique({
        where: { email },
      });
    }

    const normalizedEmail = (email || user?.email || "").toLowerCase().trim();
    const knownLoc = normalizedEmail ? KNOWN_GMAIL_LOCATIONS[normalizedEmail] : null;

    let locationUpdate: any = {};
    if (user && user.latitude && user.longitude && user.locationAddress) {
      // User already has their correct Gmail location saved in DB: preserve it and mark active
      locationUpdate = {
        isOnline: true,
        lastLocationUpdate: new Date(),
      };
    } else if (knownLoc) {
      // Automatically apply their verified Gmail location
      locationUpdate = {
        latitude: knownLoc.latitude,
        longitude: knownLoc.longitude,
        locationAccuracy: knownLoc.accuracy || 50,
        locationAddress: knownLoc.address,
        locationCity: knownLoc.city,
        locationState: knownLoc.state,
        locationCountry: knownLoc.country,
        isOnline: true,
        lastLocationUpdate: new Date(),
      };
    } else if (location && typeof location.latitude === "number" && typeof location.longitude === "number") {
      locationUpdate = {
        latitude: location.latitude,
        longitude: location.longitude,
        locationAccuracy: location.accuracy || null,
        locationAddress: location.address || null,
        locationCity: location.city || null,
        locationState: location.state || null,
        locationCountry: location.country || null,
        isOnline: true,
        lastLocationUpdate: new Date(),
      };
    }

    if (user) {
      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firebaseUid: uid, // Update in case firebase UID changed
          lastLogin: new Date(),
          ...(email && { email }),
          ...(name && { name }),
          ...(phone && { phone }),
          ...(photoURL && { profilePhoto: photoURL }),
          ...(provider && { authProvider: provider }),
          ...locationUpdate,
        },
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          firebaseUid: uid,
          email: email || null,
          name: name || null,
          phone: phone || null,
          profilePhoto: photoURL || null,
          authProvider: provider || null,
          role,
          registrationDate: new Date(),
          lastLogin: new Date(),
          ...locationUpdate,
        },
      });
    }

    // If location provided, log in UserLocationLog
    if (location && typeof location.latitude === "number" && typeof location.longitude === "number") {
      await prisma.userLocationLog.create({
        data: {
          userId: user.id,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy || null,
          address: location.address || null,
          city: location.city || null,
          state: location.state || null,
        },
      }).catch((e: any) => console.warn("Failed to write location log:", e));
    }

    return NextResponse.json({
      role: user.role,
      userId: user.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        latitude: user.latitude,
        longitude: user.longitude,
        locationAccuracy: user.locationAccuracy,
        locationAddress: user.locationAddress,
        locationCity: user.locationCity,
        locationState: user.locationState,
        locationCountry: user.locationCountry,
      },
    });
  } catch (error) {
    console.error("Auth sync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
