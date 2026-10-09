"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, CheckCheck, Package, Printer, CheckCircle, XCircle, Upload, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  channel: string;
  createdAt: string;
  orderId: string | null;
}

const getNotifIcon = (title: string) => {
  if (title.includes("Upload")) return <Upload className="w-4 h-4 text-blue-400" />;
  if (title.includes("Accepted") || title.includes("Printing")) return <Printer className="w-4 h-4 text-amber-400" />;
  if (title.includes("Completed") || title.includes("Ready")) return <CheckCircle className="w-4 h-4 text-emerald-400" />;
  if (title.includes("Cancelled")) return <XCircle className="w-4 h-4 text-red-400" />;
  if (title.includes("Payment")) return <CreditCard className="w-4 h-4 text-green-400" />;
  return <Bell className="w-4 h-4 text-violet-400" />;
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?uid=${user?.uid}`);
      if (res.ok) setNotifications(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: user?.uid, markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    toast.success("All notifications marked as read");
  };

  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: user?.uid, notificationId: id }),
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1D3A]">Notifications</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-4 py-2 rounded-xl glass border border-gray-300 text-gray-600 text-sm hover:text-[#0B1D3A] transition-colors"
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="glass rounded-3xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 skeleton rounded-xl" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {notifications.map((notif, i) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => !notif.isRead && markRead(notif.id)}
                className={`flex items-start gap-4 p-5 cursor-pointer transition-all hover:bg-gray-50 ${
                  !notif.isRead ? "border-l-2 border-violet-500" : ""
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    !notif.isRead ? "bg-violet-500/20" : "bg-white"
                  }`}
                >
                  {getNotifIcon(notif.title)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-medium text-sm ${notif.isRead ? "text-gray-600" : "text-[#0B1D3A]"}`}>
                      {notif.title}
                    </p>
                    {!notif.isRead && (
                      <div className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-2">{formatDate(notif.createdAt)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
