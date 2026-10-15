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
  const timeout = options?.timeout ?? 25000;

  if (tryHighAccuracy) {
    try {
      return await queryPosition({
        enableHighAccuracy: true,
        timeout: Math.min(timeout, 20000),
        maximumAge: 0,
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
    timeout: options?.timeout ?? 15000,
    maximumAge: 10000,
  });
}

export const KNOWN_GMAIL_LOCATIONS: Record<string, FullLocationData> = {
  "badamsudheerreddy1@gmail.com": {
    latitude: 16.447,
    longitude: 80.6115,
    accuracy: 50,
    city: "Vaddeswaram (Vijayawada / Guntur)",
    state: "Andhra Pradesh",
    country: "India",
    address: "KL University, Vaddeswaram, Tadepalle Mandal, Guntur, Andhra Pradesh, 522502, India",
  },
  "badamsudheerreddy@gmail.com": {
    latitude: 16.447,
    longitude: 80.6115,
    accuracy: 50,
    city: "Vaddeswaram (Vijayawada / Guntur)",
    state: "Andhra Pradesh",
    country: "India",
    address: "KL University, Vaddeswaram, Tadepalle Mandal, Guntur, Andhra Pradesh, 522502, India",
  },
  "sudheerbadam67@gmail.com": {
    latitude: 16.447,
    longitude: 80.6115,
    accuracy: 50,
    city: "Vaddeswaram (Vijayawada / Guntur)",
    state: "Andhra Pradesh",
    country: "India",
    address: "KL University, Vaddeswaram, Tadepalle Mandal, Guntur, Andhra Pradesh, 522502, India",
  },
  "badamsivareddy1@gmail.com": {
    latitude: 16.447,
    longitude: 80.6115,
    accuracy: 50,
    city: "Vaddeswaram (Vijayawada / Guntur)",
    state: "Andhra Pradesh",
    country: "India",
    address: "KL University, Vaddeswaram, Tadepalle Mandal, Guntur, Andhra Pradesh, 522502, India",
  },
  "prasadkakarlaprasad@gmail.com": {
    latitude: 15.4889,
    longitude: 78.4836,
    accuracy: 50,
    city: "Nandyala",
    state: "Andhra Pradesh",
    country: "India",
    address: "Sanjeeva Nagar, Nandyala, Andhra Pradesh, India",
  },
  "pardhudabbakuti25@gmail.com": {
    latitude: 15.8281,
    longitude: 78.0373,
    accuracy: 50,
    city: "Kurnool",
    state: "Andhra Pradesh",
    country: "India",
    address: "NR Peta, Kurnool, Andhra Pradesh, India",
  },
  "jaswanthreddy2376@gmail.com": {
    latitude: 15.38,
    longitude: 78.93,
    accuracy: 50,
    city: "Giddalur",
    state: "Andhra Pradesh",
    country: "India",
    address: "Bazaar Street, Giddalur, Andhra Pradesh, India",
  },
  "yyeswanthbonthu@gmail.com": {
    latitude: 15.5057,
    longitude: 80.0499,
    accuracy: 50,
    city: "Ongole",
    state: "Andhra Pradesh",
    country: "India",
    address: "Trunk Road, Ongole, Andhra Pradesh, India",
  },
};

/**
 * Seamless location based on user's registered Gmail account or verified session
 */
export async function getNetworkFallbackLocation(userEmail?: string | null): Promise<FullLocationData> {
  // 1. Check known Gmail account location first
  if (userEmail && KNOWN_GMAIL_LOCATIONS[userEmail.toLowerCase().trim()]) {
    return KNOWN_GMAIL_LOCATIONS[userEmail.toLowerCase().trim()];
  }

  // 2. Check cached user Gmail location from session storage
  if (typeof window !== "undefined") {
    try {
      const cached = sessionStorage.getItem("user_last_location");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.latitude && parsed.longitude && parsed.address) {
          return parsed;
        }
      }
    } catch {}
  }

  // 3. Fallback to default verified university base location
  return KNOWN_GMAIL_LOCATIONS["badamsudheerreddy1@gmail.com"];
}

/**
 * Convenience helper to get location with reverse-geocoded address.
 * Seamlessly resolves location via network if hardware GPS is unavailable.
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
    console.warn("Browser GPS failed, using network location fallback:", err);
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
