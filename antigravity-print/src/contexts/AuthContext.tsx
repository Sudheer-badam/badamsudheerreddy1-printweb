"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  RecaptchaVerifier,
  ConfirmationResult,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  userRole: "ADMIN" | "CUSTOMER" | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithMicrosoft: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  sendOTP: (phone: string, recaptchaVerifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
  verifyOTP: (confirmationResult: ConfirmationResult, otp: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<"ADMIN" | "CUSTOMER" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Sync user with database and get role
        try {
          const idToken = await firebaseUser.getIdToken();
          const res = await fetch("/api/auth/sync", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName,
              phone: firebaseUser.phoneNumber,
              photoURL: firebaseUser.photoURL,
              provider: firebaseUser.providerData[0]?.providerId,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            setUserRole(data.role);
          }
        } catch (error) {
          console.error("Failed to sync user:", error);
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope("email");
    provider.addScope("profile");
    await signInWithPopup(auth, provider);
  };

  const signInWithMicrosoft = async () => {
    const provider = new OAuthProvider("microsoft.com");
    provider.addScope("email");
    provider.addScope("profile");
    await signInWithPopup(auth, provider);
  };

  const signInWithApple = async () => {
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");
    await signInWithPopup(auth, provider);
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
  };

  const sendOTP = async (
    phone: string,
    recaptchaVerifier: RecaptchaVerifier
  ): Promise<ConfirmationResult> => {
    return await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
  };

  const verifyOTP = async (
    confirmationResult: ConfirmationResult,
    otp: string
  ) => {
    await confirmationResult.confirm(otp);
  };

  const logout = async () => {
    await signOut(auth);
    toast.success("Logged out successfully");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        loading,
        signInWithGoogle,
        signInWithMicrosoft,
        signInWithApple,
        signInWithEmail,
        signUpWithEmail,
        sendOTP,
        verifyOTP,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
