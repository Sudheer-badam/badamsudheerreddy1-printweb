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

/**
 * Reverse geocodes coordinates to a human-readable address using OpenStreetMap Nominatim
 * Includes fallback so reverse geocoding failure never blocks the app.
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<GeocodedAddress> {
  const defaultAddress = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 second timeout

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept-Language": "en",
        "User-Agent": "PrintDocker/1.0",
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { formattedAddress: defaultAddress };
    }

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
    const country = addr.country || "";
    const postcode = addr.postcode || "";
    const suburb = addr.suburb || addr.neighbourhood || addr.road || "";

    const parts = [suburb, city, state, country].filter(Boolean);
    const formattedAddress = parts.length > 0 ? parts.join(", ") : data.display_name || defaultAddress;

    return {
      formattedAddress,
      city,
      state,
      country,
      postcode,
      suburb,
    };
  } catch (error) {
    console.warn("Reverse geocode failed or timed out:", error);
    return { formattedAddress: defaultAddress };
  }
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
            message = "Location permission was denied. You must allow location access to continue.";
            break;
          case error.POSITION_UNAVAILABLE:
            code = "POSITION_UNAVAILABLE";
            message = "Location information is unavailable on your device. Please ensure device location/GPS is on.";
            break;
          case error.TIMEOUT:
            code = "TIMEOUT";
            message = "Location request timed out. Please check your internet/GPS signal and try again.";
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
 * Requests browser location with resilient multi-tier fallback:
 * 1. Tries high-accuracy GPS
 * 2. Falls back to low-accuracy / Wi-Fi / cell triangulation if high-accuracy fails or times out
 */
export async function getCurrentBrowserLocation(options?: {
  timeout?: number;
  enableHighAccuracy?: boolean;
}): Promise<LocationCoordinates> {
  const tryHighAccuracy = options?.enableHighAccuracy ?? true;
  const timeout = options?.timeout ?? 8000;

  if (tryHighAccuracy) {
    try {
      return await queryPosition({
        enableHighAccuracy: true,
        timeout: Math.min(timeout, 6000),
        maximumAge: 10000,
      });
    } catch (err: any) {
      // If user explicitly denied permission at browser prompt, don't retry
      if (err.code === "PERMISSION_DENIED" && !navigator.userAgent.includes("Windows")) {
        throw err;
      }
      // Otherwise (timeout, position unavailable, or Windows OS blocked), try low accuracy
    }
  }

  // Tier 2: Low-accuracy / Wi-Fi network location
  return await queryPosition({
    enableHighAccuracy: false,
    timeout: options?.timeout ?? 8000,
    maximumAge: 60000,
  });
}

/**
 * Convenience helper to get location with reverse-geocoded address.
 */
export async function getUserFullLocation(): Promise<FullLocationData> {
  const coords = await getCurrentBrowserLocation();
  const addressInfo = await reverseGeocode(coords.latitude, coords.longitude);
  return {
    ...coords,
    address: addressInfo.formattedAddress,
    city: addressInfo.city,
    state: addressInfo.state,
    country: addressInfo.country,
  };
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
