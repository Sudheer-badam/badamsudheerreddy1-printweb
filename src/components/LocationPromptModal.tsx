"use client";

import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Lock } from "lucide-react";

interface LocationPromptModalProps {
  isOpen: boolean;
  requesting: boolean;
  errorMessage?: string;
  permissionState: "granted" | "denied" | "prompt" | "unsupported";
  onEnable: () => void;
  onSignOut: () => void;
}

export default function LocationPromptModal({
  isOpen,
  requesting,
  errorMessage,
  permissionState,
  onEnable,
  onSignOut,
}: LocationPromptModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "#274C68" }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-[440px] rounded-3xl p-8 sm:p-10 text-center flex flex-col items-center justify-center shadow-2xl"
          style={{
            backgroundColor: "rgba(23, 44, 62, 0.92)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.45)",
          }}
        >
          {/* Header */}
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
            Permissions Required
          </h2>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-gray-200/90 mb-8 font-normal">
            Location sharing is currently turned OFF.
          </p>

          {/* Error Message if present */}
          {errorMessage && (
            <div className="w-full mb-5 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-xs text-left">
              {errorMessage}
            </div>
          )}

          {/* Primary Action Button: Enable Permissions (Green) */}
          <button
            type="button"
            onClick={onEnable}
            disabled={requesting}
            className="w-full max-w-[280px] py-3.5 px-6 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] active:scale-[0.99] text-white font-bold text-base shadow-lg shadow-green-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {requesting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Enabling...</span>
              </>
            ) : (
              <span>Enable Permissions</span>
            )}
          </button>

          {/* Secondary Action Button: Sign Out */}
          <button
            type="button"
            onClick={onSignOut}
            className="mt-4 px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.99] border border-white/20 text-white/90 text-sm font-semibold transition-all cursor-pointer"
          >
            Sign Out
          </button>

          {/* Address Bar Tip if blocked */}
          {permissionState === "denied" && (
            <div className="mt-6 p-3 rounded-xl bg-blue-500/10 border border-blue-400/20 text-[11px] text-gray-300 text-left space-y-1">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                To enable in browser:
              </div>
              <p>1. Click the lock/tune icon on the left of your address bar.</p>
              <p>2. Set <strong>Location</strong> to <strong>Allow</strong>.</p>
              <p>3. Click <strong>Enable Permissions</strong> above.</p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
