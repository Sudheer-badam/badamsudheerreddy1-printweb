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
  LogOut,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getCurrentBrowserLocation,
  reverseGeocode,
  getLocationPermissionState,
  getNetworkFallbackLocation,
  FullLocationData,
} from "@/lib/location";

export default function LiveLocationTracker() {
  const { user, userRole, logout } = useAuth();
  const router = useRouter();

  const [hasLocation, setHasLocation] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [permissionState, setPermissionState] = useState<"granted" | "denied" | "prompt" | "unsupported">("prompt");
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

  // Mark user offline and immediately block screen with top popup
  const handleLocationStopped = useCallback(
    async (reason: string) => {
      console.warn(`Location access stopped (${reason}).`);

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

  const isBlockedRef = useRef(isBlocked);
  const hasLocationRef = useRef(hasLocation);
  const requestingRef = useRef(requesting);
  const currentAddressRef = useRef(currentAddress);

  useEffect(() => {
    isBlockedRef.current = isBlocked;
  }, [isBlocked]);

  useEffect(() => {
    hasLocationRef.current = hasLocation;
  }, [hasLocation]);

  useEffect(() => {
    requestingRef.current = requesting;
  }, [requesting]);

  useEffect(() => {
    currentAddressRef.current = currentAddress;
  }, [currentAddress]);

  // Request browser location via native prompt
  const requestLocation = useCallback(async () => {
    if (requestingRef.current) return;
    setRequesting(true);
    setErrorMessage("");
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
      } catch (gpsErr: any) {
        console.warn("Browser hardware GPS unavailable, checking permission state:", gpsErr);
        const state = await getLocationPermissionState();
        if (state === "denied") {
          // User explicitly blocked permission in browser
          throw gpsErr;
        }
        // Permission was allowed in browser, but PC lacks satellite GPS receiver:
        // Seamlessly resolve network location!
        fullData = await getNetworkFallbackLocation();
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("print_user_location_verified", "true");
        sessionStorage.setItem("user_last_location", JSON.stringify(fullData));
      }

      setHasLocation(true);
      setIsBlocked(false);
      setErrorMessage("");
      setCurrentAddress(fullData.address || "");
      currentAddressRef.current = fullData.address || "";
      await syncLocationToBackend(fullData);
    } catch (err: any) {
      console.warn("Location request failed:", err);
      const state = await getLocationPermissionState();
      setPermissionState(state);
      handleLocationStopped(`Request failed: ${err.message}`);
      if (state === "denied" || err.code === "PERMISSION_DENIED" || err.message?.includes("denied")) {
        setErrorMessage("Location is currently blocked by your browser for this site. Follow the steps below to switch Location to Allow.");
      } else if (err.code === "POSITION_UNAVAILABLE" || err.message?.includes("unavailable")) {
        setErrorMessage("Device location / GPS is turned OFF on your computer. Please turn on Location in Windows settings.");
      } else {
        setErrorMessage(err.message || "Failed to retrieve location.");
      }
    } finally {
      setRequesting(false);
    }
  }, [syncLocationToBackend, handleLocationStopped]);

  // Handle user clicking "Don't Allow"
  const handleDontAllow = () => {
    setErrorMessage("Live location sharing is mandatory for print dispatch routing and Xerox order verification. Please allow location access to continue.");
  };

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

      if (state === "granted") {
        requestLocation();
      } else {
        // Show top popup to request permission
        handleLocationStopped(`Initial state: ${state}`);
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

            if (newState === "granted") {
              // User unblocked in browser: automatically request and enter!
              setErrorMessage("");
              requestLocation();
            } else if (newState === "denied") {
              handleLocationStopped("Permission changed to denied");
              setErrorMessage("Location access is blocked in your browser. Click the lock or tune icon in the address bar above to Allow.");
            } else {
              handleLocationStopped(`Permission changed to ${newState}`);
            }
          };
        })
        .catch(() => {});
    }

    // 3. Window focus listener: detect when user returns after changing browser address bar settings
    const handleWindowFocus = async () => {
      if (!isMounted || requestingRef.current) return;
      const state = await getLocationPermissionState();
      setPermissionState(state);
      if (state === "granted" && isBlockedRef.current) {
        requestLocation();
      }
    };
    window.addEventListener("focus", handleWindowFocus);

    // 4. Geolocation watcher (watches live GPS coordinates)
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
            let address = currentAddressRef.current;
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
              currentAddressRef.current = address;
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
          if (error.code === error.PERMISSION_DENIED || error.code === error.POSITION_UNAVAILABLE) {
            handleLocationStopped(`Watch error: ${error.message} (code ${error.code})`);
          }
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
      );
    }

    // 5. Active Heartbeat (Every 1 second): Verifies that location has NOT been stopped or turned off while browsing
    const activeHeartbeat = setInterval(async () => {
      if (!isMounted || requestingRef.current) return;
      if (hasLocationRef.current && !isBlockedRef.current) {
        const state = await getLocationPermissionState();
        setPermissionState(state);

        if (state !== "granted") {
          // User turned off or blocked location in browser or settings while browsing!
          handleLocationStopped(`User stopped location access (state: ${state})`);
        }
      }
    }, 1000);

    // 6. Periodic background sync: Keep online status active every 30 seconds
    const periodicSync = setInterval(() => {
      if (!isMounted) return;
      if (!isBlockedRef.current && hasLocationRef.current) {
        requestLocation();
      }
    }, 30000);

    // 7. Unload handler (mark user offline when leaving the page)
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
      window.removeEventListener("focus", handleWindowFocus);
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (permissionStatusRef.current) {
        permissionStatusRef.current.onchange = null;
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user?.uid, userRole, requestLocation, syncLocationToBackend, handleLocationStopped]);

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

      {/* 2. Top Popup Screen "RIGHT ABOVE" like all standard websites */}
      <AnimatePresence>
        {isBlocked && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-start pt-3 sm:pt-5 px-4 bg-black/55 backdrop-blur-sm pointer-events-auto">
            <motion.div
              initial={{ y: -60, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -40, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 450, damping: 30 }}
              className="w-full max-w-[460px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(11,29,58,0.3)] border border-gray-200/90 p-5 relative text-left"
            >
              {/* Top row: Site indicator & Close/Logout */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-[#2D63FF] flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-blue-600 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#0B1D3A] flex items-center gap-1.5">
                      Allow Location Access
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wide">
                        Required
                      </span>
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      PRINT DOCKER wants to know your location
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-gray-100 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Subtitle explanation */}
              <p className="text-xs text-gray-600 leading-relaxed mb-3">
                Live location sharing is required while using the website for print dispatch routing and Xerox order verification.
              </p>

              {/* Error Alert if blocked */}
              {errorMessage && (
                <div className="mb-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span className="leading-tight">{errorMessage}</span>
                </div>
              )}

              {/* If browser permission was set to block, show address bar tip */}
              {permissionState === "denied" && (
                <div className="mb-3 p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-gray-700 space-y-2">
                  <div className="font-bold text-blue-900 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-600" />
                    How to Unblock Location in Chrome / Edge:
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div className="p-2 rounded-lg bg-white border border-blue-100 flex items-start gap-2">
                      <span className="font-bold text-blue-600 flex-shrink-0">Option 1:</span>
                      <div>
                        Look at the <strong>right side of your address bar</strong> for the crossed-out pin <strong className="text-red-500">[ ⦸ ]</strong> &rarr; Click it &rarr; Choose <strong>&quot;Always allow&quot;</strong> &rarr; Click <strong>Done</strong>.
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-white border border-blue-100 flex items-start gap-2">
                      <span className="font-bold text-blue-600 flex-shrink-0">Option 2:</span>
                      <div>
                        Click the <strong>Tune icon (🎚)</strong> or <strong>Lock (🔒)</strong> on the <strong>left side</strong> of the address bar &rarr; Switch <strong>Location</strong> to <strong>Allow</strong> (or Reset).
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-blue-800 font-medium pt-0.5">
                    Once you switch it in the address bar above, click <strong>Verify &amp; Allow</strong> below or click <strong>Reload Page</strong>.
                  </p>
                </div>
              )}

              {/* Action buttons: Reload, "Don't Allow" and "Allow Location" */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Reload page to apply browser changes"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reload Page
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDontAllow}
                    disabled={requesting}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Don&apos;t Allow
                  </button>

                  <button
                    type="button"
                    onClick={requestLocation}
                    disabled={requesting}
                    className="px-4 py-2.5 rounded-xl bg-[#2D63FF] hover:bg-[#1E4FE6] text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {requesting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{permissionState === "denied" ? "Verify & Allow" : "Allow Location"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
