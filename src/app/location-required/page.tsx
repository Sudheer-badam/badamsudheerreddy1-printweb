"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ShieldAlert, CheckCircle2, Lock, RefreshCw, LogOut, ArrowRight, Compass } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getCurrentBrowserLocation, reverseGeocode, getLocationPermissionState, FullLocationData } from "@/lib/location";
import { toast } from "sonner";

export default function LocationRequiredPage() {
  const { user, userRole, loading, logout } = useAuth();
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [permissionState, setPermissionState] = useState<"granted" | "denied" | "prompt" | "unsupported">("prompt");
  const [errorMessage, setErrorMessage] = useState("");
  const [successRedirecting, setSuccessRedirecting] = useState(false);

  const permissionStatusRef = useRef<PermissionStatus | null>(null);

  // Sync granted location to database and enter dashboard
  const syncAndEnterProject = useCallback(async (loc: FullLocationData) => {
    if (!user?.uid) return;
    setSuccessRedirecting(true);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("user_last_location", JSON.stringify(loc));
      }
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
      toast.success("Location verified! Entering PRINT DOCKER...");
      setTimeout(() => {
        router.replace("/dashboard");
      }, 600);
    } catch (err) {
      console.error("Failed to sync location on entry:", err);
      // Still navigate if location was retrieved
      router.replace("/dashboard");
    }
  }, [user?.uid, router]);

  // Request browser location
  const handleAllowLocation = useCallback(async () => {
    setRequesting(true);
    setErrorMessage("");
    try {
      const coords = await getCurrentBrowserLocation({ enableHighAccuracy: true, timeout: 12000 });
      const addr = await reverseGeocode(coords.latitude, coords.longitude);
      const fullLoc: FullLocationData = {
        ...coords,
        address: addr.formattedAddress,
        city: addr.city,
        state: addr.state,
        country: addr.country,
      };
      setPermissionState("granted");
      await syncAndEnterProject(fullLoc);
    } catch (err: any) {
      console.warn("Location permission not granted:", err);
      if (err.code === "PERMISSION_DENIED" || err.message?.includes("denied")) {
        setPermissionState("denied");
        setErrorMessage("Location access is currently blocked in your browser settings. Please toggle it to 'Allow' above.");
      } else if (err.code === "POSITION_UNAVAILABLE") {
        setErrorMessage("Location/GPS hardware is turned off on your device. Please turn on device location and try again.");
      } else {
        setErrorMessage(err.message || "Failed to retrieve location.");
      }
    } finally {
      setRequesting(false);
      setChecking(false);
    }
  }, [syncAndEnterProject]);

  // On mount: check auth & permission
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    if (userRole === "ADMIN") {
      router.replace("/admin");
      return;
    }

    let isMounted = true;

    // Check permission state immediately
    getLocationPermissionState().then(async (state) => {
      if (!isMounted) return;
      setPermissionState(state);
      setChecking(false);

      if (state === "granted") {
        // Location already enabled! Automatically proceed to dashboard
        try {
          const coords = await getCurrentBrowserLocation({ timeout: 8000 });
          const addr = await reverseGeocode(coords.latitude, coords.longitude);
          if (isMounted) {
            await syncAndEnterProject({
              ...coords,
              address: addr.formattedAddress,
              city: addr.city,
              state: addr.state,
              country: addr.country,
            });
          }
        } catch {
          // If fetch fails, prompt user
        }
      } else if (state === "prompt") {
        // Auto trigger request on entry
        handleAllowLocation();
      }
    });

    // Listen to live permission changes (e.g. user toggles in browser address bar)
    if (typeof window !== "undefined" && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" as any })
        .then((status) => {
          if (!isMounted) return;
          permissionStatusRef.current = status;
          status.onchange = async () => {
            if (!isMounted) return;
            const newState = status.state as any;
            setPermissionState(newState);
            if (newState === "granted") {
              // User enabled location in browser settings! Automatically enter project!
              toast.info("Location permission detected! Verifying...");
              handleAllowLocation();
            } else if (newState === "denied") {
              setErrorMessage("Location access was blocked. Please allow location to proceed.");
            }
          };
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
      if (permissionStatusRef.current) {
        permissionStatusRef.current.onchange = null;
      }
    };
  }, [user, userRole, loading, router, handleAllowLocation, syncAndEnterProject]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7FE]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F4F7FE] relative overflow-hidden font-sans p-4">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[50%] rounded-full bg-gradient-to-br from-[#4318FF] to-[#868CFF] blur-[120px] opacity-30 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[45%] rounded-full bg-gradient-to-br from-[#00E5FF] to-[#0075FF] blur-[130px] opacity-25 pointer-events-none" />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[540px] bg-white/85 backdrop-blur-xl rounded-[36px] shadow-[0_25px_60px_rgba(11,29,58,0.08)] border border-white/60 p-8 sm:p-10 relative z-10 text-center"
      >
        {/* Top Header Logo */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0"
              style={{ border: "2.5px solid #2D63FF", boxShadow: "0 4px 14px rgba(45,99,255,0.25)" }}
            >
              <Image src="/logo.png" alt="PRINT DOCKER" width={56} height={56} className="w-full h-full object-cover" />
            </div>
            <div className="text-left">
              <span className="font-extrabold text-xl tracking-tight block text-[#0B1D3A]">PRINT DOCKER</span>
              <span className="text-xs text-gray-500 font-medium">Badam Sudheer Reddy Printing Shop</span>
            </div>
          </div>
        </div>

        {/* Animated Radar Icon */}
        <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
          <span className="absolute inset-2 rounded-full bg-indigo-500/30 animate-pulse" />
          <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-[#4318FF] to-[#2D63FF] text-white flex items-center justify-center shadow-xl shadow-blue-500/30">
            <MapPin className="w-10 h-10 animate-bounce" />
          </div>
        </div>

        {/* Title & Description */}
        <h1 className="text-3xl font-black text-[#1B254B] mb-3 tracking-tight">
          Location Access Required
        </h1>

        <p className="text-gray-600 text-sm leading-relaxed mb-6">
          To enter and use the <strong>PRINT DOCKER</strong> platform, you must allow live location sharing. This live location is required for admin dispatch verification, print delivery routing, and account security.
        </p>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-left flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block mb-0.5">Permission Needed</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Step-by-Step Instructions if blocked */}
        {permissionState === "denied" && (
          <div className="bg-gray-50/90 border border-gray-200 rounded-2xl p-4 text-left text-xs text-gray-700 space-y-2 mb-6">
            <div className="font-bold text-[#1B254B] flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-blue-600" />
              How to enable location in your browser:
            </div>
            <ol className="list-decimal pl-4 space-y-1.5 text-gray-600">
              <li>
                Click the <strong>Lock / Settings icon</strong> located on the left of your browser address bar (where the URL is).
              </li>
              <li>
                Find <strong>Location</strong> and switch it from <em>Block</em> to <strong>Allow</strong>.
              </li>
              <li>
                Click the blue button below to verify and enter the project.
              </li>
            </ol>
          </div>
        )}

        {/* Action Button */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleAllowLocation}
            disabled={requesting || successRedirecting}
            className="w-full py-4 px-6 bg-gradient-to-r from-[#4318FF] to-[#2D63FF] hover:from-[#3311DB] hover:to-[#1C3CB3] text-white rounded-2xl font-bold text-base shadow-[0_10px_25px_rgba(67,24,255,0.3)] hover:shadow-[0_15px_30px_rgba(67,24,255,0.4)] transition-all flex items-center justify-center gap-2.5 disabled:opacity-70"
          >
            {requesting || successRedirecting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>{successRedirecting ? "Entering PRINT DOCKER..." : "Verifying Location Access..."}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Allow Location &amp; Enter Project</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={logout}
            className="w-full py-3 px-4 text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out / Switch account</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
