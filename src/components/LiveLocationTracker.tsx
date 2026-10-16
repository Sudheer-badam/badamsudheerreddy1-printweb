"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { reverseGeocode, getDeviceOS } from "@/lib/location";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

export { getDeviceOS };

export default function LiveLocationTracker() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [isSharingLocation, setIsSharingLocation] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("isSharingLocation") === "true";
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState<boolean>(false);
  const [exactAccuracy, setExactAccuracy] = useState<number | null>(null);

  const [displayAddress, setDisplayAddress] = useState<string>("");

  const watchIdRef = useRef<number | null>(null);
  const lastGeocodeTimeRef = useRef<number>(0);
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const currentAddressRef = useRef<string>("");
  const lastDbSyncRef = useRef<number>(0);
  const savedDbLocationRef = useRef<{
    latitude: number;
    longitude: number;
    accuracy: number;
    address?: string;
    city?: string;
  } | null>(null);

  // On login, load any existing accurate location from DB so laptop doesn't overwrite with ISP IP
  useEffect(() => {
    if (!user) return;
    let active = true;
    fetch(`/api/user/location?uid=${user.uid}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data?.user?.latitude && data?.user?.longitude) {
          savedDbLocationRef.current = {
            latitude: Number(data.user.latitude),
            longitude: Number(data.user.longitude),
            accuracy: data.user.locationAccuracy || 100,
            address: data.user.locationAddress || "",
            city: data.user.locationCity || "",
          };

          if (!lastCoordsRef.current) {
            lastCoordsRef.current = {
              lat: Number(data.user.latitude),
              lng: Number(data.user.longitude),
            };
            currentAddressRef.current = data.user.locationAddress || "";
            setDisplayAddress(data.user.locationCity || data.user.locationAddress || "");
            setExactAccuracy(data.user.locationAccuracy || 100);
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user]);

  // Sync exact location update to Firebase and PostgreSQL backend
  const syncLocationUpdate = useCallback(async (position: GeolocationPosition) => {
    if (!user) return;

    let latitude = position.coords.latitude;
    let longitude = position.coords.longitude;
    let accuracy = position.coords.accuracy;
    const speed = position.coords.speed;
    const heading = position.coords.heading;

    const isLaptopOrPc = ["Windows", "Mac", "Linux"].includes(getDeviceOS());

    if (
      isLaptopOrPc &&
      accuracy > 350 &&
      savedDbLocationRef.current &&
      savedDbLocationRef.current.accuracy <= 250
    ) {
      // Laptop returned coarse IP geolocation (accuracy > 350m),
      // but user already has an accurate phone/verified location (accuracy <= 250m).
      // Keep their accurate coordinates!
      latitude = savedDbLocationRef.current.latitude;
      longitude = savedDbLocationRef.current.longitude;
      accuracy = savedDbLocationRef.current.accuracy;
    }

    setExactAccuracy(accuracy);

    const now = Date.now();
    const prev = lastCoordsRef.current;
    const userSpeed = typeof speed === "number" && speed !== null ? speed : null;
    const movedSignificantly =
      !prev ||
      Math.abs(latitude - prev.lat) > 0.00008 ||
      Math.abs(longitude - prev.lng) > 0.00008;

    const isMoving = Boolean(
      (userSpeed && userSpeed > 0.3) ||
      (prev && (Math.abs(latitude - prev.lat) > 0.00002 || Math.abs(longitude - prev.lng) > 0.00002))
    );

    // Keep latest coordinates fresh on every 1-second tick
    lastCoordsRef.current = { lat: latitude, lng: longitude };

    let address = currentAddressRef.current || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    let city = "";
    let state = "";
    let country = "India";

    // Reverse geocode to exact real-world street address (throttled to avoid rate limits)
    if (movedSignificantly || now - lastGeocodeTimeRef.current > 15000) {
      lastGeocodeTimeRef.current = now;
      try {
        const geo = await reverseGeocode(latitude, longitude);
        if (geo.formattedAddress) {
          address = geo.formattedAddress;
          currentAddressRef.current = address;
          city = geo.city || "";
          state = geo.state || "";
          country = geo.country || "India";
        }
      } catch (err) {
        console.warn("Reverse geocode warning:", err);
      }
    }

    // Cache locally for immediate fast access
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
          speed: userSpeed,
          heading,
          isMoving,
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
      speed: userSpeed,
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
      is_moving: isMoving,
      isMoving: isMoving,
    };

    // 1. Write to Firebase Firestore collection live_user_locations on every 1-second update
    try {
      if (db) {
        await setDoc(doc(db, "live_user_locations", user.uid), payload, { merge: true });
      }
    } catch (err) {
      console.error("Failed to update live location to Firebase:", err);
    }

    // 2. Also keep PostgreSQL backend in sync (every 2 seconds or on significant movement)
    if (now - lastDbSyncRef.current >= 2000 || movedSignificantly) {
      lastDbSyncRef.current = now;
      try {
        fetch("/api/user/location", {
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
        }).catch(() => {});
      } catch {}
    }
  }, [user]);

  // Request browser geolocation directly with user gesture (pops up top-left Chrome prompt)
  const handleEnablePermissions = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your browser.");
      return;
    }

    setIsRequesting(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setIsRequesting(false);
        setIsSharingLocation(true);
        if (typeof window !== "undefined") {
          localStorage.setItem("isSharingLocation", "true");
        }
        setErrorMessage(null);
        await syncLocationUpdate(position);
      },
      (error) => {
        setIsRequesting(false);
        console.warn("Location permission error:", error);
        if (error.code === 1) {
          // PERMISSION_DENIED
          setErrorMessage(
            "Location access was denied or blocked. Please click the lock 🔒 or site settings icon in your address bar above, set Location to 'Allow', and click Retry."
          );
          if (typeof window !== "undefined") {
            localStorage.setItem("isSharingLocation", "false");
          }
          setIsSharingLocation(false);
        } else if (error.code === 2) {
          setErrorMessage(
            "Location information is unavailable. Please ensure Windows Location Services or your device GPS is turned ON."
          );
        } else {
          setErrorMessage(
            "Location request timed out. Please click Retry to trigger the prompt again."
          );
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      }
    );
  }, [syncLocationUpdate]);

  // Check browser permission status and start watching when permission is granted
  useEffect(() => {
    if (!user) return;

    // Check if permission is already granted in the browser
    if (typeof window !== "undefined" && navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" as any }).then((result) => {
        if (result.state === "granted") {
          setIsSharingLocation(true);
          setErrorMessage(null);
          if (typeof window !== "undefined") {
            localStorage.setItem("isSharingLocation", "true");
          }
        } else if (result.state === "denied") {
          setIsSharingLocation(false);
          setErrorMessage(
            "Location access was denied or blocked. Please click the lock 🔒 or site settings icon in your address bar above, set Location to 'Allow', and click Retry."
          );
        } else if (result.state === "prompt" && !isSharingLocation) {
          // Automatically trigger prompt on mount
          handleEnablePermissions();
        }

        result.onchange = () => {
          if (result.state === "granted") {
            setIsSharingLocation(true);
            setErrorMessage(null);
            handleEnablePermissions();
          } else if (result.state === "denied") {
            setIsSharingLocation(false);
          }
        };
      }).catch(() => {
        if (!isSharingLocation) {
          handleEnablePermissions();
        }
      });
    } else if (!isSharingLocation) {
      handleEnablePermissions();
    }
  }, [user, isSharingLocation, handleEnablePermissions]);

  // Continuous Live Geolocation Watcher & Active 1-Second Interval when sharing is active
  useEffect(() => {
    let tickInterval: NodeJS.Timeout | undefined;

    if (isSharingLocation && user) {
      if (typeof window !== "undefined" && navigator.geolocation) {
        // Immediate single-shot request with fresh hardware fix
        navigator.geolocation.getCurrentPosition(
          (pos) => syncLocationUpdate(pos),
          () => {},
          { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );

        // Continuous watcher for event-driven position shifts
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            setErrorMessage(null);
            syncLocationUpdate(position);
          },
          (error) => {
            console.warn("Live location stream warning:", error);
            if (error.code === 1) {
              setErrorMessage(
                "Location access was denied by your browser. Please allow location access in your browser's site settings to use this application."
              );
              if (typeof window !== "undefined") {
                localStorage.setItem("isSharingLocation", "false");
              }
              setIsSharingLocation(false);
            }
          },
          { enableHighAccuracy: true, maximumAge: 0 }
        );

        watchIdRef.current = watchId;

      }
    } else if (!isSharingLocation && user) {
      if (db) {
        setDoc(
          doc(db, "live_user_locations", user.uid),
          {
            is_sharing: false,
            last_updated: new Date().toISOString(),
          },
          { merge: true }
        ).catch(console.error);
      }
    }

    return () => {
      if (watchIdRef.current !== null && typeof window !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isSharingLocation, user, syncLocationUpdate]);

  // Active Heartbeat every 1 second for instant online presence
  useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout | undefined;

    if (user && isSharingLocation) {
      const syncHeartbeat = () => {
        if (!db) return;
        const cachedLoc = lastCoordsRef.current;
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
            is_sharing: true,
            ...(cachedLoc ? { latitude: cachedLoc.lat, longitude: cachedLoc.lng } : {}),
            ...(currentAddressRef.current ? { address: currentAddressRef.current } : {}),
          },
          { merge: true }
        ).catch(console.error);
      };

      syncHeartbeat();
      heartbeatInterval = setInterval(syncHeartbeat, 1000);
    }

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [user, isSharingLocation]);

  // Handle Clean Sign Out
  const handleSignOut = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("isSharingLocation");
      sessionStorage.removeItem("user_last_location");
    }
    if (user && db) {
      try {
        await setDoc(
          doc(db, "live_user_locations", user.uid),
          {
            is_sharing: false,
            is_online: false,
            last_updated: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch {}
    }
    await logout();
    router.replace("/auth/login");
  };

  // If user is not logged in, NEVER display the location permission modal
  if (!user) {
    return null;
  }

  // If user has not shared location or there is an active error, show the exact Capstone Project 220 modal
  if (!isSharingLocation || errorMessage) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          width: "100vw",
          textAlign: "center",
          background: "#2f5d7d",
          color: "white",
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 99999,
        }}
      >
        <div
          style={{
            background: "rgba(0, 0, 0, 0.2)",
            padding: "50px",
            borderRadius: "15px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
            maxWidth: "600px",
            width: "90%",
            margin: "0 auto",
          }}
        >
          <h2 style={{ fontSize: "32px", marginBottom: "20px", fontWeight: "bold" }}>
            Permissions Required
          </h2>
          <p style={{ fontSize: "18px", marginBottom: "30px", lineHeight: "1.6" }}>
            {errorMessage || "Location sharing is currently turned OFF."}
          </p>

          {isSharingLocation ? (
            <button
              onClick={handleEnablePermissions}
              disabled={isRequesting}
              style={{
                padding: "15px 40px",
                background: "#ffc107",
                color: "#000",
                fontSize: "20px",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "bold",
                boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
                transition: "opacity 0.2s",
                opacity: isRequesting ? 0.7 : 1,
              }}
            >
              {isRequesting ? "Requesting Access..." : "Retry / I Have Granted Permissions"}
            </button>
          ) : (
            <button
              onClick={handleEnablePermissions}
              disabled={isRequesting}
              style={{
                padding: "15px 40px",
                background: "#28a745",
                color: "white",
                fontSize: "20px",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "bold",
                boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
                transition: "opacity 0.2s",
                opacity: isRequesting ? 0.7 : 1,
              }}
            >
              {isRequesting ? "Prompting Browser..." : "Enable Permissions"}
            </button>
          )}

          <div style={{ marginTop: "30px" }}>
            <button
              onClick={handleSignOut}
              style={{
                padding: "10px 25px",
                background: "rgba(255, 255, 255, 0.15)",
                color: "white",
                fontSize: "16px",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "background 0.3s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)")}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user is on an admin page, track in background without blocking the UI
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-30 flex items-center gap-2 p-1.5 pl-3 pr-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-gray-200/90 shadow-lg text-xs font-semibold text-gray-800">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>

      <div className="flex items-center gap-1.5 max-w-[200px] sm:max-w-[260px] truncate">
        <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
        <span className="truncate text-gray-700">
          {displayAddress || currentAddressRef.current || "Live Location Active"}
        </span>
        {exactAccuracy ? (
          <span className="text-[10px] text-emerald-600 font-mono bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50 flex-shrink-0">
            ±{Math.round(exactAccuracy)}m
          </span>
        ) : null}
      </div>
    </div>
  );
}
