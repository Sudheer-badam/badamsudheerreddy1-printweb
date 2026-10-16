"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  RefreshCw,
  Search,
  Users,
  Compass,
  Radio,
  Clock,
  Navigation,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  subscribeToFirebaseLocations,
  deleteFirebaseUserLocation,
  clearAllFirebaseLocations,
} from "@/lib/firebaseLocation";
import { toast } from "sonner";

// Normalizes email addresses to prevent duplicates from casing or leading/trailing spaces
function normalizeEmail(email?: string | null): string {
  return (email || "").trim().toLowerCase();
}

// Canonical key generator for unique user identification
function getCanonicalUserKey(u: { email?: string | null; firebaseUid?: string | null; id?: string | null }): string {
  const normEmail = normalizeEmail(u.email);
  if (normEmail) return `email:${normEmail}`;
  const fb = (u.firebaseUid || "").trim();
  if (fb) return `fb:${fb}`;
  return `id:${u.id || ""}`;
}

// Lookup existing user in Map by email first, then firebaseUid, then id
function findMatchingKey(
  map: Map<string, LocatedUser>,
  user: { email?: string | null; firebaseUid?: string | null; id?: string | null }
): string | null {
  const normEmail = normalizeEmail(user.email);
  if (normEmail) {
    const emailKey = `email:${normEmail}`;
    if (map.has(emailKey)) return emailKey;
    for (const [k, existing] of map.entries()) {
      if (normalizeEmail(existing.email) === normEmail) {
        return k;
      }
    }
  }

  const fbId = (user.firebaseUid || "").trim() || (user.id && !user.id.startsWith("cm") ? user.id.trim() : "");
  if (fbId) {
    const fbKey = `fb:${fbId}`;
    if (map.has(fbKey)) return fbKey;
    for (const [k, existing] of map.entries()) {
      if ((existing.firebaseUid && existing.firebaseUid === fbId) || existing.id === fbId) {
        return k;
      }
    }
  }

  if (user.id) {
    const idKey = `id:${user.id}`;
    if (map.has(idKey)) return idKey;
    for (const [k, existing] of map.entries()) {
      if (existing.id === user.id) {
        return k;
      }
    }
  }

  return null;
}

export interface LocatedUser {
  id: string;
  firebaseUid: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  profilePhoto: string | null;
  latitude: number;
  longitude: number;
  locationAccuracy?: number | null;
  locationAddress?: string | null;
  locationCity?: string | null;
  locationState?: string | null;
  locationCountry?: string | null;
  isOnline: boolean;
  lastLocationUpdate: string | null;
  lastLogin: string | null;
  registrationDate: string;
  _count?: { orders: number };
  speed?: number | null;
  heading?: number | null;
  isMoving?: boolean;
  deviceOs?: string | null;
}

interface AdminLiveMapProps {
  adminUid: string;
  initialSelectedUserId?: string | null;
}

const TILE_LAYERS = {
  googleStreet: {
    name: "Google Street",
    url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    attribution: "© Google Maps",
    maxZoom: 20,
  },
  googleSatellite: {
    name: "Google Satellite",
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    attribution: "© Google Maps",
    maxZoom: 20,
  },
  googleTerrain: {
    name: "Google Terrain",
    url: "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
    attribution: "© Google Maps",
    maxZoom: 20,
  },
};

