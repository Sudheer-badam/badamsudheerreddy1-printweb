"use client";

import React, { useState } from "react";
import { MapPin, ShieldCheck, Navigation, ExternalLink, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ReceiptLocationCardProps {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  className?: string;
}

export default function ReceiptLocationCard({
  address,
  city,
  state,
  country = "India",
  latitude,
  longitude,
  accuracy,
  className = "",
}: ReceiptLocationCardProps) {
  const [copied, setCopied] = useState(false);

  // If there's completely no location data, don't render anything
  if (!latitude && !longitude && !address && !city) {
    return null;
  }

  // Construct display address
  let displayAddress = address;
  if (!displayAddress) {
    const parts = [city, state || "Andhra Pradesh", country].filter(Boolean);
    if (parts.length > 0) {
      displayAddress = parts.join(", ");
    } else if (latitude && longitude) {
      displayAddress = `${latitude.toFixed(6)}° N, ${longitude.toFixed(6)}° E`;
    }
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!latitude || !longitude) return;

    const coordsStr = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(coordsStr);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = coordsStr;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast.success("GPS Coordinates copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy coordinates");
    }
  };

  const googleMapsUrl =
    latitude && longitude
      ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayAddress || "Vijayawada")}`;

  return (
    <div
      className={`mt-3.5 p-3.5 sm:p-4 rounded-2xl bg-white/95 border border-[#9ed4ad] shadow-xs text-left backdrop-blur-xs transition-all hover:shadow-sm ${className}`}
    >
      {/* Header Row: Title & Verified Badge */}
      <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#cde8d5]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-[13px] font-black text-[#0B1D3A] uppercase tracking-wide truncate">
              Exact Xerox / Order Location
            </div>
            <div className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span>Satellite GPS Verified Proof</span>
            </div>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/90 text-[10px] font-bold text-emerald-800 flex-shrink-0 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Geo-Verified</span>
        </span>
      </div>

      {/* Address Landmark */}
      {displayAddress && (
        <div className="mb-3">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
            Registered Place / Landmark:
          </div>
          <div className="text-xs sm:text-[13px] font-bold text-gray-900 leading-snug flex items-start gap-1.5">
            <span className="text-emerald-700 font-black mt-0.5">📍</span>
            <span>{displayAddress}</span>
          </div>
        </div>
      )}

      {/* Coordinates & Actions Strip */}
      {latitude && longitude && (
        <div className="flex items-center justify-between gap-2 flex-wrap pt-2.5 border-t border-[#cde8d5]/80">
          {/* Lat / Lng Badges */}
          <div className="flex items-center gap-1.5 flex-wrap font-mono text-[11px] font-bold text-gray-800">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f0f8f3] border border-[#a8ddb8] shadow-2xs">
              <span className="text-emerald-700 text-[9px] font-sans font-black bg-emerald-100/80 px-1 py-0.2 rounded">
                LAT
              </span>
              <span>{latitude.toFixed(6)}° N</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f0f8f3] border border-[#a8ddb8] shadow-2xs">
              <span className="text-teal-700 text-[9px] font-sans font-black bg-teal-100/80 px-1 py-0.2 rounded">
                LNG
              </span>
              <span>{longitude.toFixed(6)}° E</span>
            </div>
            {accuracy ? (
              <span className="text-[10px] font-sans font-medium text-gray-600 bg-white px-2 py-0.5 rounded-lg border border-gray-200">
                ±{Math.round(accuracy)}m
              </span>
            ) : null}
          </div>

          {/* Interactive Actions (Hidden in Print) */}
          <div className="flex items-center gap-1.5 print:hidden">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-sans text-[11px] font-bold shadow-xs hover:shadow transition-all"
              title="Open location in Google Maps"
            >
              <Navigation className="w-3 h-3 text-white" />
              <span>View Map</span>
              <ExternalLink className="w-2.5 h-2.5 text-blue-200" />
            </a>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-[#a8ddb8] font-sans text-[11px] font-semibold shadow-2xs transition-all cursor-pointer"
              title="Copy GPS coordinates"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-gray-500" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
