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
  FullLocationData,
} from "@/lib/location";
import { syncLocationToFirebase, setFirebaseUserOffline } from "@/lib/firebaseLocation";
import { toast } from "sonner";
import LocationPromptModal from "./LocationPromptModal";

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

  // Send location coordinates to backend and Firebase
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
        console.warn("Failed to sync live location to database:", err);
      }

      // Sync to Firebase Firestore (collection: live_user_locations)
      syncLocationToFirebase({
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        speed: loc.speed ?? null,
        heading: loc.heading ?? null,
        address: loc.address,
        city: loc.city,
        state: loc.state,
        country: loc.country,
        isOnline: true,
      }).catch((err) => {
        console.warn("Failed to sync live location to Firebase:", err);
      });
    },
    [user?.uid, user?.email, user?.displayName]
  );

  // Mark user offline
  const handleLocationStopped = useCallback(
    async (reason: string) => {
      console.warn(`Location access stopped (${reason}).`);

      if (typeof window !== "undefined") {
        localStorage.removeItem("isSharingLocation");
        sessionStorage.removeItem("user_last_location");
      }

      setHasLocation(false);
      setIsBlocked(true);

      if (user?.uid) {
        setFirebaseUserOffline(user.uid);
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
  const requestLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your browser.");
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    setRequesting(true);
    toast.info("Verifying location permissions...");

    // SYNCHRONOUS BROWSER USER ACTIVATION CALL
    // In Chromium and Safari, calling this synchronously in the click handler
    // guarantees the native browser permission dialog appears immediately!
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setRequesting(false);
        setIsBlocked(false);
        setHasLocation(true);
        setPermissionState("granted");
        setErrorMessage("");
        toast.success("Location verified! Access granted.");

        if (typeof window !== "undefined") {
          localStorage.setItem("isSharingLocation", "true");
        }

        const { latitude, longitude, accuracy, speed, heading } = pos.coords;
        let address = "";
        try {
          const addr = await reverseGeocode(latitude, longitude);
          address = addr.formattedAddress;
        } catch {}

        const fullData: FullLocationData = {
          latitude,
          longitude,
          accuracy,
          speed: typeof speed === "number" ? speed : null,
          heading: typeof heading === "number" ? heading : null,
          address,
        };

        if (typeof window !== "undefined") {
          sessionStorage.setItem("user_last_location", JSON.stringify(fullData));
        }

        setCurrentAddress(address);
        currentAddressRef.current = address;
        syncLocationToBackend(fullData);
      },
      (err) => {
        setRequesting(false);
        console.warn("Geolocation prompt response:", err);
        setPermissionState("denied");
        setIsBlocked(true);
        if (typeof window !== "undefined") {
          localStorage.setItem("isSharingLocation", "false");
        }
        if (err.code === 1) {
          // PERMISSION_DENIED
          setErrorMessage(
            "Location access was denied by your browser. You MUST allow location access in your browser's site settings to use this application."
          );
          toast.error(
            "Location is blocked. Click the lock icon 🔒 next to the website URL to allow location, then reload.",
            {
              action: {
                label: "Reload Page",
                onClick: () => window.location.reload(),
              },
              duration: 8000,
            }
          );
        } else {
          setErrorMessage(
            "Could not get your location. Please check your GPS signal or ensure location services are enabled on your device."
          );
          toast.error("Could not retrieve GPS signal. Please check your device location settings.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [syncLocationToBackend]);

  useEffect(() => {
    if (!user?.uid) return;

    let isMounted = true;

    // Check if user has already granted location sharing in this browser (matches Capstone: isSharingLocation)
    const isSharing =
      typeof window !== "undefined" &&
      localStorage.getItem("isSharingLocation") === "true";

    // 1. Check native browser permission state
    getLocationPermissionState().then((state) => {
      if (!isMounted) return;
      setPermissionState(state);
      if (state === "granted" && isSharing) {
        setIsBlocked(false);
        setHasLocation(true);
        requestLocation();
      } else {
        // Show modal so user clicks "Enable Permissions" to trigger native browser prompt
        setIsBlocked(true);
      }
    });

    // 2. Hydrate cached location if available
    if (typeof window !== "undefined") {
      try {
        const cached = JSON.parse(sessionStorage.getItem("user_last_location") || "{}");
        if (cached?.latitude && cached?.longitude) {
          setCurrentAddress(cached.address || "");
          currentAddressRef.current = cached.address || "";
        }
      } catch {}
    }

    // 4. Real-time permission listener
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
              // User enabled high-accuracy GPS on device: upgrade to live GPS!
              setErrorMessage("");
              requestLocation();
            }
          };
        })
        .catch(() => {});
    }

    // 5. Window focus listener: detect when user returns after changing browser address bar settings
    const handleWindowFocus = async () => {
      if (!isMounted || requestingRef.current) return;
      const state = await getLocationPermissionState();
      setPermissionState(state);
      if (state === "granted") {
        requestLocation();
      }
    };
    window.addEventListener("focus", handleWindowFocus);

    // 6. Real-time Geolocation watcher: continuous device GPS stream to Firebase
    if (typeof window !== "undefined" && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          if (!isMounted) return;
          setHasLocation(true);
          setIsBlocked(false);

          const { latitude, longitude, accuracy, speed, heading } = position.coords;
          const now = Date.now();
          const lastCoords = lastCoordsRef.current;
          let movedSignificantly = false;

          if (lastCoords) {
            const dLat = Math.abs(latitude - lastCoords.lat);
            const dLng = Math.abs(longitude - lastCoords.lng);
            // Detect movement > ~3 meters (high sensitivity for walking / vehicle)
            if (dLat > 0.00003 || dLng > 0.00003) {
              movedSignificantly = true;
            }
          }

          // Real-time broadcast: sync immediately if moved or every 3 seconds (smooth live movement)
          if (!lastCoords || movedSignificantly || now - lastSyncTimeRef.current > 3000) {
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

            const liveLoc: FullLocationData = {
              latitude,
              longitude,
              accuracy,
              speed: typeof speed === "number" ? speed : null,
              heading: typeof heading === "number" ? heading : null,
              address,
              city,
              state,
              country,
            };

            if (typeof window !== "undefined") {
              sessionStorage.setItem("user_last_location", JSON.stringify(liveLoc));
              localStorage.setItem("isSharingLocation", "true");
            }

            syncLocationToBackend(liveLoc);
          }
        },
        async (error) => {
          if (!isMounted) return;
          console.warn(`Watch position notice: ${error.message}`);
          if (error.code === 1) {
            setErrorMessage(
              "Location access was denied by your browser. You MUST allow location access in your browser's site settings to use this application."
            );
            localStorage.setItem("isSharingLocation", "false");
            setPermissionState("denied");
            setIsBlocked(true);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
      );
    }

    // 7. Active Heartbeat (Every 5 seconds): Keep online status refreshed in Firebase & backend
    const activeHeartbeat = setInterval(async () => {
      if (!isMounted || requestingRef.current) return;
      if (hasLocationRef.current && !isBlockedRef.current) {
        const cached = typeof window !== "undefined" ? sessionStorage.getItem("user_last_location") : null;
        if (cached) {
          try {
            const loc = JSON.parse(cached);
            syncLocationToBackend(loc);
          } catch {}
        }
      }
    }, 10000);

    // 8. Periodic background sync: Keep online status active every 20 seconds
    const periodicSync = setInterval(() => {
      if (!isMounted) return;
      if (!isBlockedRef.current && hasLocationRef.current) {
        requestLocation();
      }
    }, 20000);

    // 7. Unload handler (mark user offline when leaving the page)
    const handleBeforeUnload = () => {
      if (user?.uid) {
        setFirebaseUserOffline(user.uid);
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

  // Handle user signing out cleanly
  const handleSignOut = async () => {
    setIsBlocked(false);
    setErrorMessage("");
    if (typeof window !== "undefined") {
      localStorage.removeItem("isSharingLocation");
      sessionStorage.removeItem("user_last_location");
    }
    await logout();
    router.replace("/auth/login");
  };

  // If user is not logged in, NEVER show the location permissions modal
  if (!user) {
    return null;
  }

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

      {/* 2. Fullscreen Permissions Required Screen matching reference design */}
      <LocationPromptModal
        isOpen={isBlocked && Boolean(user)}
        requesting={requesting}
        errorMessage={errorMessage}
        isRetrying={Boolean(errorMessage || permissionState === "denied")}
        onEnable={requestLocation}
        onSignOut={handleSignOut}
      />
    </>
  );
}
