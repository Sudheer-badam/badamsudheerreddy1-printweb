"use client";

import { doc, setDoc, onSnapshot, collection } from "firebase/firestore";
import { db } from "./firebase";

export interface FirebaseLiveLocationPayload {
  uid: string;
  email?: string | null;
  name?: string | null;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  isOnline: boolean;
}

/**
 * Sync live user location to Firebase Firestore collection "live_user_locations"
 */
export async function syncLocationToFirebase(data: FirebaseLiveLocationPayload): Promise<void> {
  if (!data.uid || !db) return;

  const payload = {
    // Standard fields
    userId: data.uid,
    uid: data.uid,
    email: data.email || null,
    name: data.name || null,
    latitude: data.latitude,
    longitude: data.longitude,
    accuracy: data.accuracy ?? null,
    address: data.address || null,
    city: data.city || null,
    state: data.state || null,
    country: data.country || "India",
    isOnline: data.isOnline,
    updatedAt: new Date().toISOString(),
    lastLocationUpdate: new Date().toISOString(),
    timestamp: Date.now(),
    // Capstone 220 exact schema compatibility
    user_id: data.uid,
    user_name: data.name || data.email || "Unknown",
    photo_url: null,
    is_sharing: true,
    is_online: data.isOnline,
    last_updated: new Date().toISOString(),
    device_os: typeof navigator !== "undefined" && /Windows/i.test(navigator.userAgent)
      ? "Windows"
      : typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent)
      ? "Android"
      : typeof navigator !== "undefined" && /iPhone|iPad/i.test(navigator.userAgent)
      ? "iOS"
      : "Desktop",
  };

  try {
    await setDoc(doc(db, "live_user_locations", data.uid), payload, { merge: true });
  } catch (err: any) {
    console.warn("Firebase live location sync:", err.message);
  }
}

/**
 * Mark user offline in Firebase Firestore
 */
export async function setFirebaseUserOffline(uid: string): Promise<void> {
  if (!uid || !db) return;

  const update = {
    isOnline: false,
    lastActive: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, "live_user_locations", uid), update, { merge: true });
  } catch {}
}

/**
 * Listen to live user locations from Firebase Firestore
 */
export function subscribeToFirebaseLocations(
  onUpdate: (locations: any[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!db) return () => {};

  return onSnapshot(
    collection(db, "live_user_locations"),
    (snapshot) => {
      const locations: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.latitude && data.longitude) {
          locations.push({
            id: docSnap.id,
            ...data,
          });
        }
      });
      onUpdate(locations);
    },
    (error) => {
      console.warn("Firebase live locations subscription notice:", error.message);
      onError?.(error);
    }
  );
}
