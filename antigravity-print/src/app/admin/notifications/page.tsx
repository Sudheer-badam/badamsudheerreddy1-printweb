"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, CheckCheck, Users, FileText, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  user: { name: string; email: string };
}

export default function AdminNotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetch(`/api/notifications?uid=${user.uid}`)
        .then((r) => r.json())
        .then(setNotifications)
        .finally(() => setLoading(false));
    }
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <p className="text-white/40 mt-1">System-wide notification log</p>
      </div>

      <div className="glass rounded-3xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 skeleton rounded-xl" />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-white/30">
            <Bell className="w-10 h-10 mx-auto mb-3" />
            <p>No notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {notifications.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-start gap-4 p-5 ${!n.isRead ? "border-l-2 border-amber-500" : ""}`}
              >
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white text-sm">{n.title}</div>
                  <div className="text-sm text-white/40 mt-0.5">{n.message}</div>
                  <div className="text-xs text-white/25 mt-1">{formatDate(n.createdAt)}</div>
                </div>
                {!n.isRead && <div className="w-2 h-2 rounded-full bg-amber-400 mt-2" />}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
