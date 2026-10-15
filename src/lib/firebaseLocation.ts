"use client";

import { doc, setDoc, onSnapshot, collection } from "firebase/firestore";
import { db, capstoneDb } from "./firebase";

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
 * Writes to both the primary Firebase project and secondary cross-site project.
 */
export async function syncLocationToFirebase(data: FirebaseLiveLocationPayload): Promise<void> {
  if (!data.uid) return;

  const payload = {
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
    sourceWebsite: "PRINT DOCKER",
  };

  const promises: Promise<any>[] = [];

  // 1. Sync to primary project Firestore
  if (db) {
    promises.push(
      setDoc(doc(db, "live_user_locations", data.uid), payload, { merge: true }).catch((err) => {
        console.warn("Primary Firebase live location sync notice:", err.message);
      })
    );
  }

  // 2. Sync to cross-site Capstone project Firestore
  if (capstoneDb) {
    promises.push(
      setDoc(doc(capstoneDb, "live_user_locations", data.uid), payload, { merge: true }).catch((err) => {
        console.warn("Cross-site Firebase live location sync notice:", err.message);
      })
    );
  }

  await Promise.allSettled(promises);
}

/**
 * Mark user offline in Firebase Firestore
 */
export async function setFirebaseUserOffline(uid: string): Promise<void> {
  if (!uid) return;

  const update = {
    isOnline: false,
    lastActive: new Date().toISOString(),
  };

  const promises: Promise<any>[] = [];
  if (db) {
    promises.push(setDoc(doc(db, "live_user_locations", uid), update, { merge: true }).catch(() => {}));
  }
  if (capstoneDb) {
    promises.push(setDoc(doc(capstoneDb, "live_user_locations", uid), update, { merge: true }).catch(() => {}));
  }

  await Promise.allSettled(promises);
}

/**
 * Listen to live user locations from Firebase Firestore
 */
export function subscribeToFirebaseLocations(
  onUpdate: (locations: any[]) => void,
  onError?: (err: any) => void
): () => void {
  const targetDb = capstoneDb || db;
  if (!targetDb) return () => {};

  return onSnapshot(
    collection(targetDb, "live_user_locations"),
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