export default function AdminLiveMap({ adminUid, initialSelectedUserId }: AdminLiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const circlesRef = useRef<Map<string, L.Circle>>(new Map());
  const polylinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const trailPointsRef = useRef<Map<string, [number, number][]>>(new Map());
  const activeTileLayerRef = useRef<L.TileLayer | null>(null);

  const [users, setUsers] = useState<LocatedUser[]>([]);
  const [stats, setStats] = useState({ totalWithLocation: 0, onlineCount: 0, activeTodayCount: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "online" | "today">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<LocatedUser | null>(null);
  const [followingUserId, setFollowingUserId] = useState<string | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(1); // 1s default for live every second updates
  const [currentTileLayer, setCurrentTileLayer] = useState<keyof typeof TILE_LAYERS>("googleStreet");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Global window handler for popup "Follow Live Movement" & "Delete User Data" buttons
  useEffect(() => {
    (window as any).__toggleFollowUser = (userId: string) => {
      setFollowingUserId((prev) => (prev === userId ? null : userId));
    };

    (window as any).__deleteUserLocation = async (uid: string) => {
      if (
        window.confirm(
          "Are you sure you want to completely remove this user from the live map tracking data?"
        )
      ) {
        try {
          await deleteFirebaseUserLocation(uid);
          await fetch(`/api/user/location?adminUid=${adminUid}&uid=${uid}`, {
            method: "DELETE",
          });
          toast.success("User live tracking data removed.");
          setUsers((prev) => prev.filter((u) => u.firebaseUid !== uid && u.id !== uid));
        } catch {
          toast.error("Failed to remove user tracking data.");
        }
      }
    };

    return () => {
      delete (window as any).__toggleFollowUser;
      delete (window as any).__deleteUserLocation;
    };
  }, []);

  // Fetch users with live locations
  const fetchLocations = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const res = await fetch(`/api/user/location?adminUid=${adminUid}&filter=${activeFilter}`);
      if (res.ok) {
        const data = await res.json();
        const apiUsers: LocatedUser[] = data.users || [];
        setUsers((prevUsers) => {
          const map = new Map<string, LocatedUser>();

          // Seed map with apiUsers deduplicated by canonical email
          apiUsers.forEach((u) => {
            const key = getCanonicalUserKey(u);
            map.set(key, u);
          });

          // Merge in prevUsers (preserving latest live real-time coordinates)
          prevUsers.forEach((prev) => {
            const matchedKey = findMatchingKey(map, prev);
            if (matchedKey) {
              const u = map.get(matchedKey)!;
              const prevTime = prev.lastLocationUpdate ? new Date(prev.lastLocationUpdate).getTime() : 0;
              const currTime = u.lastLocationUpdate ? new Date(u.lastLocationUpdate).getTime() : 0;
              const prevAcc = prev.locationAccuracy || 99999;
              const uAcc = u.locationAccuracy || 99999;
              // If incoming update is a coarse laptop IP fix (>800m) and database has accurate fix (<=250m), keep accurate coords
              const shouldPreserveDbCoords = prevAcc > 800 && uAcc <= 250 && !prev.isMoving;

              if (prevTime >= currTime || prev.isMoving) {
                map.set(matchedKey, {
                  ...u,
                  id: u.id || prev.id,
                  firebaseUid: prev.firebaseUid || u.firebaseUid,
                  name: prev.name && prev.name !== "Live User" ? prev.name : u.name,
                  email: u.email || prev.email,
                  phone: prev.phone || u.phone,
                  profilePhoto: prev.profilePhoto || u.profilePhoto,
                  latitude: shouldPreserveDbCoords ? u.latitude : prev.latitude,
                  longitude: shouldPreserveDbCoords ? u.longitude : prev.longitude,
                  locationAccuracy: shouldPreserveDbCoords ? u.locationAccuracy : (prev.locationAccuracy ?? u.locationAccuracy),
                  locationAddress: shouldPreserveDbCoords ? u.locationAddress : (prev.locationAddress || u.locationAddress),
                  locationCity: shouldPreserveDbCoords ? u.locationCity : (prev.locationCity || u.locationCity),
                  locationState: shouldPreserveDbCoords ? u.locationState : (prev.locationState || u.locationState),
                  locationCountry: shouldPreserveDbCoords ? u.locationCountry : (prev.locationCountry || u.locationCountry),
                  isOnline: prev.isOnline !== undefined ? prev.isOnline : u.isOnline,
                  lastLocationUpdate: prev.lastLocationUpdate || u.lastLocationUpdate,
                  speed: prev.speed,
                  heading: prev.heading,
                  isMoving: prev.isMoving,
                  deviceOs: prev.deviceOs || u.deviceOs,
                  _count: u._count || prev._count,
                });
              } else {
                map.set(matchedKey, {
                  ...prev,
                  ...u,
                  firebaseUid: prev.firebaseUid || u.firebaseUid,
                });
              }
            } else {
              const key = getCanonicalUserKey(prev);
              map.set(key, prev);
            }
          });
          return Array.from(map.values());
        });
        if (data.stats) setStats(data.stats);
        setLastRefreshedAt(new Date());
      }
    } catch (err) {
      console.error("Failed to load user locations:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [adminUid, activeFilter]);

  // Initial fetch
  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Auto-refresh timer
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      fetchLocations(true);
    }, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, fetchLocations]);

  // Real-time Firebase Firestore listener for instant live movement stream
  useEffect(() => {
    const unsubscribe = subscribeToFirebaseLocations((firebaseLocations) => {
      if (!firebaseLocations || firebaseLocations.length === 0) return;
      setUsers((prevUsers) => {
        const map = new Map<string, LocatedUser>();

        // Build canonical deduplicated map from current state
        prevUsers.forEach((u) => {
          const key = getCanonicalUserKey(u);
          if (map.has(key)) {
            const existing = map.get(key)!;
            const existingTime = existing.lastLocationUpdate ? new Date(existing.lastLocationUpdate).getTime() : 0;
            const uTime = u.lastLocationUpdate ? new Date(u.lastLocationUpdate).getTime() : 0;
            if (uTime >= existingTime || u.isMoving) {
              map.set(key, { ...existing, ...u });
            }
          } else {
            map.set(key, u);
          }
        });

        firebaseLocations.forEach((fbUser) => {
          const fbId = fbUser.uid || fbUser.user_id || fbUser.id || "";
          const userSpeed = fbUser.speed !== undefined && fbUser.speed !== null ? Number(fbUser.speed) : null;
          const userHeading = fbUser.heading !== undefined && fbUser.heading !== null ? Number(fbUser.heading) : null;
          const isMoving = Boolean(
            (userSpeed && userSpeed > 0.3) ||
            fbUser.is_moving ||
            fbUser.isMoving
          );

          const matchedKey = findMatchingKey(map, {
            email: fbUser.email,
            firebaseUid: fbId,
            id: fbId,
          });

          if (matchedKey) {
            const existing = map.get(matchedKey)!;
            const oldLat = existing.latitude;
            const oldLng = existing.longitude;
            const newLat = Number(fbUser.latitude) || oldLat;
            const newLng = Number(fbUser.longitude) || oldLng;
            const moved = Math.abs(newLat - oldLat) > 0.00003 || Math.abs(newLng - oldLng) > 0.00003;
            // Accuracy guard: If existing user already has an accurate mobile GPS fix (<=250m)
            // and incoming update from a laptop is coarse IP (>800m), don't displace pin across cities!
            const fbAcc = fbUser.accuracy || 99999;
            const existingAcc = existing.locationAccuracy || 99999;
            const shouldPreserveExistingCoords = fbAcc > 800 && existingAcc <= 250 && !isMoving;

            const finalLat = shouldPreserveExistingCoords ? oldLat : newLat;
            const finalLng = shouldPreserveExistingCoords ? oldLng : newLng;
            const finalAcc = shouldPreserveExistingCoords ? existing.locationAccuracy : (fbUser.accuracy || existing.locationAccuracy);
            const finalAddr = shouldPreserveExistingCoords ? existing.locationAddress : (fbUser.address || existing.locationAddress);
            const finalCity = shouldPreserveExistingCoords ? existing.locationCity : (fbUser.city || existing.locationCity);

            // Auto-pan if Admin is following this user
            if (followingUserId && (existing.id === followingUserId || existing.firebaseUid === followingUserId)) {
              mapInstanceRef.current?.panTo([finalLat, finalLng], { animate: true, duration: 0.8 });
            }

            // Update live coordinates from Firebase in real-time
            map.set(matchedKey, {
              ...existing,
              firebaseUid: existing.firebaseUid || fbId,
              name: existing.name && existing.name !== "Live User" ? existing.name : (fbUser.user_name || fbUser.name || existing.name),
              email: existing.email || fbUser.email || null,
              phone: existing.phone || fbUser.phone || null,
              profilePhoto: existing.profilePhoto || fbUser.photoURL || fbUser.photo_url || null,
              latitude: finalLat,
              longitude: finalLng,
              locationAccuracy: finalAcc,
              locationAddress: finalAddr,
              locationCity: finalCity,
              isOnline: fbUser.is_online !== undefined ? Boolean(fbUser.is_online) : (fbUser.isOnline !== undefined ? Boolean(fbUser.isOnline) : existing.isOnline),
              lastLocationUpdate: fbUser.last_updated || fbUser.updatedAt || fbUser.lastLocationUpdate || new Date().toISOString(),
              speed: userSpeed,
              heading: userHeading,
              isMoving: isMoving || moved,
              deviceOs: fbUser.device_os || existing.deviceOs,
            });
          } else if (fbUser.latitude && fbUser.longitude) {
            // New user active on live stream
            const newEntry: LocatedUser = {
              id: fbId || `fb-${Date.now()}`,
              firebaseUid: fbId,
              name: fbUser.user_name || fbUser.name || fbUser.email || "Live User",
              email: fbUser.email || null,
              phone: fbUser.phone || null,
              profilePhoto: fbUser.photoURL || fbUser.photo_url || null,
              latitude: Number(fbUser.latitude),
              longitude: Number(fbUser.longitude),
              locationAccuracy: fbUser.accuracy || 100,
              locationAddress: fbUser.address || null,
              locationCity: fbUser.city || null,
              locationState: fbUser.state || null,
              locationCountry: fbUser.country || "India",
              isOnline: fbUser.is_online !== undefined ? Boolean(fbUser.is_online) : true,
              lastLocationUpdate: fbUser.last_updated || fbUser.updatedAt || new Date().toISOString(),
              lastLogin: fbUser.lastLogin || null,
              registrationDate: fbUser.createdAt || new Date().toISOString(),
              speed: userSpeed,
              heading: userHeading,
              isMoving,
              deviceOs: fbUser.device_os || "Device",
            };
            const newKey = getCanonicalUserKey(newEntry);
            map.set(newKey, newEntry);
          }
        });

        return Array.from(map.values());
      });
    });

    return () => unsubscribe();
  }, [followingUserId]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center matching Capstone: KL University / Vijayawada region
    const map = L.map(mapContainerRef.current, {
      center: [16.5, 80.64],
      zoom: 13,
      zoomControl: false,
    });

    // Add zoom controls at top right
    L.control.zoom({ position: "topright" }).addTo(map);

    // Initial tile layer (Google Roads style matches screenshot)
    const tileConfig = TILE_LAYERS[currentTileLayer];
    const tileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
    }).addTo(map);

    activeTileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer when changed
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeTileLayerRef.current) {
      map.removeLayer(activeTileLayerRef.current);
    }

    const tileConfig = TILE_LAYERS[currentTileLayer];
    const newTileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
    }).addTo(map);

    activeTileLayerRef.current = newTileLayer;
  }, [currentTileLayer]);

  // Helper to create HTML DivIcon for user marker
  const createUserDivIcon = (user: LocatedUser, isSelected: boolean) => {
    const isOnline = Boolean(
      user.isOnline &&
      user.lastLocationUpdate &&
      Date.now() - new Date(user.lastLocationUpdate).getTime() <= 5 * 60 * 1000
    );
    const isMoving = Boolean(
      user.isMoving ||
      (user.speed && user.speed > 0.3) ||
      (user.lastLocationUpdate && Date.now() - new Date(user.lastLocationUpdate).getTime() <= 30 * 1000)
    );
    const initial = (user.name || user.email || "U").charAt(0).toUpperCase();

    const avatarHtml = user.profilePhoto
      ? `<img src="${user.profilePhoto}" class="w-full h-full object-cover rounded-full" alt="" onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=0B1D3A&color=fff&size=128';" />`
      : `<span class="font-bold text-xs text-white">${initial}</span>`;

    const pulseRing = isMoving
      ? `<span class="absolute -inset-2.5 rounded-full bg-emerald-400 opacity-75 animate-ping"></span><span class="absolute -inset-1 rounded-full bg-emerald-300 opacity-60 animate-pulse"></span>`
      : isOnline
        ? `<span class="absolute -inset-1.5 rounded-full bg-emerald-400 opacity-60 animate-ping"></span>`
        : "";

    const movingBadge = isMoving
      ? `<span class="absolute -top-3.5 px-1.5 py-0.2 rounded-full bg-emerald-600 border border-white text-[8px] text-white font-black shadow-md flex items-center gap-0.5 whitespace-nowrap z-20"><span>●</span> MOVING</span>`
      : "";

    const statusBadge = isOnline
      ? `<span class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>`
      : `<span class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-gray-400 border-2 border-white rounded-full"></span>`;

    const selectionBorder = isSelected
      ? "ring-4 ring-amber-400 ring-offset-2 scale-110"
      : "hover:scale-110";

    const html = `
      <div class="relative flex items-center justify-center transition-transform duration-200 cursor-pointer ${selectionBorder}">
        ${pulseRing}
        ${movingBadge}
        <div class="w-10 h-10 rounded-full bg-[#0B1D3A] border-2 ${isOnline ? 'border-emerald-500' : 'border-blue-400'} flex items-center justify-center shadow-lg overflow-hidden">
          ${avatarHtml}
        </div>
        ${statusBadge}
      </div>
    `;

    return L.divIcon({
      html,
      className: "custom-user-marker",
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -22],
    });
  };

  // Helper to format popup content
  const createPopupContent = (user: LocatedUser) => {
    // Exact Capstone live calculation: active within 15 seconds
    const isOnline = Boolean(
      user.isOnline &&
      user.lastLocationUpdate &&
      Date.now() - new Date(user.lastLocationUpdate).getTime() <= 15 * 1000
    );
    const isMoving = Boolean(
      user.isMoving ||
      (user.speed && user.speed > 0.3) ||
      (user.lastLocationUpdate && Date.now() - new Date(user.lastLocationUpdate).getTime() <= 10 * 1000)
    );
    const timeAgo = user.lastLocationUpdate
      ? formatDistanceToNow(new Date(user.lastLocationUpdate), { addSuffix: true })
      : "Recently";

    const initial = (user.name || user.email || "U").charAt(0).toUpperCase();
    const avatarImg = user.profilePhoto
      ? `<img src="${user.profilePhoto}" class="w-10 h-10 rounded-xl object-cover border border-gray-200" alt="" onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=0B1D3A&color=fff&size=128';" />`
      : `<div class="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center">${initial}</div>`;

    const phoneLink = user.phone
      ? `<a href="tel:${user.phone}" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold">
           <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
           Call
         </a>`
      : "";

    const waPhone = user.phone ? user.phone.replace(/[^0-9]/g, "") : "";
    const waLink = waPhone
      ? `<a href="https://wa.me/${waPhone}?text=${encodeURIComponent(`Hello ${user.name || "Customer"}, this is PRINT DOCKER support.`)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold">
           WhatsApp
         </a>`
      : "";

    const speedInfo = user.speed && user.speed > 0.3
      ? `<span class="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-bold">🏃 ${(user.speed * 3.6).toFixed(1)} km/h</span>`
      : "";

    const deviceBadge = user.deviceOs
      ? `<span class="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-medium">📱 ${user.deviceOs}</span>`
      : "";

    const followBtn = `
      <button onclick="window.__toggleFollowUser('${user.id}')" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg ${followingUserId === user.id ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
      } text-xs font-bold transition-all shadow-sm">
        ${followingUserId === user.id ? '🎯 Stop Following' : '🧭 Follow Live'}
      </button>
    `;

    const directionsLink = `
      <a href="https://www.google.com/maps/dir/?api=1&destination=${user.latitude},${user.longitude}" target="_blank" rel="noreferrer" style="display:block;margin-top:8px;padding:6px 12px;background:#007bff;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:12px;text-decoration:none;text-align:center">
        🗺️ Get Directions
      </a>
    `;

    const deleteBtn = `
      <button onclick="window.__deleteUserLocation('${user.firebaseUid || user.id}')" style="margin-top:6px;padding:6px 12px;background:#dc3545;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:12px;width:100%;text-align:center">
        Delete User Data
      </button>
    `;

    return `
      <div class="p-3.5 min-w-[270px] max-w-[340px] font-sans text-gray-800 text-center">
        <div class="flex items-center justify-center gap-3 pb-2.5 border-b border-gray-100 mb-2.5">
          ${avatarImg}
          <div class="min-w-0 text-left">
            <h4 class="font-bold text-base text-[#0B1D3A] truncate m-0 leading-tight">${user.name || "Customer"}</h4>
            <div class="text-xs text-gray-500 truncate">${user.email || "No email"}</div>
          </div>
        </div>

        <div class="my-2">
          <span style="display:inline-block;padding:4px 10px;border-radius:12px;background:${
            isOnline ? "#d4edda" : "#f8d7da"
          };color:${isOnline ? "#155724" : "#721c24"};font-weight:bold;font-size:12px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
            ${isOnline ? "🟢 LIVE NOW" : "🔴 NOT IN LIVE"}
          </span>
        </div>

        <div class="flex items-center justify-center gap-2 mb-2 flex-wrap">
          ${deviceBadge}
          ${isMoving ? `<span class="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold">🚶 Moving</span>` : ""}
          ${speedInfo}
          <span class="text-[10px] text-gray-400 font-medium">${timeAgo}</span>
        </div>

        <div class="space-y-1 text-xs text-gray-600 mb-3 text-left bg-gray-50 p-2.5 rounded-xl border border-gray-100">
          <div class="flex items-start gap-1.5">
            <span class="font-semibold text-gray-800">📍</span>
            <span class="truncate-2-lines">${user.locationAddress || `${user.latitude.toFixed(6)}, ${user.longitude.toFixed(6)}`}</span>
          </div>
          <div class="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-200/50 mt-1">
            <span>Lat: <strong>${user.latitude.toFixed(6)}</strong></span>
            <span>Lng: <strong>${user.longitude.toFixed(6)}</strong></span>
            ${user.locationAccuracy ? `<span>Acc: <strong>±${Math.round(user.locationAccuracy)}m</strong></span>` : ""}
          </div>
          <div class="text-center text-[11px] pt-1 mt-1 border-t border-gray-200/50" style="color: green;">
            Last Update: ${user.lastLocationUpdate ? new Date(user.lastLocationUpdate).toLocaleString() : "Just now"}
          </div>
        </div>

        ${directionsLink}
        ${deleteBtn}

        <div class="flex items-center justify-center gap-2 pt-2 mt-2 border-t border-gray-100 flex-wrap">
          ${followBtn}
          ${phoneLink}
          ${waLink}
          <a href="/admin/orders?userId=${user.id}" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold ml-auto">
            Orders (${user._count?.orders ?? 0})
          </a>
        </div>
      </div>
    `;
  };

  // Render markers and movement breadcrumb trails on map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentMarkers = markersRef.current;
    const currentCircles = circlesRef.current;
    const currentPolylines = polylinesRef.current;

    // Track active IDs to remove old ones
    const newIds = new Set<string>();

    users.forEach((user) => {
      newIds.add(user.id);
      const isSelected = selectedUser?.id === user.id;
      const latLng: [number, number] = [user.latitude, user.longitude];

      // Update movement breadcrumb trail
      const trail = trailPointsRef.current.get(user.id) || [];
      const lastPt = trail[trail.length - 1];
      if (!lastPt || Math.abs(lastPt[0] - user.latitude) > 0.00001 || Math.abs(lastPt[1] - user.longitude) > 0.00001) {
        trail.push([user.latitude, user.longitude]);
        if (trail.length > 30) trail.shift();
        trailPointsRef.current.set(user.id, trail);
      }

      if (trail.length > 1) {
        if (currentPolylines.has(user.id)) {
          currentPolylines.get(user.id)!.setLatLngs(trail);
        } else {
          const polyline = L.polyline(trail, {
            color: user.isOnline ? "#10B981" : "#3B82F6",
            weight: 3.5,
            opacity: 0.85,
            lineCap: "round",
            lineJoin: "round",
            dashArray: user.isOnline ? "6, 6" : undefined,
          }).addTo(map);
          currentPolylines.set(user.id, polyline);
        }
      }

      if (currentMarkers.has(user.id)) {
        // Update existing marker position & icon smoothly
        const marker = currentMarkers.get(user.id)!;
        marker.setLatLng(latLng);
        marker.setIcon(createUserDivIcon(user, isSelected));
        marker.getPopup()?.setContent(createPopupContent(user));

        // Update accuracy circle
        if (currentCircles.has(user.id)) {
          const circle = currentCircles.get(user.id)!;
          circle.setLatLng(latLng);
          if (user.locationAccuracy) circle.setRadius(user.locationAccuracy);
        }
      } else {
        // Create new marker
        const marker = L.marker(latLng, {
          icon: createUserDivIcon(user, isSelected),
          title: user.name || user.email || "Customer",
        });

        const popup = L.popup({
          closeButton: true,
          offset: [0, -10],
          className: "custom-leaflet-popup",
        }).setContent(createPopupContent(user));

        marker.bindPopup(popup);

        marker.on("click", () => {
          setSelectedUser(user);
        });

        marker.addTo(map);
        currentMarkers.set(user.id, marker);

        // Accuracy circle
        if (user.locationAccuracy && user.locationAccuracy < 1000) {
          const circle = L.circle(latLng, {
            radius: user.locationAccuracy,
            color: user.isOnline ? "#10B981" : "#3B82F6",
            fillColor: user.isOnline ? "#10B981" : "#3B82F6",
            fillOpacity: 0.12,
            weight: 1.5,
          }).addTo(map);
          currentCircles.set(user.id, circle);
        }
      }
    });

    // Remove markers that are no longer present
    currentMarkers.forEach((marker, id) => {
      if (!newIds.has(id)) {
        marker.remove();
        currentMarkers.delete(id);
      }
    });
    currentCircles.forEach((circle, id) => {
      if (!newIds.has(id)) {
        circle.remove();
        currentCircles.delete(id);
      }
    });
    currentPolylines.forEach((poly, id) => {
      if (!newIds.has(id)) {
        poly.remove();
        currentPolylines.delete(id);
      }
    });

    // If initial selected user specified, focus on them
    if (initialSelectedUserId && !selectedUser) {
      const target = users.find((u) => u.id === initialSelectedUserId);
      if (target) {
        focusOnUser(target);
      }
    }
  }, [users, selectedUser, followingUserId, initialSelectedUserId]);

  // Focus on a specific user on the map
  const focusOnUser = (user: LocatedUser) => {
    setSelectedUser(user);
    const map = mapInstanceRef.current;
    if (!map) return;

    map.flyTo([user.latitude, user.longitude], 15, {
      animate: true,
      duration: 1.2,
    });

    const marker = markersRef.current.get(user.id);
    if (marker) {
      setTimeout(() => {
        marker.openPopup();
      }, 700);
    }
  };

  const [locatingDevice, setLocatingDevice] = useState(false);

  // Locate current device GPS
  const locateMyDevice = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      return;
    }
    setLocatingDevice(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingDevice(false);
        const map = mapInstanceRef.current;
        if (!map) return;
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 16, { animate: true, duration: 1.2 });
      },
      (err) => {
        setLocatingDevice(false);
        console.warn("Could not get device location:", err);
      },
      { enableHighAccuracy: true, timeout: 20000 }
    );
  };

  // Fit all markers in view
  const fitAllMarkers = () => {
    const map = mapInstanceRef.current;
    if (!map || users.length === 0) return;

    const group = L.featureGroup(Array.from(markersRef.current.values()));
    map.fitBounds(group.getBounds().pad(0.15), { animate: true, duration: 1 });
  };

  // Completely wipe all user location tracking data
  const handleClearAllLocations = async () => {
    if (
      !window.confirm(
        "Are you sure you want to REMOVE ALL USER LOCATION DATA from both Firebase and the Database? All current coordinates will be wiped and ready to be added newly."
      )
    ) {
      return;
    }
    try {
      setRefreshing(true);
      await clearAllFirebaseLocations();
      await fetch(`/api/user/location?adminUid=${adminUid}&all=true`, {
        method: "DELETE",
      });
      setUsers([]);
      setStats({ totalWithLocation: 0, onlineCount: 0, activeTodayCount: 0 });
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
      circlesRef.current.forEach((circle) => circle.remove());
      circlesRef.current.clear();
      polylinesRef.current.forEach((p) => p.remove());
      polylinesRef.current.clear();
      trailPointsRef.current.clear();
      setSelectedUser(null);
      setFollowingUserId(null);
      toast.success("All user location data removed. Ready to add newly!");
    } catch (err) {
      console.error("Failed to clear all location data:", err);
      toast.error("Failed to clear all location data.");
    } finally {
      setRefreshing(false);
    }
  };

  // Filtered users list for the sidebar with strict email deduplication
  const filteredUsers = useMemo(() => {
    const seen = new Set<string>();
    const q = searchQuery ? searchQuery.toLowerCase().trim() : "";
    const now = Date.now();

    return users.filter((u) => {
      // Deduplicate strictly by normalized email, then firebaseUid, then id
      const normEmail = normalizeEmail(u.email);
      const dedupeKey = normEmail ? `email:${normEmail}` : (u.firebaseUid ? `fb:${u.firebaseUid}` : `id:${u.id}`);
      if (seen.has(dedupeKey)) return false;
      seen.add(dedupeKey);

      if (activeFilter === "online") {
        const isOnline = Boolean(
          u.isOnline &&
          u.lastLocationUpdate &&
          now - new Date(u.lastLocationUpdate).getTime() <= 5 * 60 * 1000
        );
        if (!isOnline) return false;
      } else if (activeFilter === "today") {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const updateTime = u.lastLocationUpdate ? new Date(u.lastLocationUpdate).getTime() : 0;
        if (updateTime < startOfToday.getTime()) return false;
      }

      if (!q) return true;
      return (
        Boolean(u.name?.toLowerCase().includes(q)) ||
        Boolean(u.email?.toLowerCase().includes(q)) ||
        Boolean(u.phone?.includes(q)) ||
        Boolean(u.locationCity?.toLowerCase().includes(q)) ||
        Boolean(u.locationAddress?.toLowerCase().includes(q))
      );
    });
  }, [users, searchQuery, activeFilter]);

  return (
    <div className="space-y-6">
      {/* Top Header & Live Stats Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0B1D3A]">Live Location Services</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Live Tracking Active (1s Updates)
            </div>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Real-time GPS tracking for active users logged in across PRINT DOCKER
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Live Following User Indicator */}
          {followingUserId && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold shadow-md animate-pulse">
              <span>🎯 Following User Live</span>
              <button
                type="button"
                onClick={() => setFollowingUserId(null)}
                className="bg-black/25 hover:bg-black/40 rounded-lg px-2 py-0.5 text-[11px] font-semibold cursor-pointer"
              >
                Stop
              </button>
            </div>
          )}

          {/* Layer switcher */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm text-xs font-semibold text-gray-700">
            {(Object.keys(TILE_LAYERS) as Array<keyof typeof TILE_LAYERS>).map((key) => (
              <button
                key={key}
                onClick={() => setCurrentTileLayer(key)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${currentTileLayer === key ? "bg-[#0B1D3A] text-white shadow-sm" : "hover:bg-gray-100"
                  }`}
              >
                {TILE_LAYERS[key].name}
              </button>
            ))}
          </div>

          {/* Auto-refresh toggle */}
          <select
            value={autoRefreshInterval}
            onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 shadow-sm focus:outline-none focus:border-blue-500"
          >
            <option value={1}>⚡ Live 1s (Every Second)</option>
            <option value={2}>Refresh 2s</option>
            <option value={5}>Refresh 5s</option>
            <option value={10}>Refresh 10s</option>
            <option value={0}>Manual Only</option>
          </select>

          {/* Manual refresh button */}
          <button
            onClick={() => fetchLocations(false)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-sm transition-colors disabled:opacity-60"
            title="Refresh now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
            <span>Refresh</span>
          </button>

          {/* Locate My Device button */}
          <button
            onClick={locateMyDevice}
            disabled={locatingDevice}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50"
            title="Locate my device GPS position"
          >
            <MapPin className={`w-3.5 h-3.5 ${locatingDevice ? "animate-bounce" : ""}`} />
            <span>{locatingDevice ? "Locating..." : "Locate Me"}</span>
          </button>

          {/* Fit all button */}
          <button
            onClick={fitAllMarkers}
            disabled={users.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2D63FF] hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Fit All Users</span>
          </button>

          {/* Clear All Locations button */}
          <button
            onClick={handleClearAllLocations}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50"
            title="Wipe all user location records across Firebase & Database"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Data</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-gray-500">Live Online Now</div>
            <div className="text-2xl font-black text-emerald-600 mt-1 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              {stats.onlineCount}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Radio className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-gray-500">Active Today</div>
            <div className="text-2xl font-black text-[#0B1D3A] mt-1">{stats.activeTodayCount}</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-gray-500">Total Located Users</div>
            <div className="text-2xl font-black text-[#0B1D3A] mt-1">{stats.totalWithLocation}</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-gray-500">Last Synced</div>
            <div className="text-sm font-bold text-gray-800 mt-2 truncate">
              {lastRefreshedAt.toLocaleTimeString()}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Navigation className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Map + Customer List Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Map Container (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-2 border border-gray-200 shadow-sm overflow-hidden relative">
          <div
            ref={mapContainerRef}
            className="w-full h-[600px] lg:h-[680px] rounded-2xl overflow-hidden z-10"
            style={{ minHeight: "500px" }}
          />

          {/* Map Overlay Badge */}
          <div className="absolute bottom-5 left-5 z-20 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-md border border-gray-200/80 flex items-center gap-2 text-xs font-semibold text-gray-800 pointer-events-none">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>{users.length} Users Located on Live Map</span>
          </div>
        </div>

        {/* User Sidebar List (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-[#0B1D3A] flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Customer Live Directory
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {filteredUsers.length} shown
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search user, city, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1.5 p-1 bg-gray-100 rounded-xl">
            {(
              [
                { id: "all", label: "All" },
                { id: "online", label: "Online Now" },
                { id: "today", label: "Active Today" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeFilter === tab.id
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Users List */}
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {loading ? (
              <div className="space-y-3 py-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No active user locations found matching current filter.
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isSelected = selectedUser?.id === u.id;
                const isOnline = Boolean(
                  u.isOnline &&
                  u.lastLocationUpdate &&
                  Date.now() - new Date(u.lastLocationUpdate).getTime() <= 5 * 60 * 1000
                );
                const timeAgo = u.lastLocationUpdate
                  ? formatDistanceToNow(new Date(u.lastLocationUpdate), { addSuffix: true })
                  : "Recently";

                return (
                  <div
                    key={u.id}
                    onClick={() => focusOnUser(u)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${isSelected
                        ? "bg-blue-50/70 border-blue-400 shadow-sm"
                        : "bg-white border-gray-200/80 hover:border-blue-200 hover:bg-gray-50/60"
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        {u.profilePhoto ? (
                          <img
                            src={u.profilePhoto}
                            alt=""
                            className="w-10 h-10 rounded-xl object-cover border border-gray-200"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'User')}&background=0B1D3A&color=fff&size=128`;
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[#0B1D3A] text-white font-bold text-xs flex items-center justify-center">
                            {(u.name || u.email || "U").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                            }`}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-xs text-[#0B1D3A] truncate">
                            {u.name || "Customer"}
                          </h4>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${u.isMoving || (u.lastLocationUpdate && Date.now() - new Date(u.lastLocationUpdate).getTime() <= 30 * 1000)
                                ? "bg-emerald-100 text-emerald-800 animate-pulse border border-emerald-300"
                                : isOnline
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                          >
                            {u.isMoving || (u.lastLocationUpdate && Date.now() - new Date(u.lastLocationUpdate).getTime() <= 30 * 1000)
                              ? "🏃 MOVING LIVE"
                              : isOnline
                                ? "ONLINE"
                                : "OFFLINE"}
                          </span>
                        </div>

                        <div className="text-[11px] text-gray-500 truncate mt-0.5">
                          {u.email || u.phone || "No contact"}
                        </div>

                        <div className="text-[11px] text-gray-700 truncate font-medium mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-red-500 flex-shrink-0" />
                          <span className="truncate">
                            {u.locationCity || u.locationAddress || `${u.latitude.toFixed(3)}, ${u.longitude.toFixed(3)}`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1.5 pt-1.5 border-t border-gray-100">
                          <span>{isOnline ? "Active now" : `Last seen ${timeAgo}`}</span>
                          <span className="text-blue-600 font-bold hover:underline">
                            Locate on Map &rarr;
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
