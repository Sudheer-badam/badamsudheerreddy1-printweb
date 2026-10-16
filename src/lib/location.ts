export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp?: number;
}

export interface GeocodedAddress {
  formattedAddress: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
  suburb?: string;
}

export interface FullLocationData extends LocationCoordinates {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

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

/**
 * Reverse geocodes coordinates to an exact human-readable address.
 * Dual-engine: BigDataCloud (fast, zero rate-limit) + OpenStreetMap Nominatim (zoom 18 for street/building level accuracy).
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<GeocodedAddress> {
  const defaultAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

  // 1. First attempt: BigDataCloud Client Reverse Geocode API (Instant, precise, highly reliable)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const res = await fetch(bdcUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.locality || data.principalSubdivision || "";
      const state = data.principalSubdivision || "";
      const country = data.countryName || "India";
      const postcode = data.postcode || "";
      const suburb = data.locality || "";

      const parts = [
        data.locality,
        data.city && data.city !== data.locality ? data.city : null,
        data.principalSubdivision,
        data.postcode,
        data.countryName,
      ].filter(Boolean);

      const formattedAddress = parts.length > 0 ? parts.join(", ") : defaultAddress;

      return {
        formattedAddress,
        city,
        state,
        country,
        postcode,
        suburb,
      };
    }
  } catch (bdcError) {
    console.warn("BigDataCloud reverse geocode fallback:", bdcError);
  }

  // 2. Second attempt: OpenStreetMap Nominatim zoom=18 for detailed street/building name
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept-Language": "en",
        "User-Agent": "PrintDocker-LiveMap/1.0",
      },
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};

      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.municipality ||
        addr.county ||
        addr.district ||
        "";
      const state = addr.state || addr.province || addr.region || "";
      const country = addr.country || "India";
      const postcode = addr.postcode || "";
      const suburb = addr.suburb || addr.neighbourhood || addr.road || "";

      const parts = [addr.road, suburb, city, state, postcode, country].filter(Boolean);
      const formattedAddress = parts.length > 0 ? parts.join(", ") : data.display_name || defaultAddress;

      return {
        formattedAddress,
        city,
        state,
        country,
        postcode,
        suburb,
      };
    }
  } catch (error) {
    console.warn("Nominatim reverse geocode fallback:", error);
  }

  return { formattedAddress: defaultAddress };
}

/**
 * Internal helper to query browser geolocation with specific options
 */
function queryPosition(options: PositionOptions): Promise<LocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      return reject(new Error("GEOLOCATION_UNSUPPORTED: Geolocation is not supported by your browser"));
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        let code = "UNKNOWN";
        let message = "Unable to retrieve your location.";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            code = "PERMISSION_DENIED";
            message = "Location permission was denied. Please allow location access in your browser.";
            break;
          case error.POSITION_UNAVAILABLE:
            code = "POSITION_UNAVAILABLE";
            message = "Location information is unavailable on your device. Please ensure device GPS/location services are enabled.";
            break;
          case error.TIMEOUT:
            code = "TIMEOUT";
            message = "Location request timed out. Please check your GPS signal or internet connection.";
            break;
        }

        const err = new Error(message);
        (err as any).code = code;
        reject(err);
      },
      options
    );
  });
}

/**
 * Requests exact browser location with high-accuracy hardware GPS query:
 * - enableHighAccuracy: true (GPS chip on mobile, Wi-Fi BSSID scan on desktop/laptop)
 * - maximumAge: 0 (Never accept stale cache, force fresh hardware fix)
 */
export async function getCurrentBrowserLocation(options?: {
  timeout?: number;
  enableHighAccuracy?: boolean;
}): Promise<LocationCoordinates> {
  try {
    return await queryPosition({
      enableHighAccuracy: true,
      timeout: options?.timeout || 15000,
      maximumAge: 0,
    });
  } catch (err: any) {
    if (err?.code === "PERMISSION_DENIED") throw err;

    // Secondary fallback: relaxed timeout if hardware satellite lock is slow
    return await queryPosition({
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 10000,
    });
  }
}

// Deprecated empty registry to avoid breaking any legacy references
export const KNOWN_GMAIL_LOCATIONS: Record<string, FullLocationData> = {};

/**
 * Fallback location based on real IP address if GPS hardware is entirely disabled
 */
export async function getNetworkFallbackLocation(): Promise<FullLocationData> {
  // Check cached user exact location from session storage if available
  if (typeof window !== "undefined") {
    try {
      const cached = sessionStorage.getItem("user_last_location");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.latitude && parsed.longitude) {
          return parsed;
        }
      }
    } catch {}
  }

  // Fetch real approximate location from IP
  try {
    const res = await fetch("https://ipapi.co/json/", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        const address = [data.city, data.region, data.postal, data.country_name].filter(Boolean).join(", ");
        return {
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          accuracy: 2500,
          city: data.city || "",
          state: data.region || "",
          country: data.country_name || "India",
          address: address || `${data.latitude}, ${data.longitude}`,
        };
      }
    }
  } catch {}

  return {
    latitude: 16.5062,
    longitude: 80.648,
    accuracy: 5000,
    city: "Vijayawada",
    state: "Andhra Pradesh",
    country: "India",
    address: "Vijayawada, Andhra Pradesh, India",
  };
}

/**
 * Convenience helper to get location with reverse-geocoded address.
 */
export async function getUserFullLocation(): Promise<FullLocationData> {
  try {
    const coords = await getCurrentBrowserLocation();
    const addressInfo = await reverseGeocode(coords.latitude, coords.longitude);
    return {
      ...coords,
      address: addressInfo.formattedAddress,
      city: addressInfo.city,
      state: addressInfo.state,
      country: addressInfo.country,
    };
  } catch (err) {
    console.warn("Exact browser GPS failed, using network fallback:", err);
    return await getNetworkFallbackLocation();
  }
}

/**
 * Checks browser permission state for geolocation.
 */
export async function getLocationPermissionState(): Promise<"granted" | "denied" | "prompt" | "unsupported"> {
  if (typeof window === "undefined" || !navigator.permissions || !navigator.geolocation) {
    return "unsupported";
  }
  try {
    const result = await navigator.permissions.query({ name: "geolocation" as any });
    return result.state;
  } catch {
    return "prompt";
  }
}

/**
 * Forward geocodes an address or landmark query to coordinates using OpenStreetMap Nominatim.
 */
export async function forwardGeocode(query: string): Promise<Array<{
  latitude: number;
  longitude: number;
  displayName: string;
  city?: string;
  state?: string;
  country?: string;
}>> {
  if (!query || query.trim().length < 2) return [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query.trim())}&limit=5&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "en" },
    });
    if (res.ok) {
      const data = await res.json();
      return data.map((item: any) => ({
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        displayName: item.display_name,
        city: item.address?.city || item.address?.town || item.address?.suburb || item.address?.village || "",
        state: item.address?.state || "",
        country: item.address?.country || "India",
      }));
    }
  } catch (err) {
    console.warn("Forward geocode error:", err);
  }
  return [];
}

