"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getCurrentBrowserLocation, reverseGeocode, getLocationPermissionState, getIpLocationFallback, FullLocationData } from "@/lib/location";

export default function LiveLocationTracker() {
  const { user, userRole } = useAuth();
  const router = useRouter();

  const [hasLocation, setHasLocation] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>("");

  const watchIdRef = useRef<number | null>(null);
  const permissionStatusRef = useRef<PermissionStatus | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const isRedirectingRef = useRef<boolean>(false);

  // Send location to backend
  const syncLocationToBackend = useCallback(async (loc: FullLocationData) => {
    if (!user?.uid) return;
    try {
      await fetch("/api/user/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          address: loc.address,
          city: loc.city,
          state: loc.state,
          country: loc.country,
          isOnline: true,
        }),
      });
      lastSyncTimeRef.current = Date.now();
      lastCoordsRef.current = { lat: loc.latitude, lng: loc.longitude };
    } catch (err) {
      console.warn("Failed to sync live location:", err);
    }
  }, [user?.uid]);

  // Mark user offline and redirect to /location-required when location access stops
  const handleLocationStopped = useCallback(async (reason: string) => {
    if (isRedirectingRef.current) return;
    isRedirectingRef.current = true;
    console.warn(`Location access stopped (${reason}). Redirecting to /location-required...`);

    if (user?.uid) {
      try {
        await fetch("/api/user/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user.uid, isOnline: false }),
        });
      } catch {}
    }

    setHasLocation(false);
    router.replace("/location-required");
  }, [user?.uid, router]);

  // Request browser location and sync with fallback
  const requestLocation = useCallback(async () => {
    try {
      let fullData: FullLocationData;
      try {
        const coords = await getCurrentBrowserLocation({ enableHighAccuracy: true, timeout: 8000 });
        const addr = await reverseGeocode(coords.latitude, coords.longitude);
        fullData = {
          ...coords,
          address: addr.formattedAddress,
          city: addr.city,
          state: addr.state,
          country: addr.country,
        };
      } catch (gpsErr) {
        console.warn("Hardware GPS failed in live tracker, falling back to network IP location:", gpsErr);
        fullData = await getIpLocationFallback();
      }

      setHasLocation(true);
      isRedirectingRef.current = false;
      setCurrentAddress(fullData.address || "");
      await syncLocationToBackend(fullData);
    } catch (err: any) {
      if (err.code === "PERMISSION_DENIED" || err.message?.includes("denied")) {
        const state = await getLocationPermissionState();
        if (state === "denied") {
          handleLocationStopped("Permission Denied");
        }
      }
    }
  }, [syncLocationToBackend, handleLocationStopped]);

  useEffect(() => {
    if (!user?.uid) return;

    // Only track for CUSTOMER role (not ADMIN)
    const isCustomer = userRole === "CUSTOMER" || !userRole;
    if (!isCustomer) return;

    let isMounted = true;

    // 1. Initial location sync (browser GPS or network IP fallback)
    requestLocation();

    // 2. Real-time permission listener:
    // Only redirect if user actively revoked permission that was previously granted!
    let previousState: string | null = null;
    if (typeof window !== "undefined" && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" as any })
        .then((status) => {
          if (!isMounted) return;
          permissionStatusRef.current = status;
          previousState = status.state;

          status.onchange = () => {
            if (!isMounted) return;
            const newState = status.state;
            if (newState === "denied" && previousState === "granted") {
              if (typeof window !== "undefined") {
                localStorage.removeItem("print_user_location_verified");
                sessionStorage.removeItem("user_last_location");
              }
              handleLocationStopped("Location permission revoked in browser settings");
            } else if (newState === "granted") {
              isRedirectingRef.current = false;
              requestLocation();
            }
            previousState = newState;
          };
        })
        .catch(() => {});
    }

    // 3. Geolocation watcher (watches live GPS coordinates when available)
    if (typeof window !== "undefined" && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          if (!isMounted) return;
          isRedirectingRef.current = false;
          setHasLocation(true);

          const { latitude, longitude, accuracy } = position.coords;
          const now = Date.now();
          const lastCoords = lastCoordsRef.current;
          let movedSignificantly = false;

          if (lastCoords) {
            const dLat = Math.abs(latitude - lastCoords.lat);
            const dLng = Math.abs(longitude - lastCoords.lng);
            if (dLat > 0.0005 || dLng > 0.0005) {
              movedSignificantly = true;
            }
          }

          // Throttle updates: sync every 45s unless moved significantly
          if (!lastCoords || movedSignificantly || now - lastSyncTimeRef.current > 45000) {
            let address = currentAddress;
            let city = "";
            let state = "";
            let country = "";

            if (!address || movedSignificantly) {
              const geo = await reverseGeocode(latitude, longitude);
              address = geo.formattedAddress;
              city = geo.city || "";
              state = geo.state || "";
              country = geo.country || "";
              setCurrentAddress(address);
            }

            syncLocationToBackend({
              latitude,
              longitude,
              accuracy,
              address,
              city,
              state,
              country,
            });
          }
        },
        () => {
          // Hardware GPS unavailable or timeout; fallback requestLocation maintains network coordinates
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    }

    // 4. Periodic background sync: keeps user isOnline: true and refreshes coordinates every 45 seconds
    const periodicSync = setInterval(() => {
      if (!isMounted) return;
      requestLocation();
    }, 45000);

    // 5. Unload handler (mark offline when leaving page)
    const handleBeforeUnload = () => {
      if (user?.uid) {
        navigator.sendBeacon?.(
          "/api/user/location",
          JSON.stringify({ uid: user.uid, isOnline: false })
        );
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      isMounted = false;
      clearInterval(periodicSync);
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (permissionStatusRef.current) {
        permissionStatusRef.current.onchange = null;
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user?.uid, userRole, requestLocation, syncLocationToBackend, handleLocationStopped, currentAddress]);

  // If location is active and user is customer, show subtle live indicator
  if (!hasLocation) return null;

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
