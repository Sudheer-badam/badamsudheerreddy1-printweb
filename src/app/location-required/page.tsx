"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin, ShieldAlert, CheckCircle2, Lock, RefreshCw, LogOut, ArrowRight, Globe, Monitor } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getCurrentBrowserLocation,
  reverseGeocode,
  getLocationPermissionState,
  getIpLocationFallback,
  FullLocationData,
} from "@/lib/location";
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
        localStorage.setItem("print_user_location_verified", "true");
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
      }, 500);
    } catch (err) {
      console.error("Failed to sync location on entry:", err);
      router.replace("/dashboard");
    }
  }, [user?.uid, router]);

  // Request browser location with automatic fallback
  const handleAllowLocation = useCallback(async () => {
    setRequesting(true);
    setErrorMessage("");
    try {
      let fullLoc: FullLocationData;
      try {
        const coords = await getCurrentBrowserLocation({ enableHighAccuracy: true, timeout: 8000 });
        const addr = await reverseGeocode(coords.latitude, coords.longitude);
        fullLoc = {
          ...coords,
          address: addr.formattedAddress,
          city: addr.city,
          state: addr.state,
          country: addr.country,
        };
      } catch (gpsErr: any) {
        console.warn("Browser GPS failed, falling back to network IP location:", gpsErr);
        // Fallback to IP-based location
        fullLoc = await getIpLocationFallback();
      }

      setPermissionState("granted");
      await syncAndEnterProject(fullLoc);
    } catch (err: any) {
      console.warn("Location permission not granted:", err);
      if (err.code === "PERMISSION_DENIED" || err.message?.includes("denied")) {
        setPermissionState("denied");
        setErrorMessage("Location access is blocked in your browser or Windows privacy settings. You can allow it or continue with network location below.");
      } else {
        setErrorMessage(err.message || "Failed to retrieve location.");
      }
    } finally {
      setRequesting(false);
      setChecking(false);
    }
  }, [syncAndEnterProject]);

  // Continue with Network/IP location immediately
  const handleContinueWithNetworkLocation = useCallback(async () => {
    setRequesting(true);
    setErrorMessage("");
    try {
      const loc = await getIpLocationFallback();
      setPermissionState("granted");
      toast.info("Using network location provider...");
      await syncAndEnterProject(loc);
    } catch (err: any) {
      toast.error("Failed to retrieve network location.");
    } finally {
      setRequesting(false);
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
        // Location already enabled in browser! Automatically proceed
        try {
          const coords = await getCurrentBrowserLocation({ timeout: 6000 });
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
          // If browser hardware GPS fails (e.g. Windows location blocked), use IP fallback automatically
          if (isMounted) {
            const ipLoc = await getIpLocationFallback();
            await syncAndEnterProject(ipLoc);
          }
        }
      } else if (state === "prompt") {
        // Trigger request on entry
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
              toast.info("Location permission detected! Verifying...");
              handleAllowLocation();
            } else if (newState === "denied") {
              setErrorMessage("Location access was blocked. Please allow location or use network location.");
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
          To enter and use the <strong>PRINT DOCKER</strong> platform, live location sharing is required for admin dispatch verification, print delivery routing, and account security.
        </p>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-left flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block mb-0.5">Permission Notice</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Step-by-Step Instructions if blocked */}
        {permissionState === "denied" && (
          <div className="bg-gray-50/90 border border-gray-200 rounded-2xl p-4 text-left text-xs text-gray-700 space-y-3 mb-6">
            <div className="font-bold text-[#1B254B] flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-blue-600" />
              If location was blocked in your browser:
            </div>
            <ol className="list-decimal pl-4 space-y-1 text-gray-600">
              <li>Click the <strong>Lock / Settings icon</strong> on the left of your browser address bar.</li>
              <li>Find <strong>Location</strong> and switch it from <em>Block</em> to <strong>Allow</strong>.</li>
            </ol>

            <div className="pt-2 border-t border-gray-200/80">
              <div className="font-bold text-[#1B254B] flex items-center gap-1.5 mb-1">
                <Monitor className="w-4 h-4 text-indigo-600" />
                Already allowed in browser? Check Windows Settings:
              </div>
              <p className="text-gray-600 leading-relaxed">
                Open <strong>Windows Settings &gt; Privacy &amp; security &gt; Location</strong> and ensure both <strong>Location services</strong> and <strong>Let desktop apps access your location</strong> are switched <strong>ON</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleAllowLocation}
            disabled={requesting || successRedirecting}
            className="w-full py-4 px-6 bg-gradient-to-r from-[#4318FF] to-[#2D63FF] hover:from-[#3311DB] hover:to-[#1C3CB3] text-white rounded-2xl font-bold text-base shadow-[0_10px_25px_rgba(67,24,255,0.3)] hover:shadow-[0_15px_30px_rgba(67,24,255,0.4)] transition-all flex items-center justify-center gap-2.5 disabled:opacity-70 cursor-pointer"
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

          {/* Backup option to enter via Network Location if hardware GPS is blocked */}
          <button
            type="button"
            onClick={handleContinueWithNetworkLocation}
            disabled={requesting || successRedirecting}
            className="w-full py-3 px-5 bg-white hover:bg-gray-50 text-[#0B1D3A] border border-gray-300 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
          >
            <Globe className="w-4 h-4 text-blue-600" />
            <span>Verify &amp; Continue with Network Location</span>
          </button>

          <button
            type="button"
            onClick={logout}
            className="w-full py-2.5 px-4 text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out / Switch account</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

