"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  ShieldAlert,
  CheckCircle2,
  Lock,
  RefreshCw,
  Globe,
  Monitor,
  ArrowRight,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getCurrentBrowserLocation,
  reverseGeocode,
  getLocationPermissionState,
  getIpLocationFallback,
  FullLocationData,
} from "@/lib/location";
import { toast } from "sonner";

export default function LiveLocationTracker() {
  const { user, userRole, logout } = useAuth();
  const router = useRouter();

  const [hasLocation, setHasLocation] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [permissionState, setPermissionState] = useState<"granted" | "denied" | "prompt" | "unsupported">("granted");
  const [currentAddress, setCurrentAddress] = useState<string>("");

  const watchIdRef = useRef<number | null>(null);
  const permissionStatusRef = useRef<PermissionStatus | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  // Send location coordinates to backend
  const syncLocationToBackend = useCallback(
    async (loc: FullLocationData) => {
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
    },
    [user?.uid]
  );

  // Mark user offline and immediately block screen with popup
  const handleLocationStopped = useCallback(
    async (reason: string) => {
      console.warn(`Location access stopped (${reason}). Blocking dashboard with popup.`);

      if (typeof window !== "undefined") {
        localStorage.removeItem("print_user_location_verified");
        sessionStorage.removeItem("user_last_location");
      }

      setHasLocation(false);
      setIsBlocked(true);

      if (user?.uid) {
        try {
          await fetch("/api/user/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid: user.uid, isOnline: false }),
          });
        } catch {}
      }
    },
    [user?.uid]
  );

  // Request browser location and unblock
  const requestLocation = useCallback(async () => {
    setRequesting(true);
    setErrorMessage("");
    try {
      const coords = await getCurrentBrowserLocation({ enableHighAccuracy: true, timeout: 8000 });
      const addr = await reverseGeocode(coords.latitude, coords.longitude);
      const fullData: FullLocationData = {
        ...coords,
        address: addr.formattedAddress,
        city: addr.city,
        state: addr.state,
        country: addr.country,
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("print_user_location_verified", "true");
        sessionStorage.setItem("user_last_location", JSON.stringify(fullData));
      }

      setHasLocation(true);
      setIsBlocked(false);
      setErrorMessage("");
      setCurrentAddress(fullData.address || "");
      await syncLocationToBackend(fullData);
    } catch (err: any) {
      console.warn("Location request failed:", err);
      const state = await getLocationPermissionState();
      setPermissionState(state);
      handleLocationStopped(`Request failed: ${err.message}`);
      if (state === "denied" || err.code === "PERMISSION_DENIED" || err.message?.includes("denied")) {
        setErrorMessage("Location access is blocked in your browser or device settings. Please toggle it to Allow.");
      } else if (err.code === "POSITION_UNAVAILABLE") {
        setErrorMessage("Device location / GPS is turned OFF on your computer. Please turn on Location in Windows settings.");
      } else {
        setErrorMessage(err.message || "Failed to retrieve location.");
      }
    } finally {
      setRequesting(false);
    }
  }, [syncLocationToBackend, handleLocationStopped]);

  // Fallback to Network Location if hardware GPS is unavailable
  const handleContinueWithNetworkLocation = useCallback(async () => {
    setRequesting(true);
    setErrorMessage("");
    try {
      const loc = await getIpLocationFallback();
      if (typeof window !== "undefined") {
        localStorage.setItem("print_user_location_verified", "true");
        sessionStorage.setItem("user_last_location", JSON.stringify(loc));
      }

      setHasLocation(true);
      setIsBlocked(false);
      setErrorMessage("");
      setCurrentAddress(loc.address || "");
      await syncLocationToBackend(loc);
      toast.info("Connected via network location provider.");
    } catch (err) {
      toast.error("Failed to retrieve network location.");
    } finally {
      setRequesting(false);
    }
  }, [syncLocationToBackend]);

  useEffect(() => {
    if (!user?.uid) return;

    // Only enforce and track for CUSTOMER role (not ADMIN)
    const isCustomer = userRole === "CUSTOMER" || !userRole;
    if (!isCustomer) return;

    let isMounted = true;

    // 1. Initial permission check on mount
    getLocationPermissionState().then((state) => {
      if (!isMounted) return;
      setPermissionState(state);

      if (state === "denied") {
        // Explicitly denied in browser: block immediately!
        handleLocationStopped("Permission denied on mount");
      } else {
        // Try getting location
        requestLocation();
      }
    });

    // 2. Real-time permission listener
    if (typeof window !== "undefined" && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" as any })
        .then((status) => {
          if (!isMounted) return;
          permissionStatusRef.current = status;

          status.onchange = () => {
            if (!isMounted) return;
            const newState = status.state as any;
            setPermissionState(newState);

            if (newState !== "granted") {
              // User toggled location OFF in browser: block immediately!
              handleLocationStopped(`Permission changed to ${newState}`);
            } else {
              // User toggled location back ON: unblock and sync!
              requestLocation();
            }
          };
        })
        .catch(() => {});
    }

    // 3. Geolocation watcher (continuously detects if user moves or stops location)
    if (typeof window !== "undefined" && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          if (!isMounted) return;
          setHasLocation(true);
          setIsBlocked(false);

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

          if (!lastCoords || movedSignificantly || now - lastSyncTimeRef.current > 30000) {
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
        async (error) => {
          if (!isMounted) return;
          // If user denies permission or device hardware GPS is turned off:
          if (error.code === error.PERMISSION_DENIED || error.code === error.POSITION_UNAVAILABLE) {
            handleLocationStopped(`Watch error: ${error.message} (code ${error.code})`);
          }
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
      );
    }

    // 4. Active Heartbeat (Every 4 seconds): Verifies that location has NOT been stopped or turned off
    const activeHeartbeat = setInterval(async () => {
      if (!isMounted) return;
      const state = await getLocationPermissionState();
      setPermissionState(state);

      if (state !== "granted") {
        // User turned off or blocked location in browser!
        handleLocationStopped(`Heartbeat detected state: ${state}`);
      }
    }, 4000);

    // 5. Periodic background sync: Keep online status active every 30 seconds
    const periodicSync = setInterval(() => {
      if (!isMounted) return;
      if (!isBlocked && hasLocation) {
        requestLocation();
      }
    }, 30000);

    // 6. Unload handler (mark user offline when leaving the page)
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
      clearInterval(activeHeartbeat);
      clearInterval(periodicSync);
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (permissionStatusRef.current) {
        permissionStatusRef.current.onchange = null;
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user?.uid, userRole, requestLocation, syncLocationToBackend, handleLocationStopped, currentAddress, isBlocked, hasLocation]);

  return (
    <>
      {/* 1. Live Indicator Badge (Shown when location is active and user is unblocked) */}
      {hasLocation && !isBlocked && (
        <div className="fixed bottom-4 left-4 z-30 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-emerald-200 shadow-sm text-xs font-semibold text-emerald-700">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Live Location Active</span>
        </div>
      )}

      {/* 2. Full Blocking Modal (Appears IMMEDIATELY whenever user stops or turns off location) */}
      <AnimatePresence>
        {isBlocked && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-[480px] bg-white rounded-[32px] p-6 sm:p-8 shadow-2xl border border-gray-100 text-center relative"
            >
              {/* Header Logo */}
              <div className="flex justify-center mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-600">
                    <Image src="/logo.png" alt="PRINT DOCKER" width={40} height={40} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-left">
                    <span className="font-extrabold text-base tracking-tight block text-[#0B1D3A]">PRINT DOCKER</span>
                    <span className="text-[10px] text-gray-500 font-medium">Live Dispatch System</span>
                  </div>
                </div>
              </div>

              {/* Animated Red Radar Pin */}
              <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                <span className="absolute inset-1.5 rounded-full bg-red-500/20 animate-pulse" />
                <div className="relative z-10 w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-red-500/30">
                  <MapPin className="w-7 h-7 animate-bounce" />
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="text-xl font-black text-[#0B1D3A] tracking-tight mb-2">
                Location Access Required
              </h3>
              <p className="text-gray-600 text-xs leading-relaxed mb-4">
                You have turned off or stopped sharing your live location. Live location sharing is mandatory while using PRINT DOCKER for print order routing and verification.
              </p>

              {/* Error Notice */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-left flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Instructions on how to re-enable */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 text-left text-xs text-gray-700 space-y-2 mb-5">
                <div className="font-bold text-[#0B1D3A] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  How to turn location back on:
                </div>
                <ol className="list-decimal pl-4 space-y-1 text-gray-600 text-[11px]">
                  <li>Click the <strong>Lock / Settings icon</strong> left of the URL in your browser bar.</li>
                  <li>Find <strong>Location</strong> and switch it back to <strong>Allow</strong>.</li>
                  <li className="text-gray-500">On Windows, ensure <strong>Location services</strong> is ON in Windows Settings.</li>
                </ol>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={requestLocation}
                  disabled={requesting}
                  className="w-full py-3.5 px-5 bg-gradient-to-r from-[#4318FF] to-[#2D63FF] hover:from-[#3311DB] hover:to-[#1C3CB3] text-white rounded-xl font-bold text-sm shadow-[0_8px_20px_rgba(67,24,255,0.3)] hover:shadow-[0_12px_25px_rgba(67,24,255,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {requesting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Location...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Re-enable Location &amp; Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleContinueWithNetworkLocation}
                  disabled={requesting}
                  className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-sm"
                >
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  <span>Verify with Network Location</span>
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className="w-full py-2 px-3 text-xs text-gray-400 hover:text-red-600 transition-colors flex items-center justify-center gap-1 cursor-pointer font-medium"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Sign out</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
