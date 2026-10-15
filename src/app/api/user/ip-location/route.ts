import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // 1. Try freeipapi.com
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch("https://freeipapi.com/api/json", {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          const city = data.cityName || "";
          const region = data.regionName || "";
          const country = data.countryName || "";
          const parts = [city, region, country].filter(Boolean);
          return NextResponse.json({
            success: true,
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
            accuracy: 1500, // approximate IP radius in meters
            city,
            state: region,
            country,
            formattedAddress: parts.join(", ") || `${data.latitude}, ${data.longitude}`,
            source: "ip_freeipapi",
          });
        }
      }
    } catch {}

    // 2. Fallback to ipwho.is
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch("https://ipwho.is/", {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.latitude && data.longitude) {
          const city = data.city || "";
          const region = data.region || "";
          const country = data.country || "";
          const parts = [city, region, country].filter(Boolean);
          return NextResponse.json({
            success: true,
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
            accuracy: 2000,
            city,
            state: region,
            country,
            formattedAddress: parts.join(", ") || `${data.latitude}, ${data.longitude}`,
            source: "ip_ipwhois",
          });
        }
      }
    } catch {}

    // Default fallback coordinates if all external IP services fail (Markapur default)
    return NextResponse.json({
      success: true,
      latitude: 15.7353,
      longitude: 79.2685,
      accuracy: 3000,
      city: "Markapur",
      state: "Andhra Pradesh",
      country: "India",
      formattedAddress: "Markapur, Andhra Pradesh, India",
      source: "ip_default",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to resolve IP location" },
      { status: 500 }
    );
  }
}
