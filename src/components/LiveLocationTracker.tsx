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
import { syncLocationToFirebase, setFirebaseUserOffline } from "@/lib/firebaseLocation";
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
        localStorage.removeItem("print_user_location_verified");
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
  const requestLocation = useCallback(async () => {
    if (requestingRef.current) return;
    setRequesting(true);
    setErrorMessage("");
    try {
      let fullData: FullLocationData;
      try {
        const coords = await getCurrentBrowserLocation({ enableHighAccuracy: true, timeout: 25000 });
        const addr = await reverseGeocode(coords.latitude, coords.longitude);
        fullData = {
          ...coords,
          address: addr.formattedAddress,
          city: addr.city,
          state: addr.state,
          country: addr.country,
        };
      } catch (gpsErr: any) {
        console.warn("Browser GPS unavailable or blocked:", gpsErr);
        if (gpsErr?.code === "PERMISSION_DENIED") {
          throw gpsErr;
        }
        // Seamlessly resolve Gmail account location on timeout/error
        fullData = await getNetworkFallbackLocation(user?.email);
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("print_user_location_verified", "true");
        sessionStorage.setItem("user_last_location", JSON.stringify(fullData));
      }

      setHasLocation(true);
      setIsBlocked(false);
      setPermissionState("granted");
      setErrorMessage("");
      setCurrentAddress(fullData.address || "");
      currentAddressRef.current = fullData.address || "";
      await syncLocationToBackend(fullData);
    } catch (err: any) {
      console.warn("Location request failed:", err);
      if (err?.code === "PERMISSION_DENIED") {
        setPermissionState("denied");
        setIsBlocked(true);
        setErrorMessage("Location permission was denied. Please allow location access in your browser settings to share your live location with Admin.");
      } else {
        const fallback = await getNetworkFallbackLocation(user?.email);
        setHasLocation(true);
        setIsBlocked(false);
        setErrorMessage("");
        setCurrentAddress(fallback.address || "");
        await syncLocationToBackend(fallback);
      }
    } finally {
      setRequesting(false);
    }
  }, [user?.email, syncLocationToBackend]);

  // Handle user clicking "Don't Allow"
  const handleDontAllow = async () => {
    // If user clicks Don't Allow, fall back to Gmail account location and unblock
    const fullData = await getNetworkFallbackLocation(user?.email);
    if (typeof window !== "undefined") {
      localStorage.setItem("print_user_location_verified", "true");
      sessionStorage.setItem("user_last_location", JSON.stringify(fullData));
    }
    setHasLocation(true);
    setIsBlocked(false);
    setErrorMessage("");
    setCurrentAddress(fullData.address || "");
    await syncLocationToBackend(fullData);
  };

  useEffect(() => {
    if (!user?.uid) return;

    let isMounted = true;

    // Check if user has already granted/verified location in this browser
    const isAlreadyVerified =
      typeof window !== "undefined" &&
      (localStorage.getItem("print_user_location_verified") === "true" ||
        sessionStorage.getItem("user_last_location") !== null);

    if (isAlreadyVerified) {
      setHasLocation(true);
      setIsBlocked(false);
      try {
        const cached = JSON.parse(sessionStorage.getItem("user_last_location") || "{}");
        if (cached?.address) {
          setCurrentAddress(cached.address);
          currentAddressRef.current = cached.address;
        }
      } catch {}
    }

    // 1. Hydrate from DB for this user's Gmail account immediately
    fetch(`/api/user/location?uid=${user.uid}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.user?.latitude && data.user?.longitude && data.user?.locationAddress) {
          const loc: FullLocationData = {
            latitude: data.user.latitude,
            longitude: data.user.longitude,
            accuracy: data.user.locationAccuracy || 50,
            address: data.user.locationAddress,
            city: data.user.locationCity || "",
            state: data.user.locationState || "",
            country: data.user.locationCountry || "India",
          };
          setHasLocation(true);
          setCurrentAddress(loc.address || "");
          currentAddressRef.current = loc.address || "";
          if (typeof window !== "undefined") {
            sessionStorage.setItem("user_last_location", JSON.stringify(loc));
            localStorage.setItem("print_user_location_verified", "true");
          }
          syncLocationToFirebase({
            uid: user.uid,
            email: user.email,
            name: user.displayName,
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy,
            address: loc.address,
            city: loc.city,
            state: loc.state,
            country: loc.country,
            isOnline: true,
          }).catch(() => {});
        }
      })
      .catch(() => {});

    // 2. Check native browser location permission state
    getLocationPermissionState().then((state) => {
      if (!isMounted) return;
      setPermissionState(state);
      if (state === "granted" || isAlreadyVerified) {
        // Already allowed or verified: never show modal again!
        setIsBlocked(false);
        requestLocation();
      } else {
        // Only show if user has never allowed location before
        setIsBlocked(true);
      }
    });

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

          const { latitude, longitude, accuracy } = position.coords;
          const now = Date.now();
          const lastCoords = lastCoordsRef.current;
          let movedSignificantly = false;

          if (lastCoords) {
            const dLat = Math.abs(latitude - lastCoords.lat);
            const dLng = Math.abs(longitude - lastCoords.lng);
            // Detect movement > ~10 meters
            if (dLat > 0.0001 || dLng > 0.0001) {
              movedSignificantly = true;
            }
          }

          // Real-time broadcast: sync immediately if moved or every 10 seconds
          if (!lastCoords || movedSignificantly || now - lastSyncTimeRef.current > 10000) {
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
              address,
              city,
              state,
              country,
            };

            if (typeof window !== "undefined") {
              sessionStorage.setItem("user_last_location", JSON.stringify(liveLoc));
              localStorage.setItem("print_user_location_verified", "true");
            }

            syncLocationToBackend(liveLoc);
          }
        },
        async (error) => {
          if (!isMounted) return;
          console.warn(`Watch position notice: ${error.message}`);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    }

    // 7. Active Heartbeat (Every 10 seconds): Keep online status refreshed in Firebase & backend
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
        isOpen={isBlocked}
        requesting={requesting}
        errorMessage={errorMessage}
        permissionState={permissionState}
        onEnable={requestLocation}
        onSignOut={logout}
      />
    </>
  );
}
