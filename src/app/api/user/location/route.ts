import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST: Update current user's live location
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, latitude, longitude, accuracy, address, city, state, country, isOnline } = body;

    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { firebaseUid: uid },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hasValidCoords = typeof latitude === "number" && typeof longitude === "number";

    const updateData: any = {
      isOnline: isOnline !== undefined ? Boolean(isOnline) : true,
    };

    if (hasValidCoords) {
      updateData.latitude = latitude;
      updateData.longitude = longitude;
      updateData.locationAccuracy = accuracy ?? null;
      updateData.lastLocationUpdate = new Date();
      if (address) updateData.locationAddress = address;
      if (city) updateData.locationCity = city;
      if (state) updateData.locationState = state;
      if (country) updateData.locationCountry = country;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        latitude: true,
        longitude: true,
        locationAddress: true,
        locationCity: true,
        lastLocationUpdate: true,
        isOnline: true,
      },
    });

    // Write to location log if valid coordinates
    if (hasValidCoords) {
      await prisma.userLocationLog.create({
        data: {
          userId: user.id,
          latitude,
          longitude,
          accuracy: accuracy ?? null,
          address: address ?? null,
          city: city ?? null,
          state: state ?? null,
        },
      }).catch((e: any) => console.warn("Location log insert warning:", e));
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Location update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET: Fetch users with locations for Admin portal
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminUid = searchParams.get("adminUid");
    const filter = searchParams.get("filter") || "all"; // 'all' | 'online' | 'today'

    if (!adminUid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify requesting user is admin
    const admin = await prisma.user.findUnique({
      where: { firebaseUid: adminUid },
    });

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
    }

    // Base query for customers with locations
    const where: any = {
      role: "CUSTOMER",
      latitude: { not: null },
      longitude: { not: null },
    };

    const now = new Date();
    if (filter === "online") {
      // Considered online if flagged online AND active in the last 15 minutes
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
      where.isOnline = true;
      where.lastLocationUpdate = { gte: fifteenMinutesAgo };
    } else if (filter === "today") {
      const startOfToday = new Date(now.setHours(0, 0, 0, 0));
      where.lastLocationUpdate = { gte: startOfToday };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firebaseUid: true,
        name: true,
        email: true,
        phone: true,
        profilePhoto: true,
        latitude: true,
        longitude: true,
        locationAccuracy: true,
        locationAddress: true,
        locationCity: true,
        locationState: true,
        locationCountry: true,
        isOnline: true,
        lastLocationUpdate: true,
        lastLogin: true,
        registrationDate: true,
        _count: {
          select: { orders: true },
        },
      },
      orderBy: {
        lastLocationUpdate: "desc",
      },
    });

    // Compute stats
    const totalWithLocation = await prisma.user.count({
      where: {
        role: "CUSTOMER",
        latitude: { not: null },
        longitude: { not: null },
      },
    });

    const activeFifteenMin = new Date(Date.now() - 15 * 60 * 1000);
    const onlineCount = await prisma.user.count({
      where: {
        role: "CUSTOMER",
        isOnline: true,
        lastLocationUpdate: { gte: activeFifteenMin },
      },
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const activeTodayCount = await prisma.user.count({
      where: {
        role: "CUSTOMER",
        lastLocationUpdate: { gte: startOfToday },
      },
    });

    return NextResponse.json({
      users,
      stats: {
        totalWithLocation,
        onlineCount,
        activeTodayCount,
      },
    });
  } catch (error) {
    console.error("Fetch locations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
