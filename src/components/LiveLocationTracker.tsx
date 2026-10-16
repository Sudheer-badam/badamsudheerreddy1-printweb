"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { reverseGeocode, getDeviceOS } from "@/lib/location";

export { getDeviceOS };

export default function LiveLocationTracker() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isActive, setIsActive] = useState<boolean>(false);
  const [exactDetails, setExactDetails] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  } | null>(null);

  const lastGeocodeTimeRef = useRef<number>(0);
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  // 1. Continuous Live Exact Geolocation Watcher in Background
  useEffect(() => {
    let watchId: number | undefined;

    if (!user || typeof window === "undefined" || !navigator.geolocation) {
      return;
    }

    const processPosition = async (position: GeolocationPosition) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const accuracy = position.coords.accuracy;
      const speed = position.coords.speed;
      const heading = position.coords.heading;

      setIsActive(true);

      const now = Date.now();
      const prev = lastCoordsRef.current;
      const movedSignificantly =
        !prev ||
        Math.abs(latitude - prev.lat) > 0.0001 ||
        Math.abs(longitude - prev.lng) > 0.0001;

      let address = exactDetails?.address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      let city = "";
      let state = "";
      let country = "India";

      // Reverse geocode if moved or if not resolved recently (>15s)
      if (movedSignificantly || now - lastGeocodeTimeRef.current > 15000) {
        lastGeocodeTimeRef.current = now;
        lastCoordsRef.current = { lat: latitude, lng: longitude };
        try {
          const geo = await reverseGeocode(latitude, longitude);
          if (geo.formattedAddress) {
            address = geo.formattedAddress;
            city = geo.city || "";
            state = geo.state || "";
            country = geo.country || "India";
          }
        } catch (err) {
          console.warn("Reverse geocode lookup warning:", err);
        }
      }

      setExactDetails({
        latitude,
        longitude,
        accuracy,
        address,
      });

      // Save exact location to sessionStorage for immediate UI access
      try {
        sessionStorage.setItem(
          "user_last_location",
          JSON.stringify({
            latitude,
            longitude,
            accuracy,
            address,
            city,
            state,
            country,
            speed,
            heading,
            updatedAt: new Date().toISOString(),
          })
        );
      } catch {}

      const payload = {
        user_id: user.uid,
        user_name: user.displayName || user.email || "Unknown",
        email: user.email,
        photo_url: user.photoURL || null,
        latitude,
        longitude,
        accuracy: accuracy ?? null,
        speed: typeof speed === "number" ? speed : null,
        heading: typeof heading === "number" ? heading : null,
        address,
        city,
        state,
        country,
        is_sharing: true,
        device_os: getDeviceOS(),
        last_updated: new Date().toISOString(),
        is_online: true,
        isOnline: true,
      };

      // 1. Sync live exact coordinates to Firebase Firestore
      try {
        if (db) {
          await setDoc(doc(db, "live_user_locations", user.uid), payload, { merge: true });
        }
      } catch (err) {
        console.error("Failed to update exact live location to Firebase:", err);
      }

      // 2. Sync live exact coordinates to PostgreSQL backend
      try {
        await fetch("/api/user/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: user.uid,
            latitude,
            longitude,
            accuracy,
            address,
            city,
            state,
            country,
            isOnline: true,
          }),
        });
      } catch {}
    };

    const handleLocationError = (error: GeolocationPositionError) => {
      console.warn("Exact location not available:", error.message);
    };

    // Immediate single-shot request with high accuracy (maximumAge: 0 forces fresh GPS hardware fix)
    navigator.geolocation.getCurrentPosition(processPosition, handleLocationError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000,
    });

    // Continuous real-time movement watcher
    watchId = navigator.geolocation.watchPosition(processPosition, handleLocationError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000,
    });

    return () => {
      if (watchId !== undefined && typeof window !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [user]);

  // 2. Active Heartbeat (Every 3 seconds when active)
  useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout | undefined;

    if (user && isActive) {
      const syncHeartbeat = () => {
        if (!db) return;
        setDoc(
          doc(db, "live_user_locations", user.uid),
          {
            user_id: user.uid,
            user_name: user.displayName || user.email || "Unknown",
            email: user.email,
            photo_url: user.photoURL || null,
            last_updated: new Date().toISOString(),
            device_os: getDeviceOS(),
            is_online: true,
            isOnline: true,
          },
          { merge: true }
        ).catch(console.error);
      };

      syncHeartbeat();
      heartbeatInterval = setInterval(syncHeartbeat, 3000);
    }

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [user, isActive]);

  // Never render any modal or screen-blocking overlay
  if (!user || !isActive) {
    return null;
  }

  // Only show subtle live badge inside dashboard or admin views, never on landing pages
  const isDashboardOrAdmin = pathname?.startsWith("/dashboard") || pathname?.startsWith("/admin");
  if (!isDashboardOrAdmin) {
    return null;
  }

  return (
    <div
      title={exactDetails?.address ? `Exact Location: ${exactDetails.address}` : "Live Location Active"}
      className="fixed bottom-4 left-4 z-30 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-emerald-200 shadow-sm text-xs font-semibold text-emerald-700 transition-all hover:shadow-md"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <span>Live Location Active</span>
      {exactDetails?.accuracy ? (
        <span className="text-[10px] text-emerald-600 font-mono bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50">
          ±{Math.round(exactDetails.accuracy)}m
        </span>
      ) : null}
    </div>
  );
}
