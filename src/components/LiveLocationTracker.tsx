"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const { user, logout } = useAuth();
  const router = useRouter();

  const [isSharingLocation, setIsSharingLocation] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("isSharingLocation") === "true";
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Continuous Live Geolocation Watcher (Exact Capstone Logic)
  useEffect(() => {
    let watchId: number | undefined;

    if (isSharingLocation && user) {
      if (typeof window !== "undefined" && navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            setErrorMessage(null); // Clear any previous error as soon as position is received
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
            console.error("Live location error:", error);
            if (error.code === 1) {
              setErrorMessage(
                "Location access was denied by your browser. You MUST allow location access in your browser's site settings to use this application."
              );
              if (typeof window !== "undefined") {
                localStorage.setItem("isSharingLocation", "false");
              }
              setIsSharingLocation(false);
            } else {
              setErrorMessage(
                "Could not get your location. Please check your GPS signal or ensure location services are enabled on your device."
              );
            }
          },
          { enableHighAccuracy: true }
        );
      } else {
        setErrorMessage("Geolocation is not supported by your browser.");
        setIsSharingLocation(false);
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
      setErrorMessage("Location sharing is currently turned OFF.");
    }

    return () => {
      if (watchId !== undefined && typeof window !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isSharingLocation, user]);

  // 2. Active Heartbeat (Every 3 seconds, matching Capstone exact specification)
  useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout | undefined;

    if (user && isSharingLocation) {
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

  // If user has not shared location or there is an active error, show the Capstone modal
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
          background: "var(--primary, #2f5d7d)",
          color: "white",
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 9999,
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
              onClick={() => {
                setErrorMessage(null);
                if (typeof window !== "undefined") {
                  localStorage.setItem("isSharingLocation", "true");
                }
                setIsSharingLocation(false);
                setTimeout(() => setIsSharingLocation(true), 100);
              }}
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
              }}
            >
              Retry / I Have Granted Permissions
            </button>
          ) : (
            <button
              onClick={() => {
                setIsSharingLocation(true);
                if (typeof window !== "undefined") {
                  localStorage.setItem("isSharingLocation", "true");
                }
                setErrorMessage(null);
              }}
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
              }}
            >
              Enable Permissions
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

  // When location is actively sharing with no error, render subtle live badge
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
