"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Upload,
  FileText,
  CreditCard,
  Clock,
  CheckCircle,
  Printer,
  AlertCircle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, PAYMENT_STATUS_COLORS } from "@/lib/utils";

interface Order {
  id: string;
  orderNumber: string;
  fileName: string;
  totalPages: number;
  paperSize: string;
  printColor: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

interface DashboardStats {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  totalSpent: number;
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    totalSpent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`/api/orders?uid=${user?.uid}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
        // Calculate stats
        const allOrders = data.orders;
        setStats({
          totalOrders: data.pagination.total,
          completedOrders: allOrders.filter((o: Order) => o.status === "COMPLETED").length,
          pendingOrders: allOrders.filter((o: Order) =>
            ["UPLOADED", "VERIFIED", "ACCEPTED", "PRINTING"].includes(o.status)
          ).length,
          totalSpent: allOrders
            .filter((o: Order) => o.paymentStatus === "PAID")
            .reduce((sum: number, o: Order) => sum + o.totalAmount, 0),
        });
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      label: "Total Orders",
      value: stats.totalOrders,
      icon: FileText,
      color: "from-violet-500 to-purple-600",
      href: "/dashboard/orders",
    },
    {
      label: "Completed",
      value: stats.completedOrders,
      icon: CheckCircle,
      color: "from-emerald-500 to-green-600",
      href: "/dashboard/orders?status=COMPLETED",
    },
    {
      label: "In Progress",
      value: stats.pendingOrders,
      icon: Clock,
      color: "from-blue-500 to-cyan-500",
      href: "/dashboard/orders?status=PRINTING",
    },
    {
      label: "Total Spent",
      value: formatCurrency(stats.totalSpent),
      icon: CreditCard,
      color: "from-amber-500 to-orange-500",
      href: "/dashboard/payments",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user?.displayName?.split(" ")[0] || "User"} 👋
          </h1>
          <p className="text-white/40 mt-1">Here&apos;s what&apos;s happening with your print orders.</p>
        </div>
        <Link
          href="/dashboard/upload"
          className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity glow-purple"
        >
          <Upload className="w-4 h-4" />
          New Print Job
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link href={card.href}>
              <div className="glass rounded-2xl p-5 border border-white/5 hover-card cursor-pointer">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-2xl font-bold text-white">{card.value}</div>
                <div className="text-xs text-white/40 mt-1">{card.label}</div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/dashboard/upload">
          <div className="glass rounded-2xl p-5 border border-violet-500/20 hover:border-violet-500/40 transition-all hover-card cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center mb-3 group-hover:bg-violet-500/30 transition-colors">
              <Upload className="w-5 h-5 text-violet-400" />
            </div>
            <div className="font-semibold text-white">Upload New PDF</div>
            <div className="text-xs text-white/40 mt-1">Start a new print order</div>
          </div>
        </Link>
        <Link href="/dashboard/orders">
          <div className="glass rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all hover-card cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-3">
              <Printer className="w-5 h-5 text-blue-400" />
            </div>
            <div className="font-semibold text-white">Track Orders</div>
            <div className="text-xs text-white/40 mt-1">View live order status</div>
          </div>
        </Link>
        <Link href="/dashboard/support">
          <div className="glass rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all hover-card cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-3">
              <AlertCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="font-semibold text-white">Get Support</div>
            <div className="text-xs text-white/40 mt-1">Contact us for help</div>
          </div>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="glass rounded-3xl border border-white/5 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-violet-400" />
            <h2 className="font-bold text-white">Recent Orders</h2>
          </div>
          <Link
            href="/dashboard/orders"
            className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 skeleton rounded-xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40">No orders yet</p>
            <Link
              href="/dashboard/upload"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-white text-sm font-medium hover:opacity-90"
            >
              <Upload className="w-4 h-4" /> Upload Your First PDF
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {orders.map((order) => (
              <Link key={order.id} href={`/dashboard/orders/${order.id}`}>
                <div className="flex items-center gap-4 p-4 hover:bg-white/3 transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white text-sm truncate">{order.fileName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${ORDER_STATUS_COLORS[order.status]}`}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <div className="text-xs text-white/30 mt-0.5">
                      {order.orderNumber} • {order.totalPages} pages • {formatDate(order.createdAt)}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-semibold text-white">{formatCurrency(order.totalAmount)}</div>
                    <div className={`text-xs px-2 py-0.5 rounded-full border ${PAYMENT_STATUS_COLORS[order.paymentStatus]}`}>
                      {order.paymentStatus}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
