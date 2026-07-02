"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Save,
  Loader2,
  Camera,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    name: "",
    phone: "",
    email: "",
    profilePhoto: "",
    authProvider: "",
    registrationDate: "",
    lastLogin: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.displayName || "",
        phone: user.phoneNumber || "",
        email: user.email || "",
        profilePhoto: user.photoURL || "",
        authProvider: user.providerData[0]?.providerId || "email",
        registrationDate: user.metadata.creationTime || "",
        lastLogin: user.metadata.lastSignInTime || "",
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          uid: user?.uid,
          name: profile.name,
          phone: profile.phone,
        }),
      });
      if (res.ok) toast.success("Profile updated successfully!");
      else toast.error("Failed to update profile");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const getProviderLabel = (provider: string) => {
    const map: Record<string, string> = {
      "google.com": "Google",
      "microsoft.com": "Microsoft",
      "apple.com": "Apple",
      "password": "Email & Password",
      "phone": "Phone OTP",
    };
    return map[provider] || provider;
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Profile</h1>
        <p className="text-white/40 mt-1">Manage your account information</p>
      </div>

      {/* Avatar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-6 border border-white/5"
      >
        <div className="flex items-center gap-6">
          <div className="relative">
            {profile.profilePhoto ? (
              <img
                src={profile.profilePhoto}
                alt="Profile"
                className="w-20 h-20 rounded-2xl object-cover border-2 border-violet-500/30"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-violet-600/20 border-2 border-violet-500/30 flex items-center justify-center text-3xl font-bold text-violet-300">
                {profile.name?.charAt(0) || profile.email?.charAt(0) || "U"}
              </div>
            )}
            <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center border-2 border-background hover:bg-violet-700 transition-colors">
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{profile.name || "User"}</h2>
            <p className="text-white/40 text-sm">{profile.email || profile.phone}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">
                {getProviderLabel(profile.authProvider)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Profile Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-3xl p-6 border border-white/5 space-y-5"
      >
        <h3 className="font-bold text-white">Personal Information</h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/50 mb-2 block">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Your full name"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-2 block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="email"
                value={profile.email}
                readOnly
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/50 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-white/30 mt-1">Email cannot be changed here</p>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-2 block">Mobile Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+91 XXXXXXXXXX"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </motion.div>

      {/* Account Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-3xl p-6 border border-white/5"
      >
        <h3 className="font-bold text-white mb-4">Account Details</h3>
        <div className="space-y-3">
          <InfoItem
            icon={<Calendar className="w-4 h-4 text-violet-400" />}
            label="Member Since"
            value={profile.registrationDate ? formatDate(profile.registrationDate) : "—"}
          />
          <InfoItem
            icon={<Calendar className="w-4 h-4 text-blue-400" />}
            label="Last Login"
            value={profile.lastLogin ? formatDate(profile.lastLogin) : "—"}
          />
          <InfoItem
            icon={<Shield className="w-4 h-4 text-emerald-400" />}
            label="Login Method"
            value={getProviderLabel(profile.authProvider)}
          />
        </div>
      </motion.div>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">{icon}</div>
      <div className="flex-1">
        <div className="text-xs text-white/30">{label}</div>
        <div className="text-sm text-white font-medium">{value}</div>
      </div>
    </div>
  );
}
