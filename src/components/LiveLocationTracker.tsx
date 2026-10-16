"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const getDeviceOS = () => {
  if (typeof navigator === "undefined") return "Unknown Device";
  const ua = navigator.userAgent;
  return /android/i.test(ua)
    ? "Android"
    : /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    ? "iOS"
    : /Mac OS X/.test(ua)
    ? "Mac"
    : /Windows/.test(ua)
    ? "Windows"
    : /Linux/.test(ua)
    ? "Linux"
    : "Unknown Device";
};

export default function LiveLocationTracker() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isActive, setIsActive] = useState<boolean>(false);

  // 1. Continuous Live Geolocation Watcher in Background (Non-blocking)
  useEffect(() => {
    let watchId: number | undefined;

    if (user && typeof window !== "undefined" && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          setIsActive(true);
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          const speed = position.coords.speed;
          const heading = position.coords.heading;
          const accuracy = position.coords.accuracy;

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
            is_sharing: true,
            device_os: getDeviceOS(),
            last_updated: new Date().toISOString(),
            is_online: true,
            isOnline: true,
          };

          // Write to Firebase Firestore collection live_user_locations
          try {
            if (db) {
              await setDoc(doc(db, "live_user_locations", user.uid), payload, { merge: true });
            }
          } catch (err) {
            console.error("Failed to update live location to Firebase:", err);
          }

          // Also keep backend in sync
          try {
            await fetch("/api/user/location", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                uid: user.uid,
                latitude,
                longitude,
                accuracy,
                isOnline: true,
              }),
            });
          } catch {}
        },
        (error) => {
          // Graceful fallback - never block the screen or show any modal!
          console.warn("Location tracking inactive or not permitted:", error.message);
          setIsActive(false);
        },
        { enableHighAccuracy: true }
      );
    }

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

  // Only show subtle live badge inside dashboard or admin views, never on public landing pages
  const isDashboardOrAdmin = pathname?.startsWith("/dashboard") || pathname?.startsWith("/admin");
  if (!isDashboardOrAdmin) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-30 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-emerald-200 shadow-sm text-xs font-semibold text-emerald-700">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <span>Live Location Active</span>
    </div>
  );
}
