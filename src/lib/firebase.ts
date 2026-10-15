import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Capstone secondary app configuration for cross-website location sharing
const capstoneFirebaseConfig = {
  apiKey: "AIzaSyAffFR66goUx51PBnpOb5VebVyp5qO907A",
  authDomain: "capstone-project-220-real-time.firebaseapp.com",
  projectId: "capstone-project-220-real-time",
  storageBucket: "capstone-project-220-real-time.firebasestorage.app",
  messagingSenderId: "585922420311",
  appId: "1:585922420311:web:59f30356aec0178088cd12",
  measurementId: "G-WG5SDEG9ER",
};

// Prevent re-initialization in Next.js hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let capstoneApp: any = null;
try {
  capstoneApp =
    getApps().find((a) => a.name === "capstone-tracker") ||
    initializeApp(capstoneFirebaseConfig, "capstone-tracker");
} catch {}

export const auth = getAuth(app);
export const storage = getStorage(app);
export const db: Firestore = getFirestore(app);
export const capstoneDb: Firestore | null = capstoneApp ? getFirestore(capstoneApp) : null;
export default app;
