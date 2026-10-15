"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ShieldAlert, CheckCircle2, Lock, RefreshCw, Globe, Monitor, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getCurrentBrowserLocation,
  reverseGeocode,
  getLocationPermissionState,
  getIpLocationFallback,
  FullLocationData,
} from "@/lib/location";
import { toast } from "sonner";

interface LocationPromptModalProps {
  onLocationVerified?: (loc: FullLocationData) => void;
}

export default function LocationPromptModal({ onLocationVerified }: LocationPromptModalProps) {
  const { user, userRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [permissionState, setPermissionState] = useState<"granted" | "denied" | "prompt" | "unsupported">("prompt");

  const permissionStatusRef = useRef<PermissionStatus | null>(null);

  // Sync granted location to database and mark verified
  const syncAndClose = useCallback(
    async (loc: FullLocationData) => {
      if (!user?.uid) return;
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

        toast.success("Location access enabled!");
        setIsOpen(false);
        setErrorMessage("");
        onLocationVerified?.(loc);
      } catch (err) {
        console.warn("Failed to sync location:", err);
        setIsOpen(false);
      }
    },
    [user?.uid, onLocationVerified]
  );

  // Primary action: Request location with high-accuracy, falling back to low-accuracy and IP
  const handleAllowLocation = useCallback(async () => {
    setLoading(true);
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
      } catch (gpsErr) {
        console.warn("Hardware GPS request failed, falling back to network IP location:", gpsErr);
        fullLoc = await getIpLocationFallback();
      }

      await syncAndClose(fullLoc);
    } catch (err: any) {
      console.warn("Location prompt error:", err);
      const permState = await getLocationPermissionState();
      setPermissionState(permState);
      if (permState === "denied") {
        setErrorMessage("Location access is blocked. Please allow location in your browser or use Network Location below.");
      } else {
        setErrorMessage(err.message || "Failed to retrieve location.");
      }
    } finally {
      setLoading(false);
    }
  }, [syncAndClose]);

  // Secondary action: Instant 1-click network location fallback
  const handleUseNetworkLocation = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const loc = await getIpLocationFallback();
      await syncAndClose(loc);
    } catch (err) {
      toast.error("Failed to retrieve network location.");
    } finally {
      setLoading(false);
    }
  }, [syncAndClose]);

  useEffect(() => {
    if (!user?.uid) return;

    // Only prompt CUSTOMER role
    const isCustomer = userRole === "CUSTOMER" || !userRole;
    if (!isCustomer) return;

    let isMounted = true;

    // Check if location is already verified in this session
    const isVerified =
      typeof window !== "undefined" &&
      (localStorage.getItem("print_user_location_verified") === "true" ||
        Boolean(sessionStorage.getItem("user_last_location")));

    getLocationPermissionState().then((state) => {
      if (!isMounted) return;
      setPermissionState(state);

      if (state === "granted") {
        // Permission is already granted in browser! Silently sync without modal
        handleAllowLocation();
      } else if (!isVerified) {
        // Unverified customer: pop up modal to request location
        setIsOpen(true);
      }
    });

    // Listen to browser permission state changes
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
              handleAllowLocation();
            } else if (newState === "denied") {
              // User actively revoked permission in browser settings: popup modal!
              if (typeof window !== "undefined") {
                localStorage.removeItem("print_user_location_verified");
                sessionStorage.removeItem("user_last_location");
              }
              setIsOpen(true);
              setErrorMessage("Location access was revoked. Please enable location to continue.");
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
  }, [user?.uid, userRole, handleAllowLocation]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-[480px] bg-white/95 backdrop-blur-xl rounded-[32px] p-6 sm:p-8 shadow-[0_25px_60px_rgba(11,29,58,0.25)] border border-white/60 text-center relative"
          >
            {/* Animated Pin Icon */}
            <div className="relative w-20 h-20 mx-auto mb-5 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
              <span className="absolute inset-1.5 rounded-full bg-indigo-500/20 animate-pulse" />
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4318FF] to-[#2D63FF] text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                <MapPin className="w-8 h-8 animate-bounce" />
              </div>
            </div>

            {/* Title & Description */}
            <h3 className="text-2xl font-black text-[#0B1D3A] tracking-tight mb-2">
              Enable Live Location
            </h3>
            <p className="text-gray-500 text-xs sm:text-sm leading-relaxed mb-5">
              To use <strong>PRINT DOCKER</strong>, live location sharing is required for Xerox dispatch verification, order routing, and real-time delivery tracking.
            </p>

            {/* Error / Notice box */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-left flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Browser / Windows instructions if denied */}
            {permissionState === "denied" && (
              <div className="bg-gray-50/90 border border-gray-200 rounded-xl p-3 text-left text-xs text-gray-700 space-y-2 mb-4">
                <div className="font-bold text-[#0B1D3A] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  How to allow in browser:
                </div>
                <p className="text-gray-600 text-[11px]">
                  Click the <strong>Lock / Settings icon</strong> left of the URL bar and toggle <strong>Location</strong> to <strong>Allow</strong>.
                </p>
                <div className="pt-1.5 border-t border-gray-200 text-[11px] text-gray-500 flex items-center gap-1">
                  <Monitor className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                  <span>On Windows, check Settings &gt; Privacy &gt; Location &gt; Turn ON.</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleAllowLocation}
                disabled={loading}
                className="w-full py-3.5 px-5 bg-gradient-to-r from-[#4318FF] to-[#2D63FF] hover:from-[#3311DB] hover:to-[#1C3CB3] text-white rounded-xl font-bold text-sm shadow-[0_8px_20px_rgba(67,24,255,0.3)] hover:shadow-[0_12px_25px_rgba(67,24,255,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Location...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Allow Live Location</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleUseNetworkLocation}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-sm"
              >
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                <span>Continue with Network Location</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
