"use client";

import { motion, AnimatePresence } from "framer-motion";

interface LocationPromptModalProps {
  isOpen: boolean;
  requesting?: boolean;
  errorMessage?: string;
  isRetrying?: boolean;
  onEnable: () => void;
  onSignOut: () => void;
}

export default function LocationPromptModal({
  isOpen,
  requesting = false,
  errorMessage,
  isRetrying = false,
  onEnable,
  onSignOut,
}: LocationPromptModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 text-center"
        style={{
          background: "#2f5d7d",
          color: "white",
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-[600px] rounded-[15px] p-8 sm:p-12 text-center flex flex-col items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
          style={{
            background: "rgba(0, 0, 0, 0.2)",
          }}
        >
          {/* Header */}
          <h2
            className="font-bold tracking-normal mb-5 text-white"
            style={{ fontSize: "32px", lineHeight: 1.2 }}
          >
            Permissions Required
          </h2>

          {/* Subtitle / Status message */}
          <p
            className="text-white/95 mb-8 font-normal"
            style={{ fontSize: "18px", lineHeight: "1.6" }}
          >
            {errorMessage || "Location sharing is currently turned OFF."}
          </p>

          {/* Primary Action Button: Enable Permissions (Green) or Retry (Yellow) */}
          {isRetrying ? (
            <button
              type="button"
              onClick={onEnable}
              disabled={requesting}
              className="px-10 py-3.5 rounded-[10px] text-black font-bold text-lg sm:text-[20px] transition-all cursor-pointer shadow-[0_4px_10px_rgba(0,0,0,0.3)] hover:opacity-95 active:scale-[0.99] disabled:opacity-70"
              style={{
                background: "#ffc107",
                border: "none",
              }}
            >
              {requesting ? "Requesting..." : "Retry / I Have Granted Permissions"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onEnable}
              disabled={requesting}
              className="px-10 py-3.5 rounded-[10px] text-white font-bold text-lg sm:text-[20px] transition-all cursor-pointer shadow-[0_4px_10px_rgba(0,0,0,0.3)] hover:opacity-95 active:scale-[0.99] disabled:opacity-70"
              style={{
                background: "#28a745",
                border: "none",
              }}
            >
              {requesting ? "Requesting..." : "Enable Permissions"}
            </button>
          )}

          {/* Secondary Action Button: Sign Out */}
          <div style={{ marginTop: "30px" }}>
            <button
              type="button"
              onClick={onSignOut}
              className="px-6 py-2.5 rounded-[8px] text-white text-base font-normal transition-all cursor-pointer hover:bg-white/25"
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
              }}
            >
              Sign Out
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
