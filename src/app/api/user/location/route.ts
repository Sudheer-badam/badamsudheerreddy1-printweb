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

// GET: Fetch users with locations for Admin portal OR fetch single user's location by uid
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");

    // If querying own location by uid
    if (uid) {
      const user = await prisma.user.findUnique({
        where: { firebaseUid: uid },
        select: {
          id: true,
          email: true,
          name: true,
          latitude: true,
          longitude: true,
          locationAccuracy: true,
          locationAddress: true,
          locationCity: true,
          locationState: true,
          locationCountry: true,
          isOnline: true,
        },
      });
      return NextResponse.json({ success: true, user });
    }

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

    // Base query for all users with locations (customers and admin accounts)
    const where: any = {
      latitude: { not: null },
      longitude: { not: null },
    };

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    if (filter === "online") {
      // Considered online only if flagged online AND active in the last 5 minutes
      where.isOnline = true;
      where.lastLocationUpdate = { gte: fiveMinutesAgo };
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

    // Dynamically guarantee isOnline is only true if lastLocationUpdate was within 5 minutes
    const usersWithRealtimeStatus = users.map((u) => {
      const isActuallyOnline = Boolean(
        u.isOnline &&
        u.lastLocationUpdate &&
        new Date(u.lastLocationUpdate).getTime() >= fiveMinutesAgo.getTime()
      );
      return {
        ...u,
        isOnline: isActuallyOnline,
      };
    });

    // Compute stats across all located users
    const totalWithLocation = await prisma.user.count({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
    });

    const onlineCount = await prisma.user.count({
      where: {
        isOnline: true,
        lastLocationUpdate: { gte: fiveMinutesAgo },
      },
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const activeTodayCount = await prisma.user.count({
      where: {
        lastLocationUpdate: { gte: startOfToday },
      },
    });

    return NextResponse.json({
      users: usersWithRealtimeStatus,
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
